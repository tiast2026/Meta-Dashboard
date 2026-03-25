import { NextRequest, NextResponse } from 'next/server';
import { queryOne, table, DATASET_MASTER } from '@/lib/bq';
import { db, ensureDb } from '@/lib/db';
import { fetchIgPosts } from '@/lib/meta-api';
import type { InStatement } from '@libsql/client';

const T = table(DATASET_MASTER, 'clients');

export async function POST(request: NextRequest) {
  try {
    const { client_id } = await request.json();
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

    const posts = await fetchIgPosts(igId, token);

    if (posts.length === 0) {
      return NextResponse.json({ success: true, message: '取得可能な投稿がありませんでした', rowCount: 0 });
    }

    await ensureDb();

    const statements: InStatement[] = posts.map((post) => ({
      sql: `INSERT OR REPLACE INTO instagram_posts
        (client_id, ig_post_id, caption, media_type, media_url, permalink, posted_at,
         impressions, reach, likes, comments, saves, shares)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        client_id, post.ig_post_id, post.caption, post.media_type,
        post.media_url, post.permalink, post.posted_at,
        post.impressions, post.reach, post.likes, post.comments, post.saves, post.shares,
      ],
    }));

    for (let i = 0; i < statements.length; i += 100) {
      await db.batch(statements.slice(i, i + 100), 'write');
    }

    return NextResponse.json({
      success: true,
      message: `Instagram投稿 ${statements.length}件を取得・保存しました`,
      rowCount: statements.length,
    });
  } catch (err) {
    console.error('Instagram posts fetch error:', err);
    return NextResponse.json(
      { error: `取得エラー: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
