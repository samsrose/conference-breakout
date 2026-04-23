import type { PresenceDeltaPayload } from "@app/protocol";
import { Card, CardSubtitle, CardTitle } from "../ui/Card.tsx";

interface Props {
  presence: PresenceDeltaPayload | null;
}

export function PresencePanel({ presence }: Props) {
  const online = presence?.online ?? 0;
  const away = presence?.away ?? 0;
  const offline = presence?.offline ?? 0;
  const total = online + away + offline;
  return (
    <Card>
      <CardTitle>Presence</CardTitle>
      <CardSubtitle>{total} device(s) seen</CardSubtitle>
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <Stat label="Online" value={online} tone="emerald" />
        <Stat label="Away" value={away} tone="amber" />
        <Stat label="Offline" value={offline} tone="slate" />
      </div>
    </Card>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "slate";
}) {
  const toneClass = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    slate: "text-slate-500 dark:text-slate-400",
  }[tone];
  return (
    <div>
      <div className={`text-3xl font-semibold ${toneClass}`}>{value}</div>
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
    </div>
  );
}
