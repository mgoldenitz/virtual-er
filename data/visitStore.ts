// Phase 1 stand-in for the database: keeps all visits in this browser's localStorage.
// Every tab of the same browser shares it, and other tabs hear about changes
// through the browser's "storage" event, so two tabs stay in sync without a server.

import { parseVisits } from "@/lib/parseVisits";
import type { Visit } from "@/lib/visit";

/**
 * What happened when something tried to change a visit:
 * saved, refused (the visit is gone or the step is not allowed now, for example a double click),
 * or not_saved (this browser could not store it, for example storage is full or blocked).
 */
export type ChangeResult = "saved" | "refused" | "not_saved";

const STORAGE_KEY = "vwr.visits.v1";
const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cachedVisits: Visit[] = [];

function safeGet(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** All visits, as one stable array until something changes. */
export function readVisits(): Visit[] {
  const raw = safeGet();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedVisits = parseVisits(raw);
  }
  return cachedVisits;
}

function writeVisits(visits: Visit[]): ChangeResult {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(visits));
  } catch {
    // Storage blocked (private mode, full disk): report it so the screen never claims success.
    return "not_saved";
  }
  listeners.forEach((notify) => notify()); // the "storage" event only reaches other tabs
  return "saved";
}

export function addVisit(visit: Visit): ChangeResult {
  return writeVisits([...readVisits(), visit]);
}

/** Apply one rule (from lib/visitActions) to one visit. */
export function updateVisit(id: string, step: (visit: Visit) => Visit | null): ChangeResult {
  const visits = readVisits();
  const current = visits.find((v) => v.id === id);
  if (!current) return "refused";
  const next = step(current);
  if (!next) return "refused";
  return writeVisits(visits.map((v) => (v.id === id ? next : v)));
}

/** Call `onChange` whenever visits change in this tab or another tab. Returns an unsubscribe. */
export function subscribeToVisits(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) onChange();
  };
  listeners.add(onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}
