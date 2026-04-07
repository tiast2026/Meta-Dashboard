"use client";

import { Suspense } from "react";
import { useDashboard, useFetchData } from "@/lib/use-dashboard";
import { ErrorBanner } from "@/components/dashboard/error-banner";
import { PageHeader } from "@/components/dashboard/page-header";
import { TaggedPostsTable } from "@/components/dashboard/tagged-posts-table";
import { Tag } from "lucide-react";

interface TaggedData {
  posts: Array<{
    ig_post_id: string;
    account_name: string;
    caption: string;
    media_url: string;
    permalink: string;
    posted_at: string;
    likes: number;
    comments: number;
  }>;
}

interface IgData {
  client: { name: string };
}

function TaggedContent() {
  const { token, from, to, handleDateChange } = useDashboard();

  const { data: igData } = useFetchData<IgData>(
    `/api/dashboard/${token}/instagram?from=${from}&to=${to}`
  );
  const { data, loading, error } = useFetchData<TaggedData>(
    `/api/dashboard/${token}/tagged-posts?from=${from}&to=${to}`
  );

  const posts = data?.posts || [];

  // Account ranking
  const accountCounts: Record<string, number> = {};
  posts.forEach((p) => {
    accountCounts[p.account_name] = (accountCounts[p.account_name] || 0) + 1;
  });
  const accountRanking = Object.entries(accountCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <div>
      <PageHeader
        title="タグ付け分析"
        clientName={igData?.client?.name}
        from={from}
        to={to}
        onDateChange={handleDateChange}
        loading={loading}
      />

      <div className="px-6 py-6 space-y-6">
        {error && <ErrorBanner message={error} />}
        {loading ? (
          <div className="h-[400px] animate-pulse rounded-xl bg-gray-100" />
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-white p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
                  <Tag className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">総タグ付け数</p>
                  <p className="text-3xl font-bold text-gray-900">{posts.length}</p>
                </div>
              </div>
            </div>

            {/* Account Ranking */}
            {accountRanking.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4">タグ付けアカウントランキング</h2>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-sm text-gray-500 py-2">アカウント名</th>
                      <th className="text-right text-sm text-gray-500 py-2">タグ付け投稿数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accountRanking.map(([name, count]) => (
                      <tr key={name} className="border-b border-gray-50">
                        <td className="py-2.5 text-sm font-medium text-indigo-600">{name}</td>
                        <td className="py-2.5 text-sm text-right text-gray-900">{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tagged Posts Table */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">タグ付け投稿一覧</h2>
                <p className="text-sm text-gray-500">表示件数: {posts.length}件</p>
              </div>
              <TaggedPostsTable posts={posts as never[]} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function TaggedPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-gray-400">読み込み中...</div>}>
      <TaggedContent />
    </Suspense>
  );
}
