"use client";

// The "Recall patient" button for one waiting visit. Staff must confirm first, because a recall
// has no undo: the phone shows "Please head back now" at once. This file only asks; the parent saves.

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/Button";

type Props = {
  /** The visit code, read out with the button and shown in the question. */
  code: string;
  /** True while a change is on its way. "Yes" does nothing then. */
  saving: boolean;
  /** Called once staff confirm. */
  onConfirm: () => void;
};

type Mode = "idle" | "confirm";

export function RecallPanel({ code, saving, onConfirm }: Props) {
  const [mode, setMode] = useState<Mode>("idle");
  const recallButton = useRef<HTMLButtonElement>(null);
  const yesButton = useRef<HTMLButtonElement>(null);
  /** A page-wide unique id for the question, so each "Yes" points to its own question. */
  const questionId = useId();

  // When the confirm question opens, focus moves to "Yes" for keyboard and screen-reader users.
  useEffect(() => {
    if (mode === "confirm") yesButton.current?.focus();
  }, [mode]);

  // Back to the first state. The "Recall patient" button is drawn again, so focus waits one tick.
  // It does not take focus back if the parent already moved it (a fast save).
  const returnToRecall = () => {
    setMode("idle");
    window.setTimeout(() => {
      const lost = !document.activeElement || document.activeElement === document.body;
      if (lost) recallButton.current?.focus();
    }, 0);
  };

  // After "Yes" the parent saves. If the save works, the parent moves focus on, because this
  // button leaves the page once the visit is called; if not, focus stays on "Recall patient".
  const confirm = () => {
    if (saving) return;
    onConfirm();
    returnToRecall();
  };

  if (mode === "idle") {
    return (
      <Button ref={recallButton} aria-disabled={saving} onClick={() => !saving && setMode("confirm")}>
        Recall patient<span className="sr-only"> {code}</span>
      </Button>
    );
  }
  return (
    <div className="w-full space-y-2">
      {/* "Yes" points to this question, so a screen reader reads the code and "There is no undo." */}
      <p id={questionId} className="font-semibold">
        {`Recall visit ${code}? The patient's phone will show "Please head back now". There is no undo.`}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="danger" ref={yesButton}
          aria-disabled={saving}
          aria-describedby={questionId}
          onClick={confirm}
        >
          Yes, recall patient
        </Button>
        <Button variant="secondary" onClick={returnToRecall}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
