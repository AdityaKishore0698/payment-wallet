"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "@/lib/theme";
import type { MonthlyAnalyticsPoint } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit",
  });
}

function compactCurrency(value: number, currency?: string): string {
  return formatCurrency(value, currency).replace(/\.00$/, "");
}

function useChartTheme() {
  const { resolved } = useTheme();
  const dark = resolved === "dark";
  return {
    dark,
    grid: dark ? "#1e293b" : "#e2e8f0",
    axis: dark ? "#94a3b8" : "#64748b",
    tooltipBg: dark ? "#0f172a" : "#ffffff",
  };
}

/** Area chart of the wallet's closing balance, month over month. */
export function BalanceAreaChart({
  data,
  currency,
}: {
  data: MonthlyAnalyticsPoint[];
  currency?: string;
}) {
  const t = useChartTheme();
  const chartData = data.map((d) => ({
    label: monthLabel(d.month),
    closing_balance: Number(d.closing_balance),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={t.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" stroke={t.axis} fontSize={12} tickLine={false} axisLine={false} />
        <YAxis
          stroke={t.axis}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          width={60}
          tickFormatter={(v: number) => compactCurrency(v, currency)}
        />
        <Tooltip
          contentStyle={{ background: t.tooltipBg, border: `1px solid ${t.grid}`, borderRadius: 12, fontSize: 13 }}
          labelStyle={{ color: t.axis }}
          formatter={(value) => [formatCurrency(Number(value), currency), "Balance"]}
        />
        <Area
          type="monotone"
          dataKey="closing_balance"
          name="Balance"
          stroke="#4f46e5"
          strokeWidth={2.5}
          fill="url(#balanceFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Grouped bar chart: money in vs. money out, per month. */
export function SpendingBarChart({
  data,
  currency,
}: {
  data: MonthlyAnalyticsPoint[];
  currency?: string;
}) {
  const t = useChartTheme();
  const chartData = data.map((d) => ({
    label: monthLabel(d.month),
    "Money in": Number(d.credit_total),
    "Money out": Number(d.debit_total),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }} barGap={4}>
        <CartesianGrid stroke={t.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" stroke={t.axis} fontSize={12} tickLine={false} axisLine={false} />
        <YAxis
          stroke={t.axis}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          width={60}
          tickFormatter={(v: number) => compactCurrency(v, currency)}
        />
        <Tooltip
          contentStyle={{ background: t.tooltipBg, border: `1px solid ${t.grid}`, borderRadius: 12, fontSize: 13 }}
          labelStyle={{ color: t.axis }}
          formatter={(value) => formatCurrency(Number(value), currency)}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Money in" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Money out" fill="#f43f5e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
