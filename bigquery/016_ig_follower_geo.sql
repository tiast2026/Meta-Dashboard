-- ============================================================
-- instagram_analytics.raw_follower_geo
-- フォロワーの地域データ（国・都市）
-- GAS取得元: 「フォロワーの国」「フォロワーの地域」シート
-- ============================================================

CREATE TABLE IF NOT EXISTS `ecel-client.instagram_analytics.raw_follower_geo` (
  client_id               STRING     NOT NULL   OPTIONS (description = 'クライアント識別子'),
  date                    DATE       NOT NULL   OPTIONS (description = '取得日'),
  geo_type                STRING     NOT NULL   OPTIONS (description = '地域種別 (country / city)'),
  geo_name                STRING     NOT NULL   OPTIONS (description = '地域名 (Japan, Tokyo, Osaka 等)'),
  value                   FLOAT64    DEFAULT 0  OPTIONS (description = '割合 or 人数'),
  loaded_at               TIMESTAMP  DEFAULT CURRENT_TIMESTAMP() OPTIONS (description = 'データ取込日時')
)
PARTITION BY date
CLUSTER BY client_id, geo_type
OPTIONS (
  description = 'フォロワーの国別・都市別分布データ。',
  labels = [('table_type', 'raw'), ('source', 'instagram-graph-api'), ('update_frequency', 'weekly')]
);
