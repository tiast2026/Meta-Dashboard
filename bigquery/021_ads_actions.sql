-- meta_ads.raw_ad_actions
CREATE TABLE IF NOT EXISTS `ecel-client.meta_ads.raw_ad_actions` (
  client_id STRING NOT NULL, date DATE NOT NULL,
  campaign_id STRING, campaign_name STRING, adset_id STRING, adset_name STRING, ad_id STRING, ad_name STRING,
  action_type STRING NOT NULL, attribution_window STRING DEFAULT 'default',
  action_count FLOAT64 DEFAULT 0, action_value FLOAT64 DEFAULT 0,
  loaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
) PARTITION BY date CLUSTER BY client_id, action_type
OPTIONS (description = '広告アクション詳細 (purchase/add_to_cart/lead等)', labels = [('table_type', 'raw'), ('source', 'meta-marketing-api'), ('update_frequency', 'daily')]);
