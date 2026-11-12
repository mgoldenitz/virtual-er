// The "Pause off-site waiting" switch per site (SPEC /staff): which sites are paused, read
// from the database's site_settings rows on the server and from /api/site-status in browsers.
// While a site is paused: no new off-site sign-ups there; visits already off-site keep working.

import type { Site } from "./visit";

/** True for each site where off-site waiting is paused. */
export type SitePauses = Record<Site, boolean>;

const SITES: Site[] = ["A", "B"];

/** From the database rows (site, offsite_paused); null unless both demo sites are present. */
export function sitePausesFromRows(rows: unknown): SitePauses | null {
  if (!Array.isArray(rows)) return null;
  const found: Partial<SitePauses> = {};
  for (const row of rows) {
    const r = row as { site?: unknown; offsite_paused?: unknown };
    if ((r.site === "A" || r.site === "B") && typeof r.offsite_paused === "boolean") found[r.site] = r.offsite_paused;
  }
  return SITES.every((s) => typeof found[s] === "boolean") ? (found as SitePauses) : null;
}

/** From the /api/site-status answer; null if it is not exactly { A: boolean, B: boolean }. */
export function parseSitePauses(body: unknown): SitePauses | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  return typeof b.A === "boolean" && typeof b.B === "boolean" ? { A: b.A, B: b.B } : null;
}
