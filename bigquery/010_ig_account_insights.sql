-- ============================================================
-- instagram_analytics.raw_account_insights
-- アカウントの日次インサイトデータ
-- GAS取得元: 「アカウントのインサイト」シート
-- ============================================================

CREATE TABLE IF NOT EXISTS `ecel-client.instagram_analytics.raw_account_insights` (
  client_id               STRING     NOT NULL   OPTIONS (description = 'クライアント識別子'),
  date                    DATE       NOT NULL   OPTIONS (description = '集計日'),
  -- リーチ・閲覧
  impressions             INT64      DEFAULT 0  OPTIONS (description = '閲覧数 (インプレッション)'),
  reach                   INT64      DEFAULT 0  OPTIONS (description = 'リーチ (ユニーク閲覧ユーザー数)'),
  -- エンゲージメント
  actions                 INT64      DEFAULT 0  OPTIONS (description = 'アクション実行数'),
  interactions            INT64      DEFAULT 0  OPTIONS (description = 'インタラクション数'),
  comments                INT64      DEFAULT 0  OPTIONS (description = 'コメント数'),
  likes                   INT64      DEFAULT 0  OPTIONS (description = 'いいね数'),
  saves                   INT64      DEFAULT 0  OPTIONS (description = '保存数'),
  shares                  INT64      DEFAULT 0  OPTIONS (description = 'シェア数'),
  replies                 INT64      DEFAULT 0  OPTIONS (description = '返信数 (ストーリーズ)'),
  -- フォロワー
  followers               INT64      DEFAULT 0  OPTIONS (description = 'フォロワー数 (累計)'),
  follows                 INT64      DEFAULT 0  OPTIONS (description = 'フォロー数 (累計)'),
  posts_count             INT64      DEFAULT 0  OPTIONS (description = '投稿数 (累計)'),
  accounts_engaged        INT64      DEFAULT 0  OPTIONS (description = 'エンゲージしたアカウント数'),
  -- プロフィールアクション
  profile_views           INT64      DEFAULT 0  OPTIONS (description = 'プロフィール閲覧数'),
  website_clicks          INT64      DEFAULT 0  OPTIONS (description = 'ウェブサイトクリック数'),
  email_contacts          INT64      DEFAULT 0  OPTIONS (description = 'メールボタンタップ数'),
  phone_call_clicks       INT64      DEFAULT 0  OPTIONS (description = '電話ボタンタップ数'),
  text_message_clicks     INT64      DEFAULT 0  OPTIONS (description = 'テキストメッセージタップ数'),
  get_directions_clicks   INT64      DEFAULT 0  OPTIONS (description = '道順クリック数'),
  -- メタ
  loaded_at               TIMESTAMP  DEFAULT CURRENT_TIMESTAMP() OPTIONS (description = 'データ取込日時')
)
PARTITION BY date
CLUSTER BY client_id
OPTIONS (
  description = 'Instagramアカウントの日次インサイトデータ。GASにて毎日自動取得。',
  labels = [('table_type', 'raw'), ('source', 'instagram-graph-api'), ('update_frequency', 'daily')]
);
