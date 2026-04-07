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

// Meta Ads API
const ADS_CHUNK_DAYS = 30;

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

export interface MetaAdInsight {
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

  const fields = 'campaign_id,campaign_name,objective,adset_id,adset_name,ad_id,ad_name,impressions,reach,clicks,spend,actions';
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
          let results = 0;
          let website_actions = 0;
          const actions = row.actions as { action_type: string; value: string }[] | undefined;
          if (actions) {
            for (const a of actions) {
              const v = Number(a.value) || 0;
              if (['lead', 'purchase', 'complete_registration', 'link_click'].includes(a.action_type)) {
                results += v;
              }
              if (a.action_type.startsWith('offsite_conversion.') || a.action_type === 'link_click') {
                website_actions += v;
              }
            }
          }

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
