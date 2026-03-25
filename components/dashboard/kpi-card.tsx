import { ReactNode } from "react"
import { TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface KpiCardProps {
  title: string
  value: number | string
  change?: number
  icon?: ReactNode
  prefix?: string
  suffix?: string
  color?: "pink" | "blue" | "purple" | "emerald" | "amber"
}

const colorMap = {
  pink: "from-pink-500 to-rose-500",
  blue: "from-blue-500 to-cyan-500",
  purple: "from-violet-500 to-purple-500",
  emerald: "from-emerald-500 to-teal-500",
  amber: "from-amber-500 to-orange-500",
}

const iconBgMap = {
  pink: "bg-pink-400/30",
  blue: "bg-blue-400/30",
  purple: "bg-violet-400/30",
  emerald: "bg-emerald-400/30",
  amber: "bg-amber-400/30",
}

export function KpiCard({ title, value, change, icon, prefix, suffix, color = "blue" }: KpiCardProps) {
  const formattedValue =
    typeof value === "number" ? value.toLocaleString() : value

  const isPositive = change !== undefined && change >= 0

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-lg transition-transform hover:scale-[1.02]",
      colorMap[color]
    )}>
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
      <div className="absolute -right-2 -top-2 h-16 w-16 rounded-full bg-white/10" />

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-white/80">{title}</p>
        {icon && (
          <div className={cn("rounded-lg p-1.5", iconBgMap[color])}>{icon}</div>
        )}
      </div>

      <div className="flex items-baseline gap-1">
        {prefix && (
          <span className="text-lg font-semibold text-white/70">{prefix}</span>
        )}
        <span className="text-3xl font-bold tracking-tight">{formattedValue}</span>
        {suffix && (
          <span className="text-lg font-semibold text-white/70">{suffix}</span>
        )}
      </div>

      {change !== undefined && (
        <div className="mt-2 flex items-center gap-1.5">
          <div className="flex items-center gap-0.5 rounded-full bg-white/20 px-2 py-0.5">
            {isPositive ? (
              <TrendingUp className="size-3 text-white" />
            ) : (
              <TrendingDown className="size-3 text-white" />
            )}
            <span className="text-xs font-semibold text-white">
              {isPositive ? "+" : ""}{change.toFixed(1)}%
            </span>
          </div>
          <span className="text-xs text-white/60">前期比</span>
        </div>
      )}
    </div>
  )
}
