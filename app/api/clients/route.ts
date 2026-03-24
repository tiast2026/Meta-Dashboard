import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { queryRows, runDML, table, DATASET_MASTER } from '@/lib/bq';
import { v4 as uuidv4 } from 'uuid';

const T = table(DATASET_MASTER, 'clients');

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clients = await queryRows(`SELECT * FROM ${T} ORDER BY created_at DESC`);
  return NextResponse.json(clients);
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

  const client_id = uuidv4();
  const share_token = uuidv4();

  await runDML(
    `INSERT INTO ${T} (client_id, name, instagram_account_id, meta_ad_account_id, share_token, created_at, updated_at)
     VALUES (@client_id, @name, @ig_id, @ad_id, @share_token, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())`,
    {
      client_id,
      name,
      ig_id: instagram_account_id || null,
      ad_id: meta_ad_account_id || null,
      share_token,
    }
  );

  return NextResponse.json({
    client_id,
    name,
    instagram_account_id: instagram_account_id || null,
    meta_ad_account_id: meta_ad_account_id || null,
    share_token,
  }, { status: 201 });
}
