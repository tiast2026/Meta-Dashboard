-- ============================================================
-- instagram_analytics.raw_story_insights
-- ストーリーズ別インサイトデータ
-- ============================================================

CREATE TABLE IF NOT EXISTS `ecel-client.instagram_analytics.raw_story_insights` (
  client_id               STRING     NOT NULL   OPTIONS (description = 'クライアント識別子'),
  ig_media_id             STRING     NOT NULL   OPTIONS (description = 'ストーリーズメディアID'),
  -- ストーリーズ情報
  media_url               STRING               OPTIONS (description = 'メディアURL'),
  permalink               STRING               OPTIONS (description = '投稿URL'),
  posted_at               TIMESTAMP            OPTIONS (description = '投稿日時'),
  -- 閲覧指標
  impressions             INT64      DEFAULT 0  OPTIONS (description = '表示回数'),
  reach                   INT64      DEFAULT 0  OPTIONS (description = 'リーチ'),
  -- ナビゲーション指標
  taps_forward            INT64      DEFAULT 0  OPTIONS (description = 'タップ (進む)'),
  taps_back               INT64      DEFAULT 0  OPTIONS (description = 'タップ (戻る)'),
  exits                   INT64      DEFAULT 0  OPTIONS (description = '離脱数'),
  navigation              INT64      DEFAULT 0  OPTIONS (description = 'ナビゲーション合計'),
  -- エンゲージメント
  replies                 INT64      DEFAULT 0  OPTIONS (description = '返信数'),
  shares                  INT64      DEFAULT 0  OPTIONS (description = 'シェア数'),
  -- 流入指標
  profile_visits          INT64      DEFAULT 0  OPTIONS (description = 'プロフィール訪問数'),
  follows                 INT64      DEFAULT 0  OPTIONS (description = 'フォロー数'),
  link_clicks             INT64      DEFAULT 0  OPTIONS (description = 'リンクスタンプクリック数'),
  sticker_taps            INT64      DEFAULT 0  OPTIONS (description = 'スタンプタップ数'),
  -- メタ
  loaded_at               TIMESTAMP  DEFAULT CURRENT_TIMESTAMP() OPTIONS (description = 'データ取込日時')
)
PARTITION BY DATE(posted_at)
CLUSTER BY client_id
OPTIONS (
  description = 'Instagramストーリーズ別のインサイトデータ。24時間で消えるため早期取得が重要。',
  labels = [('table_type', 'raw'), ('source', 'instagram-graph-api'), ('update_frequency', 'daily')]
);
