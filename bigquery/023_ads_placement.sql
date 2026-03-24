-- meta_ads.raw_ad_placement
CREATE TABLE IF NOT EXISTS `ecel-client.meta_ads.raw_ad_placement` (
  client_id STRING NOT NULL, date DATE NOT NULL,
  campaign_id STRING, campaign_name STRING, adset_id STRING, ad_id STRING,
  publisher_platform STRING, platform_position STRING, impression_device STRING,
  impressions INT64 DEFAULT 0, reach INT64 DEFAULT 0, clicks INT64 DEFAULT 0, spend FLOAT64 DEFAULT 0,
  conversions INT64 DEFAULT 0, conversion_value FLOAT64 DEFAULT 0, video_thruplays INT64 DEFAULT 0,
  loaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
) PARTITION BY date CLUSTER BY client_id, publisher_platform, platform_position
OPTIONS (description = '広告配置別パフォーマンス', labels = [('table_type', 'raw'), ('source', 'meta-marketing-api'), ('update_frequency', 'daily')]);
