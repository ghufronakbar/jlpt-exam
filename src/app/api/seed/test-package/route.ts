import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/constants";
import rawSeedData from "./data.json";
import type { SeedData } from "./types";

// Import route for real bank-soal data scraped by another tool, written to
// ./data.json (shape documented in docs/seed.md). Unlike the Fase 5.1 demo
// seed route, this one handles real (larger, less trusted) data: protected by
// a shared-secret query param, and each Question is its own transaction so a
// single malformed record doesn't roll back everything already imported.
export const dynamic = "force-dynamic";

const seedData = rawSeedData as SeedData;

function log(message: string) {
  console.log(`[seed:test-package] ${message}`);
}

export async function GET(request: NextRequest) {
  const auth = request.nextUrl.searchParams.get("auth");

  if (!auth || auth !== env.SESSION_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = {
    packagesSeeded: [] as string[],
    packagesSkipped: [] as string[],
    questionsSeeded: 0,
    errors: [] as { context: string; message: string }[],
  };

  log(`START — ${seedData.testPackages.length} package(s) in data.json`);

  for (const pkg of seedData.testPackages) {
    const existing = await prisma.testPackage.findFirst({
      where: { name: pkg.name },
      select: { id: true },
    });

    if (existing) {
      log(`SKIP package "${pkg.name}" — sudah ada (id=${existing.id})`);
      summary.packagesSkipped.push(pkg.name);
      continue;
    }

    log(`CREATE package "${pkg.name}" (${pkg.jlptLevel})`);
    const testPackage = await prisma.testPackage.create({
      data: { name: pkg.name, jlptLevel: pkg.jlptLevel },
      select: { id: true },
    });

    // Local ref id (from data.json) -> real DB id, so questions can point at
    // the right shared QuestionContext.
    const contextIdMap = new Map<string, number>();

    for (const ctx of pkg.questionContexts ?? []) {
      const created = await prisma.questionContext.create({
        data: {
          testPackageId: testPackage.id,
          storyText: ctx.storyText ?? null,
          storyImage: ctx.storyImage ?? null,
          storyAudio: ctx.storyAudio ?? null,
        },
        select: { id: true },
      });
      contextIdMap.set(ctx.id, created.id);
      log(`  CREATE context "${ctx.id}" -> id ${created.id}`);
    }

    for (const item of pkg.testPackageItems) {
      const testPackageItem = await prisma.testPackageItem.create({
        data: {
          testPackageId: testPackage.id,
          mondaiType: item.mondaiType,
          section: item.section,
          session: item.session,
          order: item.order,
          instruction: item.instruction ?? null,
        },
        select: { id: true },
      });
      log(`  CREATE item ${item.mondaiType} (sesi ${item.session}, order ${item.order})`);

      for (const question of item.questions) {
        const questionLabel = `${pkg.name} / ${item.mondaiType} / soal #${question.order}`;

        let questionContextId: number | null = null;
        if (question.questionContextRef) {
          const resolved = contextIdMap.get(question.questionContextRef);
          if (!resolved) {
            const message = `questionContextRef "${question.questionContextRef}" tidak ditemukan di questionContexts`;
            log(`    ERROR ${questionLabel}: ${message}`);
            summary.errors.push({ context: questionLabel, message });
            continue;
          }
          questionContextId = resolved;
        }

        // One transaction per question: a bad record only fails itself, not
        // the questions already committed before it.
        try {
          await prisma.$transaction(async (tx) => {
            await tx.question.create({
              data: {
                testPackageItemId: testPackageItem.id,
                order: question.order,
                questionText: question.questionText,
                questionImage: question.questionImage ?? null,
                questionAudio: question.questionAudio ?? null,
                questionAnswer: question.questionAnswer,
                explanation: question.explanation ?? null,
                questionContextId,
                questionChoices: {
                  create: question.questionChoices.map((choice) => ({
                    codeAnswer: choice.codeAnswer,
                    answerText: choice.answerText,
                    answerImage: choice.answerImage ?? null,
                  })),
                },
              },
            });
          });
          summary.questionsSeeded += 1;
          log(`    CREATE ${questionLabel} — OK`);
        } catch (error) {
          // Per docs/database.md: constraint violations during import are a
          // signal of extraction error — report loudly, never skip silently.
          const message = error instanceof Error ? error.message : String(error);
          log(`    ERROR ${questionLabel}: ${message}`);
          summary.errors.push({ context: questionLabel, message });
        }
      }
    }

    summary.packagesSeeded.push(pkg.name);
  }

  log(
    `DONE — seeded ${summary.packagesSeeded.length} package(s), skipped ${summary.packagesSkipped.length}, ${summary.questionsSeeded} soal, ${summary.errors.length} error`,
  );

  return NextResponse.json(summary);
}
