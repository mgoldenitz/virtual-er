// The staff "Expected arrivals" list: visits started from home that have not reached triage yet.
// They are not in the waiting line. After 6 hours without arriving they drop off the list.

import type { Site, Visit } from "./visit";

export const EXPECTED_ARRIVAL_HOURS = 6;

/** True while a visit started from home is still expected (not triaged, under 6 hours old). */
export function isExpected(visit: Visit, now: Date): boolean {
  if (visit.status !== "pre_arrival" || visit.triaged_at !== null) return false;
  const ageHours = (now.getTime() - new Date(visit.created_at).getTime()) / 3_600_000;
  return ageHours < EXPECTED_ARRIVAL_HOURS;
}

/** Expected arrivals at one site, oldest first. */
export function expectedArrivals(visits: Visit[], site: Site, now: Date): Visit[] {
  return visits
    .filter((v) => v.site === site && isExpected(v, now))
    .sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0));
}
