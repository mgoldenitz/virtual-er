// Decides whether the token saved on this phone no longer opens any visit. This happens on
// the old phone after staff use "Issue a new link": the database then finds no visit for it.

import type { PatientView } from "./patientView";

/**
 * True when there is a token and the database answered "no visit" for it (null). Still
 * loading (undefined) or a failed read ("unavailable") is never dead: the visit may be fine.
 */
export function isDeadToken(
  token: string | null | undefined,
  shown: PatientView | null | "unavailable" | undefined,
): boolean {
  return typeof token === "string" && shown === null;
}
