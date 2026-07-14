import { z } from "zod";
import { JlptSection } from "@prisma/client";

export const CreateAttemptSchema = z.object({
  testPackageId: z.number().int().positive(),
  sectionScope: z.nativeEnum(JlptSection).nullable(),
});

export type CreateAttemptInput = z.infer<typeof CreateAttemptSchema>;
