"use client";

import { useState } from "react";
import { Button } from "../ui/Button.tsx";
import { Card, CardSubtitle, CardTitle } from "../ui/Card.tsx";
import { Input, Label } from "../ui/Input.tsx";

interface Props {
  onPartition: (size: number) => void;
  onMerge: () => void;
  phase: string | null;
}

export function GroupControls({ onPartition, onMerge, phase }: Props) {
  const [size, setSize] = useState(8);
  return (
    <Card>
      <CardTitle>Groups</CardTitle>
      <CardSubtitle>
        Break the room into small groups or merge back to plenary.
      </CardSubtitle>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="w-32">
          <Label htmlFor="size">Group size</Label>
          <Input
            id="size"
            type="number"
            min={2}
            max={50}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
          />
        </div>
        <Button onClick={() => onPartition(size)}>
          Partition into groups of {size}
        </Button>
        <Button variant="secondary" onClick={onMerge} disabled={phase !== "breakout"}>
          Merge to plenary
        </Button>
      </div>
    </Card>
  );
}
