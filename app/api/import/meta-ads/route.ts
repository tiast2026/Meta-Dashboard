import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDb } from '@/lib/db';
import Papa from 'papaparse';
import type { InStatement } from '@libsql/client';

const HEADER_MAP: Record<string, string> = {
  '日付': 'date',
  'パブリッシャープラットフォーム': 'publisher_platform',
  'キャンペーンID': 'campaign_id',
  'キャンペーン名': 'campaign_name',
  'キャンペーンの目的': 'campaign_objective',
  '広告セットID': 'adset_id',
  '広告セット名': 'adset_name',
  '広告ID': 'ad_id',
  '広告名': 'ad_name',
  'インプレッション': 'impressions',
  'リーチ': 'reach',
  'クリック': 'clicks',
  '結果': 'results',
  'ウェブサイト': 'website_actions',
  '消化金額': 'spend',
};

function mapHeaders(row: Record<string, string>): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const [csvKey, value] of Object.entries(row)) {
    for (const [jpKey, engKey] of Object.entries(HEADER_MAP)) {
      if (csvKey.startsWith(jpKey)) {
        mapped[engKey] = value;
        break;
      }
    }
  }
  return mapped;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const clientId = formData.get('client_id') as string;

    if (!file || !clientId) {
      return NextResponse.json({ error: 'ファイルとクライアントIDが必要です' }, { status: 400 });
    }

    const csvText = await file.text();
    const { data, errors } = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (errors.length > 0) {
      return NextResponse.json({ error: `CSVの解析に失敗しました: ${errors[0].message}` }, { status: 400 });
    }

    if (data.length === 0) {
      return NextResponse.json({ error: 'CSVにデータ行がありません。ヘッダー行の下にデータを入力してください。' }, { status: 400 });
    }

    await ensureDb();

    const statements: InStatement[] = [];
    let skippedRows = 0;
    for (const row of data) {
      const mapped = mapHeaders(row);
      if (!mapped.date) { skippedRows++; continue; }
      statements.push({
        sql: `INSERT OR REPLACE INTO meta_ad_insights
          (client_id, date, publisher_platform, campaign_id, campaign_name, campaign_objective, adset_id, adset_name, ad_id, ad_name, impressions, reach, clicks, results, website_actions, spend)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          clientId, mapped.date,
          mapped.publisher_platform || null, mapped.campaign_id || null,
          mapped.campaign_name || null, mapped.campaign_objective || null,
          mapped.adset_id || null, mapped.adset_name || null,
          mapped.ad_id || null, mapped.ad_name || null,
          Number(mapped.impressions) || 0, Number(mapped.reach) || 0,
          Number(mapped.clicks) || 0, Number(mapped.results) || 0,
          Number(mapped.website_actions) || 0, Number(mapped.spend) || 0,
        ],
      });
    }

    if (statements.length === 0) {
      return NextResponse.json({ error: `インポート可能な行がありません。${skippedRows > 0 ? `${skippedRows}行は「日付」列が空のためスキップされました。` : 'CSVのヘッダーが正しいか確認してください。'}` }, { status: 400 });
    }

    for (let i = 0; i < statements.length; i += 100) {
      await db.batch(statements.slice(i, i + 100), 'write');
    }

    return NextResponse.json({ success: true, message: `${statements.length}件の広告データをインポートしました${skippedRows > 0 ? `（${skippedRows}行スキップ）` : ''}`, rowCount: statements.length });
  } catch (err) {
    console.error('Meta ads import error:', err);
    return NextResponse.json({ error: `インポート中にエラーが発生しました: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 });
  }
}
