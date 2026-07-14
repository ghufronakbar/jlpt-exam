"use server";

import { notFound, redirect } from "next/navigation";
import { unstable_cache, updateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { CACHE_KEYS, CACHE_TAGS } from "@/constants/cache-key";
import { AddQuestionCommentSchema, type AddQuestionCommentInput } from "./schemas";

const getCachedAttemptSummary = (attemptId: number, userId: number) =>
  unstable_cache(
    async (id: number, ownerId: number) => {
      const attempt = await prisma.attempt.findUnique({
        where: { id },
        select: {
          id: true,
          userId: true,
          testPackageId: true,
          sectionScope: true,
          status: true,
          startedAt: true,
          finishedAt: true,
          testPackage: { select: { id: true, name: true, jlptLevel: true } },
          answers: {
            select: { selectedAnswer: true, isCorrect: true, flagged: true },
          },
        },
      });

      if (!attempt || attempt.userId !== ownerId) return null;

      return attempt;
    },
    CACHE_KEYS.attemptSummary(attemptId),
    { tags: [CACHE_TAGS.attemptSummary(attemptId)] },
  )(attemptId, userId);

export async function getAttemptSummary(attemptId: number) {
  const authSession = await getSession();
  if (!authSession) redirect("/login");

  const attempt = await getCachedAttemptSummary(attemptId, authSession.userId);
  if (!attempt) notFound();
  if (attempt.status !== "COMPLETED") redirect(`/test-package/${attempt.testPackageId}`);

  const totalQuestions = attempt.answers.length;
  const totalCorrect = attempt.answers.filter((a) => a.isCorrect).length;
  const totalUnanswered = attempt.answers.filter((a) => a.selectedAnswer === null).length;
  const totalWrong = totalQuestions - totalCorrect - totalUnanswered;
  const totalFlagged = attempt.answers.filter((a) => a.flagged).length;
  const scorePercentage = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  return {
    attempt: {
      id: attempt.id,
      status: attempt.status,
      sectionScope: attempt.sectionScope,
      startedAt: attempt.startedAt,
      finishedAt: attempt.finishedAt,
      testPackage: attempt.testPackage,
    },
    stats: { totalQuestions, totalCorrect, totalWrong, totalUnanswered, totalFlagged, scorePercentage },
  };
}

// Not cached: includes per-user QuestionComment which must reflect new
// comments immediately (read-your-own-writes) right after submitting one.
export async function getAttemptDetail(attemptId: number) {
  const authSession = await getSession();
  if (!authSession) redirect("/login");

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      userId: true,
      testPackageId: true,
      sectionScope: true,
      status: true,
      testPackage: { select: { id: true, name: true, jlptLevel: true } },
    },
  });

  if (!attempt || attempt.userId !== authSession.userId) notFound();
  if (attempt.status !== "COMPLETED") redirect(`/test-package/${attempt.testPackageId}`);

  const testPackageItems = await prisma.testPackageItem.findMany({
    where: attempt.sectionScope
      ? { testPackageId: attempt.testPackageId, section: attempt.sectionScope }
      : { testPackageId: attempt.testPackageId },
    orderBy: [{ session: "asc" }, { order: "asc" }],
    select: {
      id: true,
      mondaiType: true,
      section: true,
      session: true,
      order: true,
      instruction: true,
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          questionText: true,
          questionImage: true,
          questionAudio: true,
          questionAnswer: true,
          explanation: true,
          questionContext: {
            select: { id: true, storyText: true, storyImage: true, storyAudio: true },
          },
          questionChoices: {
            orderBy: { codeAnswer: "asc" },
            select: { id: true, codeAnswer: true, answerText: true, answerImage: true },
          },
          questionComments: {
            where: { userId: authSession.userId },
            orderBy: { createdAt: "desc" },
            select: { id: true, commentText: true, commentImages: true, createdAt: true },
          },
          attemptAnswers: {
            where: { attemptId },
            select: { selectedAnswer: true, isCorrect: true, flagged: true },
          },
        },
      },
    },
  });

  return { attempt, testPackageItems };
}

export async function addQuestionCommentAction(input: AddQuestionCommentInput) {
  const authSession = await getSession();
  if (!authSession) redirect("/login");

  const validated = AddQuestionCommentSchema.safeParse(input);
  if (!validated.success) {
    throw new Error("Data tidak valid.");
  }

  const { questionId, commentText } = validated.data;

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { testPackageItem: { select: { testPackageId: true } } },
  });

  if (!question) notFound();

  await prisma.questionComment.create({
    data: {
      questionId,
      userId: authSession.userId,
      commentText,
      commentImages: [],
    },
  });

  // So both mode-baca and this same review page reflect the new comment immediately.
  updateTag(CACHE_TAGS.testPackageQuestions(question.testPackageItem.testPackageId));
}
