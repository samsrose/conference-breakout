"use client";

import type { Question } from "@app/shared-types";
import { Input, Label, TextArea } from "../ui/Input.tsx";
import { Button } from "../ui/Button.tsx";

export type DraftQuestion =
  | { kind: "single"; prompt: string; options: string[] }
  | { kind: "multi"; prompt: string; options: string[] }
  | { kind: "text"; prompt: string }
  | { kind: "scale"; prompt: string; min: number; max: number };

interface Props {
  value: DraftQuestion;
  onChange: (q: DraftQuestion) => void;
  onRemove: () => void;
}

export function QuestionEditor({ value, onChange, onRemove }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-center justify-between gap-3">
        <select
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
          value={value.kind}
          onChange={(e) =>
            onChange(convertKind(value, e.target.value as DraftQuestion["kind"]))
          }
        >
          <option value="single">Single choice</option>
          <option value="multi">Multi choice</option>
          <option value="text">Short text</option>
          <option value="scale">1-5 scale</option>
        </select>
        <Button variant="ghost" onClick={onRemove}>
          Remove
        </Button>
      </div>
      <div className="mt-3 space-y-3">
        <div>
          <Label>Prompt</Label>
          <TextArea
            rows={2}
            value={value.prompt}
            onChange={(e) => onChange({ ...value, prompt: e.target.value })}
          />
        </div>
        {(value.kind === "single" || value.kind === "multi") && (
          <OptionsEditor
            options={value.options}
            onChange={(options) => onChange({ ...value, options })}
          />
        )}
        {value.kind === "scale" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Min</Label>
              <Input
                type="number"
                value={value.min}
                onChange={(e) => onChange({ ...value, min: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Max</Label>
              <Input
                type="number"
                value={value.max}
                onChange={(e) => onChange({ ...value, max: Number(e.target.value) })}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OptionsEditor({
  options,
  onChange,
}: {
  options: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div>
      <Label>Options</Label>
      <div className="mt-1 space-y-2">
        {options.map((o, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={o}
              onChange={(e) => {
                const next = [...options];
                next[i] = e.target.value;
                onChange(next);
              }}
            />
            <Button
              variant="ghost"
              onClick={() => onChange(options.filter((_, j) => j !== i))}
            >
              ×
            </Button>
          </div>
        ))}
        <Button variant="secondary" onClick={() => onChange([...options, ""])}>
          Add option
        </Button>
      </div>
    </div>
  );
}

function convertKind(q: DraftQuestion, kind: DraftQuestion["kind"]): DraftQuestion {
  const prompt = q.prompt;
  switch (kind) {
    case "single":
    case "multi":
      return { kind, prompt, options: "options" in q ? q.options : ["", ""] };
    case "text":
      return { kind, prompt };
    case "scale":
      return { kind, prompt, min: 1, max: 5 };
  }
}

export function toQuestionsPayload(
  draft: DraftQuestion[],
): Array<Partial<Question>> {
  return draft.map((q, i) => {
    const id = `q_${i}_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
    switch (q.kind) {
      case "single":
        return {
          id,
          kind: "single",
          prompt: q.prompt,
          required: false,
          options: q.options.filter(Boolean),
        };
      case "multi":
        return {
          id,
          kind: "multi",
          prompt: q.prompt,
          required: false,
          options: q.options.filter(Boolean),
        };
      case "text":
        return {
          id,
          kind: "text",
          prompt: q.prompt,
          required: false,
          maxLength: 500,
        };
      case "scale":
        return {
          id,
          kind: "scale",
          prompt: q.prompt,
          required: false,
          min: q.min,
          max: q.max,
          step: 1,
        };
    }
  }) as Array<Partial<Question>>;
}
