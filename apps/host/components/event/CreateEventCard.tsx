"use client";

import { useState, type FormEvent } from "react";
import type { EventMeta } from "@app/shared-types";
import { Button } from "../ui/Button.tsx";
import { Input, Label } from "../ui/Input.tsx";
import { Card, CardSubtitle, CardTitle } from "../ui/Card.tsx";
import { REALTIME_HTTP } from "../../lib/env.ts";

interface Props {
  credentials: { email: string; password: string };
  onCreated: (payload: { event: EventMeta; token: string }) => void;
}

export function CreateEventCard({ credentials, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`${REALTIME_HTTP}/host/events`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...credentials, title }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { event: EventMeta; token: string };
      onCreated(data);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardTitle>Create an event</CardTitle>
      <CardSubtitle>We will mint a short join code.</CardSubtitle>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        {err && <p className="text-sm text-rose-500">{err}</p>}
        <Button type="submit" disabled={busy}>
          {busy ? "Creating..." : "Create event"}
        </Button>
      </form>
    </Card>
  );
}
