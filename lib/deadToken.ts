// Decides whether the token saved on this phone no longer opens any visit. This happens on
// the old phone after staff use "Issue a new link": the database then finds no visit for it.

import type { PatientView } from "./patientView";

/** Not written yet: the test in deadToken.test.ts shows the bug first. */
export function isDeadToken(
  token: string | null | undefined,
  shown: PatientView | null | "unavailable" | undefined,
): boolean {
  void token;
  void shown;
  return false;
}
