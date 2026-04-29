import { describe, expect, it } from "vitest";
import type {
  EventId,
  FormId,
  ParticipantId,
  Question,
  QuestionId,
  Response,
  ResponseId,
} from "@app/shared-types";
import { createWorld, set } from "../src/world.ts";
import type { EntityId } from "../src/entity.ts";
import { rollupFor } from "../src/systems/aggregation.ts";

const formId = "form_1" as unknown as FormId;
const eventId = "evt_1" as unknown as EventId;

function addResponse(
  world: ReturnType<typeof createWorld>,
  i: number,
  questionId: QuestionId,
  value: Response["value"],
) {
  const r: Response = {
    id: `r_${i}` as unknown as ResponseId,
    eventId,
    formId,
    questionId,
    participantId: `p_${i}` as unknown as ParticipantId,
    value,
    submittedAt: i,
  };
  set(world, "Response", r.id as unknown as EntityId, r);
}

describe("AggregationSystem", () => {
  it("aggregates single-choice responses into counts", () => {
    const w = createWorld();
    const q: Question = {
      id: "q_1" as unknown as QuestionId,
      kind: "single",
      prompt: "pick",
      required: false,
      options: ["A", "B", "C"],
    };
    addResponse(w, 1, q.id, { kind: "single", optionIndex: 0 });
    addResponse(w, 2, q.id, { kind: "single", optionIndex: 0 });
    addResponse(w, 3, q.id, { kind: "single", optionIndex: 2 });
    const rollup = rollupFor(w, formId, q);
    expect(rollup.prompt).toBe("pick");
    expect(rollup.total).toBe(3);
    expect(rollup.summary).toEqual({
      kind: "choice",
      counts: [2, 0, 1],
      optionLabels: ["A", "B", "C"],
    });
  });

  it("aggregates scale responses into histogram + mean", () => {
    const w = createWorld();
    const q: Question = {
      id: "q_2" as unknown as QuestionId,
      kind: "scale",
      prompt: "rate",
      required: false,
      min: 1,
      max: 5,
      step: 1,
    };
    addResponse(w, 1, q.id, { kind: "scale", value: 5 });
    addResponse(w, 2, q.id, { kind: "scale", value: 3 });
    addResponse(w, 3, q.id, { kind: "scale", value: 4 });
    const rollup = rollupFor(w, formId, q);
    expect(rollup.prompt).toBe("rate");
    expect(rollup.total).toBe(3);
    if (rollup.summary.kind !== "scale") throw new Error("kind");
    expect(rollup.summary.mean).toBeCloseTo(4);
    expect(rollup.summary.histogram["5"]).toBe(1);
  });

  it("aggregates text responses into capped samples", () => {
    const w = createWorld();
    const q: Question = {
      id: "q_3" as unknown as QuestionId,
      kind: "text",
      prompt: "say",
      required: false,
      maxLength: 500,
    };
    for (let i = 0; i < 30; i++) {
      addResponse(w, i, q.id, { kind: "text", text: `t${i}` });
    }
    const rollup = rollupFor(w, formId, q);
    expect(rollup.prompt).toBe("say");
    expect(rollup.total).toBe(30);
    if (rollup.summary.kind !== "text") throw new Error("kind");
    expect(rollup.summary.samples).toHaveLength(20);
  });
});
