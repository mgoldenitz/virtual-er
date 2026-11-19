"use client";

// The "Clear demo data" button for staff, with a question first. Clearing deletes every demo
// visit and its dashboard numbers, and switches the demo simulator off (SPEC "Demo mode").
// The result words go in a status line under the button or the question. That line is always on
// the page, so screen readers hear the words and the buttons do not move.

import { useEffect, useRef, useState } from "react";
import { clearDemoData } from "@/data/demoData";
import { clearDemoMessage } from "@/lib/clearDemoMessage";
import { Button } from "@/components/Button";

export function ClearDemoData() {
  const [asking, setAsking] = useState(false);
  const [saving, setSaving] = useState(false);
  // The result words. Empty while a clear runs and when the question opens again.
  const [message, setMessage] = useState("");
  const question = useRef<HTMLHeadingElement>(null);
  const openButton = useRef<HTMLButtonElement>(null);

  // Move focus to the question when it opens, so keyboard and screen-reader users land on it.
  useEffect(() => {
    if (asking) question.current?.focus();
  }, [asking]);

  // Opening the question removes the words from an earlier clear.
  const open = () => {
    setMessage("");
    setAsking(true);
  };

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
    // Empty first, so the same words twice are read again by screen readers.
    setMessage("");
    const result = await clearDemoData();
    setSaving(false);
    if (result !== "failed") close();
    setMessage(clearDemoMessage(result));
  };

  return (
    <div className="space-y-3">
      {!asking ? (
        <Button ref={openButton} variant="danger" onClick={open}>
          Clear demo data
        </Button>
      ) : (
        <div className="space-y-3 rounded-xl border-4 border-red-800 bg-white p-4" data-testid="clear-demo-confirm">
          <h3 ref={question} tabIndex={-1} className="text-lg font-bold text-red-900">
            Clear all demo data?
          </h3>
          <p id="clear-demo-warning">
            This deletes every demo visit and demo dashboard number, and switches the demo simulator off. Real visits and
            real dashboard numbers stay. There is no undo.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" aria-disabled={saving} aria-describedby="clear-demo-warning" onClick={confirm}>
              {saving ? "Saving…" : "Yes, clear demo data"}
            </Button>
            <Button variant="secondary" aria-disabled={saving} onClick={cancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      <p role="status" className="min-h-6 font-semibold">
        {message}
      </p>
    </div>
  );
}
