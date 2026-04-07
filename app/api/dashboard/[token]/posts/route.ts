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
      `SELECT client_id FROM ${T} WHERE share_token = @token LIMIT 1`,
      { token: params.token }
    );

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const args: (string | number)[] = [String(client.client_id)];
    let dateFilter = '';
    if (from && to) {
      if (isNaN(new Date(from).getTime()) || isNaN(new Date(to).getTime())) {
        return NextResponse.json({ error: 'invalid date format' }, { status: 400 });
      }
      dateFilter = ' AND posted_at >= ? AND posted_at <= ?';
      args.push(from, to + 'T23:59:59');
    }

    const posts = await db.execute({
      sql: `SELECT * FROM instagram_posts
            WHERE client_id = ?${dateFilter}
            ORDER BY posted_at DESC LIMIT 500`,
      args,
    });

    return NextResponse.json({ posts: posts.rows });
  } catch (err) {
    console.error('Dashboard posts error:', err);
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
  }
}
