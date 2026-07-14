import Link from "next/link";
import { getTestPackages } from "@/features/test-package/actions";
import { JLPT_LEVEL_ORDER } from "@/constants/jlpt";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export default async function TestPackageListPage() {
  const testPackages = await getTestPackages();

  const grouped = JLPT_LEVEL_ORDER.map((level) => ({
    level,
    packages: testPackages.filter((testPackage) => testPackage.jlptLevel === level),
  })).filter((group) => group.packages.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Test Package</h1>
        <p className="text-sm text-muted-foreground">
          Pilih paket tes untuk mulai mock test atau latihan per seksi.
        </p>
      </div>

      {grouped.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Belum ada paket tes. Tambahkan bank soal terlebih dahulu.
        </p>
      ) : (
        grouped.map((group) => (
          <section key={group.level} className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-muted-foreground">{group.level}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.packages.map((testPackage) => (
                <Link key={testPackage.id} href={`/test-package/${testPackage.id}`}>
                  <Card className="h-full transition-colors hover:bg-muted/50">
                    <CardHeader>
                      <CardTitle>{testPackage.name}</CardTitle>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
