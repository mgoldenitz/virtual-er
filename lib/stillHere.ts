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

export function stillHereState(visit: StillHereInput, now: Date): StillHereState {
  if (visit.status !== "waiting") return "not_due";
  const start = clockStart(visit);
  if (start === null) return "not_due";
  const minutes = (now.getTime() - start) / MINUTE_MS;
  if (minutes >= STILL_HERE_EVERY_MINUTES + STILL_HERE_ANSWER_WITHIN_MINUTES) return "missed";
  if (minutes >= STILL_HERE_EVERY_MINUTES) return "due";
  return "not_due";
}
