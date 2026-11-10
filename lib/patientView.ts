// What a patient's phone is allowed to see about its own visit (SPEC rule 5).
// The database function get_patient_visit returns these fields and nothing else;
// lib/patientViewFromRow.ts turns its answer into this shape.

import type { Site, VisitStatus } from "./visit";

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
  /** Started from home, never triaged, and past the 6 hours staff keep expecting it. */
  expired: boolean;
};
