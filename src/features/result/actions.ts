"use server";

import { notFound, redirect } from "next/navigation";
import { unstable_cache, updateTag } from "next/cache";
import type { MondaiType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createSignedUploadParams } from "@/lib/cloudinary";
import { CACHE_KEYS, CACHE_TAGS } from "@/constants/cache-key";
import type { MondaiStatInput } from "@/lib/jlpt-score";
import {
  AddQuestionCommentSchema,
  EditQuestionCommentSchema,
  DeleteQuestionCommentSchema,
  type AddQuestionCommentInput,
  type EditQuestionCommentInput,
  type DeleteQuestionCommentInput,
} from "./schemas";

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
            select: {
              selectedAnswer: true,
              isCorrect: true,
              flagged: true,
              question: {
                select: { testPackageItem: { select: { mondaiType: true } } },
              },
            },
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

  const byMondaiType = new Map<MondaiType, { correct: number; total: number }>();

  for (const answer of attempt.answers) {
    const { mondaiType } = answer.question.testPackageItem;
    const stat = byMondaiType.get(mondaiType) ?? { correct: 0, total: 0 };
    stat.total += 1;
    if (answer.isCorrect) stat.correct += 1;
    byMondaiType.set(mondaiType, stat);
  }

  const mondaiStats: MondaiStatInput[] = Array.from(byMondaiType, ([mondaiType, stat]) => ({
    mondaiType,
    ...stat,
  }));

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
    mondaiStats,
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
            select: {
              id: true,
              commentText: true,
              commentImages: true,
              createdAt: true,
              updatedAt: true,
              user: { select: { username: true } },
            },
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

async function resolveTestPackageIdForQuestion(questionId: number) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { testPackageItem: { select: { testPackageId: true } } },
  });
  if (!question) notFound();
  return question.testPackageItem.testPackageId;
}

export async function addQuestionCommentAction(input: AddQuestionCommentInput) {
  const authSession = await getSession();
  if (!authSession) redirect("/login");

  const validated = AddQuestionCommentSchema.safeParse(input);
  if (!validated.success) {
    throw new Error("Data tidak valid.");
  }

  const { questionId, commentText, commentImages } = validated.data;
  const testPackageId = await resolveTestPackageIdForQuestion(questionId);

  await prisma.questionComment.create({
    data: {
      questionId,
      userId: authSession.userId,
      commentText,
      commentImages,
    },
  });

  // So both mode-baca and this same review page reflect the new comment immediately.
  updateTag(CACHE_TAGS.testPackageQuestions(testPackageId));
}

export async function updateQuestionCommentAction(input: EditQuestionCommentInput) {
  const authSession = await getSession();
  if (!authSession) redirect("/login");

  const validated = EditQuestionCommentSchema.safeParse(input);
  if (!validated.success) {
    throw new Error("Data tidak valid.");
  }

  const { commentId, commentText, commentImages } = validated.data;

  const comment = await prisma.questionComment.findUnique({
    where: { id: commentId },
    select: { userId: true, questionId: true },
  });

  if (!comment || comment.userId !== authSession.userId) notFound();

  const testPackageId = await resolveTestPackageIdForQuestion(comment.questionId);

  await prisma.questionComment.update({
    where: { id: commentId },
    data: { commentText, commentImages },
  });

  updateTag(CACHE_TAGS.testPackageQuestions(testPackageId));
}

export async function deleteQuestionCommentAction(input: DeleteQuestionCommentInput) {
  const authSession = await getSession();
  if (!authSession) redirect("/login");

  const validated = DeleteQuestionCommentSchema.safeParse(input);
  if (!validated.success) {
    throw new Error("Data tidak valid.");
  }

  const { commentId } = validated.data;

  const comment = await prisma.questionComment.findUnique({
    where: { id: commentId },
    select: { userId: true, questionId: true },
  });

  if (!comment || comment.userId !== authSession.userId) notFound();

  const testPackageId = await resolveTestPackageIdForQuestion(comment.questionId);

  await prisma.questionComment.delete({ where: { id: commentId } });

  updateTag(CACHE_TAGS.testPackageQuestions(testPackageId));
}

// Client uploads straight to Cloudinary with these signed params — our server
// never proxies the file itself, and CLOUDINARY_API_SECRET never reaches the client.
export async function getCommentImageUploadSignatureAction() {
  const authSession = await getSession();
  if (!authSession) redirect("/login");

  return createSignedUploadParams(`jlpt-exam/comments/${authSession.userId}`);
}
