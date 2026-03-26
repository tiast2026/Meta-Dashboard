"use client";

import { Suspense } from "react";
import { useDashboard, useFetchData } from "@/lib/use-dashboard";
import { PageHeader } from "@/components/dashboard/page-header";
import { PostTable } from "@/components/dashboard/post-table";

interface PostsData {
  posts: Array<{
    ig_post_id: string;
    caption: string;
    product_type: string;
    media_type: string;
    media_url: string;
    permalink: string;
    posted_at: string;
    impressions: number;
    reach: number;
    interactions: number;
    likes: number;
    comments: number;
    saves: number;
    shares: number;
  }>;
}

interface IgData {
  client: { name: string };
}

function PostsContent() {
  const { token, from, to, handleDateChange } = useDashboard();

  const { data: igData } = useFetchData<IgData>(
    `/api/dashboard/${token}/instagram?from=${from}&to=${to}`
  );
  const { data, loading } = useFetchData<PostsData>(
    `/api/dashboard/${token}/posts?from=${from}&to=${to}`
  );

  const posts = data?.posts || [];
  const totalPosts = posts.length;
  const totalLikes = posts.reduce((s, p) => s + (p.likes || 0), 0);
  const totalComments = posts.reduce((s, p) => s + (p.comments || 0), 0);
  const totalSaves = posts.reduce((s, p) => s + (p.saves || 0), 0);
  const totalImpressions = posts.reduce((s, p) => s + (p.impressions || 0), 0);
  const totalReach = posts.reduce((s, p) => s + (p.reach || 0), 0);
  const avgER = totalReach > 0 ? ((totalLikes + totalComments + totalSaves) / totalReach * 100) : 0;

  return (
    <div>
      <PageHeader
        title="投稿一覧"
        clientName={igData?.client?.name}
        from={from}
        to={to}
        onDateChange={handleDateChange}
      />

      <div className="px-6 py-6 space-y-6">
        {loading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[120px] animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : (
          <>
            {/* KPI Summary Cards (CCX social style) */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {[
                { title: "フィード投稿数", total: totalPosts, avg: null },
                { title: "インプレッション数", total: totalImpressions, avg: totalPosts > 0 ? (totalImpressions / totalPosts).toFixed(2) : "0" },
                { title: "リーチ数", total: totalReach, avg: totalPosts > 0 ? (totalReach / totalPosts).toFixed(2) : "0" },
                { title: "いいね数", total: totalLikes, avg: totalPosts > 0 ? (totalLikes / totalPosts).toFixed(2) : "0" },
                { title: "保存数", total: totalSaves, avg: totalPosts > 0 ? (totalSaves / totalPosts).toFixed(2) : "0" },
                { title: "エンゲージメント率", total: null, avg: avgER.toFixed(2) + "%" },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-gray-200 bg-white p-5">
                  <p className="text-sm text-gray-500 mb-3">{item.title}</p>
                  <div className="border-t border-gray-100 pt-3">
                    {item.total !== null && (
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-xs text-gray-400">合計</span>
                        <span className="text-2xl font-bold text-gray-900">{item.total.toLocaleString()}</span>
                      </div>
                    )}
                    {item.avg !== null && (
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-gray-400">{item.total !== null ? "投稿平均" : ""}</span>
                        <span className={`font-bold text-gray-900 ${item.total === null ? "text-2xl" : "text-lg"}`}>{item.avg}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Post Table */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">投稿一覧</h2>
                <p className="text-sm text-gray-500">表示件数: {totalPosts}件</p>
              </div>
              <PostTable posts={posts as never[]} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function PostsPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-gray-400">読み込み中...</div>}>
      <PostsContent />
    </Suspense>
  );
}
