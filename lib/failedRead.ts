// Decides what the patient screen shows when reading the visit from the database fails.
// One failed read (a short signal drop) keeps the last view on screen; a second in a row
// shows "We cannot load your visit right now", so an old status is never shown for long.

import type { PatientView } from "./patientView";

const FAILED_READS_BEFORE_UNAVAILABLE = 2;

type Shown = PatientView | null | "unavailable";

/** `shown` is what the screen has now (undefined = still loading). */
export function afterFailedRead(shown: Shown | undefined, failuresInARow: number): Shown {
  if (shown === undefined) return "unavailable"; // never a first answer of "no visit" on an error
  return failuresInARow >= FAILED_READS_BEFORE_UNAVAILABLE ? "unavailable" : shown;
}
