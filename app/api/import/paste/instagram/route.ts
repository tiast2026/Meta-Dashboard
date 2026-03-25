import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDb } from '@/lib/db';
import type { InStatement } from '@libsql/client';

/**
 * Instagram アカウントインサイトのコピペ取り込み
 * Instagramプロフェッショナルダッシュボードからコピーしたテーブルデータを解析してインポート
 *
 * 期待するフォーマット（タブ区切り or カンマ区切り）:
 * 日付\tインプレッション\tリーチ\tフォロワー数
 * 2024-01-01\t1234\t567\t890
 *
 * または自由形式のテキスト（行ごとに日付と数値を含む）
 */

const DATE_RE = /(\d{4}[-/]\d{1,2}[-/]\d{1,2})/;
const NUM_RE = /[\d,]+/g;

// Japanese header mapping
const HEADER_PATTERNS: Record<string, string> = {
  '日付': 'date',
  'インプレッション': 'impressions',
  '閲覧': 'impressions',
  'リーチ': 'reach',
  'フォロワー': 'followers',
  'フォロー数': 'follows',
  'いいね': 'likes',
  'コメント': 'comments',
  '保存': 'saves',
  'シェア': 'shares',
  'プロフィール': 'profile_views',
  'ウェブサイト': 'website_clicks',
  'アクション': 'actions',
  'インタラクション': 'interactions',
};

function parseNumber(s: string): number {
  return Number(s.replace(/,/g, '')) || 0;
}

function normalizeDate(s: string): string {
  // Convert 2024/1/5 -> 2024-01-05
  const parts = s.split(/[-/]/);
  if (parts.length === 3) {
    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }
  return s;
}

interface ParsedRow {
  date: string;
  impressions: number;
  reach: number;
  actions: number;
  interactions: number;
  comments: number;
  likes: number;
  saves: number;
  shares: number;
  followers: number;
  follows: number;
  posts_count: number;
}

function parseText(text: string): ParsedRow[] {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return [];

  // Detect delimiter: tab or comma
  const firstLine = lines[0];
  const delimiter = firstLine.includes('\t') ? '\t' : ',';

  // Check if first line is a header
  const headerCells = firstLine.split(delimiter).map(c => c.trim());
  const columnMap: Record<number, string> = {};
  let hasHeader = false;

  for (let i = 0; i < headerCells.length; i++) {
    const cell = headerCells[i];
    for (const [jpKey, engKey] of Object.entries(HEADER_PATTERNS)) {
      if (cell.includes(jpKey)) {
        columnMap[i] = engKey;
        hasHeader = true;
        break;
      }
    }
    if (cell.toLowerCase() === 'date' || cell === '日付') {
      columnMap[i] = 'date';
      hasHeader = true;
    }
  }

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const rows: ParsedRow[] = [];

  if (hasHeader && Object.keys(columnMap).length > 0) {
    // Structured: parse using header mapping
    for (const line of dataLines) {
      const cells = line.split(delimiter).map(c => c.trim());
      const row: ParsedRow = {
        date: '', impressions: 0, reach: 0, actions: 0, interactions: 0,
        comments: 0, likes: 0, saves: 0, shares: 0, followers: 0, follows: 0, posts_count: 0,
      };

      for (const [idx, field] of Object.entries(columnMap)) {
        const val = cells[Number(idx)] || '';
        if (field === 'date') {
          const match = val.match(DATE_RE);
          if (match) row.date = normalizeDate(match[1]);
        } else {
          (row as unknown as Record<string, unknown>)[field] = parseNumber(val);
        }
      }

      if (row.date) rows.push(row);
    }
  } else {
    // Unstructured: try to extract date + numbers from each line
    for (const line of dataLines) {
      const dateMatch = line.match(DATE_RE);
      if (!dateMatch) continue;

      const date = normalizeDate(dateMatch[1]);
      const rest = line.replace(dateMatch[0], '');
      const numbers = rest.match(NUM_RE)?.map(n => parseNumber(n)) || [];

      rows.push({
        date,
        impressions: numbers[0] || 0,
        reach: numbers[1] || 0,
        actions: numbers[2] || 0,
        interactions: numbers[3] || 0,
        comments: numbers[4] || 0,
        likes: numbers[5] || 0,
        saves: numbers[6] || 0,
        shares: numbers[7] || 0,
        followers: numbers[8] || 0,
        follows: numbers[9] || 0,
        posts_count: numbers[10] || 0,
      });
    }
  }

  return rows;
}

export async function POST(request: NextRequest) {
  try {
    const { client_id, text } = await request.json();

    if (!client_id) {
      return NextResponse.json({ error: 'client_id は必須です' }, { status: 400 });
    }
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'テキストデータが空です' }, { status: 400 });
    }

    const rows = parseText(text);

    if (rows.length === 0) {
      return NextResponse.json({
        error: 'データを解析できませんでした。日付（YYYY-MM-DD or YYYY/M/D）を含む行が必要です。',
      }, { status: 400 });
    }

    await ensureDb();

    const statements: InStatement[] = rows.map((row) => ({
      sql: `INSERT OR REPLACE INTO instagram_daily_insights
        (client_id, date, impressions, reach, actions, interactions,
         comments, likes, saves, shares, followers, follows, posts_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        client_id, row.date,
        row.impressions, row.reach, row.actions, row.interactions,
        row.comments, row.likes, row.saves, row.shares,
        row.followers, row.follows, row.posts_count,
      ],
    }));

    for (let i = 0; i < statements.length; i += 100) {
      await db.batch(statements.slice(i, i + 100), 'write');
    }

    return NextResponse.json({
      success: true,
      message: `${rows.length}件のデータをインポートしました`,
      rowCount: rows.length,
      sample: rows.slice(0, 3),
    });
  } catch (err) {
    console.error('Paste import error:', err);
    return NextResponse.json(
      { error: `インポートエラー: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
