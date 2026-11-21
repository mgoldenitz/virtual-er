// Line order and the simulated wait range.
// The line is ordered by triaged_at, never by created_at (SPEC data section).

import { ACTIVE_STATUSES, type Site, type Visit } from "./visit";

/**
 * Triage time first; two patients triaged at the same moment are put in a fixed order by id,
 * so the staff list and each patient's place always agree.
 */
function byTriage(a: Visit, b: Visit): number {
  const at = a.triaged_at ?? "";
  const bt = b.triaged_at ?? "";
  // Compare the moments themselves, so the order does not depend on how the time is written
  // ("...09.5+00:00" from the database, "...09.500Z" from a browser).
  const apart = Date.parse(at) - Date.parse(bt);
  if (apart < 0 || apart > 0) return apart < 0 ? -1 : 1;
  // Same millisecond: the database's text keeps finer detail (microseconds), so compare that.
  if (at !== bt) return at < bt ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Visits still in the off-site line at one site, oldest triage first. */
export function activeLine(visits: Visit[], site: Site): Visit[] {
  return visits
    .filter((v) => v.site === site && v.triaged_at && ACTIVE_STATUSES.includes(v.status))
    .sort(byTriage);
}

/** 1-based place among patients still waiting at the same site, or null if not waiting. */
export function placeInLine(visits: Visit[], visit: Visit): number | null {
  if (visit.status !== "waiting" || !visit.triaged_at) return null;
  const ahead = visits.filter(
    (v) =>
      v.site === visit.site &&
      v.status === "waiting" &&
      v.triaged_at !== null &&
      byTriage(v, visit) < 0,
  ).length;
  return ahead + 1;
}

/** The smallest gap per place, so a fast burst of call-backs never gives a very short wait. */
export const MIN_GAP_MINUTES = 5;

/**
 * Simulated wait range in minutes (SPEC rule 8: never THP's numbers).
 * place × average gap, shown as 80% to 125%, rounded out to 5 minutes.
 */
export function waitRange(place: number, gapMinutes: number): { low: number; high: number } {
  const middle = place * gapMinutes;
  const low = Math.max(5, Math.floor((middle * 0.8) / 5) * 5);
  const high = Math.max(low + 5, Math.ceil((middle * 1.25) / 5) * 5);
  return { low, high };
}

/** Whole minutes from one time to another (never negative). */
export function minutesBetween(fromIso: string, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - new Date(fromIso).getTime()) / 60_000));
}
