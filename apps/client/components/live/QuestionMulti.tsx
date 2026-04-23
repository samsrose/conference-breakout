"use client";

import { useState } from "react";
import type { Question } from "@app/shared-types";

interface Props {
  question: Extract<Question, { kind: "multi" }>;
  onAnswer: (optionIndices: number[]) => void;
  submitted: boolean;
}

export function QuestionMulti({ question, onAnswer, submitted }: Props) {
  const [picked, setPicked] = useState<Set<number>>(new Set());

  function toggle(i: number) {
    const next = new Set(picked);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setPicked(next);
  }

  return (
    <div className="space-y-3">
      <p className="text-lg">{question.prompt}</p>
      <div className="space-y-2">
        {question.options.map((opt, i) => (
          <button
            key={i}
            disabled={submitted}
            onClick={() => toggle(i)}
            className={`w-full rounded-xl border px-4 py-3 text-left text-base ${
              picked.has(i)
                ? "border-indigo-500 bg-indigo-500/15"
                : "border-slate-700 bg-slate-900 hover:border-indigo-500 hover:bg-slate-800"
            } disabled:opacity-50`}
          >
            {opt}
          </button>
        ))}
      </div>
      <button
        disabled={submitted || picked.size === 0}
        onClick={() => onAnswer(Array.from(picked).sort((a, b) => a - b))}
        className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-medium disabled:opacity-50"
      >
        Submit
      </button>
    </div>
  );
}
