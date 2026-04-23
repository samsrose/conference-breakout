"use client";

import { useState } from "react";
import type { Question } from "@app/shared-types";

interface Props {
  question: Extract<Question, { kind: "text" }>;
  onAnswer: (text: string) => void;
  submitted: boolean;
}

export function QuestionText({ question, onAnswer, submitted }: Props) {
  const [value, setValue] = useState("");
  return (
    <div className="space-y-3">
      <p className="text-lg">{question.prompt}</p>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        maxLength={question.maxLength ?? 500}
        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-base focus:border-indigo-500 focus:outline-none"
      />
      <button
        disabled={submitted || value.trim().length === 0}
        onClick={() => onAnswer(value.trim())}
        className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-medium disabled:opacity-50"
      >
        Submit
      </button>
    </div>
  );
}
