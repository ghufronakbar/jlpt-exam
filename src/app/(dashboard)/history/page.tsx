import Link from "next/link";
import { getAttemptHistory } from "@/features/history/actions";
import { JLPT_SECTION_LABELS } from "@/constants/jlpt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const ATTEMPT_STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: "Sedang dikerjakan",
  COMPLETED: "Selesai",
  ABANDONED: "Dibatalkan",
};

export default async function HistoryPage() {
  const attempts = await getAttemptHistory();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">History</h1>
        <p className="text-sm text-muted-foreground">
          Semua attempt yang pernah kamu kerjakan, lintas paket.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Attempt</CardTitle>
        </CardHeader>
        <CardContent>
          {attempts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada attempt. Mulai dari{" "}
              <Link href="/test-package" className="underline underline-offset-4">
                daftar paket tes
              </Link>
              .
            </p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {attempts.map((attempt) => (
                <li
                  key={attempt.id}
                  className="flex flex-col gap-2 border-b pb-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {attempt.testPackage.name}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {attempt.testPackage.jlptLevel}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {attempt.sectionScope
                        ? `Latihan ${JLPT_SECTION_LABELS[attempt.sectionScope]}`
                        : "Mock Test"}{" "}
                      · {new Date(attempt.startedAt).toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={attempt.status === "COMPLETED" ? "default" : "secondary"}>
                      {ATTEMPT_STATUS_LABELS[attempt.status]}
                    </Badge>
                    {attempt.status === "COMPLETED" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          nativeButton={false}
                          render={<Link href={`/result/${attempt.id}`} />}
                        >
                          Lihat Hasil
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          nativeButton={false}
                          render={<Link href={`/result/${attempt.id}/detail`} />}
                        >
                          Review
                        </Button>
                      </>
                    )}
                    {attempt.status === "IN_PROGRESS" && (
                      <Button
                        size="sm"
                        nativeButton={false}
                        render={<Link href={`/exam/${attempt.id}/${attempt.resumeSession}`} />}
                      >
                        Lanjutkan
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
