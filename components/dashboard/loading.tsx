"use client"

import { Loader2 } from "lucide-react"

/** Full-page-section loading indicator with a spinner and text. */
export function LoadingSection({ message = "データを読み込み中..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  )
}

/** Skeleton block used while data is loading. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-100 ${className}`} />
}

/** Grid of skeleton KPI cards. */
export function KpiSkeletonRow({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-[110px]" />
      ))}
    </div>
  )
}

/** Inline progress bar shown above the page header while a refresh is in flight
 *  and there is already data on screen (so we don't replace the whole page). */
export function TopProgressBar() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-indigo-100 overflow-hidden md:left-56">
      <div className="h-full bg-indigo-600 animate-[progress_1.4s_ease-in-out_infinite] origin-left" />
      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%) scaleX(0.4); }
          50% { transform: translateX(0%) scaleX(0.6); }
          100% { transform: translateX(100%) scaleX(0.4); }
        }
      `}</style>
    </div>
  )
}

/** Compact pill-style indicator placed inline (e.g. in a header). */
export function LoadingPill({ message = "更新中..." }: { message?: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-xs text-indigo-700">
      <Loader2 className="w-3.5 h-3.5 animate-spin" />
      {message}
    </div>
  )
}
