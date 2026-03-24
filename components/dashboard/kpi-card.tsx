import { ReactNode } from "react"
import { TrendingUp, TrendingDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

interface KpiCardProps {
  title: string
  value: number | string
  change?: number
  icon?: ReactNode
  prefix?: string
  suffix?: string
}

export function KpiCard({ title, value, change, icon, prefix, suffix }: KpiCardProps) {
  const formattedValue =
    typeof value === "number" ? value.toLocaleString() : value

  const isPositive = change !== undefined && change >= 0
  const isNegative = change !== undefined && change < 0

  return (
    <Card>
      <CardContent className="pt-2">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{title}</p>
          {icon && (
            <div className="text-muted-foreground">{icon}</div>
          )}
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          {prefix && (
            <span className="text-lg font-semibold text-muted-foreground">
              {prefix}
            </span>
          )}
          <span className="text-2xl font-bold tracking-tight">
            {formattedValue}
          </span>
          {suffix && (
            <span className="text-lg font-semibold text-muted-foreground">
              {suffix}
            </span>
          )}
        </div>
        {change !== undefined && (
          <div className="mt-1 flex items-center gap-1">
            {isPositive ? (
              <TrendingUp className="size-3.5 text-emerald-500" />
            ) : (
              <TrendingDown className="size-3.5 text-red-500" />
            )}
            <span
              className={cn(
                "text-xs font-medium",
                isPositive && "text-emerald-500",
                isNegative && "text-red-500"
              )}
            >
              {isPositive ? "+" : ""}
              {change.toFixed(1)}%
            </span>
            <span className="text-xs text-muted-foreground">前期比</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
