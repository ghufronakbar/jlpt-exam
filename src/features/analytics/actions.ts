"use server";

import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import type { JlptSection, MondaiType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { CACHE_KEYS, CACHE_TAGS } from "@/constants/cache-key";
import { MONDAI_TYPE_LABELS, JLPT_SECTION_LABELS } from "@/constants/jlpt";

type CategoryStat = {
  key: string;
  label: string;
  total: number;
  correct: number;
  accuracy: number;
};

function toSortedStats<K extends string>(
  map: Map<K, { total: number; correct: number }>,
  labels: Record<K, string>,
): CategoryStat[] {
  return Array.from(map.entries())
    .map(([key, { total, correct }]) => ({
      key,
      label: labels[key],
      total,
      correct,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
    }))
    .sort((a, b) => a.accuracy - b.accuracy);
}

// Weakness breakdown per mondaiType/section can't be a Prisma `groupBy` since
// those fields live on TestPackageItem, two relations away from AttemptAnswer
// — fetch the flat rows and aggregate in JS instead (data volume is tiny for
// a single-user app).
const getCachedAnalytics = (userId: number) =>
  unstable_cache(
    async (id: number) => {
      const [attempts, answers] = await Promise.all([
        prisma.attempt.findMany({
          where: { userId: id, status: "COMPLETED" },
          orderBy: { finishedAt: "asc" },
          select: {
            id: true,
            finishedAt: true,
            sectionScope: true,
            testPackage: { select: { name: true, jlptLevel: true } },
            answers: { select: { isCorrect: true } },
          },
        }),
        prisma.attemptAnswer.findMany({
          where: { attempt: { userId: id, status: "COMPLETED" } },
          select: {
            isCorrect: true,
            question: {
              select: { testPackageItem: { select: { mondaiType: true, section: true } } },
            },
          },
        }),
      ]);

      const trend = attempts.map((attempt) => {
        const total = attempt.answers.length;
        const correct = attempt.answers.filter((a) => a.isCorrect).length;
        return {
          id: attempt.id,
          finishedAt: attempt.finishedAt,
          packageName: attempt.testPackage.name,
          jlptLevel: attempt.testPackage.jlptLevel,
          sectionScope: attempt.sectionScope,
          totalQuestions: total,
          totalCorrect: correct,
          scorePercentage: total > 0 ? Math.round((correct / total) * 100) : 0,
        };
      });

      const byMondaiType = new Map<MondaiType, { total: number; correct: number }>();
      const bySection = new Map<JlptSection, { total: number; correct: number }>();

      for (const answer of answers) {
        const { mondaiType, section } = answer.question.testPackageItem;

        const m = byMondaiType.get(mondaiType) ?? { total: 0, correct: 0 };
        m.total += 1;
        if (answer.isCorrect) m.correct += 1;
        byMondaiType.set(mondaiType, m);

        const s = bySection.get(section) ?? { total: 0, correct: 0 };
        s.total += 1;
        if (answer.isCorrect) s.correct += 1;
        bySection.set(section, s);
      }

      return {
        trend,
        mondaiTypeStats: toSortedStats(byMondaiType, MONDAI_TYPE_LABELS),
        sectionStats: toSortedStats(bySection, JLPT_SECTION_LABELS),
      };
    },
    CACHE_KEYS.analytics(userId),
    { tags: [CACHE_TAGS.analytics(userId)] },
  )(userId);

export async function getAnalytics() {
  const session = await getSession();
  if (!session) redirect("/login");

  return getCachedAnalytics(session.userId);
}
