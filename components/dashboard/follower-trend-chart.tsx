"use client"

import { format, parseISO } from "date-fns"
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"

interface FollowerTrendChartProps {
  data: Array<{ date: string; followers: number }>
}

export function FollowerTrendChart({ data }: FollowerTrendChartProps) {
  // Calculate daily change
  const chartData = data.map((d, i) => {
    const prev = i > 0 ? data[i - 1].followers : d.followers;
    const change = d.followers - prev;
    return {
      ...d,
      dateLabel: format(parseISO(d.date), "M/d"),
      change,
    };
  });

  // Auto-scale Y axis for followers (min-max with padding)
  const followers = data.map((d) => d.followers).filter((v) => v > 0);
  const minFollowers = followers.length > 0 ? Math.min(...followers) : 0;
  const maxFollowers = followers.length > 0 ? Math.max(...followers) : 100;
  const padding = Math.max(Math.round((maxFollowers - minFollowers) * 0.1), 10);
  const yMin = Math.max(0, minFollowers - padding);
  const yMax = maxFollowers + padding;

  // Auto-scale Y axis for change
  const changes = chartData.map((d) => d.change);
  const maxChange = Math.max(...changes.map(Math.abs), 1);

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 mb-4">フォロワーチャート</h3>
      <div className="h-[380px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
            <YAxis
              yAxisId="followers"
              domain={[yMin, yMax]}
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => v.toLocaleString()}
              width={65}
            />
            <YAxis
              yAxisId="change"
              orientation="right"
              domain={[-maxChange, maxChange]}
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickLine={false}
              axisLine={false}
              width={45}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "13px", color: "#1f2937", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
              formatter={(value: unknown, name: unknown) => {
                const n = String(name);
                if (n === "followers") return [Number(value).toLocaleString(), "フォロワー数"];
                if (n === "change") return [(Number(value) >= 0 ? "+" : "") + Number(value).toLocaleString(), "増減"];
                return [Number(value).toLocaleString(), n];
              }}
            />
            <Legend formatter={(value) => {
              const labels: Record<string, string> = { followers: "フォロワー数", change: "日次増減" };
              return <span style={{ color: "#6b7280" }}>{labels[value] ?? value}</span>;
            }} />
            <Bar yAxisId="change" dataKey="change" fill="#93c5fd" radius={[3, 3, 0, 0]} barSize={16} />
            <Line yAxisId="followers" type="monotone" dataKey="followers" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
