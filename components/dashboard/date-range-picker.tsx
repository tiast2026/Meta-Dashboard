"use client"

import { useState } from "react"
import { format, subDays } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DateRangePickerProps {
  from: string
  to: string
  onChange: (from: string, to: string) => void
}

const presets = [
  { label: "7\u65E5", days: 7 },
  { label: "30\u65E5", days: 30 },
  { label: "90\u65E5", days: 90 },
]

export function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)

  const fromDate = from ? new Date(from) : undefined
  const toDate = to ? new Date(to) : undefined

  const handlePreset = (days: number) => {
    const end = new Date()
    const start = subDays(end, days)
    onChange(format(start, "yyyy-MM-dd"), format(end, "yyyy-MM-dd"))
  }

  const handleSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from) {
      const newFrom = format(range.from, "yyyy-MM-dd")
      const newTo = range.to ? format(range.to, "yyyy-MM-dd") : newFrom
      onChange(newFrom, newTo)
      if (range.to) {
        setOpen(false)
      }
    }
  }

  const displayText =
    fromDate && toDate
      ? `${format(fromDate, "yyyy/MM/dd")} - ${format(toDate, "yyyy/MM/dd")}`
      : "\u671F\u9593\u3092\u9078\u629E"

  return (
    <div className="flex items-center gap-2">
      {presets.map((preset) => (
        <Button
          key={preset.days}
          variant="outline"
          size="sm"
          onClick={() => handlePreset(preset.days)}
        >
          {preset.label}
        </Button>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className="inline-flex items-center justify-start gap-2 min-w-[220px] rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm hover:bg-accent hover:text-accent-foreground"
        >
          <CalendarIcon className="size-4 text-muted-foreground" />
          <span className="text-sm">{displayText}</span>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={{ from: fromDate, to: toDate }}
            onSelect={handleSelect}
            numberOfMonths={2}
            defaultMonth={fromDate}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
