// Everything a patient's phone may do, each as one narrow function that takes the token
// (SPEC rule 5). Patient screens use only this file, never visitStore directly,
// so Phase 2 can swap these for database functions without touching the screens.

import { useCallback, useSyncExternalStore } from "react";
import { patientViewFor, type PatientView } from "@/lib/patientView";
import { confirmOnMyWay, markSeen } from "@/lib/visitActions";
import { readVisits, storageMayHideToken, subscribeToVisits, updateVisit, type ChangeResult } from "./visitStore";

function idForToken(token: string): string | null {
  return readVisits().find((v) => v.access_token === token)?.id ?? null;
}

/** Record that the called screen was shown. Only while called, and only once. */
export function recordSeen(token: string): ChangeResult {
  const id = idForToken(token);
  return id ? updateVisit(id, (v) => markSeen(v, new Date())) : "refused";
}

/** The patient taps "I'm on my way". Only while called. */
export function confirmOnMyWayByToken(token: string): ChangeResult {
  const id = idForToken(token);
  return id ? updateVisit(id, (v) => confirmOnMyWay(v, new Date())) : "refused";
}

// Cache so React gets the same object until the view really changes.
let lastKey = "";
let lastView: PatientView | null | "unavailable" = null;

function readView(token: string): PatientView | null | "unavailable" {
  const found = patientViewFor(readVisits(), token);
  // Not found because the saved data is damaged: say the visit cannot be loaded, never "no visit".
  const view = found === null && storageMayHideToken(token) ? "unavailable" : found;
  const key = token + JSON.stringify(view);
  if (key !== lastKey) {
    lastKey = key;
    lastView = view;
  }
  return lastView;
}

/**
 * Live patient view for one token. The change signal carries no visit data:
 * on every change the hook simply re-reads through patientViewFor.
 * Returns undefined before the browser has loaded, null if the token matches no visit,
 * and "unavailable" if damaged saved data may be hiding it.
 */
export function usePatientView(token: string | null): PatientView | null | "unavailable" | undefined {
  const getSnapshot = useCallback(() => (token ? readView(token) : null), [token]);
  return useSyncExternalStore(subscribeToVisits, getSnapshot, () => undefined);
}
