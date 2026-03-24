import { NextRequest, NextResponse } from 'next/server';
import { queryOne, queryRows, table, DATASET_MASTER, DATASET_ADS } from '@/lib/bq';

const T_CLIENTS = table(DATASET_MASTER, 'clients');
const T_ADS = table(DATASET_ADS, 'raw_ad_insights');

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const client = await queryOne<{ client_id: string }>(
    `SELECT client_id FROM ${T_CLIENTS} WHERE share_token = @token LIMIT 1`,
    { token: params.token }
  );

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to query params are required' }, { status: 400 });
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);
  const periodLength = toDate.getTime() - fromDate.getTime();
  const prevTo = new Date(fromDate.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - periodLength);
  const prevFromStr = prevFrom.toISOString().split('T')[0];
  const prevToStr = prevTo.toISOString().split('T')[0];

  const p = { cid: client.client_id, from, to };

  const daily = await queryRows(
    `SELECT date,
      COALESCE(SUM(impressions), 0) as impressions,
      COALESCE(SUM(reach), 0) as reach,
      COALESCE(SUM(clicks), 0) as clicks,
      COALESCE(SUM(results), 0) as results,
      COALESCE(SUM(spend), 0) as spend
    FROM ${T_ADS}
    WHERE client_id = @cid AND date >= @from AND date <= @to
    GROUP BY date ORDER BY date ASC`,
    p
  );

  const campaignsRaw = await queryRows<Record<string, unknown>>(
    `SELECT campaign_name,
      COALESCE(SUM(impressions), 0) as impressions,
      COALESCE(SUM(reach), 0) as reach,
      COALESCE(SUM(clicks), 0) as clicks,
      COALESCE(SUM(results), 0) as results,
      COALESCE(SUM(spend), 0) as spend
    FROM ${T_ADS}
    WHERE client_id = @cid AND date >= @from AND date <= @to
    GROUP BY campaign_name`,
    p
  );

  const campaigns = campaignsRaw.map((c) => ({
    ...c,
    cpc: (c.clicks as number) > 0 ? (c.spend as number) / (c.clicks as number) : 0,
    ctr: (c.impressions as number) > 0 ? ((c.clicks as number) / (c.impressions as number)) * 100 : 0,
  }));

  const adsets = await queryRows(
    `SELECT adset_name,
      COALESCE(SUM(impressions), 0) as impressions,
      COALESCE(SUM(reach), 0) as reach,
      COALESCE(SUM(clicks), 0) as clicks,
      COALESCE(SUM(results), 0) as results,
      COALESCE(SUM(spend), 0) as spend
    FROM ${T_ADS}
    WHERE client_id = @cid AND date >= @from AND date <= @to
    GROUP BY adset_name`,
    p
  );

  const platforms = await queryRows(
    `SELECT publisher_platform,
      COALESCE(SUM(impressions), 0) as impressions,
      COALESCE(SUM(reach), 0) as reach,
      COALESCE(SUM(clicks), 0) as clicks,
      COALESCE(SUM(results), 0) as results,
      COALESCE(SUM(spend), 0) as spend
    FROM ${T_ADS}
    WHERE client_id = @cid AND date >= @from AND date <= @to
    GROUP BY publisher_platform`,
    p
  );

  const kpiRaw = await queryOne<Record<string, number>>(
    `SELECT
      COALESCE(SUM(spend), 0) as spend,
      COALESCE(SUM(impressions), 0) as impressions,
      COALESCE(SUM(reach), 0) as reach,
      COALESCE(SUM(clicks), 0) as clicks,
      COALESCE(SUM(results), 0) as results
    FROM ${T_ADS}
    WHERE client_id = @cid AND date >= @from AND date <= @to`,
    p
  ) || { spend: 0, impressions: 0, reach: 0, clicks: 0, results: 0 };

  const kpi = {
    ...kpiRaw,
    cpc: kpiRaw.clicks > 0 ? kpiRaw.spend / kpiRaw.clicks : 0,
    ctr: kpiRaw.impressions > 0 ? (kpiRaw.clicks / kpiRaw.impressions) * 100 : 0,
  };

  const prevP = { cid: client.client_id, from: prevFromStr, to: prevToStr };
  const prevKpiRaw = await queryOne<Record<string, number>>(
    `SELECT
      COALESCE(SUM(spend), 0) as spend,
      COALESCE(SUM(impressions), 0) as impressions,
      COALESCE(SUM(reach), 0) as reach,
      COALESCE(SUM(clicks), 0) as clicks,
      COALESCE(SUM(results), 0) as results
    FROM ${T_ADS}
    WHERE client_id = @cid AND date >= @from AND date <= @to`,
    prevP
  ) || { spend: 0, impressions: 0, reach: 0, clicks: 0, results: 0 };

  const previous_kpi = {
    ...prevKpiRaw,
    cpc: prevKpiRaw.clicks > 0 ? prevKpiRaw.spend / prevKpiRaw.clicks : 0,
    ctr: prevKpiRaw.impressions > 0 ? (prevKpiRaw.clicks / prevKpiRaw.impressions) * 100 : 0,
  };

  return NextResponse.json({ daily, campaigns, adsets, platforms, kpi, previous_kpi });
}
