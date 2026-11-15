// The rule for the sound and vibration alert on the patient screen (SPEC: "While called but
// unconfirmed, the screen alerts with sound and vibration where the phone allows").

import type { VisitStatus } from "./visit";

/** How often the alert plays again while the patient has not tapped "I'm on my way". */
export const ALERT_REPEAT_MS = 30_000;

/**
 * The beep. 880 Hz is in the range that people with age-related hearing loss still hear well
 * (they lose high pitches first). 0.4 seconds is far below the 3 seconds after which WCAG 2.2
 * 1.4.2 (Audio Control) needs a way to stop sound that plays by itself.
 */
export const BEEP_HZ = 880;
export const BEEP_SECONDS = 0.4;

/**
 * The start volume of the beep, from 0 to 1 of what the phone's volume setting allows.
 * 0.5 is about 4.4 dB louder than the old 0.3. Above 1 the sound distorts; a web page can never
 * play louder than the phone's own volume.
 */
export const BEEP_VOLUME = 0.5;

/**
 * True when the phone should beep and vibrate now.
 * status: the visit's status. soundOn: the patient tapped "Turn on sound".
 * visible: the page is on screen (document.visibilityState is "visible").
 */
export function shouldAlert(status: VisitStatus, soundOn: boolean, visible: boolean): boolean {
  return status === "called" && soundOn && visible;
}

/** What the sound box knows about the sound: not turned on, turned on, or the phone refused to start it. */
export type SoundState = "off" | "on" | "failed";

/**
 * Which extra line the sound box shows under the button, or null for no line.
 * "failed": the phone would not start the sound (lib/text sound.failed).
 * "offWhileCalled": the visit is called and the sound is off (lib/text sound.offWhileCalled).
 */
export function soundNote(status: VisitStatus, state: SoundState): "failed" | "offWhileCalled" | null {
  if (state === "failed") return "failed";
  if (state === "off" && status === "called") return "offWhileCalled";
  return null;
}
