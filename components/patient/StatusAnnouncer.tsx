"use client";

// Tells screen readers about status changes only (never the wait range or countdowns):
// an assertive message for the call-back, a polite one for everything else, including
// the visit request expiring.

import { useEffect, useRef, useState } from "react";
import { textFor } from "@/lib/text";
import type { VisitStatus } from "@/lib/visit";

/** What is announced for each status change, in the visit's language. */
function messageFor(status: VisitStatus, language: string): string {
  const a = textFor(language).announce;
  const messages: Partial<Record<VisitStatus, string>> = {
    waiting: a.waiting,
    declined: a.onsite,
    not_eligible: a.onsite,
    called: a.called,
    on_the_way: a.onTheWay,
    arrived: a.arrived,
    removed: a.ended,
    unable_to_reach: a.ended,
    needs_reassessment: a.reassess,
  };
  return messages[status] ?? "";
}

/**
 * One change waiting to be announced. `round` makes every change new, even a repeat.
 * `expired` is true when the change is the visit request expiring, not a new status.
 */
type Pending = { round: number; status: VisitStatus; expired: boolean };

type Props = { status: VisitStatus; language: string; expired?: boolean };

export function StatusAnnouncer({ status, language, expired = false }: Props) {
  const [previous, setPrevious] = useState<VisitStatus | null>(null);
  // An expiry already on screen when the page opens is not announced; only the change is.
  const [wasExpired, setWasExpired] = useState(expired);
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
      setPending((p) => ({ round: (p?.round ?? 0) + 1, status, expired: false }));
    }
  }
  if (expired !== wasExpired) {
    setWasExpired(expired);
    if (expired) {
      setPolite("");
      setPending((p) => ({ round: (p?.round ?? 0) + 1, status, expired: true }));
    }
  }

  // Put the text in only while the page is on screen; a background tab waits until it is brought
  // forward, then announces the status if it has not changed in the meantime.
  useEffect(() => {
    if (!pending) return;
    const text = pending.expired ? textFor(language).announce.expired : messageFor(pending.status, language);
    if (!text) return;
    let done = false;
    const announce = () => {
      if (done || document.visibilityState !== "visible" || current.current !== pending.status) return;
      done = true;
      if (pending.status === "called" && !pending.expired) setUrgent(text);
      else setPolite(text);
      // Said once: a later language change does not say it again.
      setPending(null);
    };
    const timer = window.setTimeout(announce, 300);
    document.addEventListener("visibilitychange", announce);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", announce);
    };
  }, [pending, language]);

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
