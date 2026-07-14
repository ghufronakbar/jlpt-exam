"use client";

import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

type TrendPoint = {
  id: number;
  dateLabel: string;
  packageLabel: string;
  scorePercentage: number;
};

const chartConfig = {
  scorePercentage: { label: "Skor (%)", color: "var(--chart-2)" },
} satisfies ChartConfig;

function TrendTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: TrendPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <div className="font-medium">{point.packageLabel}</div>
      <div className="text-muted-foreground">{point.dateLabel}</div>
      <div className="font-mono font-medium">{point.scorePercentage}%</div>
    </div>
  );
}

export function ScoreTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
      <LineChart data={data} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="dateLabel" tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tickLine={false} axisLine={false} width={32} />
        <Tooltip content={<TrendTooltip />} />
        <Line
          dataKey="scorePercentage"
          type="monotone"
          stroke="var(--color-scorePercentage)"
          strokeWidth={2}
          dot={{ r: 4 }}
        />
      </LineChart>
    </ChartContainer>
  );
}
