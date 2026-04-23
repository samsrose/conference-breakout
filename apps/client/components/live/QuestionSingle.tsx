import type { Question } from "@app/shared-types";

interface Props {
  question: Extract<Question, { kind: "single" }>;
  onAnswer: (optionIndex: number) => void;
  submitted: boolean;
}

export function QuestionSingle({ question, onAnswer, submitted }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-lg">{question.prompt}</p>
      <div className="space-y-2">
        {question.options.map((opt, i) => (
          <button
            key={i}
            disabled={submitted}
            onClick={() => onAnswer(i)}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-left text-base hover:border-indigo-500 hover:bg-slate-800 disabled:opacity-50"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
