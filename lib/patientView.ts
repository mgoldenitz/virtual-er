// What a patient's phone is allowed to see about its own visit (SPEC rule 5).
// In Phase 2 a database function returns this same shape; nothing else leaves the database.

import { averageCallGap, placeInLine, waitRange } from "./queue";
import type { Site, Visit, VisitStatus } from "./visit";

export type PatientView = {
  code: string;
  site: Site;
  language: string;
  status: VisitStatus;
  placeInLine: number | null;
  waitLow: number | null;
  waitHigh: number | null;
  calledAt: string | null;
  lastStillHereAt: string | null;
  seen: boolean;
  closed: boolean;
};

/** Find the visit with this token and return only the patient-safe fields, or null. */
export function patientViewFor(visits: Visit[], token: string): PatientView | null {
  const visit = visits.find((v) => v.access_token === token);
  if (!visit) return null;
  const place = placeInLine(visits, visit);
  const range = place === null ? null : waitRange(place, averageCallGap(visits, visit.site));
  return {
    code: visit.code,
    site: visit.site,
    language: visit.language,
    status: visit.status,
    placeInLine: place,
    waitLow: range?.low ?? null,
    waitHigh: range?.high ?? null,
    calledAt: visit.called_at,
    lastStillHereAt: visit.last_still_here_at,
    seen: visit.seen_at !== null,
    closed: visit.closed_at !== null,
  };
}
