CREATE TABLE IF NOT EXISTS `ecel-client.master.clients` (
  client_id STRING NOT NULL OPTIONS (description = 'クライアント識別子 (UUID)'),
  name STRING NOT NULL OPTIONS (description = 'クライアント名'),
  instagram_account_id STRING OPTIONS (description = 'Instagram ビジネスアカウントID'),
  meta_ad_account_id STRING OPTIONS (description = 'Meta 広告アカウントID (act_xxx)'),
  share_token STRING OPTIONS (description = 'ダッシュボード共有トークン'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
OPTIONS (description = 'クライアントマスタテーブル', labels = [('table_type', 'master')]);
