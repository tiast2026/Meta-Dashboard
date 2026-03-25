/**
 * Meta Graph API helper
 * Fetches Instagram insights and Meta Ads data from the Meta Graph API.
 * Supports full historical data retrieval with pagination and date chunking.
 */

const API_VERSION = 'v21.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;
const TIMEOUT = 30000;

// IG Insights API: max 30 days per request, max 2 years history
const IG_INSIGHTS_CHUNK_DAYS = 30;
const IG_INSIGHTS_MAX_DAYS = 730;

// Meta Ads API: max 37 months history
const ADS_MAX_MONTHS = 37;
const ADS_CHUNK_DAYS = 30;

// Posts pagination
const POSTS_PAGE_LIMIT = 50;
const POSTS_MAX_PAGES = 20; // safety limit: 50 * 20 = 1000 posts max

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

export async function fetchIgAccountInsights(
  igAccountId: string,
  token: string,
  since?: string,
  until?: string
): Promise<IgDailyInsight[]> {
  const now = new Date();
  const endDate = until ? new Date(until) : now;
  const defaultStart = new Date(now.getTime() - IG_INSIGHTS_MAX_DAYS * 86400000);
  const startDate = since ? new Date(since) : defaultStart;

  const metrics = [
    'impressions',
    'reach',
    'follower_count',
    'profile_views',
    'website_clicks',
  ].join(',');

  const chunks = dateChunks(startDate, endDate, IG_INSIGHTS_CHUNK_DAYS);
  const byDate: Record<string, IgDailyInsight> = {};

  for (const chunk of chunks) {
    try {
      const url = `${BASE_URL}/${igAccountId}/insights?metric=${metrics}&period=day&since=${chunk.since}&until=${chunk.until}&access_token=${token}`;
      const res = await metaFetch<{ name: string; values: { end_time: string; value: number }[] }>(url);

      if (!res.data) continue;

      for (const metric of res.data) {
        for (const val of metric.values) {
          const date = val.end_time.slice(0, 10);
          if (!byDate[date]) {
            byDate[date] = { date, impressions: 0, reach: 0, followers: 0, follows: 0, profile_views: 0, website_clicks: 0 };
          }
          if (metric.name === 'impressions') byDate[date].impressions = val.value;
          if (metric.name === 'reach') byDate[date].reach = val.value;
          if (metric.name === 'follower_count') byDate[date].followers = val.value;
          if (metric.name === 'profile_views') byDate[date].profile_views = val.value;
          if (metric.name === 'website_clicks') byDate[date].website_clicks = val.value;
        }
      }
    } catch (err) {
      // Some date ranges may have no data — continue with next chunk
      console.warn(`IG insights chunk ${chunk.since}~${chunk.until} failed:`, err);
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
}

export async function fetchIgPosts(
  igAccountId: string,
  token: string,
): Promise<IgPost[]> {
  const fields = 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count';
  const posts: IgPost[] = [];
  let nextUrl: string | null = `${BASE_URL}/${igAccountId}/media?fields=${fields}&limit=${POSTS_PAGE_LIMIT}&access_token=${token}`;
  let page = 0;

  while (nextUrl && page < POSTS_MAX_PAGES) {
    const res: MetaApiResponse<Record<string, unknown>> = await metaFetch<Record<string, unknown>>(nextUrl);
    if (!res.data || res.data.length === 0) break;

    for (const media of res.data) {
      const postId = String(media.id);
      let impressions = 0, reach = 0, saves = 0, shares = 0;
      try {
        const insightsUrl = `${BASE_URL}/${postId}/insights?metric=impressions,reach,saved,shares&access_token=${token}`;
        const insightsRes = await metaFetch<{ name: string; values: { value: number }[] }>(insightsUrl);
        if (insightsRes.data) {
          for (const m of insightsRes.data) {
            const v = m.values?.[0]?.value ?? 0;
            if (m.name === 'impressions') impressions = v;
            if (m.name === 'reach') reach = v;
            if (m.name === 'saved') saves = v;
            if (m.name === 'shares') shares = v;
          }
        }
      } catch {
        // Some media types don't support all insights
      }

      posts.push({
        ig_post_id: postId,
        caption: String(media.caption || ''),
        media_type: String(media.media_type || ''),
        media_url: String(media.media_url || ''),
        permalink: String(media.permalink || ''),
        posted_at: String(media.timestamp || ''),
        impressions,
        reach,
        likes: Number(media.like_count) || 0,
        comments: Number(media.comments_count) || 0,
        saves,
        shares,
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
): Promise<IgTaggedPost[]> {
  const fields = 'id,caption,media_url,permalink,timestamp,like_count,comments_count,username';
  const results: IgTaggedPost[] = [];
  let nextUrl: string | null = `${BASE_URL}/${igAccountId}/tags?fields=${fields}&limit=${POSTS_PAGE_LIMIT}&access_token=${token}`;
  let page = 0;

  while (nextUrl && page < POSTS_MAX_PAGES) {
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
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
  results: number;
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
  const defaultStart = new Date(now.getFullYear(), now.getMonth() - ADS_MAX_MONTHS, now.getDate());
  const startDate = since ? new Date(since) : defaultStart;

  const fields = 'campaign_id,campaign_name,objective,adset_id,adset_name,ad_id,ad_name,impressions,reach,clicks,spend,actions';
  const chunks = dateChunks(startDate, endDate, ADS_CHUNK_DAYS);
  const allInsights: MetaAdInsight[] = [];

  for (const chunk of chunks) {
    try {
      let nextUrl: string | null = `${BASE_URL}/${accountId}/insights?fields=${fields}&level=ad&time_range={"since":"${chunk.since}","until":"${chunk.until}"}&time_increment=1&limit=500&access_token=${token}`;
      let page = 0;

      while (nextUrl && page < 10) {
        const res: MetaApiResponse<Record<string, unknown>> = await metaFetch<Record<string, unknown>>(nextUrl);
        if (!res.data || res.data.length === 0) break;

        for (const row of res.data) {
          let results = 0;
          const actions = row.actions as { action_type: string; value: string }[] | undefined;
          if (actions) {
            for (const a of actions) {
              if (['lead', 'purchase', 'complete_registration', 'link_click'].includes(a.action_type)) {
                results += Number(a.value) || 0;
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
            impressions: Number(row.impressions) || 0,
            reach: Number(row.reach) || 0,
            clicks: Number(row.clicks) || 0,
            spend: Number(row.spend) || 0,
            results,
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
