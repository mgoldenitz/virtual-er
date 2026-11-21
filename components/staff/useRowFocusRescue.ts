"use client";

// Keeps keyboard focus in a staff row when another staff screen changes the visit, and the button
// that had focus leaves the page (for example "Recall patient"): focus goes to the target instead.
// It does not use blur, because browsers do not agree on a blur when a focused button is removed.

import { useEffect, useRef, type FocusEvent, type RefObject } from "react";
import { focusLeftWithPart } from "@/lib/rowFocus";
import { focusIsOnNobody } from "@/components/patient/noFocus";

/**
 * Gives back an onFocus handler for the row. Focus events bubble, so it learns each part that gets
 * focus. Each time `visit` changes, if that part left the page and nothing has focus, the target gets focus.
 * It runs only on a visit change, not after every render: when the row's own question closes
 * (Yes or Cancel), RecallPanel puts focus back itself one tick later, and this must not take it first.
 */
export function useRowFocusRescue(target: RefObject<HTMLElement | null>, visit: unknown): (event: FocusEvent<HTMLElement>) => void {
  /** The last part of the row that had focus, or null. */
  const lastFocused = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const last = lastFocused.current;
    if (!focusLeftWithPart(focusIsOnNobody(), last ? last.isConnected : null)) return;
    lastFocused.current = null;
    target.current?.focus({ preventScroll: true });
  }, [target, visit]);
  return (event) => {
    lastFocused.current = event.target;
  };
}
