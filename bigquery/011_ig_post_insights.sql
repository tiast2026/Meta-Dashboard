-- ============================================================
-- instagram_analytics.raw_post_insights
-- 投稿別インサイトデータ
-- GAS取得元: 「投稿のインサイト」シート
-- ============================================================

CREATE TABLE IF NOT EXISTS `ecel-client.instagram_analytics.raw_post_insights` (
  client_id               STRING     NOT NULL   OPTIONS (description = 'クライアント識別子'),
  ig_post_id              STRING     NOT NULL   OPTIONS (description = 'Instagram投稿ID'),
  -- 投稿情報
  caption                 STRING               OPTIONS (description = '投稿内容 (キャプション)'),
  product_type            STRING               OPTIONS (description = 'メディアのプロダクトタイプ (フィード/リール/ストーリーズ)'),
  media_type              STRING               OPTIONS (description = 'メディアの種別 (カルーセル/動画/画像)'),
  media_url               STRING               OPTIONS (description = 'メディアURL (サムネイル表示用)'),
  permalink               STRING               OPTIONS (description = '投稿URL (Instagram上のリンク)'),
  posted_at               TIMESTAMP            OPTIONS (description = '投稿日時'),
  -- 基本指標
  impressions             INT64      DEFAULT 0  OPTIONS (description = '閲覧数'),
  reach                   INT64      DEFAULT 0  OPTIONS (description = 'リーチ'),
  interactions            INT64      DEFAULT 0  OPTIONS (description = 'インタラクション数'),
  likes                   INT64      DEFAULT 0  OPTIONS (description = 'いいね数'),
  comments                INT64      DEFAULT 0  OPTIONS (description = 'コメント数'),
  saves                   INT64      DEFAULT 0  OPTIONS (description = '保存数'),
  shares                  INT64      DEFAULT 0  OPTIONS (description = 'シェア数'),
  engagement              INT64      DEFAULT 0  OPTIONS (description = 'エンゲージメント合計'),
  -- 動画・リール指標
  video_views             INT64      DEFAULT 0  OPTIONS (description = '動画再生数'),
  plays                   INT64      DEFAULT 0  OPTIONS (description = 'リール再生数 (初回)'),
  all_plays_count         INT64      DEFAULT 0  OPTIONS (description = 'リール全再生数 (初回+リプレイ)'),
  replays_count           INT64      DEFAULT 0  OPTIONS (description = 'リールリプレイ数'),
  avg_watch_time_sec      FLOAT64    DEFAULT 0  OPTIONS (description = 'リール平均視聴時間 (秒)'),
  total_watch_time_sec    FLOAT64    DEFAULT 0  OPTIONS (description = 'リール総視聴時間 (秒)'),
  -- 流入指標
  follows                 INT64      DEFAULT 0  OPTIONS (description = 'この投稿からのフォロー数'),
  profile_visits          INT64      DEFAULT 0  OPTIONS (description = 'この投稿からのプロフ訪問数'),
  profile_activity        INT64      DEFAULT 0  OPTIONS (description = 'プロフィールアクション数'),
  -- メタ
  loaded_at               TIMESTAMP  DEFAULT CURRENT_TIMESTAMP() OPTIONS (description = 'データ取込日時')
)
PARTITION BY DATE(posted_at)
CLUSTER BY client_id, product_type
OPTIONS (
  description = 'Instagram投稿別（フィード/リール/カルーセル）のインサイトデータ',
  labels = [('table_type', 'raw'), ('source', 'instagram-graph-api'), ('update_frequency', 'daily')]
);
