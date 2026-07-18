import Link from "next/link";
import { getDashboardSummary } from "@/features/dashboard/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const { lastAttempt, completedCount } = await getDashboardSummary();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan latihan JLPT kamu.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Total Attempt Selesai</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{completedCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attempt Terakhir</CardTitle>
            <CardDescription>
              {lastAttempt
                ? lastAttempt.sectionScope
                  ? "Latihan per seksi"
                  : "Mock test"
                : "Belum ada attempt yang selesai"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lastAttempt ? (
              <div className="space-y-1 text-sm">
                <p className="font-medium">{lastAttempt.testPackage.name}</p>
                <p className="text-muted-foreground">
                  {lastAttempt.testPackage.jlptLevel}
                  {lastAttempt.finishedAt
                    ? ` · ${new Date(lastAttempt.finishedAt).toLocaleDateString("id-ID")}`
                    : ""}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Mulai latihan pertamamu dari daftar paket tes.
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Button
              nativeButton={false}
              render={
                <Link
                  href={lastAttempt ? `/result/${lastAttempt.id}` : "/test-package"}
                />
              }
            >
              {lastAttempt ? "Lihat Hasil" : "Mulai Latihan"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div>
        <Button variant="outline" nativeButton={false} render={<Link href="/test-package" />}>
          Lihat Semua Paket Tes
        </Button>
      </div>
    </div>
  );
}
