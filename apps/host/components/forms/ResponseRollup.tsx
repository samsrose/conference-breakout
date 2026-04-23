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
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-slate-500">
          {rollup.questionId}
        </span>
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
          {rollup.total} response{rollup.total === 1 ? "" : "s"}
        </span>
      </div>
      <div className="mt-2">
        {rollup.summary.kind === "choice" && (
          <ChoiceBars counts={rollup.summary.counts} total={rollup.total} />
        )}
        {rollup.summary.kind === "scale" && (
          <p className="text-sm">Mean: {rollup.summary.mean.toFixed(2)}</p>
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

function ChoiceBars({ counts, total }: { counts: number[]; total: number }) {
  return (
    <div className="space-y-2">
      {counts.map((c, i) => {
        const pct = total > 0 ? Math.round((c / total) * 100) : 0;
        return (
          <div key={i}>
            <div className="flex justify-between text-xs">
              <span>Option {i + 1}</span>
              <span>
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
