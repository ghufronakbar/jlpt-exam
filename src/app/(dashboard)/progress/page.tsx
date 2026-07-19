import type { MondaiType } from "@prisma/client";
import { getProgress } from "@/features/progress/actions";
import {
  ProgressTabs,
  type ProgressLevelView,
  type ProgressTableRow,
} from "@/features/progress/components/progress-tabs";
import {
  computeJlptScoreProjection,
  MONDAI_WEIGHTS,
  type ScoringSectionKey,
} from "@/lib/jlpt-score";
import { MONDAI_TYPE_LABELS } from "@/constants/jlpt";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const MONDAI_ORDER = Object.keys(MONDAI_WEIGHTS) as MondaiType[];
const SECTION_KEYS: ScoringSectionKey[] = ["GENGO_CHISHIKI", "DOKKAI", "CHOUKAI"];

export default async function ProgressPage() {
  const progressLevels = await getProgress();

  const levels: ProgressLevelView[] = progressLevels.map(({ level, attempts }) => {
    // Union of every mondai type seen in this level's attempts, in canonical
    // exam order — section-practice attempts only fill a subset of columns.
    const mondaiTypes = MONDAI_ORDER.filter((mondaiType) =>
      attempts.some((attempt) =>
        attempt.mondaiStats.some((stat) => stat.mondaiType === mondaiType),
      ),
    );

    const rows: ProgressTableRow[] = attempts.map((attempt) => {
      const projection = computeJlptScoreProjection(attempt.mondaiStats);

      const mondaiAccuracy: ProgressTableRow["mondaiAccuracy"] = {};
      for (const stat of attempt.mondaiStats) {
        mondaiAccuracy[stat.mondaiType] =
          stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
      }

      const sections = Object.fromEntries(
        SECTION_KEYS.map((key) => {
          const section = projection.sections.find((s) => s.key === key);
          return [
            key,
            section
              ? {
                  plainScore: section.plainScore,
                  weightedScore: section.weightedScore,
                  accuracy: section.accuracy,
                }
              : null,
          ];
        }),
      ) as ProgressTableRow["sections"];

      return {
        attemptId: attempt.id,
        packageName: attempt.packageName,
        dateLabel: attempt.finishedAt
          ? new Date(attempt.finishedAt).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "-",
        mondaiAccuracy,
        sections,
        totalPlain: projection.plainScore,
        totalWeighted: projection.weightedScore,
        totalMax: projection.maxScore,
        totalAccuracy: projection.accuracy,
      };
    });

    return {
      level,
      mondaiColumns: mondaiTypes.map((mondaiType) => ({
        mondaiType,
        label: MONDAI_TYPE_LABELS[mondaiType],
      })),
      rows,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Progress</h1>
        <p className="text-sm text-muted-foreground">
          Perkembangan skor per attempt, dikelompokkan per level.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Skor per Attempt</CardTitle>
          <CardDescription>
            Urut dari attempt paling lama ke paling baru. Skor pakai skala JLPT asli (60 per
            scoring section, total 180); kolom Berbobot memakai bobot kesulitan per mondai
            (aproksimasi). Attempt latihan per seksi hanya mengisi kolom section yang dikerjakan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {levels.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada attempt yang selesai. Kerjakan mock test atau latihan dulu.
            </p>
          ) : (
            <ProgressTabs levels={levels} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
