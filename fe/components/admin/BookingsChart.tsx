"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from "recharts";

export interface BookingsChartPoint {
  label: string;
  count: number;
}

interface BookingsChartProps {
  data: BookingsChartPoint[];
  variant?: "bar" | "line";
  height?: number;
}

export function BookingsChart({
  data,
  variant = "bar",
  height = 280,
}: BookingsChartProps) {
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
      {variant === "line" ? (
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="label" className="text-xs" />
          <YAxis className="text-xs" allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#16a34a"
            strokeWidth={2}
            dot={{ r: 3 }}
            name="Số đơn"
          />
        </LineChart>
      ) : (
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="label" className="text-xs" />
          <YAxis className="text-xs" allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
            }}
          />
          <Legend />
          <Bar dataKey="count" fill="#16a34a" name="Số đơn" radius={[4, 4, 0, 0]} />
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}

export default BookingsChart;
