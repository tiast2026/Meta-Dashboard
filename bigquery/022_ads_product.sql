-- meta_ads.raw_ad_product
CREATE TABLE IF NOT EXISTS `ecel-client.meta_ads.raw_ad_product` (
  client_id STRING NOT NULL, date DATE NOT NULL,
  campaign_id STRING, campaign_name STRING, adset_id STRING, adset_name STRING, ad_id STRING, ad_name STRING,
  product_id STRING, product_name STRING, product_price FLOAT64, product_image_url STRING, content_type STRING,
  impressions INT64 DEFAULT 0, reach INT64 DEFAULT 0, clicks INT64 DEFAULT 0, spend FLOAT64 DEFAULT 0,
  view_content INT64 DEFAULT 0, add_to_cart INT64 DEFAULT 0, initiate_checkout INT64 DEFAULT 0,
  purchase INT64 DEFAULT 0, purchase_value FLOAT64 DEFAULT 0, roas FLOAT64 DEFAULT 0,
  loaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
) PARTITION BY date CLUSTER BY client_id, product_id
OPTIONS (description = 'カタログ広告商品別パフォーマンス', labels = [('table_type', 'raw'), ('source', 'meta-marketing-api'), ('update_frequency', 'daily'), ('ad_type', 'catalog')]);
