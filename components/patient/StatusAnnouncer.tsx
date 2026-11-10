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

export function StatusAnnouncer({ status }: { status: VisitStatus }) {
  const [previous, setPrevious] = useState(status);
  const [polite, setPolite] = useState("");
  const [urgent, setUrgent] = useState("");
  const current = useRef(status);
  useEffect(() => {
    current.current = status;
  }, [status]);

  // Update the messages while rendering, the moment the status changes.
  if (status !== previous) {
    setPrevious(status);
    const text = MESSAGES[status] ?? "";
    if (status === "called") setUrgent(text);
    else setPolite(text);
  }

  // Routine statuses already on screen when the page opened are not announced, but a call-back is:
  // once, shortly after the page is on screen (screen readers miss text present at load).
  const [openedWith] = useState(status);
  useEffect(() => {
    if (openedWith !== "called") return;
    let done = false;
    const announce = () => {
      if (done || document.visibilityState !== "visible" || current.current !== "called") return;
      done = true;
      setUrgent(CALLED);
    };
    const timer = window.setTimeout(announce, 500);
    document.addEventListener("visibilitychange", announce);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", announce);
    };
  }, [openedWith]);

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
