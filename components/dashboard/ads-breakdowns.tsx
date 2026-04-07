"use client"

import { useState, useMemo } from "react"
import { Users, MapPin, Globe, Clock, Smartphone } from "lucide-react"
import { cn } from "@/lib/utils"

interface BreakdownRow {
  breakdown_key: string
  impressions: number
  reach: number
  clicks: number
  spend: number
  purchase: number
  purchase_value: number
  add_to_cart: number
  initiate_checkout: number
  cpc: number
  ctr: number
  cpm: number
  cpa: number
  roas: number
}

interface BreakdownsData {
  age_gender: BreakdownRow[]
  region: BreakdownRow[]
  country: BreakdownRow[]
  hourly: BreakdownRow[]
  device: BreakdownRow[]
}

interface Props {
  data: BreakdownsData | undefined
  loading?: boolean
}

type Tab = "age_gender" | "region" | "country" | "hourly" | "device"

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "age_gender", label: "年齢・性別", icon: Users },
  { key: "region", label: "地域", icon: MapPin },
  { key: "country", label: "国", icon: Globe },
  { key: "hourly", label: "時間帯", icon: Clock },
  { key: "device", label: "デバイス", icon: Smartphone },
]

const GENDER_LABEL: Record<string, string> = {
  female: "女性",
  male: "男性",
  unknown: "不明",
}

function formatKey(tab: Tab, key: string): string {
  if (tab === "age_gender") {
    const [age, gender] = key.split("|")
    return `${age || "?"} / ${GENDER_LABEL[gender] || gender || "?"}`
  }
  if (tab === "hourly") {
    // "14:00:00 - 14:59:59" → "14時"
    const m = key.match(/^(\d{1,2}):/)
    return m ? `${m[1]}時` : key
  }
  if (tab === "device") {
    const labels: Record<string, string> = {
      mobile_app: "モバイルアプリ",
      mobile_web: "モバイルWeb",
      desktop: "デスクトップ",
    }
    return labels[key] || key
  }
  return key || "(不明)"
}

export function AdsBreakdowns({ data, loading }: Props) {
  const [tab, setTab] = useState<Tab>("age_gender")

  const rows = useMemo(() => {
    if (!data) return []
    return data[tab] || []
  }, [data, tab])

  const totalSpend = rows.reduce((s, r) => s + (Number(r.spend) || 0), 0)

  const sortedRows = useMemo(() => {
    if (tab === "hourly") {
      return [...rows].sort((a, b) => {
        const an = parseInt(a.breakdown_key.split(":")[0] || "0", 10)
        const bn = parseInt(b.breakdown_key.split(":")[0] || "0", 10)
        return an - bn
      })
    }
    return [...rows].sort((a, b) => Number(b.spend) - Number(a.spend))
  }, [rows, tab])

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">属性別 内訳</h3>
          <p className="text-xs text-gray-500 mt-1">
            年齢・性別 / 地域 / 時間帯 / デバイス で広告パフォーマンスを切替
          </p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 flex-wrap">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "h-8 px-3 text-xs font-medium rounded-md inline-flex items-center gap-1.5 transition",
                  active
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {loading && rows.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 rounded-md bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : sortedRows.length === 0 ? (
        <div className="text-center text-sm text-gray-500 py-12">
          このカテゴリーのデータがありません
          <p className="text-xs text-gray-400 mt-1">
            「全期間取得」を実行して属性別データを取得してください
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left font-semibold text-gray-700 px-4 py-3 min-w-[160px]">{TABS.find((t) => t.key === tab)?.label}</th>
                <th className="text-right font-semibold text-gray-700 px-4 py-3">インプレッション</th>
                <th className="text-right font-semibold text-gray-700 px-4 py-3">リーチ</th>
                <th className="text-right font-semibold text-gray-700 px-4 py-3">クリック</th>
                <th className="text-right font-semibold text-gray-700 px-4 py-3">CTR</th>
                <th className="text-right font-semibold text-gray-700 px-4 py-3">CPC</th>
                <th className="text-right font-semibold text-gray-700 px-4 py-3">消化金額</th>
                <th className="text-right font-semibold text-gray-700 px-4 py-3">構成比</th>
                <th className="text-right font-semibold text-gray-700 px-4 py-3">購入</th>
                <th className="text-right font-semibold text-gray-700 px-4 py-3">ROAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedRows.map((r) => {
                const share = totalSpend > 0 ? (Number(r.spend) / totalSpend) * 100 : 0
                return (
                  <tr key={r.breakdown_key} className="hover:bg-indigo-50/30">
                    <td className="px-4 py-3 font-medium text-gray-900">{formatKey(tab, r.breakdown_key)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{Number(r.impressions).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{Number(r.reach).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{Number(r.clicks).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{Number(r.ctr).toFixed(2)}%</td>
                    <td className="px-4 py-3 text-right tabular-nums">¥{Math.round(Number(r.cpc)).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">¥{Math.round(Number(r.spend)).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500"
                            style={{ width: `${Math.min(100, share)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-12 text-right">{share.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{Number(r.purchase).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{Number(r.roas) > 0 ? Number(r.roas).toFixed(2) + "x" : "-"}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
