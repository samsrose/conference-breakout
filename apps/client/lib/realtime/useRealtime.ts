"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ServerMessageType,
  type FormIssuedPayload,
  type FormProgressPayload,
  type GroupAssignedPayload,
  type PhaseChangedPayload,
  type ResponseSubmitPayload,
  type WelcomePayload,
} from "@app/protocol";
import { RealtimeClient } from "./client.ts";
import { SubmitQueue } from "./submitQueue.ts";
import { REALTIME_WS } from "../env.ts";

export interface ParticipantRealtimeState {
  connected: boolean;
  welcome: WelcomePayload | null;
  group: GroupAssignedPayload | null;
  currentForm: FormIssuedPayload | null;
  formProgress: FormProgressPayload | null;
  phase: PhaseChangedPayload["phase"] | null;
  pendingSubmits: number;
  error: string | null;
  terminated: string | null;
}

export interface ParticipantRealtime extends ParticipantRealtimeState {
  submitResponse: (payload: ResponseSubmitPayload) => void;
}

const emptyState: ParticipantRealtimeState = {
  connected: false,
  welcome: null,
  group: null,
  currentForm: null,
  formProgress: null,
  phase: null,
  pendingSubmits: 0,
  error: null,
  terminated: null,
};

export function useParticipantRealtime(
  token: string | null,
  onTerminal?: (reason: string) => void,
): ParticipantRealtime {
  const [state, setState] = useState<ParticipantRealtimeState>(emptyState);
  const clientRef = useRef<RealtimeClient | null>(null);
  const queueRef = useRef<SubmitQueue | null>(null);
  const terminalCbRef = useRef(onTerminal);
  terminalCbRef.current = onTerminal;

  useEffect(() => {
    if (!token) {
      setState(emptyState);
      return;
    }
    const client = new RealtimeClient({
      url: REALTIME_WS,
      token,
      endConnectionWhenEventClosed: true,
      onOpen: () => {
        setState((s) => ({ ...s, connected: true }));
        queueRef.current?.drain();
        setState((s) => ({
          ...s,
          pendingSubmits: queueRef.current?.pending() ?? 0,
        }));
      },
      onClose: () => setState((s) => ({ ...s, connected: false })),
      onError: (err) => setState((s) => ({ ...s, error: err.message })),
      onTerminal: (reason) => {
        setState((s) => ({ ...s, terminated: reason, connected: false }));
        terminalCbRef.current?.(reason);
      },
      onMessage: (type, payload) => applyMessage(setState, type, payload),
    });
    clientRef.current = client;
    queueRef.current = new SubmitQueue(client);
    client.connect();
    return () => client.close();
  }, [token]);

  const submitResponse = useCallback((payload: ResponseSubmitPayload) => {
    queueRef.current?.enqueue("response.submit", payload);
    setState((s) => ({
      ...s,
      pendingSubmits: queueRef.current?.pending() ?? 0,
    }));
  }, []);

  return { ...state, submitResponse };
}

function applyMessage(
  setState: React.Dispatch<React.SetStateAction<ParticipantRealtimeState>>,
  type: string,
  payload: unknown,
): void {
  setState((s) => {
    switch (type) {
      case ServerMessageType.Welcome: {
        const welcome = payload as WelcomePayload;
        return { ...s, welcome, phase: welcome.phase };
      }
      case ServerMessageType.GroupAssigned:
        return { ...s, group: payload as GroupAssignedPayload };
      case ServerMessageType.FormIssued:
        return {
          ...s,
          currentForm: payload as FormIssuedPayload,
          formProgress: null,
        };
      case ServerMessageType.FormProgress:
        return { ...s, formProgress: payload as FormProgressPayload };
      case ServerMessageType.PhaseChanged:
        return { ...s, phase: (payload as PhaseChangedPayload).phase };
      case ServerMessageType.Error:
        return { ...s, error: JSON.stringify(payload) };
      default:
        return s;
    }
  });
}
