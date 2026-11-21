// A patient recorded as "offered, declined" waits on-site, then changes their mind and wants
// to wait off-site after all. Staff can switch them, but only for a few hours after declining.
// The patient keeps the place in line from the original triage time (owner, 2026-11-19),
// because they have been waiting inside the whole time. A switch made by mistake can be undone
// until the patient is recalled.

import { byTriage, placeInLine } from "./queue";
import type { Site, Visit } from "./visit";

/** How long after declining a patient can still be switched to off-site waiting. */
export const SWITCH_TO_OFFSITE_HOURS = 6;

const ms = (iso: string) => Date.parse(iso);

/** True if staff can switch this visit to off-site waiting now: declined, and declined under 6 hours ago. */
export function canSwitchToOffsite(visit: Visit, now: Date): boolean {
  if (visit.status !== "declined" || !visit.triaged_at || !visit.closed_at) return false;
  const hours = (now.getTime() - ms(visit.closed_at)) / 3_600_000;
  return hours < SWITCH_TO_OFFSITE_HOURS;
}

/**
 * Staff press "Start off-site waiting" after ticking the eligibility checklist again.
 * The visit joins the line at its original triage time, and closed_at is cleared because
 * virtual waiting starts again. offered_at moves to the switch, because the patient accepts the
 * offer now. The "I'm still here" clock starts at the switch (last_still_here_at), so the first
 * prompt comes 30 minutes later, not at once. The database stamps both with the same now(),
 * which is how `switchedAt` tells a switch from a tap. Null when the switch is not allowed.
 */
export function switchToOffsite(visit: Visit, now: Date, language: string = visit.language): Visit | null {
  if (!canSwitchToOffsite(visit, now)) return null;
  const nowIso = now.toISOString();
  return { ...visit, status: "waiting", closed_at: null, offered_at: nowIso, last_still_here_at: nowIso, language };
}

/**
 * When this visit was switched from declined to off-site waiting, if the patient has not tapped
 * "I'm still here" since; otherwise null. A switch leaves offered_at after triage and the same
 * moment in last_still_here_at; a normal check-in sets offered_at at triage, and a tap changes
 * last_still_here_at.
 */
export function switchedAt(visit: Visit): string | null {
  const { offered_at, triaged_at, last_still_here_at } = visit;
  if (!offered_at || !triaged_at || !last_still_here_at) return null;
  if (ms(offered_at) <= ms(triaged_at)) return null;
  return ms(last_still_here_at) === ms(offered_at) ? offered_at : null;
}

/** True while a switch can be undone: still waiting, not recalled yet, and it was a switch. */
export function canUndoSwitch(visit: Visit): boolean {
  if (visit.status !== "waiting" || visit.called_at) return false;
  return !!visit.offered_at && !!visit.triaged_at && ms(visit.offered_at) > ms(visit.triaged_at);
}

/** Staff press Undo after a switch made by mistake: back to "offered, declined". Null when not allowed. */
export function undoSwitch(visit: Visit, now: Date): Visit | null {
  if (!canUndoSwitch(visit)) return null;
  return { ...visit, status: "declined", closed_at: now.toISOString() };
}

/** The staff "Waiting on-site: offered, declined" list at one site: visits that can still switch, oldest triage first. */
export function waitingOnSite(visits: Visit[], site: Site, now: Date): Visit[] {
  return visits.filter((v) => v.site === site && canSwitchToOffsite(v, now)).sort(byTriage);
}

/** The place in line this declined visit would get if it switched now (1 = next to be recalled), or null. */
export function placeIfSwitched(visits: Visit[], visit: Visit, now: Date): number | null {
  const preview = switchToOffsite(visit, now);
  if (!preview) return null;
  return placeInLine([...visits.filter((v) => v.id !== visit.id), preview], preview);
}
