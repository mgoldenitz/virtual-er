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

export const DEFAULT_GAP_MINUTES = 15;

/** Average minutes between the last 5 call-backs at a site; 15 until there is history. */
export function averageCallGap(visits: Visit[], site: Site): number {
  const times = visits
    .filter((v) => v.site === site && v.called_at)
    .map((v) => new Date(v.called_at!).getTime())
    .sort((a, b) => a - b)
    .slice(-6); // 6 call-backs give 5 gaps
  if (times.length < 2) return DEFAULT_GAP_MINUTES;
  const gaps = times.slice(1).map((t, i) => (t - times[i]) / 60_000);
  const avg = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;
  return Math.max(avg, 1);
}

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
