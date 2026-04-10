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

  // Drop old tables with INTEGER client_id / foreign key constraints
  // so they get recreated with TEXT client_id
  const migrationTables = [
    'instagram_daily_insights',
    'instagram_posts',
    'instagram_tagged_posts',
    'meta_ad_insights',
  ];
  for (const t of migrationTables) {
    try {
      const info = await db.execute(`PRAGMA table_info(${t})`);
      const clientIdCol = info.rows.find((r) => r.name === 'client_id');
      if (clientIdCol && clientIdCol.type === 'INTEGER') {
        await db.execute(`DROP TABLE IF EXISTS ${t}`);
      }
    } catch {
      // table doesn't exist yet — that's fine
    }
  }

  // Add video_views column if missing
  try {
    await db.execute('ALTER TABLE instagram_posts ADD COLUMN video_views INTEGER DEFAULT 0');
  } catch {
    // column already exists
  }

  // Add website_actions column if missing
  try {
    await db.execute('ALTER TABLE meta_ad_insights ADD COLUMN website_actions INTEGER DEFAULT 0');
  } catch {
    // column already exists
  }

  // One-time cleanup: rows inserted before publisher_platform breakdown was
  // added live alongside the new per-platform rows, causing 2-4x double
  // counting in dashboard SUMs. Delete them — the next refresh repopulates.
  try {
    await db.execute(
      "DELETE FROM meta_ad_insights WHERE publisher_platform IS NULL OR publisher_platform = ''"
    );
  } catch {
    // table may not exist yet
  }

  // Create meta_ad_creatives table if missing
  try {
    await db.execute(`CREATE TABLE IF NOT EXISTS meta_ad_creatives (
      ad_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      ad_name TEXT,
      thumbnail_url TEXT,
      image_url TEXT,
      title TEXT,
      body TEXT,
      call_to_action_type TEXT,
      link_url TEXT,
      instagram_permalink_url TEXT,
      effective_object_story_id TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (client_id, ad_id)
    )`);
  } catch {
    // ignore
  }

  // Demographics & breakdowns table.
  // breakdown_type: 'age_gender' | 'region' | 'country' | 'hourly' | 'device'
  // breakdown_key:  unique key inside the breakdown
  //   age_gender → "18-24|female"
  //   region     → "Tokyo"
  //   country    → "JP"
  //   hourly     → "14:00:00 - 14:59:59"
  //   device     → "mobile_web"
  try {
    await db.execute(`CREATE TABLE IF NOT EXISTS meta_ad_breakdowns (
      client_id TEXT NOT NULL,
      date TEXT NOT NULL,
      breakdown_type TEXT NOT NULL,
      breakdown_key TEXT NOT NULL,
      impressions INTEGER DEFAULT 0,
      reach INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      spend REAL DEFAULT 0,
      purchase INTEGER DEFAULT 0,
      purchase_value REAL DEFAULT 0,
      add_to_cart INTEGER DEFAULT 0,
      initiate_checkout INTEGER DEFAULT 0,
      PRIMARY KEY (client_id, date, breakdown_type, breakdown_key)
    )`);
  } catch {
    // ignore
  }
  try {
    await db.execute('CREATE INDEX IF NOT EXISTS idx_meta_breakdowns_lookup ON meta_ad_breakdowns(client_id, breakdown_type, date)');
  } catch {
    // ignore
  }

  // Add detailed action columns (ATC, IC, purchase, ROAS など)
  const adActionColumns = [
    'add_to_cart INTEGER DEFAULT 0',
    'initiate_checkout INTEGER DEFAULT 0',
    'purchase INTEGER DEFAULT 0',
    'purchase_value REAL DEFAULT 0',
    'view_content INTEGER DEFAULT 0',
    'lead INTEGER DEFAULT 0',
    'complete_registration INTEGER DEFAULT 0',
    'contact INTEGER DEFAULT 0',
    'subscribe INTEGER DEFAULT 0',
    'search INTEGER DEFAULT 0',
    'add_payment_info INTEGER DEFAULT 0',
    'add_to_wishlist INTEGER DEFAULT 0',
    'page_engagement INTEGER DEFAULT 0',
    'post_engagement INTEGER DEFAULT 0',
    'video_view INTEGER DEFAULT 0',
    'link_click INTEGER DEFAULT 0',
    // Extra metrics
    'frequency REAL DEFAULT 0',
    'video_p25 INTEGER DEFAULT 0',
    'video_p50 INTEGER DEFAULT 0',
    'video_p75 INTEGER DEFAULT 0',
    'video_p100 INTEGER DEFAULT 0',
    'landing_page_view INTEGER DEFAULT 0',
  ];
  for (const col of adActionColumns) {
    try {
      await db.execute(`ALTER TABLE meta_ad_insights ADD COLUMN ${col}`);
    } catch {
      // column already exists
    }
  }

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
