"use client";

import { useState } from "react";
import type { EventId } from "@app/shared-types";
import { Button } from "../ui/Button.tsx";
import { Input, Label } from "../ui/Input.tsx";
import { Card, CardSubtitle, CardTitle } from "../ui/Card.tsx";
import {
  QuestionEditor,
  toQuestionsPayload,
  type DraftQuestion,
} from "./QuestionEditor.tsx";

interface Props {
  eventId: EventId;
  onIssue: (payload: unknown) => void;
}

export function FormAuthor({ eventId, onIssue }: Props) {
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<DraftQuestion[]>([
    { kind: "single", prompt: "", options: ["", ""] },
  ]);

  function addQuestion() {
    setQuestions([...questions, { kind: "single", prompt: "", options: ["", ""] }]);
  }
  function updateAt(i: number, q: DraftQuestion) {
    const next = [...questions];
    next[i] = q;
    setQuestions(next);
  }
  function removeAt(i: number) {
    setQuestions(questions.filter((_, j) => j !== i));
  }

  function issue() {
    onIssue({
      form: {
        title,
        eventId,
        questions: toQuestionsPayload(questions),
        target: { kind: "event", eventId },
      },
    });
  }

  return (
    <Card>
      <CardTitle>Author form</CardTitle>
      <CardSubtitle>Broadcast instantly to every connected device.</CardSubtitle>
      <div className="mt-4 space-y-4">
        <div>
          <Label htmlFor="form-title">Title</Label>
          <Input
            id="form-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="How is the session going?"
          />
        </div>
        <div className="space-y-3">
          {questions.map((q, i) => (
            <QuestionEditor
              key={i}
              value={q}
              onChange={(n) => updateAt(i, n)}
              onRemove={() => removeAt(i)}
            />
          ))}
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={addQuestion}>
            Add question
          </Button>
          <Button onClick={issue} disabled={!title || questions.length === 0}>
            Issue to event
          </Button>
        </div>
      </div>
    </Card>
  );
}
