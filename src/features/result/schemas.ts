import { z } from "zod";

export const AddQuestionCommentSchema = z.object({
  questionId: z.number().int().positive(),
  commentText: z.string().trim().min(1, "Komentar tidak boleh kosong.").max(2000),
});

export type AddQuestionCommentInput = z.infer<typeof AddQuestionCommentSchema>;
