"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Per-user attempt list across all packages — not cached, same reasoning as
// the per-package attempt history in features/test-package: changes every
// time an attempt starts/finishes, low read volume for a single-user app.
export async function getAttemptHistory() {
  const session = await getSession();
  if (!session) redirect("/login");

  return prisma.attempt.findMany({
    where: { userId: session.userId },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      status: true,
      sectionScope: true,
      startedAt: true,
      finishedAt: true,
      testPackage: { select: { id: true, name: true, jlptLevel: true } },
    },
  });
}
