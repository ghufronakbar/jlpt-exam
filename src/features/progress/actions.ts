"use server";

import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import type { JlptLevel, MondaiType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { CACHE_KEYS, CACHE_TAGS } from "@/constants/cache-key";
import { JLPT_LEVEL_ORDER } from "@/constants/jlpt";
import type { MondaiStatInput } from "@/lib/jlpt-score";

export type ProgressAttempt = {
  id: number;
  packageName: string;
  finishedAt: Date | null;
  sectionScope: string | null;
  mondaiStats: MondaiStatInput[];
};

export type ProgressLevel = {
  level: JlptLevel;
  attempts: ProgressAttempt[];
};

// Per-attempt score tracking, grouped by JLPT level. Unlike /analytics (which
// aggregates all answers per level), this keeps every completed attempt as its
// own row so improvement between attempts is visible.
const getCachedProgress = (userId: number) =>
  unstable_cache(
    async (id: number): Promise<ProgressLevel[]> => {
      const attempts = await prisma.attempt.findMany({
        where: { userId: id, status: "COMPLETED" },
        orderBy: { finishedAt: "asc" },
        select: {
          id: true,
          finishedAt: true,
          sectionScope: true,
          testPackage: { select: { name: true, jlptLevel: true } },
          answers: {
            select: {
              isCorrect: true,
              question: { select: { testPackageItem: { select: { mondaiType: true } } } },
            },
          },
        },
      });

      const byLevel = new Map<JlptLevel, ProgressAttempt[]>();

      for (const attempt of attempts) {
        const byMondaiType = new Map<MondaiType, { correct: number; total: number }>();
        for (const answer of attempt.answers) {
          const mondaiType = answer.question.testPackageItem.mondaiType;
          const stat = byMondaiType.get(mondaiType) ?? { correct: 0, total: 0 };
          stat.total += 1;
          if (answer.isCorrect) stat.correct += 1;
          byMondaiType.set(mondaiType, stat);
        }

        const level = attempt.testPackage.jlptLevel;
        const list = byLevel.get(level) ?? [];
        list.push({
          id: attempt.id,
          packageName: attempt.testPackage.name,
          finishedAt: attempt.finishedAt,
          sectionScope: attempt.sectionScope,
          mondaiStats: Array.from(byMondaiType, ([mondaiType, stat]) => ({
            mondaiType,
            ...stat,
          })),
        });
        byLevel.set(level, list);
      }

      return JLPT_LEVEL_ORDER.filter((level) => byLevel.has(level)).map((level) => ({
        level,
        attempts: byLevel.get(level)!,
      }));
    },
    CACHE_KEYS.progress(userId),
    { tags: [CACHE_TAGS.analytics(userId)] },
  )(userId);

export async function getProgress() {
  const session = await getSession();
  if (!session) redirect("/login");

  return getCachedProgress(session.userId);
}
