import Link from "next/link";
import { notFound } from "next/navigation";
import { getTestPackageDetail } from "@/features/test-package/actions";
import { StartAttemptActions } from "@/features/test-package/components/start-attempt-actions";
import { JLPT_SESSION_TIMING, JLPT_SECTION_LABELS } from "@/constants/jlpt";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const ATTEMPT_STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: "Sedang dikerjakan",
  COMPLETED: "Selesai",
  ABANDONED: "Dibatalkan",
};

export default async function TestPackageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const testPackageId = Number(id);

  if (!Number.isInteger(testPackageId)) {
    notFound();
  }

  const { testPackage, attempts } = await getTestPackageDetail(testPackageId);

  const availableSections = Array.from(
    new Set(testPackage.testPackageItems.map((item) => item.section)),
  );

  const timing = JLPT_SESSION_TIMING[testPackage.jlptLevel];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">{testPackage.jlptLevel}</p>
        <h1 className="text-xl font-semibold">{testPackage.name}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Waktu Resmi JLPT (Acuan Timer Manual)</CardTitle>
          <CardDescription>
            Timer tidak disediakan sistem — pasang timer manual sesuai durasi resmi berikut.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          {timing.map((t) => (
            <div key={t.session} className="flex justify-between">
              <span>
                Sesi {t.session} — {t.label}
              </span>
              <span className="font-medium">{t.durationMinutes} menit</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mulai Mengerjakan</CardTitle>
        </CardHeader>
        <CardContent>
          {availableSections.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada soal di paket ini.</p>
          ) : (
            <StartAttemptActions
              testPackageId={testPackage.id}
              availableSections={availableSections}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Pengerjaan</CardTitle>
        </CardHeader>
        <CardContent>
          {attempts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum pernah dikerjakan.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {attempts.map((attempt) => (
                <li
                  key={attempt.id}
                  className="flex items-center justify-between gap-2 border-b pb-2 last:border-b-0"
                >
                  <div className="flex flex-col">
                    <span>
                      {attempt.sectionScope
                        ? `Latihan ${JLPT_SECTION_LABELS[attempt.sectionScope]}`
                        : "Mock Test"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(attempt.startedAt).toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={attempt.status === "COMPLETED" ? "default" : "secondary"}>
                      {ATTEMPT_STATUS_LABELS[attempt.status]}
                    </Badge>
                    {attempt.status === "COMPLETED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        nativeButton={false}
                        render={<Link href={`/result/${attempt.id}`} />}
                      >
                        Lihat Hasil
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={`/test-package/${testPackage.id}/questions`} />}
        >
          Lihat Semua Soal (Mode Baca)
        </Button>
      </div>
    </div>
  );
}
