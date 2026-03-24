-- ============================================================
-- instagram_analytics.raw_follower_demographics
-- フォロワー属性データ（年齢・性別）
-- GAS取得元: 「フォロワー属性」シート
-- ============================================================

CREATE TABLE IF NOT EXISTS `ecel-client.instagram_analytics.raw_follower_demographics` (
  client_id               STRING     NOT NULL   OPTIONS (description = 'クライアント識別子'),
  date                    DATE       NOT NULL   OPTIONS (description = '取得日'),
  dimension               STRING     NOT NULL   OPTIONS (description = '属性種別 (age / gender / age_gender)'),
  dimension_value         STRING     NOT NULL   OPTIONS (description = '属性値 (18-24, male, M.25-34 等)'),
  value                   FLOAT64    DEFAULT 0  OPTIONS (description = '割合 or 人数'),
  loaded_at               TIMESTAMP  DEFAULT CURRENT_TIMESTAMP() OPTIONS (description = 'データ取込日時')
)
PARTITION BY date
CLUSTER BY client_id, dimension
OPTIONS (
  description = 'フォロワーの年齢・性別分布。ターゲティング最適化に利用。',
  labels = [('table_type', 'raw'), ('source', 'instagram-graph-api'), ('update_frequency', 'weekly')]
);
