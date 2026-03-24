-- ============================================================
-- instagram_analytics.raw_tagged_posts
-- タグ付け投稿一覧
-- GAS取得元: 「タグ付け投稿一覧」シート
-- ============================================================

CREATE TABLE IF NOT EXISTS `ecel-client.instagram_analytics.raw_tagged_posts` (
  client_id               STRING     NOT NULL   OPTIONS (description = 'クライアント識別子'),
  ig_post_id              STRING     NOT NULL   OPTIONS (description = 'タグ付け投稿ID'),
  posted_at               TIMESTAMP            OPTIONS (description = '投稿日時'),
  account_name            STRING               OPTIONS (description = '投稿者のアカウント名'),
  caption                 STRING               OPTIONS (description = '投稿内容'),
  media_url               STRING               OPTIONS (description = 'メディアURL'),
  permalink               STRING               OPTIONS (description = '投稿URL'),
  likes                   INT64      DEFAULT 0  OPTIONS (description = 'いいね数'),
  comments                INT64      DEFAULT 0  OPTIONS (description = 'コメント数'),
  loaded_at               TIMESTAMP  DEFAULT CURRENT_TIMESTAMP() OPTIONS (description = 'データ取込日時')
)
PARTITION BY DATE(posted_at)
CLUSTER BY client_id
OPTIONS (
  description = '自社アカウントがタグ付けされた投稿の一覧。UGC分析に利用。',
  labels = [('table_type', 'raw'), ('source', 'instagram-graph-api'), ('update_frequency', 'daily')]
);
