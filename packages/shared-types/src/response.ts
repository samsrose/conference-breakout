import { z } from "zod";
import {
  EventIdSchema,
  FormIdSchema,
  ParticipantIdSchema,
  QuestionIdSchema,
  ResponseIdSchema,
} from "./ids.ts";
import { ResponseValueSchema } from "./question.ts";

export const ResponseSchema = z.object({
  id: ResponseIdSchema,
  eventId: EventIdSchema,
  formId: FormIdSchema,
  questionId: QuestionIdSchema,
  participantId: ParticipantIdSchema,
  value: ResponseValueSchema,
  submittedAt: z.number().int().nonnegative(),
});
export type Response = z.infer<typeof ResponseSchema>;

export const ResponseRollupSchema = z.object({
  formId: FormIdSchema,
  questionId: QuestionIdSchema,
  prompt: z.string().min(1).max(500),
  total: z.number().int().nonnegative(),
  summary: z.union([
    z.object({
      kind: z.literal("choice"),
      counts: z.array(z.number().int().nonnegative()),
      optionLabels: z.array(z.string().min(1).max(200)).min(2).max(12),
    }),
    z.object({
      kind: z.literal("text"),
      samples: z.array(z.string()).max(20),
    }),
    z.object({
      kind: z.literal("scale"),
      histogram: z.record(z.string(), z.number().int().nonnegative()),
      mean: z.number(),
    }),
  ]),
});
export type ResponseRollup = z.infer<typeof ResponseRollupSchema>;
