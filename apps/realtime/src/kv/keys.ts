import type {
  EventId,
  FormId,
  GroupId,
  ParticipantId,
  ResponseId,
} from "@app/shared-types";

export const keys = {
  eventByCode: (code: string) => ["event_by_code", code] as const,
  event: (eventId: EventId) => ["event", eventId] as const,
  participant: (eventId: EventId, participantId: ParticipantId) =>
    ["event", eventId, "participant", participantId] as const,
  participantsByEvent: (eventId: EventId) =>
    ["event", eventId, "participant"] as const,
  membership: (eventId: EventId, participantId: ParticipantId) =>
    ["event", eventId, "membership", participantId] as const,
  membershipsByEvent: (eventId: EventId) =>
    ["event", eventId, "membership"] as const,
  group: (eventId: EventId, groupId: GroupId) =>
    ["event", eventId, "group", groupId] as const,
  groupsByEvent: (eventId: EventId) => ["event", eventId, "group"] as const,
  form: (eventId: EventId, formId: FormId) =>
    ["event", eventId, "form", formId] as const,
  formsByEvent: (eventId: EventId) => ["event", eventId, "form"] as const,
  response: (eventId: EventId, responseId: ResponseId) =>
    ["event", eventId, "response", responseId] as const,
  responsesByEvent: (eventId: EventId) =>
    ["event", eventId, "response"] as const,
  presence: (eventId: EventId, participantId: ParticipantId) =>
    ["event", eventId, "presence", participantId] as const,
  presenceByEvent: (eventId: EventId) =>
    ["event", eventId, "presence"] as const,
  outbox: (eventId: EventId, seq: string) =>
    ["event", eventId, "outbox", seq] as const,
  outboxStream: (eventId: EventId) => ["event", eventId, "outbox"] as const,
  host: (hostId: string) => ["host", hostId] as const,
  hostByEmail: (email: string) => ["host_by_email", email.toLowerCase()] as const,
  rateLimit: (socketId: string) => ["ratelimit", socketId] as const,
  ipConn: (ip: string) => ["ip_conn", ip] as const,
};
