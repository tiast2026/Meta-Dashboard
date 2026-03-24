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

  const posts = db.prepare(`
    SELECT * FROM instagram_tagged_posts
    WHERE client_id = ?
    ORDER BY posted_at DESC
  `).all(client.id);

  return NextResponse.json(posts);
}
