-- ============================================================
-- instagram_analytics.raw_follower_active_time
-- フォロワーのアクティブ時間帯
-- GAS取得元: 「フォロワーのアクティブ時間」シート
-- ============================================================

CREATE TABLE IF NOT EXISTS `ecel-client.instagram_analytics.raw_follower_active_time` (
  client_id               STRING     NOT NULL   OPTIONS (description = 'クライアント識別子'),
  date                    DATE       NOT NULL   OPTIONS (description = '取得日'),
  day_of_week             INT64      NOT NULL   OPTIONS (description = '曜日 (0=月曜 〜 6=日曜)'),
  hour                    INT64      NOT NULL   OPTIONS (description = '時間帯 (0〜23)'),
  value                   INT64      DEFAULT 0  OPTIONS (description = 'アクティブユーザー数'),
  loaded_at               TIMESTAMP  DEFAULT CURRENT_TIMESTAMP() OPTIONS (description = 'データ取込日時')
)
PARTITION BY date
CLUSTER BY client_id
OPTIONS (
  description = 'フォロワーのアクティブ時間帯データ。最適投稿時間の分析に利用。',
  labels = [('table_type', 'raw'), ('source', 'instagram-graph-api'), ('update_frequency', 'weekly')]
);
