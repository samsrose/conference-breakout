import { z } from "zod";

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

export type EventId = Brand<string, "EventId">;
export type ParticipantId = Brand<string, "ParticipantId">;
export type GroupId = Brand<string, "GroupId">;
export type FormId = Brand<string, "FormId">;
export type QuestionId = Brand<string, "QuestionId">;
export type ResponseId = Brand<string, "ResponseId">;
export type DeviceId = Brand<string, "DeviceId">;
export type HostId = Brand<string, "HostId">;

const uuidLike = z
  .string()
  .regex(/^[a-z0-9_-]{8,64}$/i, "must be a url-safe id");

export const EventIdSchema = uuidLike.transform((v: string) => v as EventId);
export const ParticipantIdSchema = uuidLike.transform(
  (v: string) => v as ParticipantId,
);
export const GroupIdSchema = uuidLike.transform((v: string) => v as GroupId);
export const FormIdSchema = uuidLike.transform((v: string) => v as FormId);
export const QuestionIdSchema = uuidLike.transform(
  (v: string) => v as QuestionId,
);
export const ResponseIdSchema = uuidLike.transform(
  (v: string) => v as ResponseId,
);
export const DeviceIdSchema = uuidLike.transform((v: string) => v as DeviceId);
export const HostIdSchema = uuidLike.transform((v: string) => v as HostId);

export const EventCodeSchema = z
  .string()
  .regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/, "event codes look like ABCD-1234");
export type EventCode = z.infer<typeof EventCodeSchema>;
