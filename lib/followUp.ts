// The no-response steps after "Recall patient" (SPEC /staff): which flag staff see, and which
// message the patient's called screen shows. Minutes always count from called_at; an answered
// phone call pauses the staff flags, then they continue from that same clock (no restart).
// All times are demo settings in lib/demoTimes.ts, not clinical deadlines.

import {
  CALL_PHONE_AGAIN_MINUTES,
  CALL_REVIEW_MINUTES,
  CALL_SECOND_ALERT_MINUTES,
  ON_WAY_NOT_ARRIVED_MINUTES,
} from "./demoTimes";
import type { Visit, VisitStatus } from "./visit";

/** What the staff row shows for a called-back visit. */
export type StaffFollowUp =
  | { kind: "none" }
  /** "Phoned, answered" was recorded; flags wait until `until`. */
  | { kind: "paused"; until: string }
  /** "Phone this patient." */
  | { kind: "phone" }
  /** "Phone a second time." */
  | { kind: "phone_again" }
  /** "Review: unable to reach." A nurse must confirm before the visit leaves the line. */
  | { kind: "review" }
  /** A call was answered but the patient has still not confirmed or arrived. Never "unable to reach". */
  | { kind: "contacted_not_arrived" }
  /** Tapped "I'm on my way" a while ago and not marked arrived. Never removed automatically. */
  | { kind: "on_way_not_arrived" };

type FollowUpFields = Pick<
  Visit,
  "status" | "called_at" | "confirmed_at" | "phone_attempts" | "last_phone_result" | "followup_paused_until"
>;

const MINUTE_MS = 60_000;

const minutesSince = (iso: string, now: Date) => (now.getTime() - new Date(iso).getTime()) / MINUTE_MS;

/**
 * True if any call since this call-back was answered. last_phone_result holds only the latest
 * result, but followup_paused_until is set only by an answered call (and cleared at triage),
 * so a later "no answer" never turns an answered visit into "unable to reach".
 */
export function wasAnswered(visit: Pick<Visit, "last_phone_result" | "followup_paused_until">): boolean {
  return visit.last_phone_result === "answered" || visit.followup_paused_until !== null;
}

export function staffFollowUp(visit: FollowUpFields, now: Date): StaffFollowUp {
  if (visit.status === "on_the_way") {
    const late = visit.confirmed_at !== null && minutesSince(visit.confirmed_at, now) >= ON_WAY_NOT_ARRIVED_MINUTES;
    return late ? { kind: "on_way_not_arrived" } : { kind: "none" };
  }
  if (visit.status !== "called" || !visit.called_at) return { kind: "none" };
  const pausedUntil = visit.followup_paused_until;
  if (pausedUntil && now.getTime() < new Date(pausedUntil).getTime()) return { kind: "paused", until: pausedUntil };

  const minutes = minutesSince(visit.called_at, now);
  if (minutes >= CALL_REVIEW_MINUTES) {
    return wasAnswered(visit) ? { kind: "contacted_not_arrived" } : { kind: "review" };
  }
  // Each phone flag clears once staff record that many calls (answered or not).
  if (minutes >= CALL_PHONE_AGAIN_MINUTES) return visit.phone_attempts >= 2 ? { kind: "none" } : { kind: "phone_again" };
  if (minutes >= CALL_SECOND_ALERT_MINUTES) return visit.phone_attempts >= 1 ? { kind: "none" } : { kind: "phone" };
  return { kind: "none" };
}

/** Staff can record a simulated phone call from the "Phone this patient" step onwards, while called. */
export function canRecordPhoneCall(visit: Pick<Visit, "status" | "called_at">, now: Date): boolean {
  return (
    visit.status === "called" &&
    visit.called_at !== null &&
    minutesSince(visit.called_at, now) >= CALL_SECOND_ALERT_MINUTES
  );
}

/** What the patient's called screen adds: nothing yet, the second alert, or "Please return now". */
export type PatientCallStep = "first" | "second_alert" | "return_now";

/**
 * Only while called and not yet confirmed. The patient's messages follow the clock alone;
 * an answered phone call pauses only the staff flags (the patient view never sees it).
 */
export function patientCallStep(status: VisitStatus, calledAt: string | null, now: Date): PatientCallStep {
  if (status !== "called" || !calledAt) return "first";
  const minutes = minutesSince(calledAt, now);
  if (minutes >= CALL_PHONE_AGAIN_MINUTES) return "return_now";
  if (minutes >= CALL_SECOND_ALERT_MINUTES) return "second_alert";
  return "first";
}
