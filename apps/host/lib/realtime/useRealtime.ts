"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ServerMessageType,
  type PresenceDeltaPayload,
  type ResponseRollupPayload,
  type WelcomePayload,
  type PhaseChangedPayload,
} from "@app/protocol";
import { RealtimeClient } from "./client.ts";
import { REALTIME_WS } from "../env.ts";

export interface HostRealtimeState {
  connected: boolean;
  welcome: WelcomePayload | null;
  presence: PresenceDeltaPayload | null;
  rollups: Map<string, ResponseRollupPayload>;
  phase: PhaseChangedPayload["phase"] | null;
  error: string | null;
  terminated: string | null;
}

export interface HostRealtime extends HostRealtimeState {
  issueForm: (payload: unknown) => void;
  partitionGroups: (size: number) => void;
  mergeGroups: () => void;
  setPhase: (phase: PhaseChangedPayload["phase"]) => void;
  concludeEvent: () => void;
}

const emptyState: HostRealtimeState = {
  connected: false,
  welcome: null,
  presence: null,
  rollups: new Map(),
  phase: null,
  error: null,
  terminated: null,
};

export function useHostRealtime(
  token: string | null,
  onTerminal?: (reason: string) => void,
): HostRealtime {
  const [state, setState] = useState<HostRealtimeState>(emptyState);
  const clientRef = useRef<RealtimeClient | null>(null);
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
      onOpen: () => setState((s) => ({ ...s, connected: true })),
      onClose: () => setState((s) => ({ ...s, connected: false })),
      onError: (err) => setState((s) => ({ ...s, error: err.message })),
      onTerminal: (reason) => {
        setState((s) => ({ ...s, terminated: reason, connected: false }));
        terminalCbRef.current?.(reason);
      },
      onMessage: (type, payload) => applyMessage(setState, type, payload),
    });
    clientRef.current = client;
    client.connect();
    return () => client.close();
  }, [token]);

  const issueForm = useCallback((payload: unknown) => {
    clientRef.current?.send("host.form.issue", payload);
  }, []);
  const partitionGroups = useCallback((size: number) => {
    clientRef.current?.send("host.group.partition", { size });
  }, []);
  const mergeGroups = useCallback(() => {
    clientRef.current?.send("host.group.merge", {});
  }, []);
  const setPhase = useCallback((phase: PhaseChangedPayload["phase"]) => {
    clientRef.current?.send("host.event.phase", { phase });
  }, []);
  const concludeEvent = useCallback(() => {
    clientRef.current?.send("host.event.phase", { phase: "closed" });
  }, []);

  return {
    ...state,
    issueForm,
    partitionGroups,
    mergeGroups,
    setPhase,
    concludeEvent,
  };
}

function applyMessage(
  setState: React.Dispatch<React.SetStateAction<HostRealtimeState>>,
  type: string,
  payload: unknown,
): void {
  setState((s) => {
    switch (type) {
      case ServerMessageType.Welcome: {
        const welcome = payload as WelcomePayload;
        return { ...s, welcome, phase: welcome.phase };
      }
      case ServerMessageType.PresenceDelta:
        return { ...s, presence: payload as PresenceDeltaPayload };
      case ServerMessageType.ResponseRollup: {
        const rollup = payload as ResponseRollupPayload;
        const next = new Map(s.rollups);
        next.set(`${rollup.formId}:${rollup.questionId}`, rollup);
        return { ...s, rollups: next };
      }
      case ServerMessageType.PhaseChanged:
        return { ...s, phase: (payload as PhaseChangedPayload).phase };
      case ServerMessageType.Error:
        return { ...s, error: JSON.stringify(payload) };
      default:
        return s;
    }
  });
}
