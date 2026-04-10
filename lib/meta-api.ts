/**
 * Meta Graph API helper
 * Fetches Instagram insights and Meta Ads data from the Meta Graph API.
 * Supports full historical data retrieval with pagination and date chunking.
 */

const API_VERSION = 'v22.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;
const TIMEOUT = 30000;

// IG Insights API: max 30 days per request
const IG_INSIGHTS_CHUNK_DAYS = 30;

// Meta Ads API — smaller chunks to avoid Vercel 60s timeout on large accounts
const ADS_CHUNK_DAYS = 14;

// Posts pagination
const POSTS_PAGE_LIMIT = 50;
const POSTS_MAX_PAGES = 5; // default: 50 * 5 = 250 posts (Vercel timeout safe)
const POSTS_MAX_PAGES_FULL = 60; // historical: 50 * 60 = 3000 posts

interface MetaPaging {
  cursors?: { after?: string };
  next?: string;
}

interface MetaApiResponse<T = unknown> {
  data?: T[];
  paging?: MetaPaging;
  error?: { message: string; type: string; code: number };
  [key: string]: unknown;
}

async function metaFetch<T = unknown>(url: string): Promise<MetaApiResponse<T>> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
  const data = await res.json();
  if (data.error) {
    throw new Error(`Meta API Error: ${data.error.message} (code: ${data.error.code})`);
  }
  return data;
}

/** Generate date chunks: [{since, until}, ...] */
function dateChunks(startDate: Date, endDate: Date, chunkDays: number): { since: string; until: string }[] {
  const chunks: { since: string; until: string }[] = [];
  const current = new Date(startDate);
  while (current < endDate) {
    const chunkEnd = new Date(current.getTime() + chunkDays * 86400000);
    const actualEnd = chunkEnd > endDate ? endDate : chunkEnd;
    chunks.push({
      since: current.toISOString().slice(0, 10),
      until: actualEnd.toISOString().slice(0, 10),
    });
    current.setTime(actualEnd.getTime());
  }
  return chunks;
}

// ─── Instagram Account Insights (max 2 years) ──────────────────

export interface IgDailyInsight {
  date: string;
  impressions: number;
  reach: number;
  followers: number;
  follows: number;
  profile_views: number;
  website_clicks: number;
}

/**
 * Last error captured during the most recent fetchIgAccountInsights call.
 * Used so callers can surface a useful error message when the result is empty.
 */
let lastIgInsightsError: string | null = null;
export function getLastIgInsightsError(): string | null {
  return lastIgInsightsError;
}

/**
 * Fetch a single metric for a date chunk. Returns [] on failure.
 * Some metrics require metric_type=total_value (v22+).
 */
async function fetchIgMetricChunk(
  igAccountId: string,
  token: string,
  metric: string,
  since: string,
  until: string,
  metricType?: 'total_value'
): Promise<{ end_time: string; value: number }[]> {
  const tt = metricType ? `&metric_type=${metricType}` : '';
  const url = `${BASE_URL}/${igAccountId}/insights?metric=${metric}&period=day${tt}&since=${since}&until=${until}&access_token=${token}`;
  try {
    const res = await metaFetch<{ name: string; values: { end_time: string; value: number }[] }>(url);
    if (!res.data || res.data.length === 0) return [];
    return res.data[0].values || [];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    lastIgInsightsError = `${metric}: ${msg}`;
    console.warn(`IG metric ${metric} ${since}~${until} failed:`, msg);
    return [];
  }
}

export async function fetchIgAccountInsights(
  igAccountId: string,
  token: string,
  since?: string,
  until?: string
): Promise<IgDailyInsight[]> {
  lastIgInsightsError = null;
  const now = new Date();
  const endDate = until ? new Date(until) : now;
  // Default: 30 days (safe for Vercel timeout). Pass since/until for longer ranges.
  const defaultStart = new Date(now.getTime() - 30 * 86400000);
  const startDate = since ? new Date(since) : defaultStart;

  const chunks = dateChunks(startDate, endDate, IG_INSIGHTS_CHUNK_DAYS);
  const byDate: Record<string, IgDailyInsight> = {};

  const ensure = (date: string) => {
    if (!byDate[date]) {
      byDate[date] = { date, impressions: 0, reach: 0, followers: 0, follows: 0, profile_views: 0, website_clicks: 0 };
    }
    return byDate[date];
  };

  for (const chunk of chunks) {
    // v22+: each metric is fetched individually so a single failure does not
    // wipe out the rest of the chunk. `impressions` was deprecated in v22.
    // `follower_count` returns DAILY new followers (i.e. delta), so we store
    // it under `follows` rather than `followers`.
    const [reachVals, followerDeltaVals] = await Promise.all([
      fetchIgMetricChunk(igAccountId, token, 'reach', chunk.since, chunk.until),
      fetchIgMetricChunk(igAccountId, token, 'follower_count', chunk.since, chunk.until),
    ]);

    for (const v of reachVals) ensure(v.end_time.slice(0, 10)).reach = Number(v.value) || 0;
    for (const v of followerDeltaVals) ensure(v.end_time.slice(0, 10)).follows = Number(v.value) || 0;
  }

  // Stamp the absolute follower total (from the IG User object) onto the
  // most recent daily row so the dashboard can show "current followers".
  const sortedDates = Object.keys(byDate).sort();
  if (sortedDates.length > 0) {
    try {
      const url = `${BASE_URL}/${igAccountId}?fields=followers_count&access_token=${token}`;
      const res = await metaFetch<unknown>(url) as { followers_count?: number };
      const total = Number(res.followers_count) || 0;
      if (total > 0) {
        const latest = sortedDates[sortedDates.length - 1];
        byDate[latest].followers = total;
      }
    } catch (err) {
      console.warn('IG followers_count fetch failed:', err instanceof Error ? err.message : err);
    }
  }

  return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Instagram Posts (all posts with pagination) ────────────────

export interface IgPost {
  ig_post_id: string;
  caption: string;
  media_type: string;
  media_url: string;
  permalink: string;
  posted_at: string;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  video_views: number;
}

export async function fetchIgPosts(
  igAccountId: string,
  token: string,
  options?: { full?: boolean }
): Promise<IgPost[]> {
  const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,video_views';
  const posts: IgPost[] = [];
  let nextUrl: string | null = `${BASE_URL}/${igAccountId}/media?fields=${fields}&limit=${POSTS_PAGE_LIMIT}&access_token=${token}`;
  let page = 0;
  const maxPages = options?.full ? POSTS_MAX_PAGES_FULL : POSTS_MAX_PAGES;

  while (nextUrl && page < maxPages) {
    const res: MetaApiResponse<Record<string, unknown>> = await metaFetch<Record<string, unknown>>(nextUrl);
    if (!res.data || res.data.length === 0) break;

    for (const media of res.data) {
      posts.push({
        ig_post_id: String(media.id),
        caption: String(media.caption || ''),
        media_type: String(media.media_type || ''),
        media_url: String(media.thumbnail_url || media.media_url || ''),
        permalink: String(media.permalink || ''),
        posted_at: String(media.timestamp || ''),
        impressions: 0,
        reach: 0,
        likes: Number(media.like_count) || 0,
        comments: Number(media.comments_count) || 0,
        saves: 0,
        shares: 0,
        video_views: Number(media.video_views) || 0,
      });
    }

    nextUrl = (res.paging?.next as string) || null;
    page++;
  }

  return posts;
}

// ─── Tagged Posts (all with pagination) ─────────────────────────

export interface IgTaggedPost {
  ig_post_id: string;
  posted_at: string;
  account_name: string;
  caption: string;
  media_url: string;
  permalink: string;
  likes: number;
  comments: number;
}

export async function fetchIgTaggedPosts(
  igAccountId: string,
  token: string,
  options?: { full?: boolean }
): Promise<IgTaggedPost[]> {
  const fields = 'id,caption,media_url,permalink,timestamp,like_count,comments_count,username';
  const results: IgTaggedPost[] = [];

  try {
    let nextUrl: string | null = `${BASE_URL}/${igAccountId}/tags?fields=${fields}&limit=${POSTS_PAGE_LIMIT}&access_token=${token}`;
    let page = 0;
    const maxPages = options?.full ? POSTS_MAX_PAGES_FULL : POSTS_MAX_PAGES;

    while (nextUrl && page < maxPages) {
      const res: MetaApiResponse<Record<string, unknown>> = await metaFetch<Record<string, unknown>>(nextUrl);
      if (!res.data || res.data.length === 0) break;

      for (const m of res.data) {
        results.push({
          ig_post_id: String(m.id),
          posted_at: String(m.timestamp || ''),
          account_name: String(m.username || ''),
          caption: String(m.caption || ''),
          media_url: String(m.media_url || ''),
          permalink: String(m.permalink || ''),
          likes: Number(m.like_count) || 0,
          comments: Number(m.comments_count) || 0,
        });
      }

      nextUrl = (res.paging?.next as string) || null;
      page++;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('permission') || msg.includes('code: 10')) {
      throw new Error('タグ付け投稿の取得にはユーザートークンが必要です。ページトークンでは取得できません。');
    }
    throw err;
  }

  return results;
}

// ─── Meta Ads (max 37 months with date chunking + pagination) ───

export interface MetaAdActions {
  add_to_cart: number;
  initiate_checkout: number;
  purchase: number;
  purchase_value: number;
  view_content: number;
  lead: number;
  complete_registration: number;
  contact: number;
  subscribe: number;
  search: number;
  add_payment_info: number;
  add_to_wishlist: number;
  page_engagement: number;
  post_engagement: number;
  video_view: number;
  link_click: number;
}

export interface MetaAdInsight extends MetaAdActions {
  date: string;
  campaign_id: string;
  campaign_name: string;
  campaign_objective: string;
  adset_id: string;
  adset_name: string;
  ad_id: string;
  ad_name: string;
  publisher_platform: string;
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
  results: number;
  website_actions: number;
}

const EMPTY_ACTIONS: MetaAdActions = {
  add_to_cart: 0,
  initiate_checkout: 0,
  purchase: 0,
  purchase_value: 0,
  view_content: 0,
  lead: 0,
  complete_registration: 0,
  contact: 0,
  subscribe: 0,
  search: 0,
  add_payment_info: 0,
  add_to_wishlist: 0,
  page_engagement: 0,
  post_engagement: 0,
  video_view: 0,
  link_click: 0,
};

/**
 * Map Meta `actions[]` array (and `action_values[]` for purchase value) into
 * our flat schema. Meta returns the same conversion under many action_type
 * names depending on the channel — e.g. `purchase`, `omni_purchase`,
 * `offsite_conversion.fb_pixel_purchase`, `web_in_store_purchase`,
 * `onsite_web_purchase`, `onsite_web_app_purchase`, `web_app_in_store_purchase` —
 * and they all have the SAME value (one count per channel reporting).
 *
 * Strategy: take the FIRST matching alias only (priority order). Never sum
 * multiple aliases. omni_* are skipped because they double-count.
 */
function mapActions(
  actions: { action_type: string; value: string }[] | undefined,
  actionValues: { action_type: string; value: string }[] | undefined
): MetaAdActions {
  const out: MetaAdActions = { ...EMPTY_ACTIONS };
  if (!actions) return out;

  // Priority-ordered alias list. The FIRST one present wins.
  type MetricKey = Exclude<keyof MetaAdActions, 'purchase_value'>;
  const metricMap: { key: MetricKey; aliases: string[] }[] = [
    {
      key: 'purchase',
      aliases: [
        'offsite_conversion.fb_pixel_purchase',
        'purchase',
        'onsite_web_purchase',
        'onsite_web_app_purchase',
        'web_in_store_purchase',
        'web_app_in_store_purchase',
      ],
    },
    {
      key: 'add_to_cart',
      aliases: [
        'offsite_conversion.fb_pixel_add_to_cart',
        'add_to_cart',
        'onsite_web_add_to_cart',
        'onsite_web_app_add_to_cart',
      ],
    },
    {
      key: 'initiate_checkout',
      aliases: [
        'offsite_conversion.fb_pixel_initiate_checkout',
        'initiate_checkout',
        'onsite_web_initiate_checkout',
      ],
    },
    {
      key: 'view_content',
      aliases: [
        'offsite_conversion.fb_pixel_view_content',
        'view_content',
        'onsite_web_view_content',
        'onsite_web_app_view_content',
        'onsite_app_view_content',
        'onsite_conversion.view_content',
      ],
    },
    {
      key: 'lead',
      aliases: [
        'offsite_conversion.fb_pixel_lead',
        'lead',
        'leadgen_grouped',
      ],
    },
    {
      key: 'complete_registration',
      aliases: [
        'offsite_conversion.fb_pixel_complete_registration',
        'complete_registration',
        'offsite_complete_registration_add_meta_leads',
      ],
    },
    { key: 'contact', aliases: ['offsite_conversion.fb_pixel_contact', 'contact'] },
    { key: 'subscribe', aliases: ['offsite_conversion.fb_pixel_subscribe', 'subscribe'] },
    { key: 'search', aliases: ['offsite_conversion.fb_pixel_search', 'search'] },
    { key: 'add_payment_info', aliases: ['offsite_conversion.fb_pixel_add_payment_info', 'add_payment_info'] },
    { key: 'add_to_wishlist', aliases: ['offsite_conversion.fb_pixel_add_to_wishlist', 'add_to_wishlist', 'onsite_conversion.add_to_wishlist'] },
    { key: 'page_engagement', aliases: ['page_engagement'] },
    { key: 'post_engagement', aliases: ['post_engagement'] },
    { key: 'video_view', aliases: ['video_view'] },
    { key: 'link_click', aliases: ['link_click'] },
  ];

  // Build a quick lookup by action_type. Skip omni_* aggregates because they
  // duplicate the per-channel events.
  const byType = new Map<string, number>();
  for (const a of actions) {
    if (a.action_type.startsWith('omni_')) continue;
    byType.set(a.action_type, Number(a.value) || 0);
  }

  for (const { key, aliases } of metricMap) {
    for (const alias of aliases) {
      if (byType.has(alias)) {
        out[key] = byType.get(alias) || 0;
        break; // first match wins; never sum multiple aliases
      }
    }
  }

  // Purchase value (revenue) for ROAS — same priority approach.
  if (actionValues) {
    const valueByType = new Map<string, number>();
    for (const a of actionValues) {
      if (a.action_type.startsWith('omni_')) continue;
      valueByType.set(a.action_type, Number(a.value) || 0);
    }
    const valueAliases = [
      'offsite_conversion.fb_pixel_purchase',
      'purchase',
      'onsite_web_purchase',
      'onsite_web_app_purchase',
      'web_in_store_purchase',
      'web_app_in_store_purchase',
    ];
    for (const alias of valueAliases) {
      if (valueByType.has(alias)) {
        out.purchase_value = valueByType.get(alias) || 0;
        break;
      }
    }
  }

  return out;
}

export async function fetchMetaAds(
  adAccountId: string,
  token: string,
  since?: string,
  until?: string
): Promise<MetaAdInsight[]> {
  const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
  const now = new Date();
  const endDate = until ? new Date(until) : now;
  // Default: 30 days (safe for Vercel timeout). Pass since/until for longer ranges.
  const defaultStart = new Date(now.getTime() - 30 * 86400000);
  const startDate = since ? new Date(since) : defaultStart;

  const fields = 'campaign_id,campaign_name,objective,adset_id,adset_name,ad_id,ad_name,impressions,reach,clicks,spend,actions,action_values';
  const chunks = dateChunks(startDate, endDate, ADS_CHUNK_DAYS);
  const allInsights: MetaAdInsight[] = [];

  for (const chunk of chunks) {
    try {
      let nextUrl: string | null = `${BASE_URL}/${accountId}/insights?fields=${fields}&level=ad&breakdowns=publisher_platform&time_range={"since":"${chunk.since}","until":"${chunk.until}"}&time_increment=1&limit=500&access_token=${token}`;
      let page = 0;

      while (nextUrl && page < 10) {
        const res: MetaApiResponse<Record<string, unknown>> = await metaFetch<Record<string, unknown>>(nextUrl);
        if (!res.data || res.data.length === 0) break;

        for (const row of res.data) {
          const actions = row.actions as { action_type: string; value: string }[] | undefined;
          const actionValues = row.action_values as { action_type: string; value: string }[] | undefined;
          const mapped = mapActions(actions, actionValues);

          // Top-level "results" used in the legacy KPI = sum of conversion-style actions
          const results = mapped.lead + mapped.purchase + mapped.complete_registration + mapped.link_click;
          // "website_actions" = engagement style (kept for backwards compatibility)
          const website_actions = mapped.link_click + mapped.add_to_cart + mapped.initiate_checkout + mapped.purchase;

          allInsights.push({
            date: String(row.date_start || ''),
            campaign_id: String(row.campaign_id || ''),
            campaign_name: String(row.campaign_name || ''),
            campaign_objective: String(row.objective || ''),
            adset_id: String(row.adset_id || ''),
            adset_name: String(row.adset_name || ''),
            ad_id: String(row.ad_id || ''),
            ad_name: String(row.ad_name || ''),
            publisher_platform: String(row.publisher_platform || ''),
            impressions: Number(row.impressions) || 0,
            reach: Number(row.reach) || 0,
            clicks: Number(row.clicks) || 0,
            spend: Number(row.spend) || 0,
            results,
            website_actions,
            ...mapped,
          });
        }

        nextUrl = (res.paging?.next as string) || null;
        page++;
      }
    } catch (err) {
      console.warn(`Ads chunk ${chunk.since}~${chunk.until} failed:`, err);
    }
  }

  return allInsights;
}

// ─── Meta Ads Demographic / Geo / Time Breakdowns ──────────────

export type BreakdownType = 'age_gender' | 'region' | 'country' | 'hourly' | 'device';

export interface MetaAdBreakdownRow {
  date: string;
  breakdown_type: BreakdownType;
  breakdown_key: string;
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
  purchase: number;
  purchase_value: number;
  add_to_cart: number;
  initiate_checkout: number;
}

const BREAKDOWN_PARAM: Record<BreakdownType, string> = {
  age_gender: 'age,gender',
  region: 'region',
  country: 'country',
  hourly: 'hourly_stats_aggregated_by_advertiser_time_zone',
  device: 'device_platform',
};

function makeBreakdownKey(type: BreakdownType, row: Record<string, unknown>): string {
  switch (type) {
    case 'age_gender':
      return `${row.age || ''}|${row.gender || ''}`;
    case 'region':
      return String(row.region || '');
    case 'country':
      return String(row.country || '');
    case 'hourly':
      return String(row.hourly_stats_aggregated_by_advertiser_time_zone || '');
    case 'device':
      return String(row.device_platform || '');
  }
}

/**
 * Fetch breakdown insights for an account. We use account-level (no level=ad)
 * because per-ad breakdowns explode in row count and easily blow past
 * Vercel's 60s budget. This still gives client-level slices which is what
 * the dashboard shows.
 */
export async function fetchMetaAdsBreakdown(
  adAccountId: string,
  token: string,
  type: BreakdownType,
  since?: string,
  until?: string
): Promise<MetaAdBreakdownRow[]> {
  const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
  const now = new Date();
  const endDate = until ? new Date(until) : now;
  // Default: last 30 days. Pass since/until for longer ranges.
  const defaultStart = new Date(now.getTime() - 30 * 86400000);
  const startDate = since ? new Date(since) : defaultStart;

  // Hourly is much heavier — chunk smaller.
  const chunkDays = type === 'hourly' ? 7 : 30;
  const chunks = dateChunks(startDate, endDate, chunkDays);
  const breakdownsParam = BREAKDOWN_PARAM[type];
  const fields = 'impressions,reach,clicks,spend,actions,action_values';
  const out: MetaAdBreakdownRow[] = [];

  for (const chunk of chunks) {
    try {
      let nextUrl: string | null =
        `${BASE_URL}/${accountId}/insights?fields=${fields}&breakdowns=${breakdownsParam}` +
        `&time_range={"since":"${chunk.since}","until":"${chunk.until}"}` +
        `&time_increment=1&limit=500&access_token=${token}`;
      let page = 0;

      while (nextUrl && page < 10) {
        const res: MetaApiResponse<Record<string, unknown>> = await metaFetch<Record<string, unknown>>(nextUrl);
        if (!res.data || res.data.length === 0) break;

        for (const row of res.data) {
          const actions = row.actions as { action_type: string; value: string }[] | undefined;
          const actionValues = row.action_values as { action_type: string; value: string }[] | undefined;
          const mapped = mapActions(actions, actionValues);
          out.push({
            date: String(row.date_start || ''),
            breakdown_type: type,
            breakdown_key: makeBreakdownKey(type, row),
            impressions: Number(row.impressions) || 0,
            reach: Number(row.reach) || 0,
            clicks: Number(row.clicks) || 0,
            spend: Number(row.spend) || 0,
            purchase: mapped.purchase,
            purchase_value: mapped.purchase_value,
            add_to_cart: mapped.add_to_cart,
            initiate_checkout: mapped.initiate_checkout,
          });
        }

        nextUrl = (res.paging?.next as string) || null;
        page++;
      }
    } catch (err) {
      console.warn(`Breakdown ${type} chunk ${chunk.since}~${chunk.until} failed:`, err instanceof Error ? err.message : err);
    }
  }

  return out;
}

// ─── Meta Ad Creatives (thumbnail/image/permalink) ──────────────

export interface MetaAdCreative {
  ad_id: string;
  ad_name: string;
  thumbnail_url: string;
  image_url: string;
  title: string;
  body: string;
  call_to_action_type: string;
  link_url: string;
  instagram_permalink_url: string;
  effective_object_story_id: string;
}

/**
 * Fetch all ads in an account with their creative data. Used to display ad
 * thumbnails next to insights rows. Returns one row per ad (not per date).
 */
export async function fetchMetaAdCreatives(
  adAccountId: string,
  token: string,
  options?: { full?: boolean }
): Promise<MetaAdCreative[]> {
  const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
  // Request the creative subfields we need. `thumbnail_url` is a small
  // (~64x64) preview Meta hosts; `image_url` is the full sized one.
  const fields = [
    'id',
    'name',
    'effective_object_story_id',
    'creative{thumbnail_url,image_url,title,body,call_to_action_type,object_story_spec,instagram_permalink_url,effective_instagram_media_id}',
  ].join(',');

  const limit = 200;
  // Default cap = 5 pages = 1000 ads. full=true raises to 50 pages = 10000.
  const maxPages = options?.full ? 50 : 5;

  const out: MetaAdCreative[] = [];
  let nextUrl: string | null = `${BASE_URL}/${accountId}/ads?fields=${fields}&limit=${limit}&access_token=${token}`;
  let page = 0;

  while (nextUrl && page < maxPages) {
    try {
      const res: MetaApiResponse<Record<string, unknown>> = await metaFetch<Record<string, unknown>>(nextUrl);
      if (!res.data || res.data.length === 0) break;

      for (const ad of res.data) {
        const creative = (ad.creative as Record<string, unknown> | undefined) || {};
        // The link URL can live in a few places depending on the ad type
        const objectStorySpec = (creative.object_story_spec as Record<string, unknown> | undefined) || {};
        const linkData = (objectStorySpec.link_data as Record<string, unknown> | undefined) || {};
        const videoData = (objectStorySpec.video_data as Record<string, unknown> | undefined) || {};
        const linkUrl = String(linkData.link || videoData.link || '');

        out.push({
          ad_id: String(ad.id),
          ad_name: String(ad.name || ''),
          thumbnail_url: String(creative.thumbnail_url || ''),
          image_url: String(creative.image_url || ''),
          title: String(creative.title || linkData.name || ''),
          body: String(creative.body || linkData.message || ''),
          call_to_action_type: String(creative.call_to_action_type || ''),
          link_url: linkUrl,
          instagram_permalink_url: String(creative.instagram_permalink_url || ''),
          effective_object_story_id: String(ad.effective_object_story_id || ''),
        });
      }

      nextUrl = (res.paging?.next as string) || null;
      page++;
    } catch (err) {
      console.warn('Ad creatives fetch failed:', err instanceof Error ? err.message : err);
      break;
    }
  }

  return out;
}
