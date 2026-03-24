/**
 * BigQuery セットアップスクリプト
 * データセット作成 → 全テーブル作成 → 管理者ユーザー作成
 *
 * 使い方:
 *   GOOGLE_APPLICATION_CREDENTIALS_JSON='...' npx tsx lib/setup-bq.ts
 */
import { BigQuery } from '@google-cloud/bigquery';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

const credJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
if (!credJson) {
  console.error('ERROR: GOOGLE_APPLICATION_CREDENTIALS_JSON が設定されていません');
  process.exit(1);
}

const credentials = JSON.parse(credJson);
const projectId = credentials.project_id;
const bq = new BigQuery({ projectId, credentials });

async function run() {
  console.log(`\n=== BigQuery セットアップ (project: ${projectId}) ===\n`);

  // 1. データセット作成
  const datasets = ['master', 'instagram_analytics', 'meta_ads'];
  for (const ds of datasets) {
    try {
      await bq.createDataset(ds, { location: 'US' });
      console.log(`✓ データセット作成: ${ds}`);
    } catch (e: unknown) {
      const err = e as { code?: number };
      if (err.code === 409) {
        console.log(`  データセット既存: ${ds}`);
      } else {
        throw e;
      }
    }
  }

  // 2. SQLファイルを順番に実行
  const bqDir = path.join(process.cwd(), 'bigquery');
  const sqlFiles = fs.readdirSync(bqDir)
    .filter(f => f.endsWith('.sql') && !f.startsWith('000'))
    .sort();

  console.log(`\n--- テーブル作成 (${sqlFiles.length} ファイル) ---\n`);

  for (const file of sqlFiles) {
    const sql = fs.readFileSync(path.join(bqDir, file), 'utf-8');
    // コメント行を除去し、CREATE文を抽出
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.toUpperCase().startsWith('CREATE'));

    for (const stmt of statements) {
      try {
        await bq.query(stmt);
        console.log(`✓ ${file}`);
      } catch (e: unknown) {
        const err = e as { message?: string };
        if (err.message?.includes('Already Exists')) {
          console.log(`  既存: ${file}`);
        } else {
          console.error(`✗ ${file}: ${err.message}`);
        }
      }
    }
  }

  // 3. 管理者ユーザー作成
  console.log('\n--- 管理者ユーザー ---\n');

  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const table = `\`${projectId}.master.admin_users\``;

  const [existing] = await bq.query({
    query: `SELECT id FROM ${table} WHERE email = @email LIMIT 1`,
    params: { email },
  });

  if (existing.length === 0) {
    const hash = bcrypt.hashSync(password, 10);
    await bq.query({
      query: `INSERT INTO ${table} (id, email, password_hash, created_at)
              VALUES (@id, @email, @hash, CURRENT_TIMESTAMP())`,
      params: { id: uuidv4(), email, hash },
    });
    console.log(`✓ 管理者作成: ${email} / ${password}`);
  } else {
    console.log(`  管理者既存: ${email}`);
  }

  console.log('\n=== セットアップ完了 ===\n');
}

run().catch((e) => {
  console.error('セットアップ失敗:', e.message);
  process.exit(1);
});
