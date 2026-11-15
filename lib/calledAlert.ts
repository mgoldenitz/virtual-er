// The rule for the sound and vibration alert on the patient screen (SPEC: "While called but
// unconfirmed, the screen alerts with sound and vibration where the phone allows").

import type { VisitStatus } from "./visit";

/** How often the alert plays again while the patient has not tapped "I'm on my way". */
export const ALERT_REPEAT_MS = 30_000;

/**
 * True when the phone should beep and vibrate now.
 * status: the visit's status. soundOn: the patient tapped "Turn on sound".
 * visible: the page is on screen (document.visibilityState is "visible").
 */
export function shouldAlert(status: VisitStatus, soundOn: boolean, visible: boolean): boolean {
  return status === "called" && soundOn && visible;
}
