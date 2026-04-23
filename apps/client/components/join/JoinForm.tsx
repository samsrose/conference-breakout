"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { EventMeta } from "@app/shared-types";
import { REALTIME_HTTP } from "../../lib/env.ts";
import { getOrCreateDeviceId } from "../../lib/deviceId.ts";

interface Props {
  initialCode?: string | null;
  onJoined: (payload: { event: EventMeta; token: string }) => void;
}

export function JoinForm({ initialCode, onJoined }: Props) {
  const [code, setCode] = useState(initialCode?.toUpperCase() ?? "");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (initialCode) setCode(initialCode.toUpperCase());
  }, [initialCode]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const deviceId = getOrCreateDeviceId();
      const res = await fetch(`${REALTIME_HTTP}/participant/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, displayName, deviceId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { event: EventMeta; token: string };
      onJoined(data);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto flex max-w-sm flex-col gap-4">
      <h1 className="text-center text-3xl font-semibold">Join event</h1>
      <p className="text-center text-sm text-slate-400">
        Enter the code displayed by your host.
      </p>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="ABCD-1234"
        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-center text-xl font-mono tracking-widest uppercase focus:border-indigo-500 focus:outline-none"
        required
      />
      <input
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Your name (optional)"
        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-lg focus:border-indigo-500 focus:outline-none"
      />
      {err && <p className="text-sm text-rose-400">{err}</p>}
      <button
        type="submit"
        disabled={busy || code.length < 9}
        className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-lg font-medium text-white disabled:opacity-50"
      >
        {busy ? "Joining..." : "Join"}
      </button>
    </form>
  );
}
