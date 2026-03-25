import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDb } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    await ensureDb();

    const client = await db.execute({
      sql: 'SELECT id FROM clients WHERE share_token = ? LIMIT 1',
      args: [params.token],
    });

    if (!client.rows.length) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const clientId = client.rows[0].id;

    // タグ付け投稿は全件取得
    const posts = await db.execute({
      sql: `SELECT * FROM instagram_tagged_posts
            WHERE client_id = ?
            ORDER BY posted_at DESC`,
      args: [clientId],
    });

    return NextResponse.json(posts.rows);
  } catch (err) {
    console.error('Dashboard tagged posts error:', err);
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
  }
}
