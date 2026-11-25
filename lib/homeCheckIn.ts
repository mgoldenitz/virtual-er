// While staff have a home visit (or a reopened visit back for reassessment) open in the check-in form, it can change on another screen
// (checked in elsewhere) or expire. This says what changed, so staff never save twice.

import { isExpected } from "./expectedArrivals";
import type { Visit, VisitStatus } from "./visit";

/** Staff wording for each status. */
const STAFF_STATUS_LABEL: Record<VisitStatus, string> = {
  pre_arrival: "expected from home, not yet triaged",
  waiting: "waiting off-site",
  called: "called back",
  on_the_way: "on the way",
  arrived: "arrival recorded",
  unable_to_reach: "unable to reach",
  needs_reassessment: "needs reassessment",
  removed: "removed",
  declined: "offered, declined",
  not_eligible: "not eligible",
};

/**
 * `chosen` is the visit as it was when staff opened the form; `live` is the same visit now
 * (null if it is gone). Returns a message when it can no longer be checked in, or null.
 */
export function homeCheckInProblem(chosen: Visit, live: Visit | null, now: Date): string | null {
  if (!live) return `Visit ${chosen.code} is no longer on this screen. No check-in was saved.`;
  // A reopened visit back for reassessment can be triaged again (no 6-hour limit).
  if (live.status === "needs_reassessment") return null;
  if (live.status !== "pre_arrival" || live.triaged_at) {
    return `Visit ${chosen.code} was already processed on another screen. Current status: ${STAFF_STATUS_LABEL[live.status]}. No additional check-in was saved.`;
  }
  if (!isExpected(live, now)) {
    return `Visit ${chosen.code} was started more than 6 hours ago and is no longer expected. No check-in was saved. Check the patient in as a new visit.`;
  }
  return null;
}
