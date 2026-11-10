"use client";

// Warns staff when some saved visits could not be read, so a shorter list is never shown as normal.

import type { StorageProblem } from "@/data/visitStore";

export function StorageWarning({ problem }: { problem: StorageProblem }) {
  if (!problem.unreadable && problem.damaged === 0) return null;
  const what = problem.unreadable
    ? "The saved visit list in this browser could not be read, so no saved visits are shown. The next change will start a new list."
    : `${problem.damaged} saved ${problem.damaged === 1 ? "visit" : "visits"} could not be read and ${problem.damaged === 1 ? "is" : "are"} not shown below.`;
  return (
    <p role="alert" className="rounded-lg border-2 border-red-800 bg-red-50 p-3 font-semibold text-red-900">
      Check the list: {what} Check on every patient who should be waiting off-site.
    </p>
  );
}
