import { z } from "zod";
import { EventIdSchema, FormIdSchema, GroupIdSchema } from "./ids.ts";
import { QuestionSchema } from "./question.ts";

export const FormTargetSchema = z.union([
  z.object({ kind: z.literal("event"), eventId: EventIdSchema }),
  z.object({ kind: z.literal("group"), groupId: GroupIdSchema }),
]);
export type FormTarget = z.infer<typeof FormTargetSchema>;

export const FormSchema = z.object({
  id: FormIdSchema,
  eventId: EventIdSchema,
  title: z.string().min(1).max(200),
  questions: z.array(QuestionSchema).min(1).max(20),
  target: FormTargetSchema,
  issuedAt: z.number().int().nonnegative(),
  closesAt: z.number().int().nonnegative().optional(),
});
export type Form = z.infer<typeof FormSchema>;

export const FormProgressSchema = z.object({
  eventId: EventIdSchema,
  formId: FormIdSchema,
  expectedRespondents: z.number().int().nonnegative(),
  completedAllQuestions: z.number().int().nonnegative(),
  remainingRespondents: z.number().int().nonnegative(),
});
export type FormProgress = z.infer<typeof FormProgressSchema>;
