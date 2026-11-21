// Decides when the "not saved" alert on the patient screen shows: only while the visit is still
// in the status where the save failed, so the alert goes once the visit moves on.

import type { VisitStatus } from "./visit";

/** True when the alert shows: the save failed in this status and the visit is still in it. */
export function notSavedAlertShows(failedIn: VisitStatus | null, status: VisitStatus | undefined): boolean {
  return failedIn !== null && failedIn === status;
}
