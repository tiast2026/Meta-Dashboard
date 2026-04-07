import { NextRequest, NextResponse } from 'next/server';
import type { InStatement } from '@libsql/client';
import { queryRows, table, DATASET_MASTER } from '@/lib/bq';
import { db, ensureDb } from '@/lib/db';
import {
  fetchIgAccountInsights,
  fetchIgPosts,
  fetchIgTaggedPosts,
  fetchMetaAds,
  fetchMetaAdCreatives,
  getLastIgInsightsError,
} from '@/lib/meta-api';

const T = table(DATASET_MASTER, 'clients');

// Daily Vercel Cron entry. Configured in vercel.json as:
//   { "path": "/api/cron/refresh-all", "schedule": "0 18 * * *" } (UTC = 03:00 JST)
//
// Vercel automatically attaches an Authorization header containing
// `Bearer ${CRON_SECRET}` for cron requests. We require it so the route is
// not externally callable.

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

interface ClientRow {
  client_id: string;
  name: string;
  instagram_account_id: string | null;
  meta_ad_account_id: string | null;
  meta_access_token: string | null;
}

interface RefreshSummary {
  client_id: string;
  name: string;
  ig_daily: number | string;
  ig_posts: number | string;
  ig_tagged: number | string;
  meta_ads: number | string;
  meta_creatives: number | string;
}

// Backfill thresholds: if a table has fewer rows than this for a client we
// assume the historical backfill never ran and request a wider date range
// from the Meta API.
const IG_DAILY_BACKFILL_THRESHOLD = 60;   // < ~2 months → backfill
const META_ADS_BACKFILL_THRESHOLD = 60;
const IG_INSIGHTS_BACKFILL_DAYS = 365;    // 1 year (cron is daily, second pass extends)
const META_ADS_BACKFILL_DAYS = 365;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function countRows(clientId: string, tableName: string): Promise<number> {
  try {
    const r = await db.execute({
      sql: `SELECT COUNT(*) as c FROM ${tableName} WHERE client_id = ?`,
      args: [clientId],
    });
    return Number(r.rows[0]?.c) || 0;
  } catch {
    return 0;
  }
}

async function refreshClient(c: ClientRow): Promise<RefreshSummary> {
  const summary: RefreshSummary = {
    client_id: c.client_id,
    name: c.name,
    ig_daily: 'skipped',
    ig_posts: 'skipped',
    ig_tagged: 'skipped',
    meta_ads: 'skipped',
    meta_creatives: 'skipped',
  };
  const token = c.meta_access_token;
  if (!token) return summary;

  // ── Instagram daily insights ─────────────────────────
  if (c.instagram_account_id) {
    try {
      // Auto-detect: if local DB has very little data, request wider range
      const existing = await countRows(c.client_id, 'instagram_daily_insights');
      const igSince = existing < IG_DAILY_BACKFILL_THRESHOLD
        ? isoDate(new Date(Date.now() - IG_INSIGHTS_BACKFILL_DAYS * 86400000))
        : undefined;
      const igUntil = existing < IG_DAILY_BACKFILL_THRESHOLD
        ? isoDate(new Date())
        : undefined;
      const rows = await fetchIgAccountInsights(c.instagram_account_id, token, igSince, igUntil);
      if (rows.length > 0) {
        const stmts: InStatement[] = rows.map((row) => ({
          sql: `INSERT OR REPLACE INTO instagram_daily_insights
            (client_id, date, impressions, reach, followers, follows, posts_count)
            VALUES (?, ?, ?, ?, ?, ?, 0)`,
          args: [c.client_id, row.date, row.impressions, row.reach, row.followers, row.follows],
        }));
        for (let i = 0; i < stmts.length; i += 100) {
          await db.batch(stmts.slice(i, i + 100), 'write');
        }
        summary.ig_daily = rows.length;
      } else {
        summary.ig_daily = getLastIgInsightsError() || 0;
      }
    } catch (err) {
      summary.ig_daily = `error: ${err instanceof Error ? err.message : String(err)}`;
    }

    // ── Instagram posts ───────────────────────────────
    try {
      const posts = await fetchIgPosts(c.instagram_account_id, token);
      if (posts.length > 0) {
        const stmts: InStatement[] = posts.map((p) => ({
          sql: `INSERT OR REPLACE INTO instagram_posts
            (client_id, ig_post_id, caption, media_type, media_url, permalink, posted_at,
             impressions, reach, likes, comments, saves, shares, video_views)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            c.client_id, p.ig_post_id, p.caption, p.media_type,
            p.media_url, p.permalink, p.posted_at,
            p.impressions, p.reach, p.likes, p.comments, p.saves, p.shares,
            p.video_views,
          ],
        }));
        for (let i = 0; i < stmts.length; i += 100) {
          await db.batch(stmts.slice(i, i + 100), 'write');
        }
      }
      summary.ig_posts = posts.length;
    } catch (err) {
      summary.ig_posts = `error: ${err instanceof Error ? err.message : String(err)}`;
    }

    // ── Tagged posts ──────────────────────────────────
    try {
      const tagged = await fetchIgTaggedPosts(c.instagram_account_id, token);
      if (tagged.length > 0) {
        const stmts: InStatement[] = tagged.map((p) => ({
          sql: `INSERT OR REPLACE INTO instagram_tagged_posts
            (client_id, ig_post_id, posted_at, account_name, caption, media_url, permalink, likes, comments)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [c.client_id, p.ig_post_id, p.posted_at, p.account_name, p.caption, p.media_url, p.permalink, p.likes, p.comments],
        }));
        for (let i = 0; i < stmts.length; i += 100) {
          await db.batch(stmts.slice(i, i + 100), 'write');
        }
      }
      summary.ig_tagged = tagged.length;
    } catch (err) {
      summary.ig_tagged = `error: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  // ── Meta Ads ───────────────────────────────────────
  if (c.meta_ad_account_id) {
    try {
      const existing = await countRows(c.client_id, 'meta_ad_insights');
      const adsSince = existing < META_ADS_BACKFILL_THRESHOLD
        ? isoDate(new Date(Date.now() - META_ADS_BACKFILL_DAYS * 86400000))
        : undefined;
      const adsUntil = existing < META_ADS_BACKFILL_THRESHOLD
        ? isoDate(new Date())
        : undefined;
      const insights = await fetchMetaAds(c.meta_ad_account_id, token, adsSince, adsUntil);
      if (insights.length > 0) {
        const stmts: InStatement[] = insights.map((row) => ({
          sql: `INSERT OR REPLACE INTO meta_ad_insights
            (client_id, date, publisher_platform, campaign_id, campaign_name, campaign_objective,
             adset_id, adset_name, ad_id, ad_name,
             impressions, reach, clicks, results, website_actions, spend,
             add_to_cart, initiate_checkout, purchase, purchase_value,
             view_content, lead, complete_registration, contact, subscribe, search,
             add_payment_info, add_to_wishlist, page_engagement, post_engagement,
             video_view, link_click)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            c.client_id, row.date, row.publisher_platform || '', row.campaign_id, row.campaign_name, row.campaign_objective,
            row.adset_id, row.adset_name, row.ad_id, row.ad_name,
            row.impressions, row.reach, row.clicks, row.results, row.website_actions, row.spend,
            row.add_to_cart, row.initiate_checkout, row.purchase, row.purchase_value,
            row.view_content, row.lead, row.complete_registration, row.contact, row.subscribe, row.search,
            row.add_payment_info, row.add_to_wishlist, row.page_engagement, row.post_engagement,
            row.video_view, row.link_click,
          ],
        }));
        for (let i = 0; i < stmts.length; i += 100) {
          await db.batch(stmts.slice(i, i + 100), 'write');
        }
      }
      summary.meta_ads = insights.length;
    } catch (err) {
      summary.meta_ads = `error: ${err instanceof Error ? err.message : String(err)}`;
    }

    // ── Meta ad creatives (thumbnails) ──────────────
    try {
      const creatives = await fetchMetaAdCreatives(c.meta_ad_account_id, token);
      if (creatives.length > 0) {
        const stmts: InStatement[] = creatives.map((cr) => ({
          sql: `INSERT OR REPLACE INTO meta_ad_creatives
            (client_id, ad_id, ad_name, thumbnail_url, image_url, title, body,
             call_to_action_type, link_url, instagram_permalink_url, effective_object_story_id, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          args: [
            c.client_id, cr.ad_id, cr.ad_name, cr.thumbnail_url, cr.image_url, cr.title, cr.body,
            cr.call_to_action_type, cr.link_url, cr.instagram_permalink_url, cr.effective_object_story_id,
          ],
        }));
        for (let i = 0; i < stmts.length; i += 100) {
          await db.batch(stmts.slice(i, i + 100), 'write');
        }
      }
      summary.meta_creatives = creatives.length;
    } catch (err) {
      summary.meta_creatives = `error: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  return summary;
}

export async function GET(request: NextRequest) {
  // Auth: only Vercel Cron (or someone with the secret) may call this.
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${expected}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  await ensureDb();

  const clients = await queryRows<ClientRow>(
    `SELECT client_id, name, instagram_account_id, meta_ad_account_id, meta_access_token FROM ${T}`
  );

  const results: RefreshSummary[] = [];
  for (const c of clients) {
    results.push(await refreshClient(c));
  }

  return NextResponse.json({
    success: true,
    ran_at: new Date().toISOString(),
    client_count: clients.length,
    results,
  });
}
