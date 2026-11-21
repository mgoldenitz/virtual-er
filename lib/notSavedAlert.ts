// Decides when the "not saved" alert on the patient screen shows: only while the visit is still
// in the status where the save failed, so the alert goes once the visit moves on.

import type { VisitStatus } from "./visit";

/** The status a save failed in, "gone" once the visit has left it, or null with no failed save. */
export type FailedIn = VisitStatus | "gone" | null;

/** True when the alert shows: the save failed in this status and the visit is still in it. */
export function notSavedAlertShows(failedIn: FailedIn, status: VisitStatus | undefined): boolean {
  return failedIn !== null && failedIn !== "gone" && failedIn === status;
}
