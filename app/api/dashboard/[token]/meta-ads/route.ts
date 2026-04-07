import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDb } from '@/lib/db';
import { queryOne, table, DATASET_MASTER } from '@/lib/bq';

const T = table(DATASET_MASTER, 'clients');

// Columns we aggregate at every level (campaign / adset / ad). Keep in sync
// with the meta_ad_insights schema (action columns added in PR 21).
const SUM_COLUMNS = `
  COALESCE(SUM(impressions), 0) as impressions,
  COALESCE(SUM(reach), 0) as reach,
  COALESCE(SUM(clicks), 0) as clicks,
  COALESCE(SUM(results), 0) as results,
  COALESCE(SUM(spend), 0) as spend,
  COALESCE(SUM(add_to_cart), 0) as add_to_cart,
  COALESCE(SUM(initiate_checkout), 0) as initiate_checkout,
  COALESCE(SUM(purchase), 0) as purchase,
  COALESCE(SUM(purchase_value), 0) as purchase_value,
  COALESCE(SUM(view_content), 0) as view_content,
  COALESCE(SUM(lead), 0) as lead,
  COALESCE(SUM(complete_registration), 0) as complete_registration,
  COALESCE(SUM(contact), 0) as contact,
  COALESCE(SUM(subscribe), 0) as subscribe,
  COALESCE(SUM(search), 0) as search,
  COALESCE(SUM(add_payment_info), 0) as add_payment_info,
  COALESCE(SUM(add_to_wishlist), 0) as add_to_wishlist,
  COALESCE(SUM(page_engagement), 0) as page_engagement,
  COALESCE(SUM(post_engagement), 0) as post_engagement,
  COALESCE(SUM(video_view), 0) as video_view,
  COALESCE(SUM(link_click), 0) as link_click
`;

type Row = Record<string, unknown>;

function withDerived(row: Row): Row {
  const spend = Number(row.spend) || 0;
  const clicks = Number(row.clicks) || 0;
  const impressions = Number(row.impressions) || 0;
  const purchase = Number(row.purchase) || 0;
  const purchaseValue = Number(row.purchase_value) || 0;
  return {
    ...row,
    cpc: clicks > 0 ? spend / clicks : 0,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    cpa: purchase > 0 ? spend / purchase : 0,
    roas: spend > 0 ? purchaseValue / spend : 0,
  };
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

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (from && isNaN(new Date(from).getTime())) {
      return NextResponse.json({ error: 'invalid from date' }, { status: 400 });
    }
    if (to && isNaN(new Date(to).getTime())) {
      return NextResponse.json({ error: 'invalid to date' }, { status: 400 });
    }

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

    // ── Daily trend ────────────────────────────────────
    const daily = await db.execute({
      sql: `SELECT date, ${SUM_COLUMNS}
      FROM meta_ad_insights
      WHERE client_id = ? ${dateCondition}
      GROUP BY date ORDER BY date ASC`,
      args: [clientId, ...dateArgs],
    });

    // ── Hierarchy: Campaign → AdSet → Ad ───────────────
    const campaignsResult = await db.execute({
      sql: `SELECT campaign_id, campaign_name, campaign_objective, ${SUM_COLUMNS}
      FROM meta_ad_insights
      WHERE client_id = ? ${dateCondition}
      GROUP BY campaign_id, campaign_name, campaign_objective`,
      args: [clientId, ...dateArgs],
    });

    const adsetsResult = await db.execute({
      sql: `SELECT campaign_id, adset_id, adset_name, ${SUM_COLUMNS}
      FROM meta_ad_insights
      WHERE client_id = ? ${dateCondition}
      GROUP BY campaign_id, adset_id, adset_name`,
      args: [clientId, ...dateArgs],
    });

    const adsResult = await db.execute({
      sql: `SELECT campaign_id, adset_id, ad_id, ad_name, ${SUM_COLUMNS}
      FROM meta_ad_insights
      WHERE client_id = ? ${dateCondition}
      GROUP BY campaign_id, adset_id, ad_id, ad_name`,
      args: [clientId, ...dateArgs],
    });

    const campaigns = campaignsResult.rows.map(withDerived);
    const adsets = adsetsResult.rows.map(withDerived);
    const ads = adsResult.rows.map(withDerived);

    // ── Backwards-compat: legacy `campaigns` shape (campaign_name based) ──
    const legacyCampaigns = campaigns.map((c) => ({
      campaign_name: c.campaign_name,
      impressions: c.impressions,
      reach: c.reach,
      clicks: c.clicks,
      results: c.results,
      spend: c.spend,
      cpc: c.cpc,
      ctr: c.ctr,
    }));

    const platforms = await db.execute({
      sql: `SELECT publisher_platform, ${SUM_COLUMNS}
      FROM meta_ad_insights
      WHERE client_id = ? ${dateCondition}
      GROUP BY publisher_platform`,
      args: [clientId, ...dateArgs],
    });

    const kpiResult = await db.execute({
      sql: `SELECT ${SUM_COLUMNS}
      FROM meta_ad_insights
      WHERE client_id = ? ${dateCondition}`,
      args: [clientId, ...dateArgs],
    });

    const kpiRaw = (kpiResult.rows[0] || {}) as Row;
    const kpi = withDerived(kpiRaw);

    const prevKpiResult = await db.execute({
      sql: `SELECT ${SUM_COLUMNS}
      FROM meta_ad_insights
      WHERE client_id = ? AND date >= ? AND date <= ?`,
      args: [clientId, prevFromStr, prevToStr],
    });

    const prevKpiRaw = (prevKpiResult.rows[0] || {}) as Row;
    const previous_kpi = withDerived(prevKpiRaw);

    return NextResponse.json({
      client: { name: client.name },
      daily: daily.rows,
      // Hierarchical for the new drilldown table
      hierarchy: { campaigns, adsets, ads },
      // Legacy flat campaigns array (still used by existing campaign-table.tsx)
      campaigns: legacyCampaigns,
      platforms: platforms.rows,
      kpi,
      previous_kpi,
    });
  } catch (err) {
    console.error('Dashboard meta-ads error:', err);
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
  }
}
