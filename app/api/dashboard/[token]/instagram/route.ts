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
    const clientName = String(client.name);

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!from || !to) {
      return NextResponse.json({ error: 'from and to query params are required' }, { status: 400 });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json({ error: 'invalid date format' }, { status: 400 });
    }
    const periodLength = toDate.getTime() - fromDate.getTime();
    const prevTo = new Date(fromDate.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - periodLength);
    const prevFromStr = prevFrom.toISOString().split('T')[0];
    const prevToStr = prevTo.toISOString().split('T')[0];

    const daily = await db.execute({
      sql: `SELECT * FROM instagram_daily_insights
            WHERE client_id = ? AND date >= ? AND date <= ?
            ORDER BY date ASC`,
      args: [clientId, from, to],
    });

    const kpi = await db.execute({
      sql: `SELECT
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
      WHERE client_id = ? AND date >= ? AND date <= ?`,
      args: [clientId, from, to],
    });

    const latestFollowers = await db.execute({
      sql: `SELECT followers FROM instagram_daily_insights
            WHERE client_id = ? AND date >= ? AND date <= ?
            ORDER BY date DESC LIMIT 1`,
      args: [clientId, from, to],
    });

    const kpiResult = {
      ...(kpi.rows[0] || {}),
      followers: latestFollowers.rows[0]?.followers || 0,
    };

    const previousKpi = await db.execute({
      sql: `SELECT
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
      WHERE client_id = ? AND date >= ? AND date <= ?`,
      args: [clientId, prevFromStr, prevToStr],
    });

    const prevLatestFollowers = await db.execute({
      sql: `SELECT followers FROM instagram_daily_insights
            WHERE client_id = ? AND date >= ? AND date <= ?
            ORDER BY date DESC LIMIT 1`,
      args: [clientId, prevFromStr, prevToStr],
    });

    const previousKpiResult = {
      ...(previousKpi.rows[0] || {}),
      followers: prevLatestFollowers.rows[0]?.followers || 0,
    };

    // Fallback: if daily insights are empty, compute KPI from posts
    const hasDaily = daily.rows.length > 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let finalKpi: any = kpiResult;
    if (!hasDaily) {
      const postKpi = await db.execute({
        sql: `SELECT
          COUNT(*) as posts_count,
          COALESCE(SUM(likes), 0) as likes,
          COALESCE(SUM(comments), 0) as comments,
          COALESCE(SUM(saves), 0) as saves,
          COALESCE(SUM(shares), 0) as shares,
          COALESCE(SUM(impressions), 0) as impressions,
          COALESCE(SUM(reach), 0) as reach
        FROM instagram_posts
        WHERE client_id = ? AND posted_at >= ? AND posted_at <= ?`,
        args: [clientId, from, to + 'T23:59:59'],
      });
      const row = postKpi.rows[0];
      if (row) {
        finalKpi = { ...Object.fromEntries(Object.entries(row)), followers: kpiResult.followers || 0, follows: 0, interactions: 0 };
      }
    }

    return NextResponse.json({
      client: { name: clientName },
      daily: daily.rows,
      kpi: finalKpi,
      previous_kpi: previousKpiResult,
    });
  } catch (err) {
    console.error('Dashboard instagram error:', err);
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
  }
}
