# Instagram Dashboard - Architecture Memo

## Overview

Next.js 14 (App Router) + TypeScript のダッシュボードアプリケーション。
クライアントごとにInstagramインサイト・Meta広告データを可視化する。

## Data Layer

| Layer | Technology | Purpose |
|---|---|---|
| Metadata DB | Turso (libSQL) / Local SQLite | クライアント管理・認証情報 (`lib/db.ts`) |
| Analytics | Google BigQuery | Instagram投稿・広告の実データ保存 (`lib/bq.ts`) |
| Auth | NextAuth | 管理画面のログイン (`lib/auth.ts`) |

## Page Structure

```
app/
├── page.tsx                          # Top page
├── dashboard/[token]/page.tsx        # Public dashboard (accessed via share_token, no auth required)
├── admin/
│   ├── login/page.tsx                # Admin login
│   ├── page.tsx                      # Client list
│   ├── clients/[id]/page.tsx         # Client detail (token management, CSV import)
│   └── guide/page.tsx                # Guide page
```

## API Structure

```
api/
├── auth/[...nextauth]/               # NextAuth
├── clients/                           # Client CRUD
│   └── [id]/
│       ├── test-connection/           # API connection test
│       ├── token-info/               # Token info
│       ├── exchange-token/           # Short-lived -> long-lived token exchange
│       ├── permanent-token/          # Permanent token
├── import/                            # Data import to BigQuery
│   ├── instagram/                     # Account insights
│   ├── instagram-posts/              # Post insights
│   ├── tagged-posts/                 # Tagged posts
│   └── meta-ads/                     # Meta Ads data
├── dashboard/[token]/                 # Dashboard data endpoints
│   ├── instagram/                     # IG account KPI & daily trends
│   ├── posts/                         # Post list
│   ├── tagged-posts/                 # Tagged posts
│   └── meta-ads/                     # Ad campaign data
```

## Dashboard UI Components (`components/dashboard/`)

- **KpiCard** - Reach, followers, engagement, etc.
- **FollowerTrendChart** / **DailyTrendChart** / **EngagementChart** (Recharts)
- **PostTable** / **TaggedPostsTable** / **CampaignTable**
- **PlatformBreakdown** / **DateRangePicker**
- Tab switching: **Instagram** / **Meta Ads**

## BigQuery Schema (`bigquery/`)

- Instagram (`010-016`): Account insights, posts, stories, tagged posts, follower demographics/active time/geo
- Ads (`020-027`): Ad insights, actions, products, placements, creatives, demographics, hourly, geo

## Main Flow

1. Admin registers clients and sets Meta API tokens in admin panel
2. Import APIs fetch Instagram/Meta Ads data into BigQuery
3. Clients receive a share_token URL -> view dashboard without authentication

## Key Dependencies

- next@14, react@18, next-auth@4
- @google-cloud/bigquery, @libsql/client
- recharts (charts), shadcn/ui (UI components), tailwindcss
- date-fns, zod, papaparse (CSV parsing)

## Vercel Deploy Notes

### vercel.json に環境変数を書かないこと

`vercel.json` の `env` で `"@secret-name"` 形式のVercel Secret参照を使うと、そのSecretがVercelに存在しない場合 **全デプロイがサイレントにブロックされる**。Git連携・Deploy Hook どちらもエラー表示なしで失敗する。

**対策:**
- 環境変数は **Vercelダッシュボード > Settings > Environment Variables** で設定する
- `vercel.json` には `env` セクションを書かない
- デプロイが原因不明で止まった場合は `npx vercel --prod` (CLI) で直接デプロイしてエラーメッセージを確認する

### デプロイ方法

- mainへのpush → GitHub Actions CI成功後に Deploy Hook で自動デプロイ
- Deploy Hook URL は GitHub Secret `VERCEL_DEPLOY_HOOK` に保存済み
- Git連携が壊れた場合は Vercel CLI (`npx vercel --prod --token <TOKEN> --scope tiast2026s-projects`) で直接デプロイ
