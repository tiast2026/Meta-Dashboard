import { NextRequest, NextResponse } from 'next/server';
import { queryOne, runDML, table, DATASET_MASTER } from '@/lib/bq';

const T = table(DATASET_MASTER, 'clients');

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = await queryOne<Record<string, unknown>>(
    `SELECT * FROM ${T} WHERE client_id = @id LIMIT 1`,
    { id: params.id }
  );

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const { meta_access_token, ...safe } = client;

  return NextResponse.json({
    ...safe,
    has_token: !!meta_access_token,
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const sets: string[] = [];
  const bqParams: Record<string, unknown> = { id: params.id };

  if (body.name !== undefined) { sets.push('name = @name'); bqParams.name = body.name; }
  if (body.slug !== undefined) { sets.push('slug = @slug'); bqParams.slug = body.slug || null; }
  if (body.instagram_account_id !== undefined) { sets.push('instagram_account_id = @ig_id'); bqParams.ig_id = body.instagram_account_id; }
  if (body.meta_ad_account_id !== undefined) { sets.push('meta_ad_account_id = @ad_id'); bqParams.ad_id = body.meta_ad_account_id; }
  if (body.meta_access_token !== undefined) { sets.push('meta_access_token = @meta_token'); bqParams.meta_token = body.meta_access_token || null; }

  if (sets.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  sets.push('updated_at = CURRENT_TIMESTAMP()');

  try {
    await runDML(`UPDATE ${T} SET ${sets.join(', ')} WHERE client_id = @id`, bqParams);
  } catch (err) {
    console.error('BigQuery UPDATE error:', err);
    return NextResponse.json({ error: 'データベース更新に失敗しました' }, { status: 500 });
  }

  // BigQuery DML は反映に遅延があるため、リクエストのデータをそのまま返す
  const response: Record<string, unknown> = { client_id: params.id };
  if (body.name !== undefined) response.name = body.name;
  if (body.slug !== undefined) response.slug = body.slug || null;
  if (body.instagram_account_id !== undefined) response.instagram_account_id = body.instagram_account_id;
  if (body.meta_ad_account_id !== undefined) response.meta_ad_account_id = body.meta_ad_account_id;
  response.has_token = body.meta_access_token ? true : undefined;

  return NextResponse.json(response);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const existing = await queryOne(`SELECT client_id FROM ${T} WHERE client_id = @id LIMIT 1`, { id: params.id });
  if (!existing) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  await runDML(`DELETE FROM ${T} WHERE client_id = @id`, { id: params.id });
  return NextResponse.json({ success: true });
}
