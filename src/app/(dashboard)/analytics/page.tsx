import { Suspense } from "react";
import type { JlptSection } from "@prisma/client";
import { getAnalytics, type AnalyticsScope } from "@/features/analytics/actions";
import { AnalyticsFilterBar } from "@/features/analytics/components/analytics-filter-bar";
import { AnalyticsTabs } from "@/features/analytics/components/analytics-tabs";
import { ScoreTrendChart } from "@/features/analytics/components/score-trend-chart";
import { computeJlptScoreProjection } from "@/lib/jlpt-score";
import { resolveDateRangePreset, isDateRangePreset } from "@/lib/date-range-preset";
import { JLPT_SECTION_LABELS } from "@/constants/jlpt";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const VALID_SECTIONS = Object.keys(JLPT_SECTION_LABELS) as JlptSection[];

function resolveScope(value: string | undefined): AnalyticsScope {
  if (value === "MOCK") return "MOCK";
  if (value && (VALID_SECTIONS as string[]).includes(value)) return value as JlptSection;
  return "ALL";
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; range?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const scope = resolveScope(params.scope);
  const rangePreset = isDateRangePreset(params.range) ? params.range : "all";
  const { from, to } = resolveDateRangePreset(rangePreset, params.from, params.to);

  const { trend, levelStats } = await getAnalytics({
    scope,
    fromIso: from?.toISOString(),
    toIso: to?.toISOString(),
  });

  const trendData = trend.map((point) => ({
    id: point.id,
    dateLabel: point.finishedAt
      ? new Date(point.finishedAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })
      : "-",
    packageLabel: point.packageName,
    scorePercentage: point.scorePercentage,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Rapor hasil belajar dari attempt yang sudah selesai.
        </p>
      </div>

      <Suspense>
        <AnalyticsFilterBar />
      </Suspense>

      <Card>
        <CardHeader>
          <CardTitle>Tren Skor</CardTitle>
          <CardDescription>
            Skor tiap attempt yang sudah diselesaikan, berurutan waktu, sesuai filter di atas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trendData.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada attempt yang cocok dengan filter ini.
            </p>
          ) : (
            <ScoreTrendChart data={trendData} />
          )}
        </CardContent>
      </Card>

      {levelStats.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Analisis per Level</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Belum ada data untuk filter ini.</p>
          </CardContent>
        </Card>
      ) : (
        <AnalyticsTabs
          levelStats={levelStats.map(({ level, mondaiStats }) => ({
            level,
            projection: computeJlptScoreProjection(mondaiStats),
          }))}
        />
      )}
    </div>
  );
}
