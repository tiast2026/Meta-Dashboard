"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Eye, Users, Heart, UserPlus, Target, Megaphone, ArrowRight } from "lucide-react";
import { useDashboard, useFetchData } from "@/lib/use-dashboard";
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

function DashboardContent() {
  const { token, from, to, handleDateChange } = useDashboard();
  const params = useParams();
  const basePath = `/dashboard/${params.token}`;

  const { data: igData, loading: igLoading } = useFetchData<IgData>(
    `/api/dashboard/${token}/instagram?from=${from}&to=${to}`
  );
  const { data: adsData, loading: adsLoading } = useFetchData<AdsData>(
    `/api/dashboard/${token}/meta-ads?from=${from}&to=${to}`
  );

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
      />

      <div className="px-6 py-6 space-y-8">
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
