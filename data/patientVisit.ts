// Everything a patient's phone may do, each as one narrow function that takes the token
// (SPEC rule 5). Patient screens use only this file, never visitStore directly,
// so Phase 2 can swap these for database functions without touching the screens.

import { useCallback, useSyncExternalStore } from "react";
import { patientViewFor, type PatientView } from "@/lib/patientView";
import { makeAccessToken, makeUniqueDisplayCode } from "@/lib/codes";
import type { Site } from "@/lib/visit";
import { confirmOnMyWay, markSeen, startFromHome } from "@/lib/visitActions";
import { saveToken } from "./savedToken";
import {
  addVisit,
  readVisits,
  storageMayHideToken,
  subscribeToVisits,
  updateVisit,
  type ChangeResult,
} from "./visitStore";

function idForToken(token: string): string | null {
  return readVisits().find((v) => v.access_token === token)?.id ?? null;
}

/**
 * Start a visit from home on the start page, and remember it on this phone.
 * Phase 1 stand-in for the rate-limited server route (SPEC rule 5): only this function sets
 * source = home and status = pre_arrival; the screen passes only the site and language.
 * Returns the new visit's token, or null if this browser could not save it.
 */
export function startVisitFromHome(site: Site, language: string): string | null {
  const taken = new Set(readVisits().map((v) => v.code));
  const visit = startFromHome(
    { id: crypto.randomUUID(), code: makeUniqueDisplayCode(taken), access_token: makeAccessToken(), site, language },
    new Date(),
  );
  if (addVisit(visit) !== "saved") return null;
  saveToken(visit.access_token);
  return visit.access_token;
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
