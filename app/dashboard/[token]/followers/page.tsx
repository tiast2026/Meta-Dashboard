"use client";

import { Suspense } from "react";
import { useDashboard, useFetchData } from "@/lib/use-dashboard";
import { ErrorBanner } from "@/components/dashboard/error-banner";
import { PageHeader } from "@/components/dashboard/page-header";
import { FollowerTrendChart } from "@/components/dashboard/follower-trend-chart";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Users, UserPlus } from "lucide-react";

interface IgData {
  client: { name: string };
  kpi: Record<string, number>;
  previous_kpi: Record<string, number>;
  daily: Array<{ date: string; followers: number; follows: number }>;
}

function FollowersContent() {
  const { token, from, to, handleDateChange } = useDashboard();

  const { data, loading, error } = useFetchData<IgData>(
    `/api/dashboard/${token}/instagram?from=${from}&to=${to}`
  );

  const kpi = data?.kpi || {};
  const daily = data?.daily || [];

  const followerData = daily.map((d) => ({
    date: d.date,
    followers: Number(d.followers) || 0,
  }));

  // Calculate follower change
  const latestFollowers = followerData.length > 0 ? followerData[followerData.length - 1].followers : 0;
  const firstFollowers = followerData.length > 0 ? followerData[0].followers : 0;
  const followerChange = latestFollowers - firstFollowers;

  return (
    <div>
      <PageHeader
        title="フォロワー分析"
        clientName={data?.client?.name}
        from={from}
        to={to}
        onDateChange={handleDateChange}
      />

      <div className="px-6 py-6 space-y-6">
        {error && <ErrorBanner message={error} />}
        {loading ? (
          <div className="h-[400px] animate-pulse rounded-xl bg-gray-100" />
        ) : (
          <>
            {/* Follower KPI */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiCard title="フォロワー数" value={latestFollowers} icon={<Users className="h-4 w-4" />} suffix="人" />
              <KpiCard title="フォロワー増減" value={followerChange >= 0 ? `+${followerChange}` : String(followerChange)} icon={<UserPlus className="h-4 w-4" />} />
              <KpiCard title="フォロー数" value={Number(kpi.follows) || 0} />
              <KpiCard title="投稿数" value={Number(kpi.posts_count) || 0} />
            </div>

            {/* Follower Chart */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <FollowerTrendChart data={followerData} />
            </div>

            {/* Info message if no daily data */}
            {daily.length === 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                フォロワーの日次データがありません。管理画面の「Instagramインサイト コピペ取込」からデータを取り込んでください。
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function FollowersPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-gray-400">読み込み中...</div>}>
      <FollowersContent />
    </Suspense>
  );
}
