// Turns the row that the database function get_patient_visit returns into the PatientView
// shape the patient screens already use, and works out the simulated wait range.

import type { PatientView } from "./patientView";
import { DEFAULT_GAP_MINUTES, MIN_GAP_MINUTES, waitRange } from "./queue";
import type { Site, VisitStatus } from "./visit";

/** One row from get_patient_visit (supabase/migrations/20261110061049_patient_functions.sql). */
export type PatientVisitRow = {
  code: string;
  site: string;
  language: string;
  status: string;
  place_in_line: number | null;
  /** Whole minutes between distinct call-back moments of the last 3 hours at this site; null with fewer than 2. */
  average_gap_minutes: number | null;
  called_at: string | null;
  last_still_here_at: string | null;
  seen: boolean;
  closed: boolean;
  expired: boolean;
  /** Added in 20261111050000_still_here.sql; missing (undefined) before that change has run. */
  triaged_at?: string | null;
};

export function patientViewFromRow(row: PatientVisitRow): PatientView {
  const place = row.place_in_line;
  // 15 minutes until there are 2 distinct call-back moments in the last 3 hours (the database
  // gives null then), and never under 5 minutes per place.
  const gap = Math.max(row.average_gap_minutes ?? DEFAULT_GAP_MINUTES, MIN_GAP_MINUTES);
  const range = place === null ? null : waitRange(place, gap);
  return {
    code: row.code,
    site: row.site as Site,
    language: row.language,
    status: row.status as VisitStatus,
    placeInLine: place,
    waitLow: range?.low ?? null,
    waitHigh: range?.high ?? null,
    calledAt: row.called_at,
    lastStillHereAt: row.last_still_here_at,
    triagedAt: row.triaged_at ?? null,
    seen: row.seen,
    closed: row.closed,
    expired: row.expired,
  };
}
