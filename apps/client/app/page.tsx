"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { EventMeta } from "@app/shared-types";
import { JoinForm } from "../components/join/JoinForm.tsx";
import { GroupBanner } from "../components/live/GroupBanner.tsx";
import { FormRunner } from "../components/live/FormRunner.tsx";
import { ConnectionStatus } from "../components/live/ConnectionStatus.tsx";
import { useParticipantRealtime } from "../lib/realtime/useRealtime.ts";

interface Session {
  event: EventMeta;
  token: string;
}

export default function Page() {
  return (
    <Suspense fallback={<Splash />}>
      <ParticipantApp />
    </Suspense>
  );
}

function ParticipantApp() {
  const params = useSearchParams();
  const [session, setSession] = useState<Session | null>(null);
  const [terminalReason, setTerminalReason] = useState<string | null>(null);
  const realtime = useParticipantRealtime(
    session?.token ?? null,
    (reason) => {
      // Session is no longer valid on the server (stale token, event gone,
      // unauthorized). Clear it and send the user back to the join screen.
      setTerminalReason(reason);
      setSession(null);
      safeClear();
    },
  );

  useEffect(() => {
    const stored = safeRead();
    if (stored) setSession(stored);
  }, []);

  useEffect(() => {
    if (session) {
      safeWrite(session);
      setTerminalReason(null);
    }
  }, [session]);

  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <JoinForm initialCode={params.get("code")} onJoined={setSession} />
        {terminalReason && (
          <p className="text-xs text-amber-400">
            Previous session ended ({terminalReason}). Please re-join.
          </p>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-4 pt-8">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {session.event.title}
          </p>
          <h1 className="font-mono text-sm tracking-widest text-slate-300">
            {session.event.code}
          </h1>
        </div>
        <ConnectionStatus
          connected={realtime.connected}
          pending={realtime.pendingSubmits}
        />
      </header>

      <GroupBanner group={realtime.group} phase={realtime.phase} />

      {realtime.currentForm ? (
        <FormRunner
          form={realtime.currentForm.form}
          onSubmit={realtime.submitResponse}
        />
      ) : (
        <p className="text-center text-sm text-slate-400">
          Waiting for the host to share a prompt...
        </p>
      )}

      {realtime.error && (
        <p className="text-center text-xs text-rose-400">{realtime.error}</p>
      )}
    </main>
  );
}

function Splash() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-slate-400">Loading...</p>
    </main>
  );
}

const STORAGE = "breakout:session";
function safeRead(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}
function safeWrite(s: Session): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE, JSON.stringify(s));
  } catch {
    // ignore
  }
}
function safeClear(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE);
  } catch {
    // ignore
  }
}
