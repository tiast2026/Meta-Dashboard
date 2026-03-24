-- meta_ads.raw_ad_geo
CREATE TABLE IF NOT EXISTS `ecel-client.meta_ads.raw_ad_geo` (
  client_id STRING NOT NULL, date DATE NOT NULL,
  campaign_id STRING, campaign_name STRING,
  country STRING, region STRING, dma STRING,
  impressions INT64 DEFAULT 0, reach INT64 DEFAULT 0, clicks INT64 DEFAULT 0, spend FLOAT64 DEFAULT 0,
  conversions INT64 DEFAULT 0, conversion_value FLOAT64 DEFAULT 0,
  loaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
) PARTITION BY date CLUSTER BY client_id, country
OPTIONS (description = '広告の地域別パフォーマンス', labels = [('table_type', 'raw'), ('source', 'meta-marketing-api'), ('update_frequency', 'daily')]);
