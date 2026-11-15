"use client";

// The "Lost or stolen phone" panel for one visit. Staff must confirm before a new link is issued,
// because the old phone stops working at once. This file only asks; the parent saves the change.

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";

type Props = {
  /** The visit code, read out with the button so staff know which patient it is for. */
  code: string;
  /** True while a change is on its way. "Yes" does nothing then. */
  saving: boolean;
  /** Called once staff confirm. */
  onConfirm: () => void;
};

type Mode = "idle" | "confirm";

export function NewLinkPanel({ code, saving, onConfirm }: Props) {
  const [mode, setMode] = useState<Mode>("idle");
  const issueButton = useRef<HTMLButtonElement>(null);
  const yesButton = useRef<HTMLButtonElement>(null);

  // When the confirm question opens, focus moves to "Yes" for keyboard and screen-reader users.
  useEffect(() => {
    if (mode === "confirm") yesButton.current?.focus();
  }, [mode]);

  // Back to the first state. The "Issue a new link" button is drawn again, so focus waits one tick.
  const returnToIssue = () => {
    setMode("idle");
    window.setTimeout(() => issueButton.current?.focus(), 0);
  };

  const confirm = () => {
    if (saving) return;
    onConfirm();
    returnToIssue();
  };

  return (
    <details className="mt-3">
      <summary className="cursor-pointer py-2 text-slate-800 underline underline-offset-2">
        Lost or stolen phone
      </summary>
      <div className="mt-2 space-y-2">
        <p>The old link and the old slip stop working. Give the patient the new QR code.</p>
        {mode === "idle" && (
          <Button variant="secondary" ref={issueButton} aria-disabled={saving} onClick={() => setMode("confirm")}>
            Issue a new link<span className="sr-only"> {code}</span>
          </Button>
        )}
        {mode === "confirm" && (
          <>
            <p className="font-semibold">The old phone stops working at once. Issue a new link for {code}?</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="danger" ref={yesButton} aria-disabled={saving} onClick={confirm}>
                Yes, issue a new link
              </Button>
              <Button variant="secondary" onClick={returnToIssue}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>
    </details>
  );
}
