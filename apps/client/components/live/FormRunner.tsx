"use client";

import { useMemo, useState } from "react";
import type {
  Form,
  FormId,
  QuestionId,
  ResponseValue,
} from "@app/shared-types";
import type { FormProgressPayload } from "@app/protocol";
import { QuestionSingle } from "./QuestionSingle.tsx";
import { QuestionMulti } from "./QuestionMulti.tsx";
import { QuestionText } from "./QuestionText.tsx";
import { QuestionScale } from "./QuestionScale.tsx";

interface Props {
  form: Form;
  formProgress?: FormProgressPayload | null;
  onSubmit: (payload: {
    formId: FormId;
    questionId: QuestionId;
    value: ResponseValue;
  }) => void;
}

export function FormRunner({ form, formProgress, onSubmit }: Props) {
  const [answered, setAnswered] = useState<Set<string>>(new Set());

  function record(questionId: QuestionId, value: ResponseValue) {
    onSubmit({ formId: form.id, questionId, value });
    const next = new Set(answered);
    next.add(questionId);
    setAnswered(next);
  }

  const allDone = useMemo(
    () => answered.size >= form.questions.length,
    [answered, form.questions.length],
  );

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">{form.title}</h2>
        <p className="text-xs text-slate-400">
          {form.questions.length} question{form.questions.length === 1 ? "" : "s"}
        </p>
      </header>
      {form.questions.map((q) => {
        const submitted = answered.has(q.id);
        return (
          <div key={q.id} className="rounded-2xl bg-slate-900/60 p-4">
            {q.kind === "single" && (
              <QuestionSingle
                question={q}
                submitted={submitted}
                onAnswer={(i) =>
                  record(q.id, { kind: "single", optionIndex: i })
                }
              />
            )}
            {q.kind === "multi" && (
              <QuestionMulti
                question={q}
                submitted={submitted}
                onAnswer={(idx) =>
                  record(q.id, { kind: "multi", optionIndices: idx })
                }
              />
            )}
            {q.kind === "text" && (
              <QuestionText
                question={q}
                submitted={submitted}
                onAnswer={(text) => record(q.id, { kind: "text", text })}
              />
            )}
            {q.kind === "scale" && (
              <QuestionScale
                question={q}
                submitted={submitted}
                onAnswer={(value) => record(q.id, { kind: "scale", value })}
              />
            )}
            {submitted && (
              <p className="mt-3 text-center text-xs text-emerald-400">
                Submitted
              </p>
            )}
          </div>
        );
      })}
      {allDone && (
        <div className="space-y-2 text-center">
          <p className="text-sm text-emerald-400">
            All questions answered. Waiting for the next prompt...
          </p>
          {formProgress &&
            formProgress.formId === form.id &&
            formProgress.expectedRespondents > 0 && (
              <p className="text-xs leading-relaxed text-slate-400">
                {formProgress.remainingRespondents === 0 ? (
                  <>Everyone in this prompt has finished all questions.</>
                ) : (
                  <>
                    <span className="font-semibold text-slate-300">
                      {formProgress.remainingRespondents}
                    </span>{" "}
                    {formProgress.remainingRespondents === 1
                      ? "person still has answers left to submit"
                      : "people still have answers left to submit"}{" "}
                    <span className="text-slate-500">
                      ({formProgress.completedAllQuestions} of{" "}
                      {formProgress.expectedRespondents} finished)
                    </span>
                  </>
                )}
              </p>
            )}
        </div>
      )}
    </section>
  );
}
