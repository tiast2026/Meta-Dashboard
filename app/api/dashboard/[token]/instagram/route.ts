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

  // Calculate previous period (same length, immediately before `from`)
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const periodLength = toDate.getTime() - fromDate.getTime();
  const prevTo = new Date(fromDate.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - periodLength);
  const prevFromStr = prevFrom.toISOString().split('T')[0];
  const prevToStr = prevTo.toISOString().split('T')[0];

  const daily = db.prepare(
    `SELECT * FROM instagram_daily_insights
     WHERE client_id = ? AND date >= ? AND date <= ?
     ORDER BY date ASC`
  ).all(client.id, from, to);

  // KPI for current period
  const kpi = db.prepare(`
    SELECT
      COALESCE(SUM(impressions), 0) as impressions,
      COALESCE(SUM(reach), 0) as reach,
      COALESCE(SUM(interactions), 0) as interactions,
      COALESCE(SUM(likes), 0) as likes,
      COALESCE(SUM(comments), 0) as comments,
      COALESCE(SUM(saves), 0) as saves,
      COALESCE(SUM(shares), 0) as shares,
      COALESCE(SUM(follows), 0) as follows,
      COALESCE(SUM(posts_count), 0) as posts_count
    FROM instagram_daily_insights
    WHERE client_id = ? AND date >= ? AND date <= ?
  `).get(client.id, from, to) as Record<string, unknown>;

  // Get latest followers value in the period
  const latestFollowers = db.prepare(`
    SELECT followers FROM instagram_daily_insights
    WHERE client_id = ? AND date >= ? AND date <= ?
    ORDER BY date DESC LIMIT 1
  `).get(client.id, from, to) as Record<string, unknown> | undefined;

  const kpiResult = {
    ...kpi,
    followers: latestFollowers?.followers || 0,
  };

  // KPI for previous period
  const previousKpi = db.prepare(`
    SELECT
      COALESCE(SUM(impressions), 0) as impressions,
      COALESCE(SUM(reach), 0) as reach,
      COALESCE(SUM(interactions), 0) as interactions,
      COALESCE(SUM(likes), 0) as likes,
      COALESCE(SUM(comments), 0) as comments,
      COALESCE(SUM(saves), 0) as saves,
      COALESCE(SUM(shares), 0) as shares,
      COALESCE(SUM(follows), 0) as follows,
      COALESCE(SUM(posts_count), 0) as posts_count
    FROM instagram_daily_insights
    WHERE client_id = ? AND date >= ? AND date <= ?
  `).get(client.id, prevFromStr, prevToStr) as Record<string, unknown>;

  const prevLatestFollowers = db.prepare(`
    SELECT followers FROM instagram_daily_insights
    WHERE client_id = ? AND date >= ? AND date <= ?
    ORDER BY date DESC LIMIT 1
  `).get(client.id, prevFromStr, prevToStr) as Record<string, unknown> | undefined;

  const previousKpiResult = {
    ...previousKpi,
    followers: prevLatestFollowers?.followers || 0,
  };

  return NextResponse.json({
    client: { name: client.name },
    daily,
    kpi: kpiResult,
    previous_kpi: previousKpiResult,
  });
}
