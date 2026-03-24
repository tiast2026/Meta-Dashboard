import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, ensureDb } from '@/lib/db';
import Papa from 'papaparse';
import type { InStatement } from '@libsql/client';

const HEADER_MAP: Record<string, string> = {
  '日付': 'date',
  '閲覧数': 'impressions',
  'リーチ': 'reach',
  'アクションを実行し': 'actions',
  'インタラクション数': 'interactions',
  'コメント数': 'comments',
  'いいね数': 'likes',
  '保存数': 'saves',
  'シェア数': 'shares',
  'フォロワー数': 'followers',
  'フォロー数': 'follows',
  '投稿数': 'posts_count',
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
    if (!mapped.date) continue;
    statements.push({
      sql: `INSERT OR REPLACE INTO instagram_daily_insights
        (client_id, date, impressions, reach, actions, interactions, comments, likes, saves, shares, followers, follows, posts_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        clientId, mapped.date,
        Number(mapped.impressions) || 0, Number(mapped.reach) || 0,
        Number(mapped.actions) || 0, Number(mapped.interactions) || 0,
        Number(mapped.comments) || 0, Number(mapped.likes) || 0,
        Number(mapped.saves) || 0, Number(mapped.shares) || 0,
        Number(mapped.followers) || 0, Number(mapped.follows) || 0,
        Number(mapped.posts_count) || 0,
      ],
    });
  }

  for (let i = 0; i < statements.length; i += 100) {
    await db.batch(statements.slice(i, i + 100), 'write');
  }

  return NextResponse.json({ success: true, rowCount: statements.length });
}
