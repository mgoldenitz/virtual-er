// Phase 1 stand-in for the database: keeps all visits in this browser's localStorage.
// Every tab of the same browser shares it, and other tabs hear about changes
// through the browser's "storage" event, so two tabs stay in sync without a server.

import { parseVisits, type ParsedVisits } from "@/lib/parseVisits";
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
let cached: ParsedVisits = { visits: [], damaged: [], unreadable: false };
let cachedProblem: StorageProblem = { damaged: 0, unreadable: false };

/** Saved data this browser could not read: damaged entries, or saved text that is not a list at all. */
export type StorageProblem = { damaged: number; unreadable: boolean };

function safeGet(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function refresh(): void {
  const raw = safeGet();
  if (raw === cachedRaw) return;
  cachedRaw = raw;
  cached = parseVisits(raw);
  cachedProblem = { damaged: cached.damaged.length, unreadable: cached.unreadable };
}

/** All readable visits, as one stable array until something changes. */
export function readVisits(): Visit[] {
  refresh();
  return cached.visits;
}

/** What could not be read, as one stable object until something changes. */
export function readStorageProblem(): StorageProblem {
  refresh();
  return cachedProblem;
}

function writeVisits(visits: Visit[]): ChangeResult {
  refresh();
  // The saved text could not be read at all. Writing now would replace it, so nothing is saved
  // until staff choose "Start a new list", which keeps a backup copy first.
  if (cached.unreadable) return "not_saved";
  try {
    // Damaged entries are written back untouched, so saving never silently deletes them.
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...visits, ...cached.damaged]));
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

const BACKUP_PREFIX = "vwr.visits.v1.unreadable-backup.";

/**
 * Staff confirmed "Start a new list": copy the unreadable saved text to a backup key
 * (named with the time), then clear the list. If the backup cannot be stored, nothing is cleared.
 */
export function resetUnreadableStorage(): ChangeResult {
  refresh();
  if (!cached.unreadable || cachedRaw === null) return "refused";
  try {
    window.localStorage.setItem(BACKUP_PREFIX + new Date().toISOString(), cachedRaw);
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    return "not_saved";
  }
  listeners.forEach((notify) => notify());
  return "saved";
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
