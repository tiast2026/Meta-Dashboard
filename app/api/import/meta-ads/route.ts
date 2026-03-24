import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import Papa from 'papaparse';

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
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const clientId = formData.get('client_id') as string;

  if (!file || !clientId) {
    return NextResponse.json({ error: 'file and client_id are required' }, { status: 400 });
  }

  const csvText = await file.text();
  const { data, errors } = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (errors.length > 0) {
    return NextResponse.json({ error: 'CSV parse error', details: errors }, { status: 400 });
  }

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO meta_ad_insights
    (client_id, date, publisher_platform, campaign_id, campaign_name, campaign_objective, adset_id, adset_name, ad_id, ad_name, impressions, reach, clicks, results, website_actions, spend)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((rows: Record<string, string>[]) => {
    let count = 0;
    for (const row of rows) {
      const mapped = mapHeaders(row);
      if (!mapped.date) continue;
      stmt.run(
        clientId,
        mapped.date,
        mapped.publisher_platform || null,
        mapped.campaign_id || null,
        mapped.campaign_name || null,
        mapped.campaign_objective || null,
        mapped.adset_id || null,
        mapped.adset_name || null,
        mapped.ad_id || null,
        mapped.ad_name || null,
        mapped.impressions || 0,
        mapped.reach || 0,
        mapped.clicks || 0,
        mapped.results || 0,
        mapped.website_actions || 0,
        mapped.spend || 0
      );
      count++;
    }
    return count;
  });

  const rowCount = insertMany(data);

  return NextResponse.json({ success: true, rowCount });
}
