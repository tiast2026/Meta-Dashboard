import { createClient, type Client } from '@libsql/client';
import fs from 'fs';
import path from 'path';

function getClient(): Client {
  if (process.env.TURSO_DATABASE_URL) {
    return createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }

  // Local development: file-based SQLite
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  return createClient({
    url: `file:${path.join(dataDir, 'dashboard.db')}`,
  });
}

const globalForDb = globalThis as unknown as { __db?: Client };
export const db = globalForDb.__db || getClient();
if (process.env.NODE_ENV !== 'production') {
  globalForDb.__db = db;
}

let initialized = false;

export async function ensureDb() {
  if (initialized) return;
  const schemaPath = path.join(process.cwd(), 'lib', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  const statements = schema
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const sql of statements) {
    await db.execute(sql);
  }
  initialized = true;
}
