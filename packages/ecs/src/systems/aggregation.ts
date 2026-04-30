import type {
  FormId,
  Question,
  QuestionId,
  Response,
  ResponseRollup,
} from "@app/shared-types";
import type { World } from "../world.ts";

export function rollupFor(
  world: World,
  formId: FormId,
  question: Question,
): ResponseRollup {
  const responses: Response[] = [];
  for (const r of world.tables.Response.values()) {
    if (r.formId === formId && r.questionId === question.id) responses.push(r);
  }

  switch (question.kind) {
    case "single":
    case "multi": {
      const counts = new Array<number>(question.options.length).fill(0);
      for (const r of responses) {
        if (r.value.kind === "single") {
          const i = r.value.optionIndex;
          if (i in counts) counts[i] = (counts[i] ?? 0) + 1;
        } else if (r.value.kind === "multi") {
          for (const i of r.value.optionIndices) {
            if (i in counts) counts[i] = (counts[i] ?? 0) + 1;
          }
        }
      }
      return {
        formId,
        questionId: question.id as QuestionId,
        prompt: question.prompt,
        total: responses.length,
        summary: {
          kind: "choice",
          counts,
          optionLabels: [...question.options],
        },
      };
    }
    case "text": {
      const samples = responses
        .slice(-20)
        .map((r) => (r.value.kind === "text" ? r.value.text : ""))
        .filter(Boolean);
      return {
        formId,
        questionId: question.id as QuestionId,
        prompt: question.prompt,
        total: responses.length,
        summary: { kind: "text", samples },
      };
    }
    case "scale": {
      const values: number[] = [];
      for (
        let v = question.min;
        v <= question.max;
        v += question.step
      ) {
        values.push(v);
      }
      const counts = new Array<number>(values.length).fill(0);
      const valueToIndex = new Map(values.map((val, i) => [val, i]));
      for (const r of responses) {
        if (r.value.kind !== "scale") continue;
        const idx = valueToIndex.get(r.value.value);
        if (idx === undefined) continue;
        counts[idx] = (counts[idx] ?? 0) + 1;
      }
      return {
        formId,
        questionId: question.id as QuestionId,
        prompt: question.prompt,
        total: responses.length,
        summary: {
          kind: "scale",
          values,
          counts,
        },
      };
    }
  }
}
