import { z } from "zod";

const commentImagesSchema = z.array(z.string().url()).max(4, "Maksimal 4 gambar.");

export const AddQuestionCommentSchema = z.object({
  questionId: z.number().int().positive(),
  commentText: z.string().trim().min(1, "Komentar tidak boleh kosong.").max(2000),
  commentImages: commentImagesSchema,
});

export const EditQuestionCommentSchema = z.object({
  commentId: z.number().int().positive(),
  commentText: z.string().trim().min(1, "Komentar tidak boleh kosong.").max(2000),
  commentImages: commentImagesSchema,
});

export const DeleteQuestionCommentSchema = z.object({
  commentId: z.number().int().positive(),
});

export type AddQuestionCommentInput = z.infer<typeof AddQuestionCommentSchema>;
export type EditQuestionCommentInput = z.infer<typeof EditQuestionCommentSchema>;
export type DeleteQuestionCommentInput = z.infer<typeof DeleteQuestionCommentSchema>;
