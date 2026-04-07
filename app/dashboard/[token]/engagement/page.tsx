"use client";

import { Suspense } from "react";
import { useDashboard, useFetchData } from "@/lib/use-dashboard";
import { ErrorBanner } from "@/components/dashboard/error-banner";
import { PageHeader } from "@/components/dashboard/page-header";
import { EngagementChart } from "@/components/dashboard/engagement-chart";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Heart, MessageCircle, Bookmark, Share2 } from "lucide-react";

interface IgData {
  client: { name: string };
  kpi: Record<string, number>;
  daily: Array<{ date: string; likes: number; comments: number; saves: number; shares: number }>;
}

interface PostsData {
  posts: Array<{ likes: number; comments: number; saves: number; shares: number; reach: number }>;
}

function EngagementContent() {
  const { token, from, to, handleDateChange } = useDashboard();

  const { data: igData, loading: igLoading, error: igError } = useFetchData<IgData>(
    `/api/dashboard/${token}/instagram?from=${from}&to=${to}`
  );
  const { data: postsData } = useFetchData<PostsData>(
    `/api/dashboard/${token}/posts?from=${from}&to=${to}`
  );

  const posts = postsData?.posts || [];
  const totalLikes = posts.reduce((s, p) => s + (Number(p.likes) || 0), 0);
  const totalComments = posts.reduce((s, p) => s + (Number(p.comments) || 0), 0);
  const totalSaves = posts.reduce((s, p) => s + (Number(p.saves) || 0), 0);
  const totalShares = posts.reduce((s, p) => s + (Number(p.shares) || 0), 0);
  const totalReach = posts.reduce((s, p) => s + (Number(p.reach) || 0), 0);
  const avgER = totalReach > 0 ? ((totalLikes + totalComments + totalSaves) / totalReach * 100) : 0;

  const daily = igData?.daily || [];
  const engagementData = daily.map((d) => ({
    date: d.date,
    likes: Number(d.likes) || 0,
    comments: Number(d.comments) || 0,
    saves: Number(d.saves) || 0,
    shares: Number(d.shares) || 0,
  }));

  return (
    <div>
      <PageHeader
        title="エンゲージメント分析"
        clientName={igData?.client?.name}
        from={from}
        to={to}
        onDateChange={handleDateChange}
        loading={igLoading}
      />

      <div className="px-6 py-6 space-y-6">
        {igError && <ErrorBanner message={igError} />}
        {igLoading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[100px] animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              <KpiCard title="いいね合計" value={totalLikes} icon={<Heart className="h-4 w-4" />} />
              <KpiCard title="コメント合計" value={totalComments} icon={<MessageCircle className="h-4 w-4" />} />
              <KpiCard title="保存合計" value={totalSaves} icon={<Bookmark className="h-4 w-4" />} />
              <KpiCard title="シェア合計" value={totalShares} icon={<Share2 className="h-4 w-4" />} />
              <KpiCard title="平均ER" value={avgER.toFixed(2) + "%"} />
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <EngagementChart data={engagementData} />
            </div>

            {daily.length === 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                エンゲージメントの日次データがありません。KPIは投稿データから集計しています。
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function EngagementPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-gray-400">読み込み中...</div>}>
      <EngagementContent />
    </Suspense>
  );
}
