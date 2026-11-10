"use client";

// Tells screen readers about status changes only (never the wait range or countdowns):
// an assertive message for the call-back, a polite one for everything else.

import { useState } from "react";
import type { VisitStatus } from "@/lib/visit";

const MESSAGES: Partial<Record<VisitStatus, string>> = {
  called: "You have been called back. Please head back to the emergency department now.",
  on_the_way: "Thank you. Staff know you are on your way.",
  arrived: "Staff have marked you as back at the emergency department.",
  removed: "Your off-site wait has ended.",
};

export function StatusAnnouncer({ status }: { status: VisitStatus }) {
  // The status already on screen when the page opened is not announced.
  const [previous, setPrevious] = useState(status);
  const [polite, setPolite] = useState("");
  const [urgent, setUrgent] = useState("");

  // Update the messages while rendering, the moment the status changes.
  if (status !== previous) {
    setPrevious(status);
    const text = MESSAGES[status] ?? "";
    if (status === "called") setUrgent(text);
    else setPolite(text);
  }

  return (
    <>
      <p aria-live="polite" className="sr-only">
        {polite}
      </p>
      <p aria-live="assertive" className="sr-only">
        {urgent}
      </p>
    </>
  );
}
