// A patient recorded as "offered, declined" waits on-site, then changes their mind and wants
// to wait off-site after all. Staff can switch them, but only for a few hours after triage.
// The patient keeps the place in line from the original triage time (owner, 2026-11-19),
// because they have been waiting inside the whole time.

import type { Site, Visit } from "./visit";

/** How long after declining a patient can still be switched to off-site waiting. */
export const SWITCH_TO_OFFSITE_HOURS = 6;

/** True if staff can switch this visit to off-site waiting now: declined, and declined under 6 hours ago. */
export function canSwitchToOffsite(visit: Visit, now: Date): boolean {
  if (visit.status !== "declined" || !visit.triaged_at || !visit.closed_at) return false;
  const hours = (now.getTime() - new Date(visit.closed_at).getTime()) / 3_600_000;
  return hours < SWITCH_TO_OFFSITE_HOURS;
}

/**
 * Staff press "Switch to off-site waiting" after ticking the eligibility checklist again.
 * The visit joins the line at its original triage time, and closed_at is cleared because
 * virtual waiting starts again. The "I'm still here" clock starts at the switch (the patient
 * is at the desk right then), so the first prompt comes 30 minutes later, not at once.
 * Null when the switch is not allowed.
 */
export function switchToOffsite(visit: Visit, now: Date): Visit | null {
  if (!canSwitchToOffsite(visit, now)) return null;
  return { ...visit, status: "waiting", closed_at: null, last_still_here_at: now.toISOString() };
}

/** The staff "Waiting on-site (offered, declined)" list at one site: visits that can still switch, oldest triage first. */
export function waitingOnSite(visits: Visit[], site: Site, now: Date): Visit[] {
  return visits
    .filter((v) => v.site === site && canSwitchToOffsite(v, now))
    .sort((a, b) => (a.triaged_at! < b.triaged_at! ? -1 : a.triaged_at! > b.triaged_at! ? 1 : 0));
}
