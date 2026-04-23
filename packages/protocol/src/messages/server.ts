import { z } from "zod";
import {
  EventIdSchema,
  EventPhaseSchema,
  FormSchema,
  FormTargetSchema,
  GroupIdSchema,
  ParticipantIdSchema,
  PresenceSummarySchema,
  ResponseRollupSchema,
} from "@app/shared-types";
import { ErrorCode } from "../errors.ts";

export const ServerMessageType = {
  Welcome: "welcome",
  FormIssued: "form.issued",
  GroupAssigned: "group.assigned",
  PresenceDelta: "presence.delta",
  ResponseRollup: "response.rollup",
  PhaseChanged: "phase.changed",
  Error: "error",
  Pong: "pong",
} as const;
export type ServerMessageType =
  (typeof ServerMessageType)[keyof typeof ServerMessageType];

export const WelcomePayloadSchema = z.object({
  participantId: ParticipantIdSchema,
  eventId: EventIdSchema,
  phase: EventPhaseSchema,
  groupId: GroupIdSchema.nullable(),
  role: z.enum(["host", "participant"]),
});
export type WelcomePayload = z.infer<typeof WelcomePayloadSchema>;

export const FormIssuedPayloadSchema = z.object({
  form: FormSchema,
  target: FormTargetSchema,
});
export type FormIssuedPayload = z.infer<typeof FormIssuedPayloadSchema>;

export const GroupAssignedPayloadSchema = z.object({
  groupId: GroupIdSchema.nullable(),
  groupIndex: z.number().int().nonnegative().nullable(),
});
export type GroupAssignedPayload = z.infer<typeof GroupAssignedPayloadSchema>;

export const PresenceDeltaPayloadSchema = PresenceSummarySchema;
export type PresenceDeltaPayload = z.infer<typeof PresenceDeltaPayloadSchema>;

export const ResponseRollupPayloadSchema = ResponseRollupSchema;
export type ResponseRollupPayload = z.infer<typeof ResponseRollupPayloadSchema>;

export const PhaseChangedPayloadSchema = z.object({
  phase: EventPhaseSchema,
});
export type PhaseChangedPayload = z.infer<typeof PhaseChangedPayloadSchema>;

export const ErrorPayloadSchema = z.object({
  code: z.enum([
    ErrorCode.BadEnvelope,
    ErrorCode.BadPayload,
    ErrorCode.Unauthenticated,
    ErrorCode.Unauthorized,
    ErrorCode.NotFound,
    ErrorCode.RateLimited,
    ErrorCode.EventClosed,
    ErrorCode.VersionMismatch,
    ErrorCode.Internal,
  ]),
  message: z.string(),
});
export type ErrorPayload = z.infer<typeof ErrorPayloadSchema>;

export const PongPayloadSchema = z.object({ ts: z.number().int() });
export type PongPayload = z.infer<typeof PongPayloadSchema>;

export const SERVER_PAYLOAD_SCHEMAS = {
  [ServerMessageType.Welcome]: WelcomePayloadSchema,
  [ServerMessageType.FormIssued]: FormIssuedPayloadSchema,
  [ServerMessageType.GroupAssigned]: GroupAssignedPayloadSchema,
  [ServerMessageType.PresenceDelta]: PresenceDeltaPayloadSchema,
  [ServerMessageType.ResponseRollup]: ResponseRollupPayloadSchema,
  [ServerMessageType.PhaseChanged]: PhaseChangedPayloadSchema,
  [ServerMessageType.Error]: ErrorPayloadSchema,
  [ServerMessageType.Pong]: PongPayloadSchema,
} as const;
