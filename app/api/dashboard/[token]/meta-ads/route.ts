import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDb } from '@/lib/db';
import { queryOne, table, DATASET_MASTER } from '@/lib/bq';

const T = table(DATASET_MASTER, 'clients');

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

    return NextResponse.json({
      client: { name: client.name },
      daily: daily.rows,
      campaigns,
      platforms: platforms.rows,
      kpi,
      previous_kpi,
    });
  } catch (err) {
    console.error('Dashboard meta-ads error:', err);
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
  }
}
