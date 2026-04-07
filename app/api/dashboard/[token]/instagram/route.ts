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
      ...(kpi.rows[0] ? Object.fromEntries(Object.entries(kpi.rows[0])) : {}),
      followers: latestFollowers.rows[0]?.followers || 0,
    } as Record<string, unknown>;

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
      ...(previousKpi.rows[0] ? Object.fromEntries(Object.entries(previousKpi.rows[0])) : {}),
      followers: prevLatestFollowers.rows[0]?.followers || 0,
    } as Record<string, unknown>;

    // Always merge post-level aggregates into the KPI. The IG daily insights
    // API (v22+) only returns reach + follower_count, so likes/comments/saves
    // /shares/impressions all live on the post records.
    const postKpi = await db.execute({
      sql: `SELECT
        COUNT(*) as posts_count,
        COALESCE(SUM(likes), 0) as likes,
        COALESCE(SUM(comments), 0) as comments,
        COALESCE(SUM(saves), 0) as saves,
        COALESCE(SUM(shares), 0) as shares,
        COALESCE(SUM(impressions), 0) as impressions
      FROM instagram_posts
      WHERE client_id = ? AND posted_at >= ? AND posted_at <= ?`,
      args: [clientId, from, to + 'T23:59:59'],
    });
    const postKpiRow = (postKpi.rows[0] ? Object.fromEntries(Object.entries(postKpi.rows[0])) : {}) as Record<string, unknown>;
    const prevPostKpi = await db.execute({
      sql: `SELECT
        COUNT(*) as posts_count,
        COALESCE(SUM(likes), 0) as likes,
        COALESCE(SUM(comments), 0) as comments,
        COALESCE(SUM(saves), 0) as saves,
        COALESCE(SUM(shares), 0) as shares,
        COALESCE(SUM(impressions), 0) as impressions
      FROM instagram_posts
      WHERE client_id = ? AND posted_at >= ? AND posted_at <= ?`,
      args: [clientId, prevFromStr, prevToStr + 'T23:59:59'],
    });
    const prevPostKpiRow = (prevPostKpi.rows[0] ? Object.fromEntries(Object.entries(prevPostKpi.rows[0])) : {}) as Record<string, unknown>;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalKpi: any = {
      ...kpiResult,
      likes: Number(postKpiRow.likes) || 0,
      comments: Number(postKpiRow.comments) || 0,
      saves: Number(postKpiRow.saves) || 0,
      shares: Number(postKpiRow.shares) || 0,
      posts_count: Number(postKpiRow.posts_count) || 0,
      // Prefer post impressions when daily impressions are 0 (always 0 in v22)
      impressions: Number(kpiResult.impressions) || Number(postKpiRow.impressions) || 0,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalPrevKpi: any = {
      ...previousKpiResult,
      likes: Number(prevPostKpiRow.likes) || 0,
      comments: Number(prevPostKpiRow.comments) || 0,
      saves: Number(prevPostKpiRow.saves) || 0,
      shares: Number(prevPostKpiRow.shares) || 0,
      posts_count: Number(prevPostKpiRow.posts_count) || 0,
      impressions: Number(previousKpiResult.impressions) || Number(prevPostKpiRow.impressions) || 0,
    };

    return NextResponse.json({
      client: { name: clientName },
      daily: daily.rows,
      kpi: finalKpi,
      previous_kpi: finalPrevKpi,
    });
  } catch (err) {
    console.error('Dashboard instagram error:', err);
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
  }
}
