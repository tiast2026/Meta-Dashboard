"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { format, subDays, startOfMonth, endOfMonth, subMonths, addMonths, startOfYear, isSameDay, isAfter, isBefore } from "date-fns"
import { CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface DateRangePickerProps {
  from: string
  to: string
  onChange: (from: string, to: string) => void
}

interface Preset {
  key: string
  label: string
  range: () => { from: Date; to: Date }
}

function todayLocal(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

const PRESETS: Preset[] = [
  {
    key: "today",
    label: "今日",
    range: () => {
      const t = todayLocal()
      return { from: t, to: t }
    },
  },
  {
    key: "7d",
    label: "7日",
    range: () => {
      const t = todayLocal()
      return { from: subDays(t, 6), to: t }
    },
  },
  {
    key: "30d",
    label: "30日",
    range: () => {
      const t = todayLocal()
      return { from: subDays(t, 29), to: t }
    },
  },
  {
    key: "90d",
    label: "90日",
    range: () => {
      const t = todayLocal()
      return { from: subDays(t, 89), to: t }
    },
  },
  {
    key: "thisMonth",
    label: "今月",
    range: () => {
      const t = todayLocal()
      return { from: startOfMonth(t), to: t }
    },
  },
  {
    key: "lastMonth",
    label: "先月",
    range: () => {
      const t = todayLocal()
      const last = subMonths(t, 1)
      return { from: startOfMonth(last), to: endOfMonth(last) }
    },
  },
  {
    key: "thisYear",
    label: "今年",
    range: () => {
      const t = todayLocal()
      return { from: startOfYear(t), to: t }
    },
  },
  {
    key: "all",
    label: "全期間",
    range: () => {
      const t = todayLocal()
      return { from: subDays(t, 730), to: t }
    },
  },
]

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"]

function fmt(d: Date): string {
  return format(d, "yyyy-MM-dd")
}

function parseDate(s: string): Date | undefined {
  if (!s) return undefined
  const d = new Date(s + "T00:00:00")
  return isNaN(d.getTime()) ? undefined : d
}

function detectActivePreset(from: Date | undefined, to: Date | undefined): string | null {
  if (!from || !to) return null
  for (const p of PRESETS) {
    const r = p.range()
    if (isSameDay(r.from, from) && isSameDay(r.to, to)) return p.key
  }
  return null
}

export function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const fromDate = useMemo(() => parseDate(from), [from])
  const toDate = useMemo(() => parseDate(to), [to])

  // Pending range while user is selecting (click 1: from, click 2: to)
  const [pendingFrom, setPendingFrom] = useState<Date | undefined>(fromDate)
  const [pendingTo, setPendingTo] = useState<Date | undefined>(toDate)
  const [hoverDate, setHoverDate] = useState<Date | undefined>(undefined)
  const [leftMonth, setLeftMonth] = useState<Date>(() => fromDate || todayLocal())

  // Sync pending state when prop changes from outside
  useEffect(() => {
    setPendingFrom(fromDate)
    setPendingTo(toDate)
    if (fromDate) setLeftMonth(fromDate)
  }, [fromDate, toDate])

  // Click outside to close
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const activePreset = detectActivePreset(fromDate, toDate)

  const applyPreset = (preset: Preset) => {
    const r = preset.range()
    onChange(fmt(r.from), fmt(r.to))
    setOpen(false)
  }

  const handleDayClick = (date: Date) => {
    if (!pendingFrom || (pendingFrom && pendingTo)) {
      // Start new selection
      setPendingFrom(date)
      setPendingTo(undefined)
      setHoverDate(undefined)
      return
    }
    // Completing selection
    if (isBefore(date, pendingFrom)) {
      setPendingTo(pendingFrom)
      setPendingFrom(date)
      onChange(fmt(date), fmt(pendingFrom))
    } else {
      setPendingTo(date)
      onChange(fmt(pendingFrom), fmt(date))
    }
    setHoverDate(undefined)
    setTimeout(() => setOpen(false), 150)
  }

  const handleClear = () => {
    const t = todayLocal()
    onChange(fmt(subDays(t, 29)), fmt(t))
    setOpen(false)
  }

  const display =
    fromDate && toDate
      ? isSameDay(fromDate, toDate)
        ? format(fromDate, "yyyy/MM/dd")
        : `${format(fromDate, "yyyy/MM/dd")} 〜 ${format(toDate, "yyyy/MM/dd")}`
      : "期間を選択"

  // Top bar quick presets (smaller, frequently used)
  const topPresets = PRESETS.filter((p) => ["7d", "30d", "90d"].includes(p.key))

  const rightMonth = addMonths(leftMonth, 1)

  return (
    <div className="flex items-center gap-2 flex-wrap" ref={containerRef}>
      {topPresets.map((preset) => (
        <button
          key={preset.key}
          onClick={() => applyPreset(preset)}
          className={cn(
            "h-8 px-3 text-xs font-medium rounded-md border transition-colors",
            activePreset === preset.key
              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
          )}
        >
          {preset.label}
        </button>
      ))}

      {/* Trigger */}
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "h-8 inline-flex items-center gap-2 px-3 text-xs font-medium rounded-md border transition-colors",
            open
              ? "bg-indigo-50 border-indigo-300 text-indigo-700"
              : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
          )}
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          <span>{display}</span>
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-xl border border-gray-200 shadow-2xl overflow-hidden max-w-[calc(100vw-2rem)]">
            <div className="flex flex-col sm:flex-row">
              {/* Preset sidebar */}
              <div className="w-full sm:w-32 border-b sm:border-b-0 sm:border-r border-gray-100 bg-gray-50/60 py-2 flex sm:block overflow-x-auto">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.key}
                    onClick={() => applyPreset(preset)}
                    className={cn(
                      "block w-full text-left px-4 py-2 text-xs transition-colors",
                      activePreset === preset.key
                        ? "bg-indigo-100 text-indigo-700 font-medium"
                        : "text-gray-700 hover:bg-white"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Calendars */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => setLeftMonth((m) => subMonths(m, 1))}
                    className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
                    aria-label="前の月"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex-1 flex items-center justify-around text-sm font-semibold text-gray-900">
                    <span>{format(leftMonth, "yyyy年 M月")}</span>
                    <span>{format(rightMonth, "yyyy年 M月")}</span>
                  </div>
                  <button
                    onClick={() => setLeftMonth((m) => addMonths(m, 1))}
                    className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
                    aria-label="次の月"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex gap-6">
                  <MonthGrid
                    month={leftMonth}
                    pendingFrom={pendingFrom}
                    pendingTo={pendingTo}
                    hoverDate={hoverDate}
                    onDayClick={handleDayClick}
                    onDayHover={setHoverDate}
                  />
                  <MonthGrid
                    month={rightMonth}
                    pendingFrom={pendingFrom}
                    pendingTo={pendingTo}
                    hoverDate={hoverDate}
                    onDayClick={handleDayClick}
                    onDayHover={setHoverDate}
                  />
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    {pendingFrom && !pendingTo ? "終了日を選択してください" : `${pendingFrom ? format(pendingFrom, "yyyy/MM/dd") : "—"} 〜 ${pendingTo ? format(pendingTo, "yyyy/MM/dd") : "—"}`}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleClear}>
                      <X className="w-3 h-3 mr-1" /> リセット
                    </Button>
                    <Button size="sm" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => setOpen(false)}>
                      閉じる
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface MonthGridProps {
  month: Date
  pendingFrom: Date | undefined
  pendingTo: Date | undefined
  hoverDate: Date | undefined
  onDayClick: (d: Date) => void
  onDayHover: (d: Date | undefined) => void
}

function MonthGrid({ month, pendingFrom, pendingTo, hoverDate, onDayClick, onDayHover }: MonthGridProps) {
  // Build the 6x7 grid of dates for the given month
  const grid = useMemo(() => {
    const first = startOfMonth(month)
    const startWeekday = first.getDay() // 0 = Sun
    const start = subDays(first, startWeekday)
    const days: Date[] = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      d.setHours(0, 0, 0, 0)
      days.push(d)
    }
    return days
  }, [month])

  const today = todayLocal()

  // Compute the effective end date for in-range highlighting (hover or pendingTo)
  const effectiveEnd = pendingTo || (pendingFrom && hoverDate && isAfter(hoverDate, pendingFrom) ? hoverDate : undefined)
  const effectiveStart = pendingTo
    ? pendingFrom
    : pendingFrom && hoverDate && isBefore(hoverDate, pendingFrom)
    ? hoverDate
    : pendingFrom

  const isInRange = (d: Date): boolean => {
    if (!effectiveStart || !effectiveEnd) return false
    return !isBefore(d, effectiveStart) && !isAfter(d, effectiveEnd)
  }

  const isStart = (d: Date): boolean => effectiveStart != null && isSameDay(d, effectiveStart)
  const isEnd = (d: Date): boolean => effectiveEnd != null && isSameDay(d, effectiveEnd)

  return (
    <div className="select-none">
      <table className="border-separate" style={{ borderSpacing: "2px" }}>
        <thead>
          <tr>
            {WEEKDAYS.map((w, i) => (
              <th
                key={w}
                className={cn(
                  "w-10 h-7 text-[11px] font-semibold",
                  i === 0 ? "text-rose-500" : i === 6 ? "text-sky-500" : "text-gray-500"
                )}
              >
                {w}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }).map((_, weekIdx) => (
            <tr key={weekIdx}>
              {Array.from({ length: 7 }).map((_, dayIdx) => {
                const d = grid[weekIdx * 7 + dayIdx]
                const inMonth = d.getMonth() === month.getMonth()
                const inRange = isInRange(d)
                const start = isStart(d)
                const end = isEnd(d)
                const isToday = isSameDay(d, today)
                const isMiddle = inRange && !start && !end

                return (
                  <td key={dayIdx} className="p-0">
                    <button
                      type="button"
                      disabled={!inMonth}
                      onClick={() => inMonth && onDayClick(d)}
                      onMouseEnter={() => inMonth && onDayHover(d)}
                      onMouseLeave={() => onDayHover(undefined)}
                      className={cn(
                        "w-10 h-10 inline-flex items-center justify-center text-sm font-medium rounded-md transition-colors",
                        !inMonth && "text-gray-300 cursor-default",
                        // Default in-month cell
                        inMonth && !inRange && !isToday && "text-gray-700 hover:bg-gray-100",
                        // Today indicator (when not in range/selection)
                        isToday && !start && !end && !isMiddle && "ring-1 ring-indigo-400 text-indigo-700 font-semibold",
                        // In-range middle days
                        isMiddle && "bg-indigo-100 text-indigo-700 hover:bg-indigo-200",
                        // Range start/end
                        (start || end) && "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm font-semibold"
                      )}
                    >
                      {d.getDate()}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
