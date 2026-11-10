// The core-loop steps as small rules. Each one takes a visit and the time,
// and returns the updated visit, or null when the step is not allowed right now
// (for example a second click after the list already changed).

import type { Site, Visit } from "./visit";

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

function blankVisit(input: DeskCheckIn, nowIso: string): Visit {
  return {
    id: input.id,
    code: input.code,
    access_token: input.access_token,
    site: input.site,
    source: "desk",
    ctas_level: input.ctas_level,
    language: input.language,
    status: "waiting",
    removed_reason: null,
    created_at: nowIso,
    triaged_at: nowIso,
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
 * A nurse checks in a patient at the desk after triage.
 * - waiting: offered and accepted off-site waiting; joins the line now.
 * - declined: offered, said no; waits on-site as usual (closed for virtual waiting).
 * - not_eligible: not offered; waits on-site as usual.
 */
export function checkInAtDesk(input: DeskCheckIn, outcome: DeskOutcome, now: Date): Visit {
  const nowIso = now.toISOString();
  const visit = blankVisit(input, nowIso);
  if (outcome === "not_eligible") {
    return { ...visit, status: "not_eligible", closed_at: nowIso };
  }
  visit.offered_at = nowIso;
  if (outcome === "declined") {
    return { ...visit, status: "declined", closed_at: nowIso };
  }
  return visit;
}

/** Staff press "Call back". Only while waiting. */
export function callBack(visit: Visit, now: Date): Visit | null {
  if (visit.status !== "waiting") return null;
  return { ...visit, status: "called", called_at: now.toISOString() };
}

/** The called screen was shown on the patient's phone. Sets seen_at once, only while called. */
export function markSeen(visit: Visit, now: Date): Visit | null {
  if (visit.status !== "called" || visit.seen_at) return null;
  return { ...visit, seen_at: now.toISOString() };
}

/** The patient taps "I'm on my way". Only while called. */
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
