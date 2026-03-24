import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, ensureDb } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureDb();
  const result = await db.execute({
    sql: 'SELECT * FROM clients WHERE id = ?',
    args: [params.id],
  });

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  return NextResponse.json(result.rows[0]);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (body.name !== undefined) {
    fields.push('name = ?');
    values.push(body.name);
  }
  if (body.instagram_account_id !== undefined) {
    fields.push('instagram_account_id = ?');
    values.push(body.instagram_account_id);
  }
  if (body.meta_ad_account_id !== undefined) {
    fields.push('meta_ad_account_id = ?');
    values.push(body.meta_ad_account_id);
  }

  if (fields.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  values.push(params.id);

  await ensureDb();
  const result = await db.execute({
    sql: `UPDATE clients SET ${fields.join(', ')} WHERE id = ?`,
    args: values as (string | number | null)[],
  });

  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const updated = await db.execute({
    sql: 'SELECT * FROM clients WHERE id = ?',
    args: [params.id],
  });
  return NextResponse.json(updated.rows[0]);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureDb();
  const result = await db.execute({
    sql: 'DELETE FROM clients WHERE id = ?',
    args: [params.id],
  });

  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
