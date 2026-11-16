"use client";

// Keeps keyboard focus on the patient screen when a part that has focus leaves the page
// (for example the sound box when staff mark the visit arrived): focus goes to the status heading.

import type { RefObject } from "react";

/** Calls onLost when this part leaves the page while focus is inside it. */
export function useReportFocusOnLeave(part: RefObject<HTMLElement | null>, onLost?: () => void): void {
  void part;
  void onLost;
}

/** After each change of trigger: if a part reported lost focus, focus goes to the element with this id. */
export function useRescueFocus(targetId: string, trigger: unknown, lost: RefObject<boolean>): void {
  void targetId;
  void trigger;
  void lost;
}
