import Link from "next/link";
import { notFound } from "next/navigation";
import { getAttemptSummary } from "@/features/result/actions";
import { JlptScoreTable } from "@/components/jlpt-score-table";
import { computeJlptScoreProjection } from "@/lib/jlpt-score";
import { JLPT_SECTION_LABELS } from "@/constants/jlpt";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function formatDuration(startedAt: Date, finishedAt: Date | null) {
  if (!finishedAt) return "-";
  const minutes = Math.round((finishedAt.getTime() - startedAt.getTime()) / 60000);
  return `${minutes} menit`;
}

export default async function ResultSummaryPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const attemptIdNum = Number(attemptId);

  if (!Number.isInteger(attemptIdNum)) {
    notFound();
  }

  const { attempt, stats, mondaiStats } = await getAttemptSummary(attemptIdNum);
  const projection = computeJlptScoreProjection(mondaiStats);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-muted-foreground">
          {attempt.testPackage.jlptLevel} ·{" "}
          {attempt.sectionScope
            ? `Latihan ${JLPT_SECTION_LABELS[attempt.sectionScope]}`
            : "Mock Test"}
        </p>
        <h1 className="text-xl font-semibold">{attempt.testPackage.name}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">{stats.scorePercentage}%</CardTitle>
          <CardDescription>
            {stats.totalCorrect} benar dari {stats.totalQuestions} soal · durasi{" "}
            {formatDuration(attempt.startedAt, attempt.finishedAt)}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Benar</CardDescription>
            <CardTitle className="text-2xl text-primary">{stats.totalCorrect}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Salah</CardDescription>
            <CardTitle className="text-2xl text-destructive">{stats.totalWrong}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Tidak Dijawab</CardDescription>
            <CardTitle className="text-2xl">{stats.totalUnanswered}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Ditandai Ragu-ragu</CardDescription>
            <CardTitle className="text-2xl">{stats.totalFlagged}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {projection.sections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Analisis per Mondai & Proyeksi Skor</CardTitle>
            <CardDescription>
              Proyeksi skor pakai skala JLPT asli: 60 per scoring section
              (言語知識・読解・聴解), total 180. Kolom Skor Berbobot memakai bobot kesulitan
              per mondai (aproksimasi, bukan algoritma resmi JLPT).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <JlptScoreTable projection={projection} />
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Button nativeButton={false} render={<Link href={`/result/${attempt.id}/detail`} />}>
          Lihat Review Lengkap
        </Button>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={`/test-package/${attempt.testPackage.id}`} />}
        >
          Kembali ke Paket Tes
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/dashboard" />}>
          Ke Dashboard
        </Button>
      </div>
    </div>
  );
}
