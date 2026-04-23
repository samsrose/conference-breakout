import type { Question } from "@app/shared-types";

interface Props {
  question: Extract<Question, { kind: "scale" }>;
  onAnswer: (value: number) => void;
  submitted: boolean;
}

export function QuestionScale({ question, onAnswer, submitted }: Props) {
  const values: number[] = [];
  for (let v = question.min; v <= question.max; v += question.step || 1) {
    values.push(v);
  }
  return (
    <div className="space-y-3">
      <p className="text-lg">{question.prompt}</p>
      <div className="flex flex-wrap gap-2">
        {values.map((v) => (
          <button
            key={v}
            disabled={submitted}
            onClick={() => onAnswer(v)}
            className="min-w-12 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-lg font-semibold hover:border-indigo-500 hover:bg-slate-800 disabled:opacity-50"
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
