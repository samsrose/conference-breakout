import { z } from "zod";
import {
  EventCodeSchema,
  DeviceIdSchema,
  FormIdSchema,
  FormSchema,
  QuestionIdSchema,
  EventPhaseSchema,
  ResponseValueSchema,
} from "@app/shared-types";

export const ClientMessageType = {
  Join: "join",
  Heartbeat: "heartbeat",
  ResponseSubmit: "response.submit",
  HostFormIssue: "host.form.issue",
  HostGroupPartition: "host.group.partition",
  HostGroupMerge: "host.group.merge",
  HostEventPhase: "host.event.phase",
} as const;
export type ClientMessageType =
  (typeof ClientMessageType)[keyof typeof ClientMessageType];

export const JoinPayloadSchema = z.object({
  eventCode: EventCodeSchema,
  deviceId: DeviceIdSchema,
  displayName: z.string().min(1).max(60),
});
export type JoinPayload = z.infer<typeof JoinPayloadSchema>;

export const HeartbeatPayloadSchema = z.object({}).strict();
export type HeartbeatPayload = z.infer<typeof HeartbeatPayloadSchema>;

export const ResponseSubmitPayloadSchema = z.object({
  formId: FormIdSchema,
  questionId: QuestionIdSchema,
  value: ResponseValueSchema,
});
export type ResponseSubmitPayload = z.infer<typeof ResponseSubmitPayloadSchema>;

export const HostFormIssuePayloadSchema = z.object({
  form: FormSchema.omit({ id: true, issuedAt: true }).extend({
    id: z.string().optional(),
  }),
});
export type HostFormIssuePayload = z.infer<typeof HostFormIssuePayloadSchema>;

export const HostGroupPartitionPayloadSchema = z.object({
  size: z.number().int().positive().max(100).default(8),
});
export type HostGroupPartitionPayload = z.infer<
  typeof HostGroupPartitionPayloadSchema
>;

export const HostGroupMergePayloadSchema = z.object({}).strict();
export type HostGroupMergePayload = z.infer<typeof HostGroupMergePayloadSchema>;

export const HostEventPhasePayloadSchema = z.object({
  phase: EventPhaseSchema,
});
export type HostEventPhasePayload = z.infer<typeof HostEventPhasePayloadSchema>;

export const CLIENT_PAYLOAD_SCHEMAS = {
  [ClientMessageType.Join]: JoinPayloadSchema,
  [ClientMessageType.Heartbeat]: HeartbeatPayloadSchema,
  [ClientMessageType.ResponseSubmit]: ResponseSubmitPayloadSchema,
  [ClientMessageType.HostFormIssue]: HostFormIssuePayloadSchema,
  [ClientMessageType.HostGroupPartition]: HostGroupPartitionPayloadSchema,
  [ClientMessageType.HostGroupMerge]: HostGroupMergePayloadSchema,
  [ClientMessageType.HostEventPhase]: HostEventPhasePayloadSchema,
} as const;
