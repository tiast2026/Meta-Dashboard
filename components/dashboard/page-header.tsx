"use client";

import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { LoadingPill, TopProgressBar } from "@/components/dashboard/loading";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  clientName?: string;
  from: string;
  to: string;
  onDateChange: (from: string, to: string) => void;
  lastUpdated?: string;
  loading?: boolean;
}

export function PageHeader({ title, subtitle, clientName, from, to, onDateChange, lastUpdated, loading }: PageHeaderProps) {
  return (
    <>
      {loading && <TopProgressBar />}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur px-4 sm:px-6 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between min-w-0">
          <div className="min-w-0">
            {clientName && <p className="text-xs text-gray-400 font-medium mb-0.5">{clientName}</p>}
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900 truncate">{title}</h1>
              {loading && <LoadingPill />}
            </div>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
            {lastUpdated && <p className="text-xs text-gray-400 mt-1">最終更新: {lastUpdated}</p>}
          </div>
          {/* DateRangePicker handles its own popover overflow via
              max-w-[calc(100vw-2rem)] — do NOT wrap in overflow-x-auto here
              because that creates a clipping context and the popover would
              be hidden. */}
          <div className="flex flex-wrap items-center gap-2 -mx-1 px-1">
            <DateRangePicker from={from} to={to} onChange={onDateChange} />
          </div>
        </div>
      </div>
    </>
  );
}
