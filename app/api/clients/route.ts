import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, ensureDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureDb();
  const result = await db.execute('SELECT * FROM clients');
  return NextResponse.json(result.rows);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, instagram_account_id, meta_ad_account_id } = body;

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const share_token = uuidv4();

  await ensureDb();
  const result = await db.execute({
    sql: `INSERT INTO clients (name, instagram_account_id, meta_ad_account_id, share_token)
     VALUES (?, ?, ?, ?)`,
    args: [name, instagram_account_id || null, meta_ad_account_id || null, share_token],
  });

  return NextResponse.json({
    id: Number(result.lastInsertRowid),
    name,
    instagram_account_id: instagram_account_id || null,
    meta_ad_account_id: meta_ad_account_id || null,
    share_token,
  }, { status: 201 });
}
