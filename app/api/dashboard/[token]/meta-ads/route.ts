import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const client = db.prepare('SELECT * FROM clients WHERE share_token = ?').get(params.token) as Record<string, unknown> | undefined;

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to query params are required' }, { status: 400 });
  }

  // Calculate previous period
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const periodLength = toDate.getTime() - fromDate.getTime();
  const prevTo = new Date(fromDate.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - periodLength);
  const prevFromStr = prevFrom.toISOString().split('T')[0];
  const prevToStr = prevTo.toISOString().split('T')[0];

  // Daily aggregation
  const daily = db.prepare(`
    SELECT
      date,
      COALESCE(SUM(impressions), 0) as impressions,
      COALESCE(SUM(reach), 0) as reach,
      COALESCE(SUM(clicks), 0) as clicks,
      COALESCE(SUM(results), 0) as results,
      COALESCE(SUM(spend), 0) as spend
    FROM meta_ad_insights
    WHERE client_id = ? AND date >= ? AND date <= ?
    GROUP BY date
    ORDER BY date ASC
  `).all(client.id, from, to);

  // Campaigns aggregation
  const campaignsRaw = db.prepare(`
    SELECT
      campaign_name,
      COALESCE(SUM(impressions), 0) as impressions,
      COALESCE(SUM(reach), 0) as reach,
      COALESCE(SUM(clicks), 0) as clicks,
      COALESCE(SUM(results), 0) as results,
      COALESCE(SUM(spend), 0) as spend
    FROM meta_ad_insights
    WHERE client_id = ? AND date >= ? AND date <= ?
    GROUP BY campaign_name
  `).all(client.id, from, to) as Array<Record<string, unknown>>;

  const campaigns = campaignsRaw.map((c) => ({
    ...c,
    cpc: (c.clicks as number) > 0 ? (c.spend as number) / (c.clicks as number) : 0,
    ctr: (c.impressions as number) > 0 ? ((c.clicks as number) / (c.impressions as number)) * 100 : 0,
  }));

  // Adsets aggregation
  const adsets = db.prepare(`
    SELECT
      adset_name,
      COALESCE(SUM(impressions), 0) as impressions,
      COALESCE(SUM(reach), 0) as reach,
      COALESCE(SUM(clicks), 0) as clicks,
      COALESCE(SUM(results), 0) as results,
      COALESCE(SUM(spend), 0) as spend
    FROM meta_ad_insights
    WHERE client_id = ? AND date >= ? AND date <= ?
    GROUP BY adset_name
  `).all(client.id, from, to);

  // Platforms aggregation
  const platforms = db.prepare(`
    SELECT
      publisher_platform,
      COALESCE(SUM(impressions), 0) as impressions,
      COALESCE(SUM(reach), 0) as reach,
      COALESCE(SUM(clicks), 0) as clicks,
      COALESCE(SUM(results), 0) as results,
      COALESCE(SUM(spend), 0) as spend
    FROM meta_ad_insights
    WHERE client_id = ? AND date >= ? AND date <= ?
    GROUP BY publisher_platform
  `).all(client.id, from, to);

  // KPI totals for current period
  const kpiRaw = db.prepare(`
    SELECT
      COALESCE(SUM(spend), 0) as spend,
      COALESCE(SUM(impressions), 0) as impressions,
      COALESCE(SUM(reach), 0) as reach,
      COALESCE(SUM(clicks), 0) as clicks,
      COALESCE(SUM(results), 0) as results
    FROM meta_ad_insights
    WHERE client_id = ? AND date >= ? AND date <= ?
  `).get(client.id, from, to) as Record<string, number>;

  const kpi = {
    ...kpiRaw,
    cpc: kpiRaw.clicks > 0 ? kpiRaw.spend / kpiRaw.clicks : 0,
    ctr: kpiRaw.impressions > 0 ? (kpiRaw.clicks / kpiRaw.impressions) * 100 : 0,
  };

  // KPI totals for previous period
  const prevKpiRaw = db.prepare(`
    SELECT
      COALESCE(SUM(spend), 0) as spend,
      COALESCE(SUM(impressions), 0) as impressions,
      COALESCE(SUM(reach), 0) as reach,
      COALESCE(SUM(clicks), 0) as clicks,
      COALESCE(SUM(results), 0) as results
    FROM meta_ad_insights
    WHERE client_id = ? AND date >= ? AND date <= ?
  `).get(client.id, prevFromStr, prevToStr) as Record<string, number>;

  const previous_kpi = {
    ...prevKpiRaw,
    cpc: prevKpiRaw.clicks > 0 ? prevKpiRaw.spend / prevKpiRaw.clicks : 0,
    ctr: prevKpiRaw.impressions > 0 ? (prevKpiRaw.clicks / prevKpiRaw.impressions) * 100 : 0,
  };

  return NextResponse.json({
    daily,
    campaigns,
    adsets,
    platforms,
    kpi,
    previous_kpi,
  });
}
