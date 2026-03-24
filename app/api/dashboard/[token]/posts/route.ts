import { NextRequest, NextResponse } from 'next/server';
import { queryOne, queryRows, table, DATASET_MASTER, DATASET_IG } from '@/lib/bq';

const T_CLIENTS = table(DATASET_MASTER, 'clients');
const T_POSTS = table(DATASET_IG, 'raw_post_insights');

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const client = await queryOne<{ client_id: string }>(
    `SELECT client_id FROM ${T_CLIENTS} WHERE share_token = @token LIMIT 1`,
    { token: params.token }
  );

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  let query = `SELECT * FROM ${T_POSTS} WHERE client_id = @cid`;
  const bqParams: Record<string, unknown> = { cid: client.client_id };

  if (from) {
    query += ' AND posted_at >= @from';
    bqParams.from = from;
  }
  if (to) {
    query += ' AND posted_at <= @to';
    bqParams.to = to;
  }

  query += ' ORDER BY posted_at DESC LIMIT 100';

  const posts = await queryRows(query, bqParams);

  return NextResponse.json(posts);
}
