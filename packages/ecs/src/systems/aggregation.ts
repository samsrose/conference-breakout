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
      const histogram: Record<string, number> = {};
      let sum = 0;
      let n = 0;
      for (const r of responses) {
        if (r.value.kind !== "scale") continue;
        const key = String(r.value.value);
        histogram[key] = (histogram[key] ?? 0) + 1;
        sum += r.value.value;
        n += 1;
      }
      return {
        formId,
        questionId: question.id as QuestionId,
        prompt: question.prompt,
        total: responses.length,
        summary: {
          kind: "scale",
          histogram,
          mean: n > 0 ? sum / n : 0,
        },
      };
    }
  }
}
