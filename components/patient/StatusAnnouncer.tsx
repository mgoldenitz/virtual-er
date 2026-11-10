"use client";

// Tells screen readers about status changes only (never the wait range or countdowns):
// an assertive message for the call-back, a polite one for everything else.

import { useEffect, useRef, useState } from "react";
import type { VisitStatus } from "@/lib/visit";

const CALLED = "You have been called back. Please head back to the emergency department now.";

const MESSAGES: Partial<Record<VisitStatus, string>> = {
  called: CALLED,
  on_the_way: "Thank you. Staff know you are on your way.",
  arrived: "Staff have marked you as back at the emergency department.",
  removed: "Your off-site wait has ended.",
  unable_to_reach: "Your off-site wait has ended.",
  needs_reassessment: "Please go to the triage desk.",
};

/** One status change waiting to be announced. `round` makes every change new, even a repeat. */
type Pending = { round: number; status: VisitStatus };

export function StatusAnnouncer({ status }: { status: VisitStatus }) {
  const [previous, setPrevious] = useState<VisitStatus | null>(null);
  // A call-back already on screen when the page opens is announced; other opening statuses are not.
  const [pending, setPending] = useState<Pending | null>(null);
  const [polite, setPolite] = useState("");
  const [urgent, setUrgent] = useState("");
  const current = useRef(status);
  useEffect(() => {
    current.current = status;
  }, [status]);

  // On every status change, empty both regions at once. The new text is put in a moment later,
  // so a screen reader hears it even when it is the same words as last time
  // (for example called, arrived, then Undo back to called).
  if (status !== previous) {
    setPrevious(status);
    setPolite("");
    setUrgent("");
    if (previous !== null || status === "called") {
      setPending((p) => ({ round: (p?.round ?? 0) + 1, status }));
    }
  }

  // Put the text in only while the page is on screen; a background tab waits until it is brought
  // forward, then announces the status if it has not changed in the meantime.
  useEffect(() => {
    if (!pending) return;
    const text = MESSAGES[pending.status] ?? "";
    if (!text) return;
    let done = false;
    const announce = () => {
      if (done || document.visibilityState !== "visible" || current.current !== pending.status) return;
      done = true;
      if (pending.status === "called") setUrgent(text);
      else setPolite(text);
    };
    const timer = window.setTimeout(announce, 300);
    document.addEventListener("visibilitychange", announce);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", announce);
    };
  }, [pending]);

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
