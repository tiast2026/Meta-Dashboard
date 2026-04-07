import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { queryOne, runDML, table, DATASET_MASTER } from '@/lib/bq';

export const dynamic = 'force-dynamic';

const T = table(DATASET_MASTER, 'admin_users');

/**
 * One-time admin setup / password reset.
 *
 * Protected by ADMIN_SETUP_TOKEN environment variable. Caller must send the
 * matching token in the `x-setup-token` header. After creating the desired
 * admin user, REMOVE the env var from Vercel and redeploy so this endpoint
 * stops accepting requests.
 *
 * Body: { email: string, password: string }
 */
export async function POST(request: NextRequest) {
  const expected = process.env.ADMIN_SETUP_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: 'ADMIN_SETUP_TOKEN env var is not set on this deployment' },
      { status: 503 }
    );
  }

  const provided = request.headers.get('x-setup-token');
  if (provided !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json(
      { error: 'email and password are required' },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: 'password must be at least 8 characters' },
      { status: 400 }
    );
  }

  const hash = bcrypt.hashSync(password, 10);

  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM ${T} WHERE email = @email LIMIT 1`,
    { email }
  );

  if (existing) {
    await runDML(
      `UPDATE ${T} SET password_hash = @hash WHERE email = @email`,
      { hash, email }
    );
    return NextResponse.json({ success: true, action: 'password_updated', email });
  }

  await runDML(
    `INSERT INTO ${T} (id, email, password_hash, created_at)
     VALUES (@id, @email, @hash, CURRENT_TIMESTAMP())`,
    { id: uuidv4(), email, hash }
  );
  return NextResponse.json({ success: true, action: 'created', email });
}
