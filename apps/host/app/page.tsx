"use client";

import { useState } from "react";
import type { EventMeta } from "@app/shared-types";
import { LoginForm } from "../components/auth/LoginForm.tsx";
import { CreateEventCard } from "../components/event/CreateEventCard.tsx";
import { EventHeader } from "../components/event/EventHeader.tsx";
import { GroupControls } from "../components/event/GroupControls.tsx";
import { PresencePanel } from "../components/event/PresencePanel.tsx";
import { FormAuthor } from "../components/forms/FormAuthor.tsx";
import { ResponseRollup } from "../components/forms/ResponseRollup.tsx";
import { useHostRealtime } from "../lib/realtime/useRealtime.ts";

interface Session {
  event: EventMeta;
  token: string;
}

export default function HostDashboard() {
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [terminalReason, setTerminalReason] = useState<string | null>(null);
  const realtime = useHostRealtime(session?.token ?? null, (reason) => {
    setTerminalReason(reason);
    setSession(null);
  });

  if (!creds) {
    return (
      <main className="mx-auto max-w-5xl p-8">
        <LoginForm onReady={setCreds} />
      </main>
    );
  }

  if (!session) {
    return (
      <main className="mx-auto max-w-5xl space-y-4 p-8">
        <CreateEventCard credentials={creds} onCreated={setSession} />
        {terminalReason && (
          <p className="text-xs text-amber-500">
            Previous session ended ({terminalReason}). Create a new event to continue.
          </p>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <EventHeader
        event={session.event}
        connected={realtime.connected}
        phase={realtime.phase}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <PresencePanel presence={realtime.presence} />
          <GroupControls
            onPartition={realtime.partitionGroups}
            onMerge={realtime.mergeGroups}
            phase={realtime.phase}
          />
          <FormAuthor
            eventId={session.event.id}
            onIssue={realtime.issueForm}
          />
        </div>
        <div>
          <ResponseRollup rollups={realtime.rollups} />
        </div>
      </div>
      {realtime.error && (
        <p className="text-xs text-rose-500">{realtime.error}</p>
      )}
    </main>
  );
}
