// The core-loop steps as small rules. Each one takes a visit and the time,
// and returns the updated visit, or null when the step is not allowed right now
// (for example a second click after the list already changed).

import { isExpected } from "./expectedArrivals";
import { type Site, type Visit, type VisitStatus } from "./visit";

export type DeskCheckIn = {
  id: string;
  code: string;
  access_token: string;
  site: Site;
  ctas_level: 4 | 5;
  language: string;
  is_demo?: boolean;
};

export type DeskOutcome = "waiting" | "declined" | "not_eligible";

/** What a new visit needs, whether started at the desk or from home. */
export type NewVisit = { id: string; code: string; access_token: string; site: Site; language: string; is_demo?: boolean };

function blankVisit(input: NewVisit, source: "home" | "desk", nowIso: string): Visit {
  return {
    id: input.id,
    code: input.code,
    access_token: input.access_token,
    site: input.site,
    source,
    ctas_level: null,
    language: input.language,
    status: "pre_arrival",
    removed_reason: null,
    created_at: nowIso,
    triaged_at: null,
    offered_at: null,
    last_still_here_at: null,
    called_at: null,
    seen_at: null,
    confirmed_at: null,
    review_flagged_at: null,
    arrived_at: null,
    closed_at: null,
    phone_attempts: 0,
    last_phone_result: null,
    followup_paused_until: null,
    survey_score: null,
    is_demo: input.is_demo ?? false,
  };
}

/**
 * The nurse's check-in after triage, applied to a visit that has not been triaged yet.
 * Its place in line starts now (triaged_at), never when it was created (SPEC rule 7).
 * - waiting: offered and accepted off-site waiting; joins the line now.
 * - declined: offered, said no; waits on-site as usual (closed for virtual waiting).
 * - not_eligible: not offered; waits on-site as usual.
 */
function applyTriage(visit: Visit, ctas: 4 | 5, language: string, outcome: DeskOutcome, nowIso: string): Visit {
  const triaged = { ...visit, ctas_level: ctas, language, triaged_at: nowIso };
  if (outcome === "not_eligible") return { ...triaged, status: "not_eligible", closed_at: nowIso };
  const offered = { ...triaged, offered_at: nowIso };
  if (outcome === "declined") return { ...offered, status: "declined", closed_at: nowIso };
  return { ...offered, status: "waiting" };
}

/** A nurse checks in a patient at the desk after triage, for a patient who did not start a visit. */
export function checkInAtDesk(input: DeskCheckIn, outcome: DeskOutcome, now: Date): Visit {
  const nowIso = now.toISOString();
  return applyTriage(blankVisit(input, "desk", nowIso), input.ctas_level, input.language, outcome, nowIso);
}

/**
 * A patient starts a visit from home on the start page: "Started from home, not yet triaged".
 * This never gives a place in line (SPEC rule 7); that starts at triage.
 * In the app the database function start_home_visit does this; this copy is used by the tests.
 */
export function startFromHome(input: NewVisit, now: Date): Visit {
  return blankVisit(input, "home", now.toISOString());
}

/** A nurse checks in, after triage, a visit the patient started from home. Only before triage. */
export function checkInHomeVisit(
  visit: Visit,
  triage: { ctas_level: 4 | 5; language: string },
  outcome: DeskOutcome,
  now: Date,
): Visit | null {
  // Only while still expected: not triaged yet, and under 6 hours old.
  if (!isExpected(visit, now)) return null;
  return applyTriage(visit, triage.ctas_level, triage.language, outcome, now.toISOString());
}

/** Staff press "Call back". Only while waiting. */
export function callBack(visit: Visit, now: Date): Visit | null {
  if (visit.status !== "waiting") return null;
  return { ...visit, status: "called", called_at: now.toISOString() };
}

/**
 * The called screen was shown on the patient's phone. Sets seen_at once, only while called.
 * In the app the database function record_seen does this; this copy is used by the tests.
 */
export function markSeen(visit: Visit, now: Date): Visit | null {
  if (visit.status !== "called" || visit.seen_at) return null;
  return { ...visit, seen_at: now.toISOString() };
}

/**
 * The patient taps "I'm on my way". Only while called.
 * In the app the database function confirm_on_my_way does this; this copy is used by the tests.
 */
export function confirmOnMyWay(visit: Visit, now: Date): Visit | null {
  if (visit.status !== "called") return null;
  return { ...visit, status: "on_the_way", confirmed_at: now.toISOString() };
}

/** Staff mark the patient as back at the hospital. Ends virtual waiting. */
export function markArrived(visit: Visit, now: Date): Visit | null {
  if (!["waiting", "called", "on_the_way"].includes(visit.status)) return null;
  const nowIso = now.toISOString();
  return { ...visit, status: "arrived", arrived_at: nowIso, closed_at: nowIso };
}

/** Staff remove the patient (left, or did not show). Ends virtual waiting. */
export function markRemoved(visit: Visit, reason: "left" | "no_show", now: Date): Visit | null {
  if (!["waiting", "called", "on_the_way"].includes(visit.status)) return null;
  return { ...visit, status: "removed", removed_reason: reason, closed_at: now.toISOString() };
}

/**
 * The status a closed visit had just before Mark arrived, Left or No-show.
 * Statuses only move forward (waiting, then called, then on the way) and closing keeps
 * called_at and confirmed_at, so the visit's own times say where it was.
 */
export function statusBeforeClose(visit: Visit): VisitStatus {
  if (visit.confirmed_at) return "on_the_way";
  if (visit.called_at) return "called";
  return "waiting";
}

/** What one closure left behind; the Undo button for that closure carries a copy. */
export type Closure = Pick<Visit, "status" | "removed_reason" | "arrived_at" | "closed_at">;

/**
 * Staff press Undo on one closure in the "Recently closed" list. There is no time limit.
 * `closure` names the exact closure the button belongs to: if the visit was reopened and
 * closed again since, its status, reason or times differ and the old button is refused, so it
 * can never reverse a newer action. (Two closures could only match on all four if they were
 * the same kind and happened in the same millisecond, and then undoing either gives the same
 * result.) The visit goes back to exactly its state before that closure.
 */
export function undoClose(visit: Visit, closure: Closure): Visit | null {
  if (visit.status !== "arrived" && visit.status !== "removed") return null;
  if (!visit.triaged_at || !visit.closed_at) return null;
  const sameClosure =
    visit.status === closure.status &&
    visit.removed_reason === closure.removed_reason &&
    visit.arrived_at === closure.arrived_at &&
    visit.closed_at === closure.closed_at;
  if (!sameClosure) return null;
  return {
    ...visit,
    status: statusBeforeClose(visit),
    arrived_at: null,
    removed_reason: null,
    closed_at: null,
  };
}
