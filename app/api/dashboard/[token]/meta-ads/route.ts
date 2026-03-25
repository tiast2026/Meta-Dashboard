import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDb } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    await ensureDb();

    const client = await db.execute({
      sql: 'SELECT id FROM clients WHERE share_token = ? LIMIT 1',
      args: [params.token],
    });

    if (!client.rows.length) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const clientId = client.rows[0].id;

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // 広告データは全期間取得可能（from/toはオプション）
    const hasDateFilter = from && to;

    const dateCondition = hasDateFilter ? 'AND date >= ? AND date <= ?' : '';
    const dateArgs = hasDateFilter ? [from, to] : [];

    const fromDate = from ? new Date(from) : new Date();
    const toDate = to ? new Date(to) : new Date();
    const periodLength = toDate.getTime() - fromDate.getTime();
    const prevTo = new Date(fromDate.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - periodLength);
    const prevFromStr = prevFrom.toISOString().split('T')[0];
    const prevToStr = prevTo.toISOString().split('T')[0];

    const daily = await db.execute({
      sql: `SELECT date,
        COALESCE(SUM(impressions), 0) as impressions,
        COALESCE(SUM(reach), 0) as reach,
        COALESCE(SUM(clicks), 0) as clicks,
        COALESCE(SUM(results), 0) as results,
        COALESCE(SUM(spend), 0) as spend
      FROM meta_ad_insights
      WHERE client_id = ? ${dateCondition}
      GROUP BY date ORDER BY date ASC`,
      args: [clientId, ...dateArgs],
    });

    const campaignsResult = await db.execute({
      sql: `SELECT campaign_name,
        COALESCE(SUM(impressions), 0) as impressions,
        COALESCE(SUM(reach), 0) as reach,
        COALESCE(SUM(clicks), 0) as clicks,
        COALESCE(SUM(results), 0) as results,
        COALESCE(SUM(spend), 0) as spend
      FROM meta_ad_insights
      WHERE client_id = ? ${dateCondition}
      GROUP BY campaign_name`,
      args: [clientId, ...dateArgs],
    });

    const campaigns = campaignsResult.rows.map((c) => ({
      ...c,
      cpc: Number(c.clicks) > 0 ? Number(c.spend) / Number(c.clicks) : 0,
      ctr: Number(c.impressions) > 0 ? (Number(c.clicks) / Number(c.impressions)) * 100 : 0,
    }));

    const adsets = await db.execute({
      sql: `SELECT adset_name,
        COALESCE(SUM(impressions), 0) as impressions,
        COALESCE(SUM(reach), 0) as reach,
        COALESCE(SUM(clicks), 0) as clicks,
        COALESCE(SUM(results), 0) as results,
        COALESCE(SUM(spend), 0) as spend
      FROM meta_ad_insights
      WHERE client_id = ? ${dateCondition}
      GROUP BY adset_name`,
      args: [clientId, ...dateArgs],
    });

    const platforms = await db.execute({
      sql: `SELECT publisher_platform,
        COALESCE(SUM(impressions), 0) as impressions,
        COALESCE(SUM(reach), 0) as reach,
        COALESCE(SUM(clicks), 0) as clicks,
        COALESCE(SUM(results), 0) as results,
        COALESCE(SUM(spend), 0) as spend
      FROM meta_ad_insights
      WHERE client_id = ? ${dateCondition}
      GROUP BY publisher_platform`,
      args: [clientId, ...dateArgs],
    });

    const kpiResult = await db.execute({
      sql: `SELECT
        COALESCE(SUM(spend), 0) as spend,
        COALESCE(SUM(impressions), 0) as impressions,
        COALESCE(SUM(reach), 0) as reach,
        COALESCE(SUM(clicks), 0) as clicks,
        COALESCE(SUM(results), 0) as results
      FROM meta_ad_insights
      WHERE client_id = ? ${dateCondition}`,
      args: [clientId, ...dateArgs],
    });

    const kpiRaw = kpiResult.rows[0] || { spend: 0, impressions: 0, reach: 0, clicks: 0, results: 0 };
    const kpi = {
      ...kpiRaw,
      cpc: Number(kpiRaw.clicks) > 0 ? Number(kpiRaw.spend) / Number(kpiRaw.clicks) : 0,
      ctr: Number(kpiRaw.impressions) > 0 ? (Number(kpiRaw.clicks) / Number(kpiRaw.impressions)) * 100 : 0,
    };

    // 前期間の比較データ
    const prevKpiResult = await db.execute({
      sql: `SELECT
        COALESCE(SUM(spend), 0) as spend,
        COALESCE(SUM(impressions), 0) as impressions,
        COALESCE(SUM(reach), 0) as reach,
        COALESCE(SUM(clicks), 0) as clicks,
        COALESCE(SUM(results), 0) as results
      FROM meta_ad_insights
      WHERE client_id = ? AND date >= ? AND date <= ?`,
      args: [clientId, prevFromStr, prevToStr],
    });

    const prevKpiRaw = prevKpiResult.rows[0] || { spend: 0, impressions: 0, reach: 0, clicks: 0, results: 0 };
    const previous_kpi = {
      ...prevKpiRaw,
      cpc: Number(prevKpiRaw.clicks) > 0 ? Number(prevKpiRaw.spend) / Number(prevKpiRaw.clicks) : 0,
      ctr: Number(prevKpiRaw.impressions) > 0 ? (Number(prevKpiRaw.clicks) / Number(prevKpiRaw.impressions)) * 100 : 0,
    };

    return NextResponse.json({ daily: daily.rows, campaigns, adsets: adsets.rows, platforms: platforms.rows, kpi, previous_kpi });
  } catch (err) {
    console.error('Dashboard meta-ads error:', err);
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
  }
}
