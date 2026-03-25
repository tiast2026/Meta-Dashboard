import { NextRequest, NextResponse } from 'next/server';
import { queryOne, table, DATASET_MASTER } from '@/lib/bq';
import { db, ensureDb } from '@/lib/db';
import { fetchMetaAds } from '@/lib/meta-api';
import type { InStatement } from '@libsql/client';

const T = table(DATASET_MASTER, 'clients');

export async function POST(request: NextRequest) {
  try {
    const { client_id, since, until } = await request.json();
    if (!client_id) {
      return NextResponse.json({ error: 'client_id は必須です' }, { status: 400 });
    }

    const client = await queryOne<Record<string, unknown>>(
      `SELECT meta_ad_account_id, meta_access_token FROM ${T} WHERE client_id = @id LIMIT 1`,
      { id: client_id }
    );
    if (!client) {
      return NextResponse.json({ error: 'クライアントが見つかりません' }, { status: 404 });
    }

    const token = client.meta_access_token as string;
    const adAccountId = client.meta_ad_account_id as string;
    if (!token) {
      return NextResponse.json({ error: 'アクセストークンが設定されていません' }, { status: 400 });
    }
    if (!adAccountId) {
      return NextResponse.json({ error: 'Meta広告アカウントIDが設定されていません' }, { status: 400 });
    }

    // Default: last 30 days
    const now = new Date();
    const defaultUntil = now.toISOString().slice(0, 10);
    const defaultSince = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);

    const insights = await fetchMetaAds(
      adAccountId, token,
      since || defaultSince,
      until || defaultUntil
    );

    if (insights.length === 0) {
      return NextResponse.json({ success: true, message: '取得可能な広告データがありませんでした', rowCount: 0 });
    }

    await ensureDb();

    const statements: InStatement[] = insights.map((row) => ({
      sql: `INSERT OR REPLACE INTO meta_ad_insights
        (client_id, date, campaign_id, campaign_name, campaign_objective,
         adset_id, adset_name, ad_id, ad_name,
         impressions, reach, clicks, results, spend)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        client_id, row.date, row.campaign_id, row.campaign_name, row.campaign_objective,
        row.adset_id, row.adset_name, row.ad_id, row.ad_name,
        row.impressions, row.reach, row.clicks, row.results, row.spend,
      ],
    }));

    for (let i = 0; i < statements.length; i += 100) {
      await db.batch(statements.slice(i, i + 100), 'write');
    }

    return NextResponse.json({
      success: true,
      message: `Meta広告データ ${statements.length}件を取得・保存しました`,
      rowCount: statements.length,
    });
  } catch (err) {
    console.error('Meta ads fetch error:', err);
    return NextResponse.json(
      { error: `取得エラー: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
