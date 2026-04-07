"use client";

import { Suspense } from "react";
import { Eye, Target, MousePointerClick } from "lucide-react";
import { useDashboard, useFetchData } from "@/lib/use-dashboard";
import { ErrorBanner } from "@/components/dashboard/error-banner";
import { PageHeader } from "@/components/dashboard/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { DailyTrendChart } from "@/components/dashboard/daily-trend-chart";
import { ExpandableCampaignTable } from "@/components/dashboard/expandable-campaign-table";
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
  hierarchy?: {
    campaigns: Array<Record<string, unknown>>;
    adsets: Array<Record<string, unknown>>;
    ads: Array<Record<string, unknown>>;
  };
}

function AdsContent() {
  const { token, from, to, handleDateChange } = useDashboard();

  const { data, loading, error } = useFetchData<AdsData>(
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
        loading={loading}
      />

      <div className="px-6 py-6 space-y-6">
        {error && <ErrorBanner message={error} />}
        {loading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[100px] animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiCard title="消化金額" value={Math.round(Number(kpi.spend) || 0)} change={calcChange(Number(kpi.spend) || 0, Number(prevKpi.spend) || 0)} prefix="¥" />
              <KpiCard title="インプレッション" value={Number(kpi.impressions) || 0} change={calcChange(Number(kpi.impressions) || 0, Number(prevKpi.impressions) || 0)} icon={<Eye className="h-4 w-4" />} />
              <KpiCard title="リーチ" value={Number(kpi.reach) || 0} change={calcChange(Number(kpi.reach) || 0, Number(prevKpi.reach) || 0)} icon={<Target className="h-4 w-4" />} />
              <KpiCard title="クリック" value={Number(kpi.clicks) || 0} change={calcChange(Number(kpi.clicks) || 0, Number(prevKpi.clicks) || 0)} icon={<MousePointerClick className="h-4 w-4" />} />
            </div>

            {/* Second row: calculated metrics */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiCard title="CPC (クリック単価)" value={"¥" + Math.round(Number(kpi.cpc) || 0).toLocaleString()} change={calcChange(Number(kpi.cpc) || 0, Number(prevKpi.cpc) || 0)} />
              <KpiCard title="CTR (クリック率)" value={(Number(kpi.ctr) || 0).toFixed(2) + "%"} change={calcChange(Number(kpi.ctr) || 0, Number(prevKpi.ctr) || 0)} />
              <KpiCard title="CPM (千人単価)" value={"¥" + (Number(kpi.impressions) > 0 ? Math.round(Number(kpi.spend) / Number(kpi.impressions) * 1000) : 0).toLocaleString()} />
              <KpiCard title="成果数" value={Number(kpi.results) || 0} change={calcChange(Number(kpi.results) || 0, Number(prevKpi.results) || 0)} />
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <DailyTrendChart data={(data?.daily || []) as never[]} />
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <ExpandableCampaignTable hierarchy={data?.hierarchy as never} />
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
