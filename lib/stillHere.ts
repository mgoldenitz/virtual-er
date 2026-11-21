// Decides when the "I'm still here" prompt shows on the patient's phone and when staff see
// a missed tap. The clock starts at triage and starts again at every tap. Only while waiting
// off-site. The tap only tells staff the patient is still following the visit; it is not a
// reassessment (SPEC).

import { STILL_HERE_ANSWER_WITHIN_MINUTES, STILL_HERE_EVERY_MINUTES } from "./demoTimes";
import type { VisitStatus } from "./visit";

/** not_due = nothing to show; due = show the prompt; missed = still showing, and staff are flagged. */
export type StillHereState = "not_due" | "due" | "missed";

type StillHereInput = {
  status: VisitStatus;
  triagedAt: string | null;
  lastStillHereAt: string | null;
};

const MINUTE_MS = 60_000;

/** The later of triage and the last tap, as milliseconds; null if the visit was never triaged. */
function clockStart({ triagedAt, lastStillHereAt }: StillHereInput): number | null {
  if (!triagedAt) return null;
  const triaged = new Date(triagedAt).getTime();
  const tapped = lastStillHereAt ? new Date(lastStillHereAt).getTime() : -Infinity;
  return Math.max(triaged, tapped);
}

type LastTapInput = Omit<StillHereInput, "status"> & { offeredAt?: string | null };

/** The last tap in this wait, or null if there was none since the latest triage (a reopened visit starts fresh), or if that stamp is a switch to off-site waiting. */
export function lastTapThisWait({ triagedAt, lastStillHereAt, offeredAt }: LastTapInput): string | null {
  if (!triagedAt || !lastStillHereAt) return null;
  const triaged = new Date(triagedAt).getTime();
  const tapped = new Date(lastStillHereAt).getTime();
  if (tapped < triaged) return null;
  // A switch from declined sets offered_at and last_still_here_at to the same moment, after triage: not a tap.
  const offered = offeredAt ? new Date(offeredAt).getTime() : null;
  const isSwitchStamp = offered !== null && offered > triaged && offered === tapped;
  return isSwitchStamp ? null : lastStillHereAt;
}

export function stillHereState(visit: StillHereInput, now: Date): StillHereState {
  if (visit.status !== "waiting") return "not_due";
  const start = clockStart(visit);
  if (start === null) return "not_due";
  const minutes = (now.getTime() - start) / MINUTE_MS;
  if (minutes >= STILL_HERE_EVERY_MINUTES + STILL_HERE_ANSWER_WITHIN_MINUTES) return "missed";
  if (minutes >= STILL_HERE_EVERY_MINUTES) return "due";
  return "not_due";
}
