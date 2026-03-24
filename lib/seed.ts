import { db } from './db';
import bcrypt from 'bcryptjs';

const email = process.env.ADMIN_EMAIL || 'admin@example.com';
const password = process.env.ADMIN_PASSWORD || 'admin123';

const hash = bcrypt.hashSync(password, 10);

const existing = db.prepare('SELECT id FROM admin_users WHERE email = ?').get(email);
if (!existing) {
  db.prepare('INSERT INTO admin_users (email, password_hash) VALUES (?, ?)').run(email, hash);
  console.log(`Admin user created: ${email}`);
} else {
  console.log(`Admin user already exists: ${email}`);
}
