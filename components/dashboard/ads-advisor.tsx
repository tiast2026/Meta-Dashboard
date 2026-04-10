"use client"

import { useState } from "react"
import { TrendingUp, TrendingDown, AlertTriangle, Zap, ChevronDown, ChevronRight, XCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Types ──────────────────────────────────────

type Level = "excellent" | "good" | "caution" | "warning" | "danger"

interface PeriodMetrics {
  spend: number
  purchase: number
  purchase_value: number
  clicks: number
  impressions: number
  initiate_checkout: number
  cpa: number
  checkout_cost: number
  roas: number
  cpc: number
  ctr: number
}

interface Recommendation {
  level: Level
  action: string
  detail: string
}

interface CampaignAdvisor {
  campaign_id: string
  campaign_name: string
  campaign_objective: string
  metrics_1d: PeriodMetrics
  metrics_7d: PeriodMetrics
  metrics_30d: PeriodMetrics
  recommendation: Recommendation
  is_learning: boolean
}

interface AdAlert {
  ad_id: string
  ad_name: string
  campaign_name: string
  spend: number
  purchase: number
  cpa: number
  level: Level
  reason: string
}

interface AdvisorData {
  client_name: string
  overall: {
    metrics_1d: PeriodMetrics
    metrics_7d: PeriodMetrics
    metrics_30d: PeriodMetrics
    recommendation: Recommendation
    checkout_insight: string
    trend_note: string
  }
  campaigns: CampaignAdvisor[]
  ad_alerts: AdAlert[]
}

interface Props {
  data: AdvisorData | undefined
  loading?: boolean
}

// ── Helpers ─────────────────────────────────────

const LEVEL_STYLES: Record<Level, { bg: string; border: string; text: string; icon: typeof TrendingUp }> = {
  excellent: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", icon: Zap },
  good: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", icon: TrendingUp },
  caution: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", icon: AlertTriangle },
  warning: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", icon: TrendingDown },
  danger: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", icon: XCircle },
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

function fmtYen(v: number): string {
  return v > 0 ? `¥${Math.round(v).toLocaleString()}` : "-"
}

function fmtRoas(v: number): string {
  return v > 0 ? `${(v * 100).toFixed(0)}%` : "-"
}

// ── Component ──────────────────────────────────

export function AdsAdvisor({ data, loading }: Props) {
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null)

  if (loading && !data) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg bg-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }

  if (!data) return null

  const { overall, campaigns, ad_alerts } = data
  const s = LEVEL_STYLES[overall.recommendation.level]
  const Icon = s.icon

  return (
    <div className="space-y-6">
      {/* ── Overall Recommendation ──────────────── */}
      <div className={cn("rounded-xl border-2 p-5", s.bg, s.border)}>
        <div className="flex items-start gap-4">
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", s.bg)}>
            <Icon className={cn("w-6 h-6", s.text)} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={cn("text-lg font-bold", s.text)}>{overall.recommendation.action}</h3>
            <p className="text-sm text-gray-700 mt-1">{overall.recommendation.detail}</p>
            {overall.checkout_insight && (
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                <Info className="w-3 h-3" /> {overall.checkout_insight}
              </p>
            )}
            {overall.trend_note && (
              <p className="text-xs text-gray-600 mt-1 font-medium">{overall.trend_note}</p>
            )}
          </div>
        </div>

        {/* 3-period comparison */}
        <div className="mt-4 pt-4 border-t border-gray-200/50 grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 text-center">直近1日</p>
            <div className="flex justify-around">
              <MetricCard label="CPA" value={fmtYen(overall.metrics_1d.cpa)} />
              <MetricCard label="ROAS" value={fmtRoas(overall.metrics_1d.roas)} />
              <MetricCard label="消化" value={fmtYen(overall.metrics_1d.spend)} />
            </div>
          </div>
          <div className="space-y-2 border-x border-gray-200/50 px-4">
            <p className="text-xs font-semibold text-gray-500 text-center">直近7日</p>
            <div className="flex justify-around">
              <MetricCard label="CPA" value={fmtYen(overall.metrics_7d.cpa)} />
              <MetricCard label="ROAS" value={fmtRoas(overall.metrics_7d.roas)} />
              <MetricCard label="消化" value={fmtYen(overall.metrics_7d.spend)} />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-indigo-600 text-center">直近30日（判断基準）</p>
            <div className="flex justify-around">
              <MetricCard label="CPA" value={fmtYen(overall.metrics_30d.cpa)} />
              <MetricCard label="ROAS" value={fmtRoas(overall.metrics_30d.roas)} />
              <MetricCard label="消化" value={fmtYen(overall.metrics_30d.spend)} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Campaign-level Recommendations ──── */}
      <div>
        <h4 className="text-base font-semibold text-gray-900 mb-3">キャンペーン別 判定</h4>
        <div className="space-y-2">
          {campaigns.map((c) => {
            const cs = LEVEL_STYLES[c.recommendation.level]
            const CIcon = cs.icon
            const isExpanded = expandedCampaign === c.campaign_id
            return (
              <div key={c.campaign_id} className={cn("rounded-lg border", cs.border, cs.bg)}>
                <button
                  onClick={() => setExpandedCampaign(isExpanded ? null : c.campaign_id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  <CIcon className={cn("w-4 h-4 shrink-0", cs.text)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 truncate">{c.campaign_name}</span>
                      {c.is_learning && <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">学習中</span>}
                    </div>
                    <span className={cn("text-xs font-medium", cs.text)}>{c.recommendation.action}</span>
                  </div>
                  <div className="text-right shrink-0 mr-2">
                    <p className="text-sm font-bold text-gray-900">{fmtYen(c.metrics_30d.cpa)}</p>
                    <p className="text-[10px] text-gray-500">30日CPA</p>
                  </div>
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-200/50">
                    <p className="text-xs text-gray-700 mt-2 mb-3">{c.recommendation.detail}</p>
                    {c.campaign_objective && (
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-2">目的: {c.campaign_objective}</p>
                    )}
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-white/60 rounded-lg p-2">
                        <p className="text-[10px] text-gray-500">1日</p>
                        <p className="text-xs font-bold">{fmtYen(c.metrics_1d.cpa)}</p>
                        <p className="text-[10px] text-gray-400">ROAS {fmtRoas(c.metrics_1d.roas)}</p>
                      </div>
                      <div className="bg-white/60 rounded-lg p-2">
                        <p className="text-[10px] text-gray-500">7日</p>
                        <p className="text-xs font-bold">{fmtYen(c.metrics_7d.cpa)}</p>
                        <p className="text-[10px] text-gray-400">ROAS {fmtRoas(c.metrics_7d.roas)}</p>
                      </div>
                      <div className="bg-white/60 rounded-lg p-2 ring-1 ring-indigo-200">
                        <p className="text-[10px] text-indigo-600 font-semibold">30日</p>
                        <p className="text-xs font-bold">{fmtYen(c.metrics_30d.cpa)}</p>
                        <p className="text-[10px] text-gray-400">ROAS {fmtRoas(c.metrics_30d.roas)}</p>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-2 text-center text-[11px]">
                      <div><span className="text-gray-500">消化</span><br /><span className="font-bold">{fmtYen(c.metrics_30d.spend)}</span></div>
                      <div><span className="text-gray-500">購入</span><br /><span className="font-bold">{c.metrics_30d.purchase}件</span></div>
                      <div><span className="text-gray-500">購入金額</span><br /><span className="font-bold">{fmtYen(c.metrics_30d.purchase_value)}</span></div>
                      <div><span className="text-gray-500">CO単価</span><br /><span className="font-bold">{fmtYen(c.metrics_30d.checkout_cost)}</span></div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Ad Alerts ────────────────────────── */}
      {ad_alerts.length > 0 && (
        <div>
          <h4 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            要注意の広告（停止推奨）
          </h4>
          <div className="rounded-lg border border-red-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-red-50">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold text-gray-700">広告名</th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-700">キャンペーン</th>
                  <th className="text-right px-4 py-2 font-semibold text-gray-700">消化</th>
                  <th className="text-right px-4 py-2 font-semibold text-gray-700">CPA</th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-700">理由</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-50">
                {ad_alerts.map((a) => (
                  <tr key={a.ad_id} className="hover:bg-red-50/50">
                    <td className="px-4 py-2 font-medium text-gray-900 truncate max-w-[200px]" title={a.ad_name}>{a.ad_name}</td>
                    <td className="px-4 py-2 text-gray-600 truncate max-w-[180px]" title={a.campaign_name}>{a.campaign_name}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtYen(a.spend)}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-bold text-red-600">{a.cpa > 0 ? fmtYen(a.cpa) : "∞"}</td>
                    <td className="px-4 py-2 text-xs text-gray-700">{a.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Knowledge source ─────────────────── */}
      <p className="text-[10px] text-gray-400 text-center">
        判定基準: 広告運用ナレッジ教科書（CPA/ROAS基準、1日/7日/30日分析、チェックアウト単価併用）
      </p>
    </div>
  )
}
