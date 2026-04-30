import type { ResponseRollupPayload } from "@app/protocol";
import { Card, CardSubtitle, CardTitle } from "../ui/Card.tsx";

interface Props {
  rollups: Map<string, ResponseRollupPayload>;
}

export function ResponseRollup({ rollups }: Props) {
  const list = Array.from(rollups.values());
  return (
    <Card>
      <CardTitle>Live responses</CardTitle>
      <CardSubtitle>
        {list.length === 0 ? "Waiting for responses..." : `${list.length} question(s) reporting`}
      </CardSubtitle>
      <div className="mt-4 space-y-4">
        {list.map((r) => (
          <RollupCard key={`${r.formId}:${r.questionId}`} rollup={r} />
        ))}
      </div>
    </Card>
  );
}

function RollupCard({ rollup }: { rollup: ResponseRollupPayload }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex items-start justify-between gap-2">
        <span
          className="text-sm font-medium leading-snug text-slate-900 dark:text-slate-100"
          title={rollup.questionId}
        >
          {rollup.prompt}
        </span>
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
          {rollup.total} response{rollup.total === 1 ? "" : "s"}
        </span>
      </div>
      <div className="mt-2">
        {rollup.summary.kind === "choice" && (
          <ChoiceBars
            counts={rollup.summary.counts}
            optionLabels={rollup.summary.optionLabels}
            total={rollup.total}
          />
        )}
        {rollup.summary.kind === "scale" && (
          <ChoiceBars
            counts={rollup.summary.counts}
            optionLabels={rollup.summary.values.map(String)}
            total={rollup.total}
          />
        )}
        {rollup.summary.kind === "text" && (
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {rollup.summary.samples.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ChoiceBars({
  counts,
  optionLabels,
  total,
}: {
  counts: number[];
  optionLabels: string[];
  total: number;
}) {
  return (
    <div className="space-y-2">
      {counts.map((c, i) => {
        const pct = total > 0 ? Math.round((c / total) * 100) : 0;
        const label =
          optionLabels[i] ?? (counts.length > 0 ? `Option ${i + 1}` : String(i));
        return (
          <div key={i}>
            <div className="flex justify-between gap-2 text-xs">
              <span className="min-w-0 truncate" title={label}>
                {label}
              </span>
              <span className="shrink-0">
                {c} ({pct}%)
              </span>
            </div>
            <div className="mt-1 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-2 rounded-full bg-indigo-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
