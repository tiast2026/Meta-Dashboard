import { NextRequest, NextResponse } from 'next/server';
import { queryOne, table, DATASET_MASTER } from '@/lib/bq';
import { db, ensureDb } from '@/lib/db';
import { fetchIgAccountInsights } from '@/lib/meta-api';
import type { InStatement } from '@libsql/client';

const T = table(DATASET_MASTER, 'clients');

export async function POST(request: NextRequest) {
  try {
    const { client_id, since, until } = await request.json();
    if (!client_id) {
      return NextResponse.json({ error: 'client_id は必須です' }, { status: 400 });
    }

    const client = await queryOne<Record<string, unknown>>(
      `SELECT instagram_account_id, meta_access_token FROM ${T} WHERE client_id = @id LIMIT 1`,
      { id: client_id }
    );
    if (!client) {
      return NextResponse.json({ error: 'クライアントが見つかりません' }, { status: 404 });
    }

    const token = client.meta_access_token as string;
    const igId = client.instagram_account_id as string;
    if (!token) {
      return NextResponse.json({ error: 'アクセストークンが設定されていません' }, { status: 400 });
    }
    if (!igId) {
      return NextResponse.json({ error: 'Instagram アカウントIDが設定されていません' }, { status: 400 });
    }

    const insights = await fetchIgAccountInsights(igId, token, since, until);

    if (insights.length === 0) {
      return NextResponse.json({ success: true, message: '取得可能なデータがありませんでした', rowCount: 0 });
    }

    await ensureDb();

    const statements: InStatement[] = insights.map((row) => ({
      sql: `INSERT OR REPLACE INTO instagram_daily_insights
        (client_id, date, impressions, reach, followers, follows, posts_count)
        VALUES (?, ?, ?, ?, ?, ?, 0)`,
      args: [client_id, row.date, row.impressions, row.reach, row.followers, row.follows],
    }));

    for (let i = 0; i < statements.length; i += 100) {
      await db.batch(statements.slice(i, i + 100), 'write');
    }

    return NextResponse.json({
      success: true,
      message: `Instagram日次データ ${statements.length}件を取得・保存しました`,
      rowCount: statements.length,
    });
  } catch (err) {
    console.error('Instagram fetch error:', err);
    return NextResponse.json(
      { error: `取得エラー: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
