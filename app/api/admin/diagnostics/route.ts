import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDb } from '@/lib/db';
import { queryOne, table, DATASET_MASTER } from '@/lib/bq';

const T = table(DATASET_MASTER, 'clients');

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const META_API_VERSION = 'v22.0';
const META_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

interface ClientRow {
  client_id: string;
  name: string;
  instagram_account_id: string | null;
  meta_ad_account_id: string | null;
  meta_access_token: string | null;
}

/**
 * Diagnostics endpoint.
 *
 * Usage (either parameter works):
 *   GET /api/admin/diagnostics?client_id=xxxx
 *   GET /api/admin/diagnostics?token=xxxx     (the share_token from the
 *                                              dashboard URL)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientIdParam = searchParams.get('client_id');
  const token = searchParams.get('token');
  if (!clientIdParam && !token) {
    return NextResponse.json({ error: 'client_id or token query param is required' }, { status: 400 });
  }

  await ensureDb();

  const client = (await queryOne<ClientRow>(
    clientIdParam
      ? `SELECT client_id, name, instagram_account_id, meta_ad_account_id, meta_access_token FROM ${T} WHERE client_id = @id LIMIT 1`
      : `SELECT client_id, name, instagram_account_id, meta_ad_account_id, meta_access_token FROM ${T} WHERE share_token = @id LIMIT 1`,
    { id: clientIdParam || token }
  )) as ClientRow | undefined;

  if (!client) {
    return NextResponse.json({
      error: 'client not found',
      hint: 'Use either ?client_id=<uuid> (from /admin/clients/<id>) or ?token=<share_token> (from dashboard URL)'
    }, { status: 404 });
  }
  const clientId = client.client_id;

  // ── Row counts ──────────────────────────────────────────
  const counts: Record<string, number> = {};
  const tables = [
    'instagram_daily_insights',
    'instagram_posts',
    'instagram_tagged_posts',
    'meta_ad_insights',
    'meta_ad_creatives',
    'meta_ad_breakdowns',
  ];
  for (const t of tables) {
    try {
      const r = await db.execute({
        sql: `SELECT COUNT(*) as c FROM ${t} WHERE client_id = ?`,
        args: [clientId],
      });
      counts[t] = Number(r.rows[0]?.c) || 0;
    } catch {
      counts[t] = -1; // table doesn't exist
    }
  }

  // ── Meta_ad_creatives sample ────────────────────────────
  let creativesSample: unknown[] = [];
  try {
    const r = await db.execute({
      sql: `SELECT ad_id, ad_name, thumbnail_url, image_url, instagram_permalink_url
            FROM meta_ad_creatives WHERE client_id = ? LIMIT 5`,
      args: [clientId],
    });
    creativesSample = r.rows;
  } catch {
    // ignore
  }

  // ── Distinct breakdown_types in DB ──────────────────────
  let breakdownTypesInDb: unknown[] = [];
  try {
    const r = await db.execute({
      sql: `SELECT breakdown_type, COUNT(*) as c FROM meta_ad_breakdowns
            WHERE client_id = ? GROUP BY breakdown_type`,
      args: [clientId],
    });
    breakdownTypesInDb = r.rows;
  } catch {
    // ignore
  }

  // ── Aggregate action columns sum to see if any data is in there ──
  let actionColumnSums: Record<string, number> = {};
  try {
    const r = await db.execute({
      sql: `SELECT
        COALESCE(SUM(purchase),0) as purchase,
        COALESCE(SUM(purchase_value),0) as purchase_value,
        COALESCE(SUM(add_to_cart),0) as add_to_cart,
        COALESCE(SUM(initiate_checkout),0) as initiate_checkout,
        COALESCE(SUM(view_content),0) as view_content,
        COALESCE(SUM(lead),0) as lead,
        COALESCE(SUM(complete_registration),0) as complete_registration,
        COALESCE(SUM(link_click),0) as link_click,
        COALESCE(SUM(page_engagement),0) as page_engagement,
        COALESCE(SUM(post_engagement),0) as post_engagement,
        COALESCE(SUM(video_view),0) as video_view
      FROM meta_ad_insights WHERE client_id = ?`,
      args: [clientId],
    });
    if (r.rows[0]) {
      actionColumnSums = Object.fromEntries(
        Object.entries(r.rows[0]).map(([k, v]) => [k, Number(v) || 0])
      );
    }
  } catch {
    // ignore
  }

  // ── Live sample from Meta API (raw action_types) ────────
  let liveMetaActionTypes: string[] = [];
  let liveMetaError: string | null = null;
  let liveMetaSampleRow: unknown = null;
  let liveMetaCreativeSample: unknown = null;

  if (client.meta_ad_account_id && client.meta_access_token) {
    const acc = client.meta_ad_account_id.startsWith('act_')
      ? client.meta_ad_account_id
      : `act_${client.meta_ad_account_id}`;
    const token = client.meta_access_token;
    try {
      // Last 14 days, just enough to see real data
      const until = new Date().toISOString().slice(0, 10);
      const since = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
      const url = `${META_BASE}/${acc}/insights?fields=ad_id,ad_name,impressions,spend,actions,action_values&level=ad&time_range={"since":"${since}","until":"${until}"}&limit=10&access_token=${token}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      const data = await res.json();
      if (data.error) {
        liveMetaError = `${data.error.message} (code: ${data.error.code})`;
      } else {
        const rows = (data.data as Record<string, unknown>[]) || [];
        const found = new Set<string>();
        for (const row of rows) {
          const actions = row.actions as { action_type: string; value: string }[] | undefined;
          if (actions) for (const a of actions) found.add(a.action_type);
        }
        liveMetaActionTypes = Array.from(found).sort();
        // First non-empty row as a sample
        liveMetaSampleRow = rows.find((r) => Array.isArray(r.actions) && (r.actions as unknown[]).length > 0) || rows[0];
      }
    } catch (err) {
      liveMetaError = err instanceof Error ? err.message : String(err);
    }

    // Live creatives sample
    try {
      const url = `${META_BASE}/${acc}/ads?fields=id,name,creative{thumbnail_url,image_url,title,instagram_permalink_url}&limit=3&access_token=${token}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      const data = await res.json();
      if (data.error) {
        liveMetaCreativeSample = { error: `${data.error.message} (code: ${data.error.code})` };
      } else {
        liveMetaCreativeSample = data.data;
      }
    } catch (err) {
      liveMetaCreativeSample = { error: err instanceof Error ? err.message : String(err) };
    }
  }

  return NextResponse.json({
    client: {
      id: client.client_id,
      name: client.name,
      has_ig: !!client.instagram_account_id,
      has_ads: !!client.meta_ad_account_id,
      has_token: !!client.meta_access_token,
    },
    db_row_counts: counts,
    creatives_sample: creativesSample,
    breakdown_types_in_db: breakdownTypesInDb,
    action_column_sums: actionColumnSums,
    live_meta_api: {
      action_types_found: liveMetaActionTypes,
      sample_row: liveMetaSampleRow,
      creative_sample: liveMetaCreativeSample,
      error: liveMetaError,
    },
  });
}
