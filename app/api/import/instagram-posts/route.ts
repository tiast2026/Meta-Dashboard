import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, ensureDb } from '@/lib/db';
import Papa from 'papaparse';
import type { InStatement } from '@libsql/client';

const HEADER_MAP: Record<string, string> = {
  'ID': 'ig_post_id',
  '投稿内容': 'caption',
  'メディアのプロダクトタイプ': 'product_type',
  'メディアの種別': 'media_type',
  'メディアURL': 'media_url',
  '投稿URL': 'permalink',
  '投稿日時': 'posted_at',
  '閲覧数': 'impressions',
  'リーチ': 'reach',
  'インタラクション数': 'interactions',
  'いいね数': 'likes',
  'コメント数': 'comments',
  '保存数': 'saves',
  'シェア数': 'shares',
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

  await ensureDb();

  const statements: InStatement[] = [];
  for (const row of data) {
    const mapped = mapHeaders(row);
    if (!mapped.ig_post_id) continue;
    statements.push({
      sql: `INSERT OR REPLACE INTO instagram_posts
        (client_id, ig_post_id, caption, product_type, media_type, media_url, permalink, posted_at, impressions, reach, interactions, likes, comments, saves, shares)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        clientId, mapped.ig_post_id,
        mapped.caption || null, mapped.product_type || null,
        mapped.media_type || null, mapped.media_url || null,
        mapped.permalink || null, mapped.posted_at || null,
        Number(mapped.impressions) || 0, Number(mapped.reach) || 0,
        Number(mapped.interactions) || 0, Number(mapped.likes) || 0,
        Number(mapped.comments) || 0, Number(mapped.saves) || 0,
        Number(mapped.shares) || 0,
      ],
    });
  }

  for (let i = 0; i < statements.length; i += 100) {
    await db.batch(statements.slice(i, i + 100), 'write');
  }

  return NextResponse.json({ success: true, rowCount: statements.length });
}
