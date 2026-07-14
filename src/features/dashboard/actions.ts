"use server";

import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { CACHE_KEYS, CACHE_TAGS } from "@/constants/cache-key";

const getCachedDashboardSummary = (userId: number) =>
  unstable_cache(
    async (id: number) => {
      const [lastAttempt, completedCount] = await Promise.all([
        prisma.attempt.findFirst({
          where: { userId: id, status: "COMPLETED" },
          orderBy: { finishedAt: "desc" },
          select: {
            id: true,
            finishedAt: true,
            sectionScope: true,
            testPackage: { select: { id: true, name: true, jlptLevel: true } },
          },
        }),
        prisma.attempt.count({ where: { userId: id, status: "COMPLETED" } }),
      ]);

      return { lastAttempt, completedCount };
    },
    CACHE_KEYS.dashboardSummary(userId),
    { tags: [CACHE_TAGS.dashboardSummary(userId)] },
  )(userId);

// Session is a Request-time API (cookies), so it must be read outside the
// cached function and passed in as a plain argument.
export async function getDashboardSummary() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return getCachedDashboardSummary(session.userId);
}
