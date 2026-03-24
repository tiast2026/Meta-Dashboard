import { NextRequest, NextResponse } from 'next/server';
import { queryOne, queryRows, table, DATASET_MASTER, DATASET_IG } from '@/lib/bq';

const T_CLIENTS = table(DATASET_MASTER, 'clients');
const T_TAGGED = table(DATASET_IG, 'raw_tagged_posts');

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

  const posts = await queryRows(
    `SELECT * FROM ${T_TAGGED}
    WHERE client_id = @cid
    ORDER BY posted_at DESC`,
    { cid: client.client_id }
  );

  return NextResponse.json(posts);
}
