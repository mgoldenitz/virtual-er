"use client";

// Keeps keyboard focus in a staff row when another staff screen changes the visit, and the button
// that had focus leaves the page (for example "Recall patient"): focus goes to the target instead.
// It does not use blur to see a removed button, because browsers do not agree on a blur then.

import { useEffect, useRef, type FocusEvent, type RefObject } from "react";
import { focusLeftWithPart } from "@/lib/rowFocus";
import { focusIsOnNobody } from "@/components/patient/noFocus";

/** The handlers to put on the row's `<li>`. */
export type RowFocusWatch = {
  onFocus: (event: FocusEvent<HTMLElement>) => void;
  onBlur: (event: FocusEvent<HTMLElement>) => void;
};

/**
 * Gives back focus handlers for the row. Focus events bubble, so the row learns each part that gets
 * focus. Each time `visit` changes, if that part left the page and nothing has focus, the target gets focus.
 * It runs only on a visit change, not after every render: when the row's own question closes
 * (Yes or Cancel), RecallPanel puts focus back itself one tick later, and this must not take it first.
 * The row forgets the part when focus moves out of the row, at a tap or click anywhere,
 * and when the part leaves the page, so an old part never takes focus at a later change.
 */
export function useRowFocusRescue(target: RefObject<HTMLElement | null>, visit: unknown): RowFocusWatch {
  /** The last part of the row that had focus, or null. */
  const lastFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const last = lastFocused.current;
    const rescue = focusLeftWithPart(focusIsOnNobody(), last ? last.isConnected : null);
    if (last && !last.isConnected) lastFocused.current = null;
    if (rescue) target.current?.focus({ preventScroll: true });
  }, [target, visit]);

  // A tap on a phone can drop focus to the page body with no focus event, so forget the part.
  // If the tap gives focus to a part of the row, onFocus learns it again just after.
  useEffect(() => {
    const forget = () => (lastFocused.current = null);
    document.addEventListener("pointerdown", forget);
    return () => document.removeEventListener("pointerdown", forget);
  }, []);

  return {
    onFocus: (event) => {
      lastFocused.current = event.target;
    },
    onBlur: (event) => {
      // Focus moved to a part outside the row (not to nobody, which a removed part can also give).
      const next = event.relatedTarget;
      if (next instanceof Node && !event.currentTarget.contains(next)) lastFocused.current = null;
    },
  };
}
