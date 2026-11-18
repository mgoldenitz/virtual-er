"use client";

// The "Clear demo data" button for staff, with a question first. Clearing deletes every demo
// visit and its dashboard numbers, and switches the demo simulator off (SPEC "Demo mode").

import { useEffect, useRef, useState } from "react";
import { clearDemoData } from "@/data/demoData";
import { clearDemoMessage } from "@/lib/clearDemoMessage";
import { Button } from "@/components/Button";

type Props = {
  /** Called with words for staff and screen readers after a clear, or after a failed one. */
  onResult: (message: string) => void;
};

export function ClearDemoData({ onResult }: Props) {
  const [asking, setAsking] = useState(false);
  const [saving, setSaving] = useState(false);
  const question = useRef<HTMLHeadingElement>(null);
  const openButton = useRef<HTMLButtonElement>(null);

  // Move focus to the question when it opens, so keyboard and screen-reader users land on it.
  useEffect(() => {
    if (asking) question.current?.focus();
  }, [asking]);

  const close = () => {
    setAsking(false);
    // Focus goes back to the button once it is shown again.
    window.setTimeout(() => openButton.current?.focus(), 0);
  };

  // Cancel does nothing while a clear runs: aria-disabled does not stop a click.
  const cancel = () => {
    if (saving) return;
    close();
  };

  const confirm = async () => {
    if (saving) return;
    setSaving(true);
    const result = await clearDemoData();
    setSaving(false);
    if (result !== "failed") close();
    onResult(clearDemoMessage(result));
  };

  if (!asking) {
    return (
      <Button ref={openButton} variant="danger" onClick={() => setAsking(true)}>
        Clear demo data
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border-4 border-red-800 bg-white p-4" data-testid="clear-demo-confirm">
      <h3 ref={question} tabIndex={-1} className="text-lg font-bold text-red-900">
        Clear all demo data?
      </h3>
      <p>
        This deletes every demo visit at Demo Site A and B and their dashboard numbers, and switches the demo
        simulator off. Real visits stay. There is no undo.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="danger" aria-disabled={saving} onClick={confirm}>
          {saving ? "Saving…" : "Yes, clear demo data"}
        </Button>
        <Button variant="secondary" aria-disabled={saving} onClick={cancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
