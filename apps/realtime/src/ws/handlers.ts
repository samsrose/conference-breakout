import {
  ClientMessageType,
  decodeClient,
  ErrorCode,
  ProtocolError,
  ServerMessageType,
  type HostEventPhasePayload,
  type HostFormIssuePayload,
  type HostGroupMergePayload,
  type HostGroupPartitionPayload,
  type ResponseSubmitPayload,
} from "@app/protocol";
import {
  FormSchema,
  GROUP_CAPACITY,
  type EventId,
  type Form,
  type FormId,
  type Group,
  type GroupId,
  type Participant,
  type Response,
  type ResponseId,
} from "@app/shared-types";
import {
  createWorld,
  partitionIntoGroups,
  mergeToPlenary,
  rollupFor,
  set as setComponent,
  type EntityId,
} from "@app/ecs";
import type { Broadcaster } from "./broadcaster.ts";
import type { Hub } from "./hub.ts";
import type { SocketSession } from "./session.ts";
import { sendEnvelope } from "./session.ts";
import type { Store } from "../kv/store.ts";
import { requireHost, requireParticipant } from "../security/guards.ts";
import { computeFormProgress } from "./formProgress.ts";

export interface HandlerCtx {
  store: Store;
  hub: Hub;
  broadcaster: Broadcaster;
}

async function requireEventNotClosed(
  store: Store,
  eventId: EventId,
): Promise<void> {
  const e = await store.getEvent(eventId);
  if (e?.phase === "closed") {
    throw new ProtocolError(ErrorCode.EventClosed, "event concluded");
  }
}

export async function dispatchClientMessage(
  ctx: HandlerCtx,
  session: SocketSession,
  raw: string,
): Promise<void> {
  if (!session.bucket.take()) {
    throw new ProtocolError(ErrorCode.RateLimited, "rate limited");
  }
  const { envelope, payload } = decodeClient(raw);
  switch (envelope.type) {
    case ClientMessageType.Heartbeat:
      return handleHeartbeat(ctx, session);
    case ClientMessageType.ResponseSubmit:
      return handleResponseSubmit(ctx, session, payload as ResponseSubmitPayload);
    case ClientMessageType.HostFormIssue:
      return handleHostFormIssue(ctx, session, payload as HostFormIssuePayload);
    case ClientMessageType.HostGroupPartition:
      return handleHostPartition(
        ctx,
        session,
        payload as HostGroupPartitionPayload,
      );
    case ClientMessageType.HostGroupMerge:
      return handleHostMerge(ctx, session, payload as HostGroupMergePayload);
    case ClientMessageType.HostEventPhase:
      return handleHostPhase(ctx, session, payload as HostEventPhasePayload);
    case ClientMessageType.Join:
      throw new ProtocolError(
        ErrorCode.BadEnvelope,
        "join is handled at connection time",
      );
    default:
      throw new ProtocolError(
        ErrorCode.BadEnvelope,
        `unhandled message type: ${envelope.type}`,
      );
  }
}

async function handleHeartbeat(
  ctx: HandlerCtx,
  session: SocketSession,
): Promise<void> {
  const now = Date.now();
  await ctx.store.putPresence({
    eventId: session.eventId,
    participantId: session.participantId,
    status: "online",
    lastSeenAt: now,
  });
  sendEnvelope(session, ServerMessageType.Pong, { ts: now });

  if (session.role === "host") {
    const summary = await ctx.store.summarizePresence(session.eventId);
    sendEnvelope(session, ServerMessageType.PresenceDelta, {
      eventId: session.eventId,
      ...summary,
    });
  }
}

async function handleResponseSubmit(
  ctx: HandlerCtx,
  session: SocketSession,
  payload: ResponseSubmitPayload,
): Promise<void> {
  requireParticipant(session);
  await requireEventNotClosed(ctx.store, session.eventId);
  const response: Response = {
    id: newId("resp") as unknown as ResponseId,
    eventId: session.eventId,
    formId: payload.formId,
    questionId: payload.questionId,
    participantId: session.participantId,
    value: payload.value,
    submittedAt: Date.now(),
  };
  await ctx.store.putResponse(response);
  await pushRollup(ctx, session.eventId, payload.formId);
  const forms = await ctx.store.listForms(session.eventId);
  const form = forms.find((f) => f.id === payload.formId);
  if (form) await pushFormProgress(ctx, session.eventId, form);
}

async function pushRollup(
  ctx: HandlerCtx,
  eventId: EventId,
  formId: FormId,
): Promise<void> {
  const forms = await ctx.store.listForms(eventId);
  const form = forms.find((f) => f.id === formId);
  if (!form) return;
  const responses = await ctx.store.listResponses(eventId);
  const world = createWorld();
  for (const r of responses) {
    if (r.formId === formId) {
      setComponent(world, "Response", r.id as unknown as EntityId, r);
    }
  }
  for (const q of form.questions) {
    const rollup = rollupFor(world, formId, q);
    await ctx.broadcaster.toHosts(
      eventId,
      ServerMessageType.ResponseRollup,
      rollup,
    );
  }
}

async function pushFormProgress(
  ctx: HandlerCtx,
  eventId: EventId,
  form: Form,
): Promise<void> {
  const progress = await computeFormProgress(ctx.store, eventId, form);
  const payload = {
    eventId,
    formId: form.id,
    ...progress,
  };
  if (form.target.kind === "event") {
    await ctx.broadcaster.toParticipants(
      eventId,
      ServerMessageType.FormProgress,
      payload,
    );
  } else {
    await ctx.broadcaster.toGroup(
      eventId,
      form.target.groupId,
      ServerMessageType.FormProgress,
      payload,
    );
  }
}

async function handleHostFormIssue(
  ctx: HandlerCtx,
  session: SocketSession,
  payload: HostFormIssuePayload,
): Promise<void> {
  requireHost(session);
  await requireEventNotClosed(ctx.store, session.eventId);
  const id = newId("form") as unknown as FormId;
  const now = Date.now();
  const form: Form = FormSchema.parse({
    ...payload.form,
    id,
    eventId: session.eventId,
    issuedAt: now,
  });
  await ctx.store.putForm(form);
  if (form.target.kind === "event") {
    await ctx.broadcaster.toParticipants(
      session.eventId,
      ServerMessageType.FormIssued,
      { form, target: form.target },
    );
  } else {
    await ctx.broadcaster.toGroup(
      session.eventId,
      form.target.groupId,
      ServerMessageType.FormIssued,
      { form, target: form.target },
    );
  }
  await pushFormProgress(ctx, session.eventId, form);
}

async function handleHostPartition(
  ctx: HandlerCtx,
  session: SocketSession,
  payload: HostGroupPartitionPayload,
): Promise<void> {
  requireHost(session);
  await requireEventNotClosed(ctx.store, session.eventId);
  const size = payload.size > 0 ? payload.size : GROUP_CAPACITY;
  const participants = await ctx.store.listParticipants(session.eventId);
  const world = createWorld();
  for (const p of participants) {
    setComponent(world, "Participant", p.id as unknown as EntityId, p);
  }
  const { groups, memberships } = partitionIntoGroups(
    world,
    session.eventId,
    size,
    Date.now(),
  );
  await ctx.store.clearGroupsForEvent(session.eventId);
  await ctx.store.putGroups(groups);
  await ctx.store.setMemberships(memberships);
  await ctx.store.setEventPhase(session.eventId, "breakout");
  await ctx.broadcaster.toEvent(
    session.eventId,
    ServerMessageType.PhaseChanged,
    { phase: "breakout" },
  );
  await fanOutGroupAssignments(ctx, session.eventId, groups, participants);
}

async function fanOutGroupAssignments(
  ctx: HandlerCtx,
  eventId: EventId,
  groups: Group[],
  participants: Participant[],
): Promise<void> {
  const groupIndex = new Map<GroupId, number>();
  for (const g of groups) groupIndex.set(g.id, g.index);

  for (const p of participants) {
    const m = await ctx.store.getMembership(eventId, p.id);
    const groupId = m?.groupId ?? null;
    const idx = groupId ? (groupIndex.get(groupId) ?? null) : null;
    const sockets = ctx.hub
      .participants(eventId)
      .filter((s) => s.participantId === p.id);
    for (const s of sockets) {
      s.groupIdCache = groupId;
    }
    await ctx.broadcaster.toParticipant(
      eventId,
      p.id,
      ServerMessageType.GroupAssigned,
      { groupId, groupIndex: idx },
    );
  }
}

async function handleHostMerge(
  ctx: HandlerCtx,
  session: SocketSession,
  _payload: HostGroupMergePayload,
): Promise<void> {
  requireHost(session);
  await requireEventNotClosed(ctx.store, session.eventId);
  const participants = await ctx.store.listParticipants(session.eventId);
  const world = createWorld();
  for (const p of participants) {
    setComponent(world, "Participant", p.id as unknown as EntityId, p);
  }
  const groups = await ctx.store.listGroups(session.eventId);
  for (const g of groups) {
    setComponent(world, "Group", g.id as unknown as EntityId, g);
  }
  mergeToPlenary(world, session.eventId, Date.now());
  await ctx.store.clearGroupsForEvent(session.eventId);
  await ctx.store.setMemberships(
    participants.map((p) => ({
      participantId: p.id,
      eventId: session.eventId,
      groupId: null,
      assignedAt: Date.now(),
    })),
  );
  await ctx.store.setEventPhase(session.eventId, "plenary");
  await ctx.broadcaster.toEvent(
    session.eventId,
    ServerMessageType.PhaseChanged,
    { phase: "plenary" },
  );
  for (const p of participants) {
    const sockets = ctx.hub
      .participants(session.eventId)
      .filter((s) => s.participantId === p.id);
    for (const s of sockets) s.groupIdCache = null;
    await ctx.broadcaster.toParticipant(
      session.eventId,
      p.id,
      ServerMessageType.GroupAssigned,
      { groupId: null, groupIndex: null },
    );
  }
}

async function handleHostPhase(
  ctx: HandlerCtx,
  session: SocketSession,
  payload: HostEventPhasePayload,
): Promise<void> {
  requireHost(session);
  const meta = await ctx.store.getEvent(session.eventId);
  if (!meta) {
    throw new ProtocolError(ErrorCode.NotFound, "event not found");
  }
  if (meta.phase === "closed" && payload.phase !== "closed") {
    throw new ProtocolError(ErrorCode.EventClosed, "event concluded");
  }
  await ctx.store.setEventPhase(session.eventId, payload.phase);
  await ctx.broadcaster.toEvent(
    session.eventId,
    ServerMessageType.PhaseChanged,
    { phase: payload.phase },
  );
  if (payload.phase === "closed") {
    ctx.hub.disconnectParticipants(session.eventId, 1000, "event concluded");
  }
}

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
}
