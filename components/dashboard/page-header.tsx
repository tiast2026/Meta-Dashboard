"use client";

import { DateRangePicker } from "@/components/dashboard/date-range-picker";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  clientName?: string;
  from: string;
  to: string;
  onDateChange: (from: string, to: string) => void;
  lastUpdated?: string;
}

export function PageHeader({ title, subtitle, clientName, from, to, onDateChange, lastUpdated }: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur px-6 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {clientName && <p className="text-xs text-gray-400 font-medium mb-0.5">{clientName}</p>}
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          {lastUpdated && <p className="text-xs text-gray-400 mt-1">最終更新: {lastUpdated}</p>}
        </div>
        <DateRangePicker from={from} to={to} onChange={onDateChange} />
      </div>
    </div>
  );
}
