import { NextRequest, NextResponse } from 'next/server';
import { queryOne, queryRows, table, DATASET_MASTER, DATASET_IG } from '@/lib/bq';

const T_CLIENTS = table(DATASET_MASTER, 'clients');
const T_DAILY = table(DATASET_IG, 'raw_account_insights');

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const client = await queryOne<{ client_id: string; name: string }>(
    `SELECT client_id, name FROM ${T_CLIENTS} WHERE share_token = @token LIMIT 1`,
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

  const daily = await queryRows(
    `SELECT * FROM ${T_DAILY}
     WHERE client_id = @cid AND date >= @from AND date <= @to
     ORDER BY date ASC`,
    { cid: client.client_id, from, to }
  );

  const kpi = await queryOne<Record<string, number>>(
    `SELECT
      COALESCE(SUM(impressions), 0) as impressions,
      COALESCE(SUM(reach), 0) as reach,
      COALESCE(SUM(interactions), 0) as interactions,
      COALESCE(SUM(likes), 0) as likes,
      COALESCE(SUM(comments), 0) as comments,
      COALESCE(SUM(saves), 0) as saves,
      COALESCE(SUM(shares), 0) as shares,
      COALESCE(SUM(follows), 0) as follows,
      COALESCE(SUM(posts_count), 0) as posts_count
    FROM ${T_DAILY}
    WHERE client_id = @cid AND date >= @from AND date <= @to`,
    { cid: client.client_id, from, to }
  );

  const latestFollowers = await queryOne<{ followers: number }>(
    `SELECT followers FROM ${T_DAILY}
    WHERE client_id = @cid AND date >= @from AND date <= @to
    ORDER BY date DESC LIMIT 1`,
    { cid: client.client_id, from, to }
  );

  const kpiResult = { ...kpi, followers: latestFollowers?.followers || 0 };

  const previousKpi = await queryOne<Record<string, number>>(
    `SELECT
      COALESCE(SUM(impressions), 0) as impressions,
      COALESCE(SUM(reach), 0) as reach,
      COALESCE(SUM(interactions), 0) as interactions,
      COALESCE(SUM(likes), 0) as likes,
      COALESCE(SUM(comments), 0) as comments,
      COALESCE(SUM(saves), 0) as saves,
      COALESCE(SUM(shares), 0) as shares,
      COALESCE(SUM(follows), 0) as follows,
      COALESCE(SUM(posts_count), 0) as posts_count
    FROM ${T_DAILY}
    WHERE client_id = @cid AND date >= @from AND date <= @to`,
    { cid: client.client_id, from: prevFromStr, to: prevToStr }
  );

  const prevLatestFollowers = await queryOne<{ followers: number }>(
    `SELECT followers FROM ${T_DAILY}
    WHERE client_id = @cid AND date >= @from AND date <= @to
    ORDER BY date DESC LIMIT 1`,
    { cid: client.client_id, from: prevFromStr, to: prevToStr }
  );

  const previousKpiResult = { ...previousKpi, followers: prevLatestFollowers?.followers || 0 };

  return NextResponse.json({
    client: { name: client.name },
    daily,
    kpi: kpiResult,
    previous_kpi: previousKpiResult,
  });
}
