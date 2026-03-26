"use client";

import { Suspense } from "react";
import { Eye, Target, MousePointerClick } from "lucide-react";
import { useDashboard, useFetchData } from "@/lib/use-dashboard";
import { PageHeader } from "@/components/dashboard/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { DailyTrendChart } from "@/components/dashboard/daily-trend-chart";
import { CampaignTable } from "@/components/dashboard/campaign-table";
import { PlatformBreakdown } from "@/components/dashboard/platform-breakdown";

function calcChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

interface AdsData {
  client?: { name: string };
  kpi: Record<string, number>;
  previous_kpi: Record<string, number>;
  daily: Array<Record<string, unknown>>;
  campaigns: Array<Record<string, unknown>>;
  platforms: Array<Record<string, unknown>>;
}

function AdsContent() {
  const { token, from, to, handleDateChange } = useDashboard();

  const { data, loading } = useFetchData<AdsData>(
    `/api/dashboard/${token}/meta-ads?from=${from}&to=${to}`
  );

  const kpi = data?.kpi || {};
  const prevKpi = data?.previous_kpi || {};

  return (
    <div>
      <PageHeader
        title="Meta広告分析"
        clientName={data?.client?.name}
        from={from}
        to={to}
        onDateChange={handleDateChange}
      />

      <div className="px-6 py-6 space-y-6">
        {loading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[100px] animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              <KpiCard title="消化金額" value={Math.round(Number(kpi.spend) || 0)} change={calcChange(Number(kpi.spend) || 0, Number(prevKpi.spend) || 0)} prefix="¥" />
              <KpiCard title="インプレッション" value={Number(kpi.impressions) || 0} change={calcChange(Number(kpi.impressions) || 0, Number(prevKpi.impressions) || 0)} icon={<Eye className="h-4 w-4" />} />
              <KpiCard title="リーチ" value={Number(kpi.reach) || 0} change={calcChange(Number(kpi.reach) || 0, Number(prevKpi.reach) || 0)} icon={<Target className="h-4 w-4" />} />
              <KpiCard title="クリック" value={Number(kpi.clicks) || 0} change={calcChange(Number(kpi.clicks) || 0, Number(prevKpi.clicks) || 0)} icon={<MousePointerClick className="h-4 w-4" />} />
              <KpiCard title="CPC" value={Math.round(Number(kpi.cpc) || 0)} change={calcChange(Number(kpi.cpc) || 0, Number(prevKpi.cpc) || 0)} prefix="¥" />
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <DailyTrendChart data={(data?.daily || []) as never[]} />
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <CampaignTable campaigns={(data?.campaigns || []) as never[]} />
            </div>

            {(data?.platforms || []).length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <PlatformBreakdown data={(data?.platforms || []) as never[]} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function AdsPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-gray-400">読み込み中...</div>}>
      <AdsContent />
    </Suspense>
  );
}
