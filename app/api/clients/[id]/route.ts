import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { queryOne, runDML, table, DATASET_MASTER } from '@/lib/bq';

const T = table(DATASET_MASTER, 'clients');

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = await queryOne(
    `SELECT * FROM ${T} WHERE client_id = @id LIMIT 1`,
    { id: params.id }
  );

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  return NextResponse.json(client);
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
  const sets: string[] = [];
  const bqParams: Record<string, unknown> = { id: params.id };

  if (body.name !== undefined) {
    sets.push('name = @name');
    bqParams.name = body.name;
  }
  if (body.instagram_account_id !== undefined) {
    sets.push('instagram_account_id = @ig_id');
    bqParams.ig_id = body.instagram_account_id;
  }
  if (body.meta_ad_account_id !== undefined) {
    sets.push('meta_ad_account_id = @ad_id');
    bqParams.ad_id = body.meta_ad_account_id;
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  sets.push('updated_at = CURRENT_TIMESTAMP()');

  await runDML(
    `UPDATE ${T} SET ${sets.join(', ')} WHERE client_id = @id`,
    bqParams
  );

  const updated = await queryOne(`SELECT * FROM ${T} WHERE client_id = @id LIMIT 1`, { id: params.id });
  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const existing = await queryOne(`SELECT client_id FROM ${T} WHERE client_id = @id LIMIT 1`, { id: params.id });
  if (!existing) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  await runDML(`DELETE FROM ${T} WHERE client_id = @id`, { id: params.id });

  return NextResponse.json({ success: true });
}
