"use client";

// Keeps keyboard focus on the patient screen when a part that has focus leaves the page
// (for example the sound box when staff mark the visit arrived): focus goes to the status heading.

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { focusIsOnNobody } from "./noFocus";

/**
 * Calls onLost when this part leaves the page while focus is inside it. A layout effect cleanup
 * runs before React takes the part's nodes off the page, so contains() still gives the true answer.
 */
export function useReportFocusOnLeave(part: RefObject<HTMLElement | null>, onLost?: () => void): void {
  // Always the newest onLost, so the cleanup below does not use an old one.
  const latest = useRef(onLost);
  useLayoutEffect(() => {
    latest.current = onLost;
  });
  useLayoutEffect(() => {
    const node = part.current;
    return () => {
      if (node?.contains(document.activeElement)) latest.current?.();
    };
  }, [part]);
}

/**
 * After each change of trigger: if a part reported lost focus (lost.current is true), focus goes to
 * the element with this id. Focus that is still on a button that stays, or on the page body after
 * a phone tap, does not move, so the page does not scroll.
 * Gives back markLost, for a part that left with focus inside it.
 */
export function useRescueFocus(targetId: string, trigger: unknown, lostRef: RefObject<boolean>): () => void {
  useEffect(() => {
    if (!lostRef.current) return;
    lostRef.current = false;
    // Focus on a part that is still on the page stays there.
    if (!focusIsOnNobody() && document.activeElement?.isConnected) return;
    const target = document.getElementById(targetId);
    if (target) target.focus({ preventScroll: true });
  }, [targetId, trigger, lostRef]);
  return () => {
    lostRef.current = true;
  };
}
