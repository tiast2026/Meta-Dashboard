"use client"

import { useState, useMemo, Fragment } from "react"
import { ChevronRight, ChevronDown, Download, ArrowUpDown } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { downloadCsv } from "@/lib/csv"
import { cn } from "@/lib/utils"

// ── Types ───────────────────────────────────────────────

interface Creative {
  thumbnail_url?: string
  image_url?: string
  title?: string
  body?: string
  call_to_action_type?: string
  link_url?: string
  instagram_permalink_url?: string
}

interface BaseRow {
  campaign_id: string
  campaign_name: string
  campaign_objective?: string
  adset_id?: string
  adset_name?: string
  ad_id?: string
  ad_name?: string
  creative?: Creative
  impressions: number
  reach: number
  clicks: number
  spend: number
  results: number
  add_to_cart: number
  initiate_checkout: number
  purchase: number
  purchase_value: number
  view_content: number
  lead: number
  complete_registration: number
  contact: number
  subscribe: number
  search: number
  add_payment_info: number
  add_to_wishlist: number
  page_engagement: number
  post_engagement: number
  video_view: number
  link_click: number
  cpc: number
  ctr: number
  cpm: number
  cpa: number
  roas: number
}

interface Hierarchy {
  campaigns: BaseRow[]
  adsets: BaseRow[]
  ads: BaseRow[]
}

interface Props {
  hierarchy: Hierarchy | undefined
}

// ── Column definitions ──────────────────────────────────

type SortKey =
  | "name"
  | "impressions"
  | "reach"
  | "clicks"
  | "ctr"
  | "cpc"
  | "cpm"
  | "spend"
  | "results"
  | "add_to_cart"
  | "initiate_checkout"
  | "purchase"
  | "purchase_value"
  | "cpa"
  | "roas"
  | "view_content"
  | "lead"
  | "complete_registration"
  | "contact"
  | "subscribe"
  | "link_click"

const ALL_COLUMNS: { key: SortKey; label: string; group: "basic" | "ec" | "lead" | "engagement"; format: (v: number) => string; align?: "right" }[] = [
  // basic
  { key: "impressions", label: "インプレッション", group: "basic", format: (v) => v.toLocaleString(), align: "right" },
  { key: "reach", label: "リーチ", group: "basic", format: (v) => v.toLocaleString(), align: "right" },
  { key: "clicks", label: "クリック", group: "basic", format: (v) => v.toLocaleString(), align: "right" },
  { key: "ctr", label: "CTR", group: "basic", format: (v) => v.toFixed(2) + "%", align: "right" },
  { key: "cpc", label: "CPC", group: "basic", format: (v) => "¥" + Math.round(v).toLocaleString(), align: "right" },
  { key: "cpm", label: "CPM", group: "basic", format: (v) => "¥" + Math.round(v).toLocaleString(), align: "right" },
  { key: "spend", label: "消化金額", group: "basic", format: (v) => "¥" + Math.round(v).toLocaleString(), align: "right" },
  // ec
  { key: "view_content", label: "コンテンツ閲覧", group: "ec", format: (v) => v.toLocaleString(), align: "right" },
  { key: "add_to_cart", label: "カート追加", group: "ec", format: (v) => v.toLocaleString(), align: "right" },
  { key: "initiate_checkout", label: "チェックアウト開始", group: "ec", format: (v) => v.toLocaleString(), align: "right" },
  { key: "purchase", label: "購入", group: "ec", format: (v) => v.toLocaleString(), align: "right" },
  { key: "purchase_value", label: "購入金額", group: "ec", format: (v) => "¥" + Math.round(v).toLocaleString(), align: "right" },
  { key: "cpa", label: "CPA (購入)", group: "ec", format: (v) => v > 0 ? "¥" + Math.round(v).toLocaleString() : "-", align: "right" },
  { key: "roas", label: "ROAS", group: "ec", format: (v) => v > 0 ? v.toFixed(2) + "x" : "-", align: "right" },
  // lead
  { key: "lead", label: "リード", group: "lead", format: (v) => v.toLocaleString(), align: "right" },
  { key: "complete_registration", label: "登録完了", group: "lead", format: (v) => v.toLocaleString(), align: "right" },
  { key: "contact", label: "問い合わせ", group: "lead", format: (v) => v.toLocaleString(), align: "right" },
  { key: "subscribe", label: "購読", group: "lead", format: (v) => v.toLocaleString(), align: "right" },
  // engagement
  { key: "link_click", label: "リンククリック", group: "engagement", format: (v) => v.toLocaleString(), align: "right" },
]

const COLUMN_GROUPS = [
  { key: "basic", label: "基本指標", default: true },
  { key: "ec", label: "EC / 購買", default: true },
  { key: "lead", label: "リード獲得", default: false },
  { key: "engagement", label: "エンゲージメント", default: false },
] as const

// ── Component ──────────────────────────────────────────

export function ExpandableCampaignTable({ hierarchy }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey>("spend")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [activeGroups, setActiveGroups] = useState<Set<string>>(
    () => new Set(COLUMN_GROUPS.filter((g) => g.default).map((g) => g.key))
  )

  const visibleColumns = useMemo(
    () => ALL_COLUMNS.filter((c) => activeGroups.has(c.group)),
    [activeGroups]
  )

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  const sortRows = <T extends BaseRow>(rows: T[]): T[] => {
    return [...rows].sort((a, b) => {
      if (sortKey === "name") {
        const an = (a.ad_name || a.adset_name || a.campaign_name || "")
        const bn = (b.ad_name || b.adset_name || b.campaign_name || "")
        return sortDir === "asc" ? an.localeCompare(bn) : bn.localeCompare(an)
      }
      const av = Number(a[sortKey as keyof BaseRow]) || 0
      const bv = Number(b[sortKey as keyof BaseRow]) || 0
      return sortDir === "asc" ? av - bv : bv - av
    })
  }

  const campaigns = useMemo(() => sortRows(hierarchy?.campaigns || []), [hierarchy, sortKey, sortDir])
  const adsetsByCampaign = useMemo(() => {
    const map: Record<string, BaseRow[]> = {}
    for (const a of hierarchy?.adsets || []) {
      const k = String(a.campaign_id)
      if (!map[k]) map[k] = []
      map[k].push(a)
    }
    for (const k of Object.keys(map)) map[k] = sortRows(map[k])
    return map
  }, [hierarchy, sortKey, sortDir])
  const adsByAdset = useMemo(() => {
    const map: Record<string, BaseRow[]> = {}
    for (const a of hierarchy?.ads || []) {
      const k = String(a.adset_id)
      if (!map[k]) map[k] = []
      map[k].push(a)
    }
    for (const k of Object.keys(map)) map[k] = sortRows(map[k])
    return map
  }, [hierarchy, sortKey, sortDir])

  const exportCsv = () => {
    const rows: Record<string, unknown>[] = []
    for (const c of campaigns) {
      const cRow: Record<string, unknown> = { 階層: "キャンペーン", 名前: c.campaign_name }
      for (const col of visibleColumns) cRow[col.label] = c[col.key as keyof BaseRow]
      rows.push(cRow)
      for (const s of adsetsByCampaign[String(c.campaign_id)] || []) {
        const sRow: Record<string, unknown> = { 階層: "  広告セット", 名前: s.adset_name || "" }
        for (const col of visibleColumns) sRow[col.label] = s[col.key as keyof BaseRow]
        rows.push(sRow)
        for (const a of adsByAdset[String(s.adset_id)] || []) {
          const aRow: Record<string, unknown> = { 階層: "    広告", 名前: a.ad_name || "" }
          for (const col of visibleColumns) aRow[col.label] = a[col.key as keyof BaseRow]
          rows.push(aRow)
        }
      }
    }
    const cols = [
      { key: "階層", label: "階層" },
      { key: "名前", label: "名前" },
      ...visibleColumns.map((c) => ({ key: c.label, label: c.label })),
    ]
    downloadCsv(rows, `meta_ads_${format(new Date(), "yyyyMMdd")}.csv`, cols)
  }

  const toggleGroup = (key: string) => {
    setActiveGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (!hierarchy || campaigns.length === 0) {
    return (
      <div className="text-center text-sm text-gray-500 py-12">
        広告データがありません
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header: title + column group toggles + CSV */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            キャンペーン詳細
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            ▶ をクリックして広告セット・広告までドリルダウン
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {COLUMN_GROUPS.map((g) => (
            <button
              key={g.key}
              onClick={() => toggleGroup(g.key)}
              className={cn(
                "h-7 px-2.5 text-[11px] font-medium rounded-md border transition-colors",
                activeGroups.has(g.key)
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              )}
            >
              {g.label}
            </button>
          ))}
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-100">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="sticky left-0 bg-gray-50 text-left font-semibold text-gray-700 px-4 py-3 min-w-[280px] z-10">
                <button onClick={() => handleSort("name")} className="inline-flex items-center gap-1 hover:text-indigo-600">
                  名称 <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </th>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 font-semibold text-gray-700 whitespace-nowrap",
                    col.align === "right" ? "text-right" : "text-left"
                  )}
                >
                  <button onClick={() => handleSort(col.key)} className="inline-flex items-center gap-1 hover:text-indigo-600">
                    {col.label} <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {campaigns.map((c) => {
              const cKey = `c-${c.campaign_id}`
              const isOpen = expanded.has(cKey)
              const adsets = adsetsByCampaign[String(c.campaign_id)] || []
              return (
                <Fragment key={cKey}>
                  <tr className="hover:bg-indigo-50/30 transition-colors">
                    <td className="sticky left-0 bg-white hover:bg-indigo-50/30 px-4 py-3 z-10">
                      <div className="flex items-center gap-2">
                        {adsets.length > 0 ? (
                          <button onClick={() => toggleExpand(cKey)} className="text-gray-400 hover:text-indigo-600 shrink-0">
                            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        ) : (
                          <span className="w-4" />
                        )}
                        <span className="font-semibold text-gray-900 truncate text-sm" title={c.campaign_name}>
                          {c.campaign_name || "(無名キャンペーン)"}
                        </span>
                      </div>
                      {c.campaign_objective && (
                        <span className="ml-6 inline-block mt-1 text-[11px] text-gray-400 uppercase tracking-wide">
                          {c.campaign_objective}
                        </span>
                      )}
                    </td>
                    {visibleColumns.map((col) => (
                      <td key={col.key} className={cn("px-4 py-3 tabular-nums whitespace-nowrap font-semibold text-gray-900", col.align === "right" && "text-right")}>
                        {col.format(Number(c[col.key as keyof BaseRow]) || 0)}
                      </td>
                    ))}
                  </tr>
                  {isOpen && adsets.map((s) => {
                    const sKey = `s-${s.adset_id}`
                    const sOpen = expanded.has(sKey)
                    const ads = adsByAdset[String(s.adset_id)] || []
                    return (
                      <Fragment key={sKey}>
                        <tr className="bg-gray-50/60 hover:bg-indigo-50/40">
                          <td className="sticky left-0 bg-gray-50/60 hover:bg-indigo-50/40 px-4 py-2.5 pl-10 z-10">
                            <div className="flex items-center gap-2">
                              {ads.length > 0 ? (
                                <button onClick={() => toggleExpand(sKey)} className="text-gray-400 hover:text-indigo-600 shrink-0">
                                  {sOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </button>
                              ) : (
                                <span className="w-4" />
                              )}
                              <span className="text-gray-700 truncate text-sm font-medium" title={s.adset_name}>
                                {s.adset_name || "(無名広告セット)"}
                              </span>
                            </div>
                          </td>
                          {visibleColumns.map((col) => (
                            <td key={col.key} className={cn("px-4 py-2.5 tabular-nums whitespace-nowrap text-gray-700 text-sm", col.align === "right" && "text-right")}>
                              {col.format(Number(s[col.key as keyof BaseRow]) || 0)}
                            </td>
                          ))}
                        </tr>
                        {sOpen && ads.map((a) => {
                          const creative = a.creative
                          const thumb = creative?.thumbnail_url || creative?.image_url
                          const linkHref = creative?.instagram_permalink_url || creative?.link_url
                          return (
                            <tr key={`a-${a.ad_id}`} className="bg-white hover:bg-indigo-50/40">
                              <td className="sticky left-0 bg-white hover:bg-indigo-50/40 px-4 py-2 pl-16 z-10">
                                <div className="flex items-center gap-2.5">
                                  {thumb ? (
                                    linkHref ? (
                                      <a
                                        href={linkHref}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="shrink-0 block w-10 h-10 rounded-md overflow-hidden border border-gray-200 hover:ring-2 hover:ring-indigo-300 transition"
                                        title={creative?.title || a.ad_name}
                                      >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={thumb} alt="" className="w-full h-full object-cover" />
                                      </a>
                                    ) : (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={thumb} alt="" className="shrink-0 w-10 h-10 rounded-md object-cover border border-gray-200" />
                                    )
                                  ) : (
                                    <div className="shrink-0 w-10 h-10 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] text-gray-400">
                                      画像なし
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <span className="text-gray-700 text-sm truncate block" title={a.ad_name}>
                                      {a.ad_name || "(無名広告)"}
                                    </span>
                                    {creative?.title && (
                                      <span className="text-[11px] text-gray-400 truncate block" title={creative.title}>
                                        {creative.title}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              {visibleColumns.map((col) => (
                                <td key={col.key} className={cn("px-4 py-2 tabular-nums whitespace-nowrap text-gray-600 text-sm", col.align === "right" && "text-right")}>
                                  {col.format(Number(a[col.key as keyof BaseRow]) || 0)}
                                </td>
                              ))}
                            </tr>
                          )
                        })}
                      </Fragment>
                    )
                  })}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
