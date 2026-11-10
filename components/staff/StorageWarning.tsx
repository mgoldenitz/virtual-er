"use client";

// Warns staff when some saved visits could not be read, so a shorter list is never shown as normal.
// If the whole saved list is unreadable, saving stops until staff confirm starting a new list.

import { useState } from "react";
import { startNewVisitList } from "@/data/staffActions";
import type { StorageProblem } from "@/data/visitStore";
import { Button } from "@/components/Button";

export function StorageWarning({ problem }: { problem: StorageProblem }) {
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState("");
  if (!problem.unreadable && problem.damaged === 0) return null;

  const reset = () => {
    const result = startNewVisitList();
    setConfirming(false);
    setNote(result === "saved" ? "" : "Not done: this browser could not keep a backup copy, so nothing was cleared.");
  };

  if (!problem.unreadable) {
    const n = problem.damaged;
    return (
      <p role="alert" className="rounded-lg border-2 border-red-800 bg-red-50 p-3 font-semibold text-red-900">
        Check the list: {n} saved {n === 1 ? "visit" : "visits"} could not be read and {n === 1 ? "is" : "are"} not
        shown below. Check on every patient who should be waiting off-site.
      </p>
    );
  }

  return (
    <div role="alert" className="space-y-3 rounded-lg border-2 border-red-800 bg-red-50 p-3 text-red-900">
      <p className="font-semibold">
        The saved visit list in this browser could not be read, so no visits are shown and nothing can be
        saved. Check on every patient who should be waiting off-site.
      </p>
      {confirming ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="danger" onClick={reset}>
            Yes, keep a backup and start a new list
          </Button>
          <Button variant="secondary" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button variant="secondary" onClick={() => setConfirming(true)}>
          Start a new list…
        </Button>
      )}
      {note && <p className="font-semibold">{note}</p>}
    </div>
  );
}
