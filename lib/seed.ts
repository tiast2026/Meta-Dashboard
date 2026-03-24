import { db, ensureDb } from './db';
import bcrypt from 'bcryptjs';

async function main() {
  await ensureDb();

  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const hash = bcrypt.hashSync(password, 10);

  const existing = await db.execute({
    sql: 'SELECT id FROM admin_users WHERE email = ?',
    args: [email],
  });

  if (existing.rows.length === 0) {
    await db.execute({
      sql: 'INSERT INTO admin_users (email, password_hash) VALUES (?, ?)',
      args: [email, hash],
    });
    console.log(`Admin user created: ${email}`);
  } else {
    console.log(`Admin user already exists: ${email}`);
  }
}

main().catch(console.error);
