import { NextRequest } from 'next/server';
import { queryOne, table, DATASET_MASTER } from '@/lib/bq';
import { db, ensureDb } from '@/lib/db';
import {
  fetchIgAccountInsights,
  fetchIgPosts,
  fetchIgTaggedPosts,
  fetchMetaAds,
  fetchMetaAdCreatives,
  getLastIgInsightsError,
} from '@/lib/meta-api';
import type { InStatement } from '@libsql/client';

const T = table(DATASET_MASTER, 'clients');

export const maxDuration = 60; // Vercel Pro: 60s, Hobby: 10s — will do best effort

// Maximum lookback supported by Meta APIs
const IG_INSIGHTS_MAX_DAYS = 720; // ~2 years
const META_ADS_MAX_DAYS = 1110;   // ~37 months

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

type Phase = 'all' | 'ig_daily' | 'ig_posts' | 'ig_tagged' | 'meta_ads' | 'meta_creatives';

export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get('client_id');
  if (!clientId) {
    return new Response('client_id is required', { status: 400 });
  }
  // ?full=1 → fetch maximum historical data instead of the default 30 days
  const fullMode = request.nextUrl.searchParams.get('full') === '1';
  // ?phase=ig_daily|ig_posts|ig_tagged|meta_ads → only run a single phase so
  // each call fits comfortably inside the Vercel function time limit. The UI
  // chains these for full mode.
  const phaseParam = (request.nextUrl.searchParams.get('phase') || 'all') as Phase;
  const phaseAllowed = (p: Phase): boolean => phaseParam === 'all' || phaseParam === p;

  const client = await queryOne<Record<string, unknown>>(
    `SELECT instagram_account_id, meta_ad_account_id, meta_access_token FROM ${T} WHERE client_id = @id LIMIT 1`,
    { id: clientId }
  );
  if (!client) {
    return new Response('Client not found', { status: 404 });
  }

  const token = client.meta_access_token as string;
  const igId = client.instagram_account_id as string;
  const adAccountId = client.meta_ad_account_id as string;

  if (!token) {
    return new Response('Token not set', { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: { step: string; status: string; message: string; progress?: number }) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      await ensureDb();

      const steps = [
        { key: 'ig_daily' as Phase, label: 'Instagram日次データ', needsIg: true },
        { key: 'ig_posts' as Phase, label: 'Instagram投稿データ', needsIg: true },
        { key: 'ig_tagged' as Phase, label: 'タグ付け投稿', needsIg: true },
        { key: 'meta_ads' as Phase, label: 'Meta広告データ', needsAd: true },
        { key: 'meta_creatives' as Phase, label: '広告クリエイティブ', needsAd: true },
      ];

      const totalSteps = steps.filter(s =>
        phaseAllowed(s.key) &&
        (s.needsIg ? !!igId : true) &&
        (s.needsAd ? !!adAccountId : true)
      ).length || 1;
      let completedSteps = 0;

      const now = new Date();
      const igSince = fullMode ? isoDate(new Date(now.getTime() - IG_INSIGHTS_MAX_DAYS * 86400000)) : undefined;
      const igUntil = fullMode ? isoDate(now) : undefined;
      const adsSince = fullMode ? isoDate(new Date(now.getTime() - META_ADS_MAX_DAYS * 86400000)) : undefined;
      const adsUntil = fullMode ? isoDate(now) : undefined;

      // --- 1. Instagram Daily Insights ---
      if (igId && phaseAllowed('ig_daily')) {
        send({ step: 'ig_daily', status: 'running', message: fullMode ? '全期間 Instagram日次データを取得中...' : 'Instagram日次データを取得中...', progress: Math.round((completedSteps / totalSteps) * 100) });
        try {
          const insights = await fetchIgAccountInsights(igId, token, igSince, igUntil);
          if (insights.length > 0) {
            const stmts: InStatement[] = insights.map((row) => ({
              sql: `INSERT OR REPLACE INTO instagram_daily_insights
                (client_id, date, impressions, reach, followers, follows, posts_count)
                VALUES (?, ?, ?, ?, ?, ?, 0)`,
              args: [clientId, row.date, row.impressions, row.reach, row.followers, row.follows],
            }));
            for (let i = 0; i < stmts.length; i += 100) {
              await db.batch(stmts.slice(i, i + 100), 'write');
            }
            send({ step: 'ig_daily', status: 'done', message: `${insights.length}件取得完了`, progress: Math.round((++completedSteps / totalSteps) * 100) });
          } else {
            const apiErr = getLastIgInsightsError();
            send({
              step: 'ig_daily',
              status: apiErr ? 'error' : 'done',
              message: apiErr ? `Meta APIエラー: ${apiErr}` : 'データなし',
              progress: Math.round((++completedSteps / totalSteps) * 100),
            });
          }
        } catch (err) {
          send({ step: 'ig_daily', status: 'error', message: err instanceof Error ? err.message : String(err), progress: Math.round((++completedSteps / totalSteps) * 100) });
        }
      }

      // --- 2. Instagram Posts ---
      if (igId && phaseAllowed('ig_posts')) {
        send({ step: 'ig_posts', status: 'running', message: fullMode ? '全期間 Instagram投稿を取得中...' : 'Instagram投稿データを取得中...', progress: Math.round((completedSteps / totalSteps) * 100) });
        try {
          const posts = await fetchIgPosts(igId, token, { full: fullMode });
          if (posts.length > 0) {
            const stmts: InStatement[] = posts.map((post) => ({
              sql: `INSERT OR REPLACE INTO instagram_posts
                (client_id, ig_post_id, caption, media_type, media_url, permalink, posted_at,
                 impressions, reach, likes, comments, saves, shares, video_views)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              args: [
                clientId, post.ig_post_id, post.caption, post.media_type,
                post.media_url, post.permalink, post.posted_at,
                post.impressions, post.reach, post.likes, post.comments, post.saves, post.shares,
                post.video_views,
              ],
            }));
            for (let i = 0; i < stmts.length; i += 100) {
              await db.batch(stmts.slice(i, i + 100), 'write');
            }
            send({ step: 'ig_posts', status: 'done', message: `${posts.length}件取得完了`, progress: Math.round((++completedSteps / totalSteps) * 100) });
          } else {
            send({ step: 'ig_posts', status: 'done', message: 'データなし', progress: Math.round((++completedSteps / totalSteps) * 100) });
          }
        } catch (err) {
          send({ step: 'ig_posts', status: 'error', message: err instanceof Error ? err.message : String(err), progress: Math.round((++completedSteps / totalSteps) * 100) });
        }
      }

      // --- 3. Tagged Posts ---
      if (igId && phaseAllowed('ig_tagged')) {
        send({ step: 'ig_tagged', status: 'running', message: fullMode ? '全期間 タグ付け投稿を取得中...' : 'タグ付け投稿を取得中...', progress: Math.round((completedSteps / totalSteps) * 100) });
        try {
          const posts = await fetchIgTaggedPosts(igId, token, { full: fullMode });
          if (posts.length > 0) {
            const stmts: InStatement[] = posts.map((post) => ({
              sql: `INSERT OR REPLACE INTO instagram_tagged_posts
                (client_id, ig_post_id, posted_at, account_name, caption, media_url, permalink, likes, comments)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              args: [
                clientId, post.ig_post_id, post.posted_at, post.account_name,
                post.caption, post.media_url, post.permalink, post.likes, post.comments,
              ],
            }));
            for (let i = 0; i < stmts.length; i += 100) {
              await db.batch(stmts.slice(i, i + 100), 'write');
            }
            send({ step: 'ig_tagged', status: 'done', message: `${posts.length}件取得完了`, progress: Math.round((++completedSteps / totalSteps) * 100) });
          } else {
            send({ step: 'ig_tagged', status: 'done', message: 'データなし', progress: Math.round((++completedSteps / totalSteps) * 100) });
          }
        } catch (err) {
          send({ step: 'ig_tagged', status: 'error', message: err instanceof Error ? err.message : String(err), progress: Math.round((++completedSteps / totalSteps) * 100) });
        }
      }

      // --- 4. Meta Ads ---
      if (adAccountId && phaseAllowed('meta_ads')) {
        send({ step: 'meta_ads', status: 'running', message: fullMode ? '全期間 Meta広告データを取得中...' : 'Meta広告データを取得中...', progress: Math.round((completedSteps / totalSteps) * 100) });
        try {
          const insights = await fetchMetaAds(adAccountId, token, adsSince, adsUntil);
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
                clientId, row.date, row.publisher_platform || '', row.campaign_id, row.campaign_name, row.campaign_objective,
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
            send({ step: 'meta_ads', status: 'done', message: `${insights.length}件取得完了`, progress: Math.round((++completedSteps / totalSteps) * 100) });
          } else {
            send({ step: 'meta_ads', status: 'done', message: 'データなし', progress: Math.round((++completedSteps / totalSteps) * 100) });
          }
        } catch (err) {
          send({ step: 'meta_ads', status: 'error', message: err instanceof Error ? err.message : String(err), progress: Math.round((++completedSteps / totalSteps) * 100) });
        }
      }

      // --- 5. Meta Ad Creatives (thumbnails) ---
      if (adAccountId && phaseAllowed('meta_creatives')) {
        send({ step: 'meta_creatives', status: 'running', message: '広告クリエイティブを取得中...', progress: Math.round((completedSteps / totalSteps) * 100) });
        try {
          const creatives = await fetchMetaAdCreatives(adAccountId, token, { full: fullMode });
          if (creatives.length > 0) {
            const stmts: InStatement[] = creatives.map((c) => ({
              sql: `INSERT OR REPLACE INTO meta_ad_creatives
                (client_id, ad_id, ad_name, thumbnail_url, image_url, title, body,
                 call_to_action_type, link_url, instagram_permalink_url, effective_object_story_id, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
              args: [
                clientId, c.ad_id, c.ad_name, c.thumbnail_url, c.image_url, c.title, c.body,
                c.call_to_action_type, c.link_url, c.instagram_permalink_url, c.effective_object_story_id,
              ],
            }));
            for (let i = 0; i < stmts.length; i += 100) {
              await db.batch(stmts.slice(i, i + 100), 'write');
            }
            send({ step: 'meta_creatives', status: 'done', message: `${creatives.length}件取得完了`, progress: Math.round((++completedSteps / totalSteps) * 100) });
          } else {
            send({ step: 'meta_creatives', status: 'done', message: 'クリエイティブなし', progress: Math.round((++completedSteps / totalSteps) * 100) });
          }
        } catch (err) {
          send({ step: 'meta_creatives', status: 'error', message: err instanceof Error ? err.message : String(err), progress: Math.round((++completedSteps / totalSteps) * 100) });
        }
      }

      send({ step: 'complete', status: 'done', message: '全データ取得完了', progress: 100 });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
