-- ============================================================
-- master.admin_users
-- 管理者ユーザーテーブル
-- ============================================================

CREATE TABLE IF NOT EXISTS `ecel-client.master.admin_users` (
  id                      STRING     NOT NULL   OPTIONS (description = '管理者ID (UUID)'),
  email                   STRING     NOT NULL   OPTIONS (description = 'メールアドレス'),
  password_hash           STRING     NOT NULL   OPTIONS (description = 'bcryptハッシュ化パスワード'),
  created_at              TIMESTAMP  DEFAULT CURRENT_TIMESTAMP() OPTIONS (description = '作成日時')
)
OPTIONS (
  description = '管理画面ログイン用ユーザーテーブル',
  labels = [('table_type', 'master')]
);
