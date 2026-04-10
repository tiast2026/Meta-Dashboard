import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDb } from '@/lib/db';
import { queryOne, table, DATASET_MASTER } from '@/lib/bq';

const T = table(DATASET_MASTER, 'clients');

export const dynamic = 'force-dynamic';

// ── Decision thresholds from 広告運用ナレッジ教科書 ──────────
// Based on: apparel, avg order value ~¥6,000, ad ratio target 15-18%

const CPA_IDEAL = 1200;
const CPA_GOOD = 1500;
const CPA_CAUTION = 1600;
const CPA_TOUGH = 1800;
const CPA_DANGER = 2000;

const CHECKOUT_IDEAL = 600;

const ROAS_DANGER = 3;     // 300%
const ROAS_STANDARD = 5;   // 500%
const ROAS_GOOD = 8;       // 800%
const ROAS_GREAT = 10;     // 1000%

const MIN_SPEND_FOR_JUDGMENT = 5000; // ¥5,000未満は学習中
const HIGH_CPA_AD_THRESHOLD = 4000;  // 個別広告の高CPA閾値

type Level = 'excellent' | 'good' | 'caution' | 'warning' | 'danger';

interface Recommendation {
  level: Level;
  action: string;
  detail: string;
}

interface CampaignAdvisor {
  campaign_id: string;
  campaign_name: string;
  campaign_objective: string;
  metrics_1d: PeriodMetrics;
  metrics_7d: PeriodMetrics;
  metrics_30d: PeriodMetrics;
  recommendation: Recommendation;
  is_learning: boolean;
}

interface PeriodMetrics {
  spend: number;
  purchase: number;
  purchase_value: number;
  clicks: number;
  impressions: number;
  initiate_checkout: number;
  cpa: number;
  checkout_cost: number;
  roas: number;
  cpc: number;
  ctr: number;
}

interface AdAlert {
  ad_id: string;
  ad_name: string;
  campaign_name: string;
  spend: number;
  purchase: number;
  cpa: number;
  level: Level;
  reason: string;
}

const SUM_COLS = `
  COALESCE(SUM(spend), 0) as spend,
  COALESCE(SUM(purchase), 0) as purchase,
  COALESCE(SUM(purchase_value), 0) as purchase_value,
  COALESCE(SUM(clicks), 0) as clicks,
  COALESCE(SUM(impressions), 0) as impressions,
  COALESCE(SUM(initiate_checkout), 0) as initiate_checkout
`;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function computeMetrics(row: Record<string, unknown>): PeriodMetrics {
  const spend = Number(row.spend) || 0;
  const purchase = Number(row.purchase) || 0;
  const pv = Number(row.purchase_value) || 0;
  const clicks = Number(row.clicks) || 0;
  const impressions = Number(row.impressions) || 0;
  const ic = Number(row.initiate_checkout) || 0;
  return {
    spend,
    purchase,
    purchase_value: pv,
    clicks,
    impressions,
    initiate_checkout: ic,
    cpa: purchase > 0 ? spend / purchase : 0,
    checkout_cost: ic > 0 ? spend / ic : 0,
    roas: spend > 0 ? pv / spend : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function judgeCampaign(m30: PeriodMetrics, m7: PeriodMetrics, m1: PeriodMetrics): Recommendation {
  // Not enough spend to judge
  if (m30.spend < MIN_SPEND_FOR_JUDGMENT) {
    return { level: 'good', action: '学習中 — 様子見', detail: `消化金額 ¥${Math.round(m30.spend).toLocaleString()} はまだ学習期間です。¥5,000以上消化してから判断してください。` };
  }

  const cpa = m30.cpa;
  const roas = m30.roas;

  // ROAS-based exceptional performance
  if (roas >= ROAS_GREAT) {
    return { level: 'excellent', action: '🚀 全力投下', detail: `ROAS ${(roas * 100).toFixed(0)}% — 圧倒的なパフォーマンス。予算を可能な限り追加してください。` };
  }

  // CPA-based judgment (primary)
  if (cpa > 0 && cpa <= CPA_IDEAL) {
    return { level: 'excellent', action: '📈 予算追加OK', detail: `CPA ¥${Math.round(cpa).toLocaleString()} — 理想的。段階的に予算を追加してください。` };
  }
  if (cpa > 0 && cpa <= CPA_GOOD) {
    const trend = m7.cpa > 0 && m7.cpa < m30.cpa ? '（7日平均は改善傾向）' : '';
    return { level: 'good', action: '✅ 良好 — 維持・追加検討', detail: `CPA ¥${Math.round(cpa).toLocaleString()} ${trend}` };
  }
  if (cpa > 0 && cpa <= CPA_CAUTION) {
    return { level: 'caution', action: '⚠️ 注意 — 予算追加停止', detail: `CPA ¥${Math.round(cpa).toLocaleString()} — 現状維持し、クリエイティブの見直しを検討。` };
  }
  if (cpa > 0 && cpa <= CPA_TOUGH) {
    return { level: 'warning', action: '🟠 厳しい — 縮小検討', detail: `CPA ¥${Math.round(cpa).toLocaleString()} — 予算縮小またはクリエイティブ/ターゲティングの変更を推奨。` };
  }
  if (cpa > CPA_DANGER) {
    return { level: 'danger', action: '🔴 危険 — 基本停止', detail: `CPA ¥${Math.round(cpa).toLocaleString()} — このまま回すと赤字拡大。停止して原因を分析してください。` };
  }

  // No purchases — check ROAS from checkout perspective
  if (m30.purchase === 0 && m30.spend > MIN_SPEND_FOR_JUDGMENT) {
    if (m30.initiate_checkout > 0) {
      return { level: 'caution', action: '⚠️ 購入0件 — チェックアウトは発生', detail: `¥${Math.round(m30.spend).toLocaleString()} 消化で購入0件。ただしチェックアウト${m30.initiate_checkout}件あり。LP/価格/在庫を確認。` };
    }
    return { level: 'danger', action: '🔴 購入もチェックアウトもなし', detail: `¥${Math.round(m30.spend).toLocaleString()} 消化で成果なし。クリエイティブ・ターゲティング・LPの見直しが必要。` };
  }

  // ROAS fallback
  if (roas >= ROAS_GOOD) {
    return { level: 'good', action: '✅ ROAS良好', detail: `ROAS ${(roas * 100).toFixed(0)}% — 安定稼働中。` };
  }
  if (roas >= ROAS_STANDARD) {
    return { level: 'good', action: '✅ ROAS標準', detail: `ROAS ${(roas * 100).toFixed(0)}% — 業界標準。` };
  }
  if (roas >= ROAS_DANGER) {
    return { level: 'caution', action: '⚠️ ROAS低め', detail: `ROAS ${(roas * 100).toFixed(0)}% — 損益分岐ライン。改善策を検討。` };
  }

  return { level: 'caution', action: '⚠️ データ不足', detail: '判断に必要なデータが不足しています。' };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    await ensureDb();

    const client = await queryOne<Record<string, unknown>>(
      `SELECT client_id, name FROM ${T} WHERE share_token = @token LIMIT 1`,
      { token: params.token }
    );
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    const clientId = String(client.client_id);

    const now = new Date();
    const d1 = isoDate(new Date(now.getTime() - 1 * 86400000));
    const d7 = isoDate(new Date(now.getTime() - 7 * 86400000));
    const d30 = isoDate(new Date(now.getTime() - 30 * 86400000));
    const today = isoDate(now);

    // ── Overall metrics ────────────────────────────
    const fetchOverall = async (since: string, until: string) => {
      const r = await db.execute({
        sql: `SELECT ${SUM_COLS} FROM meta_ad_insights WHERE client_id = ? AND date >= ? AND date <= ?`,
        args: [clientId, since, until],
      });
      return computeMetrics((r.rows[0] || {}) as Record<string, unknown>);
    };

    const [overall1d, overall7d, overall30d] = await Promise.all([
      fetchOverall(d1, today),
      fetchOverall(d7, today),
      fetchOverall(d30, today),
    ]);

    // ── Per-campaign metrics at 3 timeframes ───────
    const fetchCampaigns = async (since: string, until: string) => {
      const r = await db.execute({
        sql: `SELECT campaign_id, campaign_name, campaign_objective, ${SUM_COLS}
              FROM meta_ad_insights WHERE client_id = ? AND date >= ? AND date <= ?
              GROUP BY campaign_id, campaign_name, campaign_objective`,
        args: [clientId, since, until],
      });
      const map = new Map<string, PeriodMetrics>();
      for (const row of r.rows) {
        map.set(String(row.campaign_id), computeMetrics(row as Record<string, unknown>));
      }
      return map;
    };

    const [camps1d, camps7d, camps30d] = await Promise.all([
      fetchCampaigns(d1, today),
      fetchCampaigns(d7, today),
      fetchCampaigns(d30, today),
    ]);

    // Build campaign list from 30d (primary)
    const ZERO: PeriodMetrics = { spend: 0, purchase: 0, purchase_value: 0, clicks: 0, impressions: 0, initiate_checkout: 0, cpa: 0, checkout_cost: 0, roas: 0, cpc: 0, ctr: 0 };
    const campaignNames = await db.execute({
      sql: `SELECT DISTINCT campaign_id, campaign_name, campaign_objective FROM meta_ad_insights WHERE client_id = ?`,
      args: [clientId],
    });

    const campaigns: CampaignAdvisor[] = campaignNames.rows.map((row) => {
      const id = String(row.campaign_id);
      const m30 = camps30d.get(id) || ZERO;
      const m7 = camps7d.get(id) || ZERO;
      const m1 = camps1d.get(id) || ZERO;
      return {
        campaign_id: id,
        campaign_name: String(row.campaign_name),
        campaign_objective: String(row.campaign_objective || ''),
        metrics_1d: m1,
        metrics_7d: m7,
        metrics_30d: m30,
        recommendation: judgeCampaign(m30, m7, m1),
        is_learning: m30.spend < MIN_SPEND_FOR_JUDGMENT,
      };
    }).sort((a, b) => b.metrics_30d.spend - a.metrics_30d.spend);

    // ── Ad-level alerts (high CPA ads) ─────────────
    const adsResult = await db.execute({
      sql: `SELECT ad_id, ad_name, campaign_name, ${SUM_COLS}
            FROM meta_ad_insights WHERE client_id = ? AND date >= ? AND date <= ?
            GROUP BY ad_id, ad_name, campaign_name
            HAVING spend > 1000`,
      args: [clientId, d30, today],
    });

    const adAlerts: AdAlert[] = [];
    for (const row of adsResult.rows) {
      const m = computeMetrics(row as Record<string, unknown>);
      if (m.purchase === 0 && m.spend > 3000) {
        adAlerts.push({
          ad_id: String(row.ad_id),
          ad_name: String(row.ad_name),
          campaign_name: String(row.campaign_name),
          spend: m.spend,
          purchase: 0,
          cpa: 0,
          level: 'danger',
          reason: `¥${Math.round(m.spend).toLocaleString()} 消化で購入0件 — 停止を推奨`,
        });
      } else if (m.cpa > HIGH_CPA_AD_THRESHOLD) {
        adAlerts.push({
          ad_id: String(row.ad_id),
          ad_name: String(row.ad_name),
          campaign_name: String(row.campaign_name),
          spend: m.spend,
          purchase: m.purchase,
          cpa: m.cpa,
          level: 'warning',
          reason: `CPA ¥${Math.round(m.cpa).toLocaleString()} — 全体平均を大幅に悪化させている可能性。停止を検討`,
        });
      }
    }
    adAlerts.sort((a, b) => (b.cpa || b.spend) - (a.cpa || a.spend));

    // ── Summary ────────────────────────────────────
    const overallRecommendation = judgeCampaign(overall30d, overall7d, overall1d);

    // Checkout cost insight
    let checkoutInsight = '';
    if (overall30d.checkout_cost > 0 && overall30d.checkout_cost <= CHECKOUT_IDEAL) {
      checkoutInsight = `チェックアウト単価 ¥${Math.round(overall30d.checkout_cost).toLocaleString()} — 良好（理想: ¥${CHECKOUT_IDEAL}以下）`;
    } else if (overall30d.checkout_cost > CHECKOUT_IDEAL) {
      checkoutInsight = `チェックアウト単価 ¥${Math.round(overall30d.checkout_cost).toLocaleString()} — やや高い（理想: ¥${CHECKOUT_IDEAL}以下）`;
    }

    // 1d vs 7d vs 30d trend
    const trendNote = (() => {
      if (overall1d.cpa === 0 || overall7d.cpa === 0 || overall30d.cpa === 0) return '';
      if (overall1d.cpa > overall30d.cpa * 1.5) return '⚠️ 直近1日のCPAが30日平均の1.5倍以上。一時的な高騰の可能性。1日で判断せず7日を待ちましょう。';
      if (overall7d.cpa < overall30d.cpa * 0.8) return '📈 直近7日のCPAが30日平均より20%以上改善。好調トレンドです。';
      if (overall7d.cpa > overall30d.cpa * 1.3) return '📉 直近7日のCPAが30日平均より30%以上悪化。クリエイティブ疲弊 or 在庫切れの可能性を確認。';
      return '';
    })();

    return NextResponse.json({
      client_name: String(client.name),
      overall: {
        metrics_1d: overall1d,
        metrics_7d: overall7d,
        metrics_30d: overall30d,
        recommendation: overallRecommendation,
        checkout_insight: checkoutInsight,
        trend_note: trendNote,
      },
      campaigns,
      ad_alerts: adAlerts.slice(0, 20),
    });
  } catch (err) {
    console.error('Advisor error:', err);
    return NextResponse.json({ error: 'アドバイザーデータの取得に失敗しました' }, { status: 500 });
  }
}
