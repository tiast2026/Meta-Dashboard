"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Eye, Users, Heart, UserPlus, Target, Megaphone, ArrowRight } from "lucide-react";
import { useDashboard, useFetchData } from "@/lib/use-dashboard";
import { ErrorBanner } from "@/components/dashboard/error-banner";
import { PageHeader } from "@/components/dashboard/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";

function calcChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

interface IgData {
  client: { name: string };
  kpi: Record<string, number>;
  previous_kpi: Record<string, number>;
  daily: unknown[];
}

interface AdsData {
  kpi: Record<string, number>;
  previous_kpi: Record<string, number>;
}

interface TopPost {
  ig_post_id: string;
  caption: string;
  permalink: string;
  media_url: string;
  posted_at: string;
  likes: number;
  comments: number;
  saves: number;
  reach: number;
}

interface PostsResp {
  posts: TopPost[];
}

function DashboardContent() {
  const { token, from, to, handleDateChange } = useDashboard();
  const params = useParams();
  const basePath = `/dashboard/${params.token}`;

  const { data: igData, loading: igLoading, error: igError } = useFetchData<IgData>(
    `/api/dashboard/${token}/instagram?from=${from}&to=${to}`
  );
  const { data: adsData, loading: adsLoading, error: adsError } = useFetchData<AdsData>(
    `/api/dashboard/${token}/meta-ads?from=${from}&to=${to}`
  );
  const { data: postsData } = useFetchData<PostsResp>(
    `/api/dashboard/${token}/posts?from=${from}&to=${to}`
  );

  const topPosts = (postsData?.posts || [])
    .map((p) => ({ ...p, _engagement: (p.likes || 0) + (p.comments || 0) + (p.saves || 0) }))
    .sort((a, b) => b._engagement - a._engagement)
    .slice(0, 5);

  const igKpi = igData?.kpi || {};
  const igPrev = igData?.previous_kpi || {};
  const adsKpi = adsData?.kpi || {};
  const adsPrev = adsData?.previous_kpi || {};

  const loading = igLoading || adsLoading;

  return (
    <div>
      <PageHeader
        title="アカウント概要"
        clientName={igData?.client?.name}
        from={from}
        to={to}
        onDateChange={handleDateChange}
        loading={loading}
      />

      <div className="px-6 py-6 space-y-8">
        {igError && <ErrorBanner message={`Instagram: ${igError}`} />}
        {adsError && <ErrorBanner message={`Meta広告: ${adsError}`} />}
        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-[100px] animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Instagram KPIs */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Instagram</h2>
                <Link href={`${basePath}/posts?from=${from}&to=${to}`} className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                  詳細を見る <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                <KpiCard title="フォロワー" value={igKpi.followers || 0} change={calcChange(igKpi.followers || 0, igPrev.followers || 0)} icon={<Users className="h-4 w-4" />} suffix="人" />
                <KpiCard title="インプレッション" value={igKpi.impressions || 0} change={calcChange(igKpi.impressions || 0, igPrev.impressions || 0)} icon={<Eye className="h-4 w-4" />} />
                <KpiCard title="リーチ" value={igKpi.reach || 0} change={calcChange(igKpi.reach || 0, igPrev.reach || 0)} icon={<Target className="h-4 w-4" />} />
                <KpiCard title="いいね" value={igKpi.likes || 0} change={calcChange(igKpi.likes || 0, igPrev.likes || 0)} icon={<Heart className="h-4 w-4" />} />
                <KpiCard title="フォロー増加" value={igKpi.follows || 0} change={calcChange(igKpi.follows || 0, igPrev.follows || 0)} icon={<UserPlus className="h-4 w-4" />} />
              </div>
            </div>

            {/* Top Posts */}
            {topPosts.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">人気投稿 TOP5</h2>
                  <Link href={`${basePath}/posts?from=${from}&to=${to}`} className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                    すべて見る <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                  {topPosts.map((p, idx) => (
                    <a
                      key={p.ig_post_id}
                      href={p.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <div className="relative aspect-square bg-gray-100">
                        {p.media_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.media_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">画像なし</div>
                        )}
                        <span className="absolute top-2 left-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-black/70 text-white text-xs font-bold">
                          {idx + 1}
                        </span>
                      </div>
                      <div className="p-3">
                        <p className="text-xs text-gray-500 mb-2 line-clamp-2 min-h-[2.4em]">
                          {p.caption || "(キャプションなし)"}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-700">
                          <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-pink-500" />{p.likes.toLocaleString()}</span>
                          <span>💬{p.comments.toLocaleString()}</span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Meta Ads KPIs */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Meta広告</h2>
                <Link href={`${basePath}/ads?from=${from}&to=${to}`} className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                  詳細を見る <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                <KpiCard title="消化金額" value={Math.round(Number(adsKpi.spend) || 0)} change={calcChange(Number(adsKpi.spend) || 0, Number(adsPrev.spend) || 0)} prefix="¥" />
                <KpiCard title="インプレッション" value={Number(adsKpi.impressions) || 0} change={calcChange(Number(adsKpi.impressions) || 0, Number(adsPrev.impressions) || 0)} icon={<Eye className="h-4 w-4" />} />
                <KpiCard title="リーチ" value={Number(adsKpi.reach) || 0} change={calcChange(Number(adsKpi.reach) || 0, Number(adsPrev.reach) || 0)} icon={<Target className="h-4 w-4" />} />
                <KpiCard title="クリック" value={Number(adsKpi.clicks) || 0} change={calcChange(Number(adsKpi.clicks) || 0, Number(adsPrev.clicks) || 0)} icon={<Megaphone className="h-4 w-4" />} />
                <KpiCard title="CPC" value={Math.round(Number(adsKpi.cpc) || 0)} change={calcChange(Number(adsKpi.cpc) || 0, Number(adsPrev.cpc) || 0)} prefix="¥" />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-gray-400">読み込み中...</div></div>}>
      <DashboardContent />
    </Suspense>
  );
}
