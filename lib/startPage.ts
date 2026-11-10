// Decides what the start page shows, based on the visit already saved on this phone.

import type { PatientView } from "./patientView";

export type StartPageState = "loading" | "start" | "unavailable" | "open" | "expired" | "closed";

/** `saved` is what usePatientView returned for the token saved on this phone. */
export function startPageState(saved: PatientView | null | "unavailable" | undefined): StartPageState {
  if (saved === undefined) return "loading";
  if (saved === null) return "start";
  if (saved === "unavailable") return "unavailable";
  if (saved.expired) return "expired";
  return saved.closed ? "closed" : "open";
}
