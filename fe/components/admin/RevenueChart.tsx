"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

export interface RevenuePoint {
  period: string;
  revenue: number;
  bookingCount?: number;
}

export interface RevenueChartProps {
  data: RevenuePoint[];
  variant?: "line" | "bar";
  height?: number;
  xKey?: string;
  yKey?: string;
}

export function RevenueChart({
  data,
  variant = "line",
  height = 280,
  xKey = "period",
  yKey = "revenue",
}: RevenueChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground"
      >
        Chưa có dữ liệu
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      {variant === "bar" ? (
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey={xKey} className="text-xs" />
          <YAxis
            className="text-xs"
            tickFormatter={(v: number) =>
              v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}tr` : `${v / 1000}k`
            }
          />
          <Tooltip
            formatter={(v) => formatCurrency(Number(v) || 0)}
            labelClassName="text-foreground"
            contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }}
          />
          <Legend />
          <Bar dataKey={yKey} fill="hsl(var(--primary))" name="Doanh thu" radius={[4, 4, 0, 0]} />
        </BarChart>
      ) : (
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey={xKey} className="text-xs" />
          <YAxis
            className="text-xs"
            tickFormatter={(v: number) =>
              v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}tr` : `${v / 1000}k`
            }
          />
          <Tooltip
            formatter={(v) =>
              typeof v === "number" ? formatCurrency(v) : String(v ?? "")
            }
            contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey={yKey}
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ r: 3 }}
            name="Doanh thu"
          />
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}

export default RevenueChart;
