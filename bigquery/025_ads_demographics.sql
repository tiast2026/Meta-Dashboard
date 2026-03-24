-- meta_ads.raw_ad_demographics
CREATE TABLE IF NOT EXISTS `ecel-client.meta_ads.raw_ad_demographics` (
  client_id STRING NOT NULL, date DATE NOT NULL,
  campaign_id STRING, campaign_name STRING, adset_id STRING, ad_id STRING,
  age STRING, gender STRING,
  impressions INT64 DEFAULT 0, reach INT64 DEFAULT 0, clicks INT64 DEFAULT 0, spend FLOAT64 DEFAULT 0,
  conversions INT64 DEFAULT 0, conversion_value FLOAT64 DEFAULT 0,
  loaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
) PARTITION BY date CLUSTER BY client_id, age, gender
OPTIONS (description = '広告の年齢×性別別パフォーマンス', labels = [('table_type', 'raw'), ('source', 'meta-marketing-api'), ('update_frequency', 'daily')]);
