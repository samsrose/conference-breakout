import { z } from "zod";
import { QuestionIdSchema } from "./ids.ts";

const BaseQuestion = z.object({
  id: QuestionIdSchema,
  prompt: z.string().min(1).max(500),
  required: z.boolean().default(false),
});

export const SingleChoiceQuestionSchema = BaseQuestion.extend({
  kind: z.literal("single"),
  options: z.array(z.string().min(1).max(200)).min(2).max(12),
});
export const MultiChoiceQuestionSchema = BaseQuestion.extend({
  kind: z.literal("multi"),
  options: z.array(z.string().min(1).max(200)).min(2).max(12),
  maxSelections: z.number().int().positive().optional(),
});
export const TextQuestionSchema = BaseQuestion.extend({
  kind: z.literal("text"),
  maxLength: z.number().int().positive().max(2000).default(500),
});
export const ScaleQuestionSchema = BaseQuestion.extend({
  kind: z.literal("scale"),
  min: z.number().int(),
  max: z.number().int(),
  step: z.number().int().positive().default(1),
});

export const QuestionSchema = z.discriminatedUnion("kind", [
  SingleChoiceQuestionSchema,
  MultiChoiceQuestionSchema,
  TextQuestionSchema,
  ScaleQuestionSchema,
]);
export type Question = z.infer<typeof QuestionSchema>;

export const ResponseValueSchema = z.union([
  z.object({ kind: z.literal("single"), optionIndex: z.number().int().nonnegative() }),
  z.object({ kind: z.literal("multi"), optionIndices: z.array(z.number().int().nonnegative()).max(12) }),
  z.object({ kind: z.literal("text"), text: z.string().max(2000) }),
  z.object({ kind: z.literal("scale"), value: z.number().int() }),
]);
export type ResponseValue = z.infer<typeof ResponseValueSchema>;
