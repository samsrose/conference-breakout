"use client";

import { useState, type FormEvent } from "react";
import { Button } from "../ui/Button.tsx";
import { Input, Label } from "../ui/Input.tsx";
import { Card, CardSubtitle, CardTitle } from "../ui/Card.tsx";
import { REALTIME_HTTP } from "../../lib/env.ts";

interface Props {
  onReady: (creds: { email: string; password: string }) => void;
}

export function LoginForm({ onReady }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const path = mode === "register" ? "/host/register" : "/host/login";
      const res = await fetch(`${REALTIME_HTTP}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      onReady({ email, password });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardTitle>Host sign in</CardTitle>
      <CardSubtitle>
        {mode === "login"
          ? "Sign in to run your event."
          : "Create an account to host events."}
      </CardSubtitle>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {err && <p className="text-sm text-rose-500">{err}</p>}
        <div className="flex items-center justify-between">
          <Button type="submit" disabled={busy}>
            {busy ? "..." : mode === "login" ? "Sign in" : "Register"}
          </Button>
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="text-sm text-indigo-600 hover:underline"
          >
            {mode === "login" ? "Need an account?" : "Have an account?"}
          </button>
        </div>
      </form>
    </Card>
  );
}
