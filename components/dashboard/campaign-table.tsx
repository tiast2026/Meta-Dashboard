"use client"

import { useState, useMemo } from "react"
import { ArrowUpDown, Download } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { downloadCsv } from "@/lib/csv"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"


interface Campaign {
  campaign_name: string
  impressions: number
  reach: number
  clicks: number
  spend: number
  results: number
  cpc: number
  ctr: number
}

interface CampaignTableProps {
  campaigns: Campaign[]
}

type SortKey = keyof Campaign
type SortDir = "asc" | "desc"

export function CampaignTable({ campaigns }: CampaignTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("spend")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  const sortedCampaigns = useMemo(() => {
    return [...campaigns].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal
      }
      return sortDir === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal))
    })
  }, [campaigns, sortKey, sortDir])

  const columns: { key: SortKey; label: string; align?: "right"; format?: (v: number) => string }[] = [
    { key: "campaign_name", label: "キャンペーン名" },
    {
      key: "impressions",
      label: "インプレッション",
      align: "right",
      format: (v) => v.toLocaleString(),
    },
    {
      key: "reach",
      label: "リーチ",
      align: "right",
      format: (v) => v.toLocaleString(),
    },
    {
      key: "clicks",
      label: "クリック",
      align: "right",
      format: (v) => v.toLocaleString(),
    },
    {
      key: "cpc",
      label: "CPC",
      align: "right",
      format: (v) => `¥${v.toLocaleString()}`,
    },
    {
      key: "ctr",
      label: "CTR",
      align: "right",
      format: (v) => `${v.toFixed(2)}%`,
    },
    {
      key: "results",
      label: "結果",
      align: "right",
      format: (v) => v.toLocaleString(),
    },
    {
      key: "spend",
      label: "消化金額",
      align: "right",
      format: (v) => `¥${v.toLocaleString()}`,
    },
  ]

  const exportCsv = () => {
    downloadCsv(
      sortedCampaigns.map((c) => ({
        campaign_name: c.campaign_name,
        impressions: c.impressions,
        reach: c.reach,
        clicks: c.clicks,
        ctr: c.ctr.toFixed(2),
        cpc: Math.round(c.cpc),
        results: c.results,
        spend: Math.round(c.spend),
      })),
      `meta_campaigns_${format(new Date(), "yyyyMMdd")}.csv`,
      [
        { key: "campaign_name", label: "キャンペーン名" },
        { key: "impressions", label: "インプレッション" },
        { key: "reach", label: "リーチ" },
        { key: "clicks", label: "クリック" },
        { key: "ctr", label: "CTR(%)" },
        { key: "cpc", label: "CPC(¥)" },
        { key: "results", label: "結果" },
        { key: "spend", label: "消化金額(¥)" },
      ]
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">キャンペーン別実績</h3>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={sortedCampaigns.length === 0}>
          <Download className="size-3.5 mr-1.5" /> CSVダウンロード
        </Button>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    "cursor-pointer select-none",
                    col.align === "right" && "text-right",
                    col.key === "campaign_name" && "pl-4"
                  )}
                  onClick={() => handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    <ArrowUpDown
                      className={cn(
                        "size-3",
                        sortKey === col.key
                          ? "text-foreground"
                          : "text-muted-foreground/40"
                      )}
                    />
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCampaigns.map((campaign, i) => (
              <TableRow key={`${campaign.campaign_name}-${i}`}>
                {columns.map((col) => {
                  const rawValue = campaign[col.key]
                  const display =
                    col.format && typeof rawValue === "number"
                      ? col.format(rawValue)
                      : String(rawValue)
                  return (
                    <TableCell
                      key={col.key}
                      className={cn(
                        col.align === "right" && "text-right tabular-nums",
                        col.key === "campaign_name" && "pl-4 font-medium max-w-[240px] truncate"
                      )}
                    >
                      {display}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
            {sortedCampaigns.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  キャンペーンデータがありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
