import { queryOne, runDML, table, DATASET_MASTER } from './bq';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const hash = bcrypt.hashSync(password, 10);

  const existing = await queryOne(
    `SELECT id FROM ${table(DATASET_MASTER, 'admin_users')} WHERE email = @email LIMIT 1`,
    { email }
  );

  if (!existing) {
    await runDML(
      `INSERT INTO ${table(DATASET_MASTER, 'admin_users')} (id, email, password_hash, created_at)
       VALUES (@id, @email, @hash, CURRENT_TIMESTAMP())`,
      { id: uuidv4(), email, hash }
    );
    console.log(`Admin user created: ${email}`);
  } else {
    console.log(`Admin user already exists: ${email}`);
  }
}

main().catch(console.error);
