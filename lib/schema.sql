-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  instagram_account_id TEXT,
  meta_ad_account_id TEXT,
  share_token TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS instagram_daily_insights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  actions INTEGER DEFAULT 0,
  interactions INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  followers INTEGER DEFAULT 0,
  follows INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  UNIQUE(client_id, date)
);

CREATE TABLE IF NOT EXISTS instagram_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  ig_post_id TEXT,
  caption TEXT,
  product_type TEXT,
  media_type TEXT,
  media_url TEXT,
  permalink TEXT,
  posted_at TEXT,
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  interactions INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  UNIQUE(client_id, ig_post_id)
);

CREATE TABLE IF NOT EXISTS instagram_tagged_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  ig_post_id TEXT,
  posted_at TEXT,
  account_name TEXT,
  caption TEXT,
  media_url TEXT,
  permalink TEXT,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  UNIQUE(client_id, ig_post_id)
);

CREATE TABLE IF NOT EXISTS meta_ad_insights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  publisher_platform TEXT,
  campaign_id TEXT,
  campaign_name TEXT,
  campaign_objective TEXT,
  adset_id TEXT,
  adset_name TEXT,
  ad_id TEXT,
  ad_name TEXT,
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  results INTEGER DEFAULT 0,
  website_actions INTEGER DEFAULT 0,
  spend REAL DEFAULT 0,
  UNIQUE(client_id, date, ad_id, publisher_platform)
);

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ig_daily_client_date ON instagram_daily_insights(client_id, date);
CREATE INDEX IF NOT EXISTS idx_ig_posts_client ON instagram_posts(client_id, posted_at);
CREATE INDEX IF NOT EXISTS idx_meta_ads_client_date ON meta_ad_insights(client_id, date);
CREATE INDEX IF NOT EXISTS idx_clients_token ON clients(share_token);
