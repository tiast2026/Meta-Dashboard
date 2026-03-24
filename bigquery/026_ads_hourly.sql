-- meta_ads.raw_ad_hourly
CREATE TABLE IF NOT EXISTS `ecel-client.meta_ads.raw_ad_hourly` (
  client_id STRING NOT NULL, date DATE NOT NULL, hour INT64 NOT NULL,
  campaign_id STRING, campaign_name STRING,
  impressions INT64 DEFAULT 0, reach INT64 DEFAULT 0, clicks INT64 DEFAULT 0, spend FLOAT64 DEFAULT 0,
  conversions INT64 DEFAULT 0,
  loaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
) PARTITION BY date CLUSTER BY client_id, hour
OPTIONS (description = '広告の時間帯別パフォーマンス', labels = [('table_type', 'raw'), ('source', 'meta-marketing-api'), ('update_frequency', 'daily')]);
