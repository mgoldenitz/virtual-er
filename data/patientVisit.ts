// Everything a patient's phone may do, each as one narrow call that takes the token
// (SPEC rule 5). Patient screens use only this file. Reading the visit and the two patient
// steps go to the database functions; starting from home goes through the server route
// app/api/start-visit.

import { useCallback, useSyncExternalStore } from "react";
import { isAccessToken } from "@/lib/codes";
import { afterFailedRead } from "@/lib/failedRead";
import type { PatientView } from "@/lib/patientView";
import { patientViewFromRow, type PatientVisitRow } from "@/lib/patientViewFromRow";
import type { ChangeResult, Site } from "@/lib/visit";
import { keepFresh } from "./keepFresh";
import { saveToken } from "./savedToken";
import { supabaseBrowser } from "./supabaseBrowser";

/** saved = started and remembered on this phone; paused and busy = refused for now. */
export type StartResult = "saved" | "paused" | "busy" | "not_saved";

/**
 * Start a visit from home on the start page, and remember it on this phone.
 * The phone sends only the site and language to the server route, which makes the code and
 * token and asks the database; the database sets source = home and status = pre_arrival.
 */
export async function startVisitFromHome(site: Site, language: string): Promise<StartResult> {
  try {
    const response = await fetch("/api/start-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ site, language }),
    });
    const answer: unknown = await response.json();
    const { result, token } = (answer ?? {}) as { result?: unknown; token?: unknown };
    if (result === "paused" || result === "busy") return result;
    if (result !== "saved" || typeof token !== "string" || !isAccessToken(token)) return "not_saved";
    saveToken(token);
    return "saved";
  } catch {
    return "not_saved";
  }
}

/** A visit, null if the token matches no visit, or "unavailable" if it could not be read. */
type Shown = PatientView | null | "unavailable";

const REREAD_MS = 15_000; // until live updates arrive in the next step

// What each token last showed, kept in memory only (nothing about the visit is saved on the phone).
type Entry = {
  shown?: Shown;
  key: string;
  failures: number;
  latestRead: number;
  watchers: number;
  stopReading?: () => void;
};
const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();

function entryFor(token: string): Entry {
  let entry = entries.get(token);
  if (!entry) {
    entry = { key: "", failures: 0, latestRead: 0, watchers: 0 };
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

/**
 * While a screen is showing this token: read now, every 15 seconds, and when the tab comes back.
 * There is one timer per token however many parts of the screen are listening.
 */
function watch(token: string | null, onChange: () => void): () => void {
  if (!token) return () => {};
  listeners.add(onChange);
  const entry = entryFor(token);
  entry.watchers++;
  if (!entry.stopReading) {
    entry.stopReading = keepFresh(() => refreshPatientView(token), () => entry.failures > 0, REREAD_MS);
  }
  return () => {
    listeners.delete(onChange);
    entry.watchers--;
    if (entry.watchers === 0 && entry.stopReading) {
      entry.stopReading();
      entry.stopReading = undefined;
    }
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
