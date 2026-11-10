// Everything a patient's phone may do, each as one narrow call that takes the token
// (SPEC rule 5). Patient screens use only this file. Reading the visit and the two patient
// steps go to the database functions; starting from home still uses browser storage until
// the server route is built (step B of the storage plan).

import { useCallback, useSyncExternalStore } from "react";
import { makeAccessToken, makeUniqueDisplayCode } from "@/lib/codes";
import { afterFailedRead } from "@/lib/failedRead";
import type { PatientView } from "@/lib/patientView";
import { patientViewFromRow, type PatientVisitRow } from "@/lib/patientViewFromRow";
import type { Site } from "@/lib/visit";
import { startFromHome } from "@/lib/visitActions";
import { saveToken } from "./savedToken";
import { supabaseBrowser } from "./supabaseBrowser";
import { addVisit, readVisits, type ChangeResult } from "./visitStore";

/**
 * Start a visit from home on the start page, and remember it on this phone.
 * Still the Phase 1 stand-in (browser storage) until step B replaces it with the server route.
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

/** A visit, null if the token matches no visit, or "unavailable" if it could not be read. */
type Shown = PatientView | null | "unavailable";

const REREAD_MS = 30_000; // until live updates arrive in the next step
const RETRY_MS = 5_000; // sooner while reads are failing

// What each token last showed, kept in memory only (nothing about the visit is saved on the phone).
type Entry = { shown?: Shown; key: string; failures: number; latestRead: number };
const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();

function entryFor(token: string): Entry {
  let entry = entries.get(token);
  if (!entry) {
    entry = { key: "", failures: 0, latestRead: 0 };
    entries.set(token, entry);
  }
  return entry;
}

async function readFromDatabase(token: string): Promise<PatientView | null | "failed"> {
  try {
    const { data, error } = await supabaseBrowser().rpc("get_patient_visit", { p_token: token });
    if (error || !Array.isArray(data)) return "failed";
    return data.length === 0 ? null : patientViewFromRow(data[0] as PatientVisitRow);
  } catch {
    return "failed";
  }
}

/** Read the visit again and tell the screens if anything changed. */
async function refreshPatientView(token: string): Promise<void> {
  const entry = entryFor(token);
  const thisRead = ++entry.latestRead;
  const read = await readFromDatabase(token);
  if (thisRead !== entry.latestRead) return; // a newer read has started; its answer wins
  entry.failures = read === "failed" ? entry.failures + 1 : 0;
  const next = read === "failed" ? afterFailedRead(entry.shown, entry.failures) : read;
  // Keep the same object until the view really changes, so React does not redraw for nothing.
  const key = JSON.stringify(next);
  if (entry.shown !== undefined && key === entry.key) return;
  entry.key = key;
  entry.shown = next;
  listeners.forEach((tell) => tell());
}

/** While a screen is showing this token: read now, every 30 seconds, and when the tab comes back. */
function watch(token: string | null, onChange: () => void): () => void {
  if (!token) return () => {};
  listeners.add(onChange);
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const readNow = async () => {
    await refreshPatientView(token);
    if (stopped) return;
    clearTimeout(timer);
    timer = setTimeout(readNow, entryFor(token).failures > 0 ? RETRY_MS : REREAD_MS);
  };
  const onBack = () => {
    if (document.visibilityState === "visible") void readNow();
  };
  void readNow();
  document.addEventListener("visibilitychange", onBack);
  window.addEventListener("online", onBack);
  return () => {
    stopped = true;
    clearTimeout(timer);
    listeners.delete(onChange);
    document.removeEventListener("visibilitychange", onBack);
    window.removeEventListener("online", onBack);
  };
}

/**
 * The patient view for one token, read through the database function get_patient_visit.
 * Returns undefined while loading, null if the token matches no visit, and "unavailable"
 * if the visit could not be read (so the screen never says "no visit" because of an error).
 */
export function usePatientView(token: string | null): Shown | undefined {
  const subscribe = useCallback((onChange: () => void) => watch(token, onChange), [token]);
  const getSnapshot = useCallback(() => (token ? entries.get(token)?.shown : null), [token]);
  return useSyncExternalStore(subscribe, getSnapshot, () => undefined);
}

/** Saved = the step was recorded; refused = not allowed now; not_saved = could not reach the database. */
async function patientStep(step: "record_seen" | "confirm_on_my_way", token: string): Promise<ChangeResult> {
  try {
    const { data, error } = await supabaseBrowser().rpc(step, { p_token: token });
    if (error || typeof data !== "boolean") return "not_saved";
    await refreshPatientView(token); // show the result straight away
    return data ? "saved" : "refused";
  } catch {
    return "not_saved";
  }
}

/** Record that the called screen was shown. Only while called, and only once. */
export function recordSeen(token: string): Promise<ChangeResult> {
  return patientStep("record_seen", token);
}

/** The patient taps "I'm on my way". Only while called. */
export function confirmOnMyWayByToken(token: string): Promise<ChangeResult> {
  return patientStep("confirm_on_my_way", token);
}
