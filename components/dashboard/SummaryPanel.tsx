"use client";

// The "Write a short summary" button under the dashboard numbers. It asks the server for 2 or 3
// sentences about today's totals and shows them with a line that an AI model wrote them.
// The button stays off for 30 seconds after a click, so a double click does not pay twice.

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { fetchDashboardSummary } from "@/data/dashboardSummary";
import type { SummaryMessage } from "@/lib/summaryMessage";

const WAIT_BETWEEN_CLICKS_MS = 30_000;

export function SummaryPanel({ isDemo }: { isDemo: boolean }) {
  // The summary keeps the mode it was written for; after a Real or Demo switch it is hidden.
  const [shown, setShown] = useState<{ forDemo: boolean; message: SummaryMessage } | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [resting, setResting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When the dashboard closes, stop the 30-second timer.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
  }, []);

  async function writeSummary() {
    // One lock for Real and Demo together: it is the guard against two paid calls in 30 seconds.
    // The timer ref changes at once, so it also stops a second click that comes before React redraws.
    if (waiting || resting || timer.current !== null) return;
    setWaiting(true);
    setResting(true);
    setShown(null);
    timer.current = setTimeout(() => {
      timer.current = null;
      setResting(false);
    }, WAIT_BETWEEN_CLICKS_MS);
    const forDemo = isDemo;
    setShown({ forDemo, message: await fetchDashboardSummary(forDemo) });
    setWaiting(false);
  }

  const message = shown && shown.forDemo === isDemo ? shown.message : null;

  return (
    <section aria-label="Summary" className="space-y-3 rounded-lg border-2 border-line bg-card p-4">
      <Button variant="secondary" onClick={writeSummary} disabled={waiting || resting}>
        Write a short summary
      </Button>
      {/* One live box, always on the page, so screen readers hear the summary or the note when it comes. */}
      <div role="status" className="space-y-3">
        {waiting && <p>Writing the summary...</p>}
        {message?.kind === "text" && (
          <>
            <p>{message.text}</p>
            <p className="text-sm text-muted">
              {"Written by an AI model from today's totals. Check the numbers above."}
            </p>
          </>
        )}
        {message?.kind === "note" && <p>{message.text}</p>}
      </div>
    </section>
  );
}
