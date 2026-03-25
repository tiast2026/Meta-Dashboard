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
  const bqParams: Record<string, unknown> = { id: String(params.id) };

  if (body.name !== undefined) { sets.push('name = @name'); bqParams.name = String(body.name || ''); }
  if (body.slug !== undefined) { sets.push('slug = @slug'); bqParams.slug = String(body.slug || ''); }
  if (body.instagram_account_id !== undefined) { sets.push('instagram_account_id = @ig_id'); bqParams.ig_id = String(body.instagram_account_id || ''); }
  if (body.meta_ad_account_id !== undefined) { sets.push('meta_ad_account_id = @ad_id'); bqParams.ad_id = String(body.meta_ad_account_id || ''); }
  if (body.meta_access_token !== undefined) { sets.push('meta_access_token = @meta_token'); bqParams.meta_token = String(body.meta_access_token || ''); }

  if (sets.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  sets.push('updated_at = CURRENT_TIMESTAMP()');

  try {
    await runDML(`UPDATE ${T} SET ${sets.join(', ')} WHERE client_id = @id`, bqParams);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('BigQuery UPDATE error:', message);
    return NextResponse.json({ error: `\u30c7\u30fc\u30bf\u30d9\u30fc\u30b9\u66f4\u65b0\u306b\u5931\u6557\u3057\u307e\u3057\u305f: ${message}` }, { status: 500 });
  }

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
