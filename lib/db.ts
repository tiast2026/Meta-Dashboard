import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'dashboard.db');
const SCHEMA_PATH = path.join(process.cwd(), 'lib', 'schema.sql');

function createDatabase(): Database.Database {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schema);

  return db;
}

const globalForDb = globalThis as unknown as { __db?: Database.Database };

export const db = globalForDb.__db || createDatabase();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__db = db;
}
