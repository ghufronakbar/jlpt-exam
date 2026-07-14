import { getAnalytics } from "@/features/analytics/actions";
import { ScoreTrendChart } from "@/features/analytics/components/score-trend-chart";
import { CategoryAccuracyChart } from "@/features/analytics/components/category-accuracy-chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AnalyticsPage() {
  const { trend, mondaiTypeStats, sectionStats } = await getAnalytics();

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

      <Card>
        <CardHeader>
          <CardTitle>Kelemahan per Tipe Mondai</CardTitle>
          <CardDescription>
            Diurutkan dari akurasi terendah — bar merah = di bawah 60%.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mondaiTypeStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada data.</p>
          ) : (
            <CategoryAccuracyChart data={mondaiTypeStats} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kelemahan per Section</CardTitle>
          <CardDescription>Moji-Goi, Bunpou, Dokkai, Choukai.</CardDescription>
        </CardHeader>
        <CardContent>
          {sectionStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada data.</p>
          ) : (
            <CategoryAccuracyChart data={sectionStats} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
