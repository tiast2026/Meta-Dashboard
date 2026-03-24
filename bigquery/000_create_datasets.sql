-- BigQuery データセット作成
-- プロジェクト: ecel-client

CREATE SCHEMA IF NOT EXISTS `ecel-client.instagram_analytics`
OPTIONS (description = 'Instagram Graph APIから取得したオーガニックデータ', labels = [('team', 'marketing'), ('source', 'instagram'), ('env', 'production')]);

CREATE SCHEMA IF NOT EXISTS `ecel-client.meta_ads`
OPTIONS (description = 'Meta Marketing APIから取得した広告パフォーマンスデータ', labels = [('team', 'marketing'), ('source', 'meta-ads'), ('env', 'production')]);

CREATE SCHEMA IF NOT EXISTS `ecel-client.master`
OPTIONS (description = 'クライアント情報などのマスタデータ', labels = [('team', 'marketing'), ('type', 'master'), ('env', 'production')]);
