import type { GroupAssignedPayload } from "@app/protocol";

interface Props {
  group: GroupAssignedPayload | null;
  phase: string | null;
}

export function GroupBanner({ group, phase }: Props) {
  const inGroup = group?.groupId !== null && group?.groupId !== undefined;
  const label = inGroup
    ? `Breakout group ${(group?.groupIndex ?? 0) + 1}`
    : phase === "breakout"
      ? "Waiting for group assignment"
      : "Plenary (everyone together)";
  return (
    <div
      className={`rounded-2xl px-4 py-3 text-center text-sm font-medium ${
        inGroup
          ? "bg-indigo-500/15 text-indigo-300"
          : "bg-slate-800 text-slate-300"
      }`}
    >
      {label}
    </div>
  );
}
