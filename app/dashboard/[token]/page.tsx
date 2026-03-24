"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { format, subDays } from "date-fns";
import {
  Eye,
  Users,
  Heart,
  UserPlus,
  MousePointerClick,
  Target,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { FollowerTrendChart } from "@/components/dashboard/follower-trend-chart";
import { DailyTrendChart } from "@/components/dashboard/daily-trend-chart";
import { PostTable } from "@/components/dashboard/post-table";
import { CampaignTable } from "@/components/dashboard/campaign-table";
import { PlatformBreakdown } from "@/components/dashboard/platform-breakdown";
import { TaggedPostsTable } from "@/components/dashboard/tagged-posts-table";
import { EngagementChart } from "@/components/dashboard/engagement-chart";

function calcChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function DashboardContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = params.token as string;

  const tab = searchParams.get("tab") || "instagram";
  const defaultTo = format(new Date(), "yyyy-MM-dd");
  const defaultFrom = format(subDays(new Date(), 30), "yyyy-MM-dd");
  const from = searchParams.get("from") || defaultFrom;
  const to = searchParams.get("to") || defaultTo;

  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Instagram state
  const [igKpi, setIgKpi] = useState<Record<string, number>>({});
  const [igPrevKpi, setIgPrevKpi] = useState<Record<string, number>>({});
  const [igDaily, setIgDaily] = useState<Array<Record<string, unknown>>>([]);
  const [posts, setPosts] = useState<Array<Record<string, unknown>>>([]);
  const [taggedPosts, setTaggedPosts] = useState<Array<Record<string, unknown>>>([]);

  // Meta Ads state
  const [adsKpi, setAdsKpi] = useState<Record<string, number>>({});
  const [adsPrevKpi, setAdsPrevKpi] = useState<Record<string, number>>({});
  const [adsDaily, setAdsDaily] = useState<Array<Record<string, unknown>>>([]);
  const [campaigns, setCampaigns] = useState<Array<Record<string, unknown>>>([]);
  const [platforms, setPlatforms] = useState<Array<Record<string, unknown>>>([]);

  const updateSearchParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        params.set(key, value);
      });
      router.push(`/dashboard/${token}?${params.toString()}`);
    },
    [searchParams, router, token]
  );

  const handleDateChange = useCallback(
    (newFrom: string, newTo: string) => {
      updateSearchParams({ from: newFrom, to: newTo });
    },
    [updateSearchParams]
  );

  const handleTabChange = useCallback(
    (value: string) => {
      updateSearchParams({ tab: value });
    },
    [updateSearchParams]
  );

  // Fetch Instagram data
  useEffect(() => {
    if (tab !== "instagram") return;
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        const [igRes, postsRes, taggedRes] = await Promise.all([
          fetch(`/api/dashboard/${token}/instagram?from=${from}&to=${to}`),
          fetch(`/api/dashboard/${token}/posts?from=${from}&to=${to}`),
          fetch(`/api/dashboard/${token}/tagged-posts?from=${from}&to=${to}`),
        ]);

        if (!igRes.ok) throw new Error("Instagram data fetch failed");

        const igData = await igRes.json();
        setClientName(igData.client?.name || "");
        setIgKpi(igData.kpi || {});
        setIgPrevKpi(igData.previous_kpi || {});
        setIgDaily(igData.daily || []);

        if (postsRes.ok) {
          const postsData = await postsRes.json();
          setPosts(postsData.posts || []);
        }

        if (taggedRes.ok) {
          const taggedData = await taggedRes.json();
          setTaggedPosts(taggedData.posts || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, from, to, tab]);

  // Fetch Meta Ads data
  useEffect(() => {
    if (tab !== "ads") return;
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        const res = await fetch(
          `/api/dashboard/${token}/meta-ads?from=${from}&to=${to}`
        );
        if (!res.ok) throw new Error("Meta Ads data fetch failed");

        const data = await res.json();
        if (!clientName) setClientName(data.client?.name || "");
        setAdsKpi(data.kpi || {});
        setAdsPrevKpi(data.previous_kpi || {});
        setAdsDaily(data.daily || []);
        setCampaigns(data.campaigns || []);
        setPlatforms(data.platforms || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, from, to, tab, clientName]);

  // Derive engagement chart data from daily
  const engagementData = igDaily.map((d: Record<string, unknown>) => ({
    date: d.date as string,
    likes: (d.likes as number) || 0,
    comments: (d.comments as number) || 0,
    saves: (d.saves as number) || 0,
    shares: (d.shares as number) || 0,
  }));

  const followerData = igDaily.map((d: Record<string, unknown>) => ({
    date: d.date as string,
    followers: (d.followers as number) || 0,
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              {clientName || "ダッシュボード"}
            </h1>
            <p className="text-sm text-muted-foreground">
              レポートダッシュボード
            </p>
          </div>
          <DateRangePicker
            from={from}
            to={to}
            onChange={handleDateChange}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <Tabs value={tab} onValueChange={handleTabChange}>
          <TabsList className="mb-6">
            <TabsTrigger value="instagram">Instagram分析</TabsTrigger>
            <TabsTrigger value="ads">Meta広告</TabsTrigger>
          </TabsList>

          {/* Instagram Tab */}
          <TabsContent value="instagram">
            {loading ? (
              <LoadingSkeleton />
            ) : (
              <div className="space-y-6">
                {/* KPI Grid */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                  <KpiCard
                    title="フォロワー"
                    value={igKpi.followers || 0}
                    change={calcChange(
                      igKpi.followers || 0,
                      igPrevKpi.followers || 0
                    )}
                    icon={<Users className="h-4 w-4" />}
                    suffix="人"
                  />
                  <KpiCard
                    title="インプレッション"
                    value={igKpi.impressions || 0}
                    change={calcChange(
                      igKpi.impressions || 0,
                      igPrevKpi.impressions || 0
                    )}
                    icon={<Eye className="h-4 w-4" />}
                  />
                  <KpiCard
                    title="リーチ"
                    value={igKpi.reach || 0}
                    change={calcChange(
                      igKpi.reach || 0,
                      igPrevKpi.reach || 0
                    )}
                    icon={<Target className="h-4 w-4" />}
                  />
                  <KpiCard
                    title="いいね"
                    value={igKpi.likes || 0}
                    change={calcChange(
                      igKpi.likes || 0,
                      igPrevKpi.likes || 0
                    )}
                    icon={<Heart className="h-4 w-4" />}
                  />
                  <KpiCard
                    title="フォロー増加"
                    value={igKpi.follows || 0}
                    change={calcChange(
                      igKpi.follows || 0,
                      igPrevKpi.follows || 0
                    )}
                    icon={<UserPlus className="h-4 w-4" />}
                  />
                </div>

                {/* Charts */}
                <div className="grid gap-6 lg:grid-cols-2">
                  <FollowerTrendChart data={followerData} />
                  <EngagementChart data={engagementData} />
                </div>

                {/* Post Performance Table */}
                <PostTable posts={posts as never[]} />

                {/* Tagged Posts Table */}
                {taggedPosts.length > 0 && (
                  <TaggedPostsTable posts={taggedPosts as never[]} />
                )}
              </div>
            )}
          </TabsContent>

          {/* Meta Ads Tab */}
          <TabsContent value="ads">
            {loading ? (
              <LoadingSkeleton />
            ) : (
              <div className="space-y-6">
                {/* KPI Grid */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                  <KpiCard
                    title="消化金額"
                    value={Math.round(adsKpi.spend || 0)}
                    change={calcChange(
                      adsKpi.spend || 0,
                      adsPrevKpi.spend || 0
                    )}
                    prefix="¥"
                  />
                  <KpiCard
                    title="インプレッション"
                    value={adsKpi.impressions || 0}
                    change={calcChange(
                      adsKpi.impressions || 0,
                      adsPrevKpi.impressions || 0
                    )}
                    icon={<Eye className="h-4 w-4" />}
                  />
                  <KpiCard
                    title="リーチ"
                    value={adsKpi.reach || 0}
                    change={calcChange(
                      adsKpi.reach || 0,
                      adsPrevKpi.reach || 0
                    )}
                    icon={<Target className="h-4 w-4" />}
                  />
                  <KpiCard
                    title="クリック"
                    value={adsKpi.clicks || 0}
                    change={calcChange(
                      adsKpi.clicks || 0,
                      adsPrevKpi.clicks || 0
                    )}
                    icon={<MousePointerClick className="h-4 w-4" />}
                  />
                  <KpiCard
                    title="CPC"
                    value={Math.round(adsKpi.cpc || 0)}
                    change={calcChange(
                      adsKpi.cpc || 0,
                      adsPrevKpi.cpc || 0
                    )}
                    prefix="¥"
                  />
                </div>

                {/* Daily Trend Chart */}
                <DailyTrendChart data={adsDaily as never[]} />

                {/* Campaign Table */}
                <CampaignTable campaigns={campaigns as never[]} />

                {/* Platform Breakdown */}
                {platforms.length > 0 && (
                  <PlatformBreakdown data={platforms as never[]} />
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-[110px] animate-pulse rounded-lg border bg-muted/40"
          />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-[380px] animate-pulse rounded-lg border bg-muted/40" />
        <div className="h-[380px] animate-pulse rounded-lg border bg-muted/40" />
      </div>
      <div className="h-[400px] animate-pulse rounded-lg border bg-muted/40" />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-muted-foreground">読み込み中...</div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
