interface Props {
  connected: boolean;
  pending: number;
}

export function ConnectionStatus({ connected, pending }: Props) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className={`h-2 w-2 rounded-full ${
          connected ? "bg-emerald-400" : "bg-amber-400"
        }`}
      />
      <span className="text-slate-300">
        {connected ? "Connected" : "Reconnecting..."}
      </span>
      {pending > 0 && (
        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-400">
          {pending} pending
        </span>
      )}
    </div>
  );
}
