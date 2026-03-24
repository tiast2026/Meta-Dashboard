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

  let query = `
    SELECT * FROM instagram_posts
    WHERE client_id = ?
  `;
  const queryParams: unknown[] = [client.id];

  if (from) {
    query += ' AND posted_at >= ?';
    queryParams.push(from);
  }
  if (to) {
    query += ' AND posted_at <= ?';
    queryParams.push(to);
  }

  query += ' ORDER BY posted_at DESC LIMIT 100';

  const posts = db.prepare(query).all(...queryParams);

  return NextResponse.json(posts);
}
