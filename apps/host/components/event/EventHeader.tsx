import type { EventMeta } from "@app/shared-types";
import { Button } from "../ui/Button.tsx";

interface Props {
  event: EventMeta;
  connected: boolean;
  phase: string | null;
  onConclude?: () => void;
}

export function EventHeader({ event, connected, phase, onConclude }: Props) {
  const effectivePhase = phase ?? event.phase;
  return (
    <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">{event.title}</h1>
            <span className="rounded-md bg-slate-200 px-2 py-0.5 font-mono text-xs tracking-wider text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {event.code}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                connected
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200"
              }`}
            >
              {connected ? "Live" : "Connecting..."}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Phase:&nbsp;<span className="font-medium">{effectivePhase}</span>
          </p>
        </div>
        {onConclude && (
          <Button
            type="button"
            variant="danger"
            disabled={
              effectivePhase === "closed" || !connected
            }
            onClick={onConclude}
            className="shrink-0"
          >
            Conclude event
          </Button>
        )}
      </div>
    </header>
  );
}
