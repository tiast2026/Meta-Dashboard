-- meta_ads.raw_ad_creative
CREATE TABLE IF NOT EXISTS `ecel-client.meta_ads.raw_ad_creative` (
  client_id STRING NOT NULL, date DATE NOT NULL,
  campaign_id STRING, campaign_name STRING, adset_id STRING, ad_id STRING, ad_name STRING,
  creative_id STRING, thumbnail_url STRING, body STRING, title STRING, description STRING,
  link_url STRING, display_url STRING, call_to_action_type STRING,
  body_asset_id STRING, title_asset_id STRING, image_asset_id STRING, video_asset_id STRING, link_url_asset_id STRING,
  impressions INT64 DEFAULT 0, reach INT64 DEFAULT 0, clicks INT64 DEFAULT 0, spend FLOAT64 DEFAULT 0,
  conversions INT64 DEFAULT 0, conversion_value FLOAT64 DEFAULT 0, ctr FLOAT64 DEFAULT 0, cpc FLOAT64 DEFAULT 0,
  loaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
) PARTITION BY date CLUSTER BY client_id, ad_id
OPTIONS (description = '広告クリエイティブ別パフォーマンス (A/Bテスト分析用)', labels = [('table_type', 'raw'), ('source', 'meta-marketing-api'), ('update_frequency', 'daily')]);
