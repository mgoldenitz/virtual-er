// Phase 1 stand-in for the database: keeps all visits in this browser's localStorage.
// Every tab of the same browser shares it, and other tabs hear about changes
// through the browser's "storage" event, so two tabs stay in sync without a server.

import type { Visit } from "@/lib/visit";

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
    try {
      cachedVisits = raw ? (JSON.parse(raw) as Visit[]) : [];
    } catch {
      cachedVisits = [];
    }
  }
  return cachedVisits;
}

function writeVisits(visits: Visit[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(visits));
  } catch {
    // Storage blocked (private mode, full disk): the demo can't save, but must not crash.
  }
  listeners.forEach((notify) => notify()); // the "storage" event only reaches other tabs
}

export function addVisit(visit: Visit): void {
  writeVisits([...readVisits(), visit]);
}

/**
 * Apply one rule (from lib/visitActions) to one visit.
 * Returns false when the visit is gone or the rule refused, for example a double click.
 */
export function updateVisit(id: string, step: (visit: Visit) => Visit | null): boolean {
  const visits = readVisits();
  const current = visits.find((v) => v.id === id);
  if (!current) return false;
  const next = step(current);
  if (!next) return false;
  writeVisits(visits.map((v) => (v.id === id ? next : v)));
  return true;
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
