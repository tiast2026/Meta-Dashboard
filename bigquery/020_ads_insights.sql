-- meta_ads.raw_ad_insights
CREATE TABLE IF NOT EXISTS `ecel-client.meta_ads.raw_ad_insights` (
  client_id STRING NOT NULL, date DATE NOT NULL,
  publisher_platform STRING, platform_position STRING, device_platform STRING,
  campaign_id STRING, campaign_name STRING, campaign_objective STRING,
  adset_id STRING, adset_name STRING, ad_id STRING, ad_name STRING,
  impressions INT64 DEFAULT 0, reach INT64 DEFAULT 0, frequency FLOAT64 DEFAULT 0,
  clicks INT64 DEFAULT 0, unique_clicks INT64 DEFAULT 0, spend FLOAT64 DEFAULT 0,
  cpc FLOAT64 DEFAULT 0, cpm FLOAT64 DEFAULT 0, ctr FLOAT64 DEFAULT 0,
  cpp FLOAT64 DEFAULT 0, unique_ctr FLOAT64 DEFAULT 0,
  cost_per_result FLOAT64 DEFAULT 0, cost_per_unique_click FLOAT64 DEFAULT 0,
  results INT64 DEFAULT 0,
  outbound_clicks INT64 DEFAULT 0, outbound_clicks_ctr FLOAT64 DEFAULT 0,
  inline_link_clicks INT64 DEFAULT 0, inline_link_click_ctr FLOAT64 DEFAULT 0,
  video_plays INT64 DEFAULT 0, video_thruplays INT64 DEFAULT 0,
  video_p25 INT64 DEFAULT 0, video_p50 INT64 DEFAULT 0,
  video_p75 INT64 DEFAULT 0, video_p100 INT64 DEFAULT 0,
  video_avg_watch_sec FLOAT64 DEFAULT 0,
  conversions INT64 DEFAULT 0, conversion_value FLOAT64 DEFAULT 0,
  purchase_roas FLOAT64 DEFAULT 0, website_purchase_roas FLOAT64 DEFAULT 0,
  quality_ranking STRING, engagement_rate_ranking STRING, conversion_rate_ranking STRING,
  loaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
) PARTITION BY date CLUSTER BY client_id, campaign_id, publisher_platform
OPTIONS (description = 'Meta広告基本パフォーマンスデータ', labels = [('table_type', 'raw'), ('source', 'meta-marketing-api'), ('update_frequency', 'daily')]);
