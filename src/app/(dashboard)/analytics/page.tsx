import { getAnalytics } from "@/features/analytics/actions";
import { ScoreTrendChart } from "@/features/analytics/components/score-trend-chart";
import { JlptScoreTable } from "@/components/jlpt-score-table";
import { computeJlptScoreProjection } from "@/lib/jlpt-score";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AnalyticsPage() {
  const { trend, levelStats } = await getAnalytics();

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

      <Card>
        <CardHeader>
          <CardTitle>Tren Skor</CardTitle>
          <CardDescription>
            Skor tiap attempt yang sudah diselesaikan, berurutan waktu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trendData.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada attempt yang selesai. Kerjakan mock test atau latihan dulu.
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
            <p className="text-sm text-muted-foreground">Belum ada data.</p>
          </CardContent>
        </Card>
      ) : (
        levelStats.map(({ level, mondaiStats }) => (
          <Card key={level}>
            <CardHeader>
              <CardTitle>{level}</CardTitle>
              <CardDescription>
                Akurasi per mondai (agregat semua attempt selesai) + proyeksi skor ala JLPT:
                skala 60 per scoring section, total 180. Kolom Skor Berbobot memakai bobot
                kesulitan per mondai (aproksimasi, bukan algoritma resmi JLPT).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <JlptScoreTable projection={computeJlptScoreProjection(mondaiStats)} />
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
