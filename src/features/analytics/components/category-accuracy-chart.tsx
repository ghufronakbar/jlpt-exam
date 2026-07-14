"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

type CategoryPoint = {
  key: string;
  label: string;
  total: number;
  correct: number;
  accuracy: number;
};

const chartConfig = {
  accuracy: { label: "Akurasi (%)", color: "var(--chart-3)" },
} satisfies ChartConfig;

const WEAK_THRESHOLD = 60;

function CategoryTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: CategoryPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium">{point.label}</div>
      <div className="text-muted-foreground">
        {point.correct} / {point.total} benar
      </div>
      <div className="font-mono font-medium">{point.accuracy}%</div>
    </div>
  );
}

// Single-metric magnitude chart (one bar per category) — bars below
// WEAK_THRESHOLD use the status/destructive color to flag weak areas;
// this isn't a categorical series so there's no legend to conflict with.
export function CategoryAccuracyChart({ data }: { data: CategoryPoint[] }) {
  const height = Math.max(160, data.length * 40);

  return (
    <ChartContainer config={chartConfig} className="aspect-auto w-full" style={{ height }}>
      <BarChart data={data} layout="vertical" margin={{ left: 12, right: 24 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={120} />
        <Tooltip content={<CategoryTooltip />} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="accuracy" radius={4}>
          {data.map((point) => (
            <Cell
              key={point.key}
              fill={point.accuracy < WEAK_THRESHOLD ? "var(--destructive)" : "var(--color-accuracy)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
