// Which status moves a visit may make, written once as data. The database trigger
// visits_check_step (in the newest migration that makes it) holds the same list, and
// lib/allowedSteps.test.ts checks that the two lists match and that every rule in
// lib/visitActions.ts makes only these moves. Time rules (the phone steps) stay in the app.

import type { VisitStatus } from "./visit";

/** For each status, the statuses a visit may move to next. A status that is not listed may not move. */
export const ALLOWED_MOVES: Partial<Record<VisitStatus, VisitStatus[]>> = {
  // Triage: a visit started from home, or one back for reassessment.
  pre_arrival: ["waiting", "declined", "not_eligible"],
  needs_reassessment: ["waiting", "declined", "not_eligible"],
  // Recall, or close (Mark arrived, Left, No-show).
  waiting: ["called", "arrived", "removed"],
  // I'm on my way, close, or a nurse confirms "Review: unable to reach".
  called: ["on_the_way", "arrived", "removed", "unable_to_reach"],
  on_the_way: ["arrived", "removed"],
  // Reopen: the patient came back, so the visit goes back to triage.
  unable_to_reach: ["needs_reassessment"],
  // Undo: back to the status before the closure.
  arrived: ["waiting", "called", "on_the_way"],
  removed: ["waiting", "called", "on_the_way"],
};

/** The statuses a new visit may start in (desk check-in, or start from home). */
export const START_STATUSES: VisitStatus[] = ["pre_arrival", "waiting", "declined", "not_eligible"];

/**
 * The statuses a triage starts from. A move from one of these to waiting starts off-site
 * waiting, so the database refuses it while the site is paused. Undo back to waiting does not.
 */
export const TRIAGE_STATUSES: VisitStatus[] = ["pre_arrival", "needs_reassessment"];

/** True if a visit may move from one status to another. Staying in the same status is always allowed. */
export function isAllowedMove(from: VisitStatus, to: VisitStatus): boolean {
  return from === to || (ALLOWED_MOVES[from] ?? []).includes(to);
}
