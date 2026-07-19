"use server";

import { notFound, redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createSignedUploadParams } from "@/lib/cloudinary";
import { CACHE_TAGS } from "@/constants/cache-key";
import {
  AddQuestionCommentSchema,
  EditQuestionCommentSchema,
  DeleteQuestionCommentSchema,
  type AddQuestionCommentInput,
  type EditQuestionCommentInput,
  type DeleteQuestionCommentInput,
} from "./schemas";

// Comments live on Question (not Attempt), so they're shared between mode-baca
// (/test-package/[id]/questions) and attempt review (/result/[attemptId]/detail)
// — invalidating by testPackageId refreshes both.
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
