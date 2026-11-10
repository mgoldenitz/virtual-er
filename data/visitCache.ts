// The staff screens' copy of the visits: read from the database (row-level security lets only
// signed-in staff do this), held in memory, and read again on a timer, when the tab comes
// back, and after every staff action. Nothing here is saved in the browser.

import { ACTIVE_STATUSES, type Visit } from "@/lib/visit";
import { supabaseBrowser } from "./supabaseBrowser";

/** A visit as the database holds it: the version goes up by one on every change. */
export type StoredVisit = Visit & { version: number };

/** `visits` is null until the first read works; `outOfDate` is true when the last read failed. */
export type VisitList = { visits: StoredVisit[] | null; outOfDate: boolean };

export const EMPTY_LIST: VisitList = { visits: null, outOfDate: false };

const LIST_HOURS = 24; // plus everyone still in the line, however long ago they were triaged
const REREAD_MS = 15_000; // until live updates arrive in the next step
const RETRY_MS = 5_000; // sooner while reads are failing

let list: VisitList = EMPTY_LIST;
let visitsKey = "";
let latestLoad = 0;
const listeners = new Set<() => void>();

export function readVisitList(): VisitList {
  return list;
}

/** One visit from the copy on screen (with the version staff were looking at), or null. */
export function cachedVisit(id: string): StoredVisit | null {
  return list.visits?.find((v) => v.id === id) ?? null;
}

function show(visits: StoredVisit[] | null, outOfDate: boolean): void {
  // Keep the same list object until the visits really change: screens compare lists to
  // announce changes, and React does not redraw for nothing.
  const key = JSON.stringify(visits);
  const sameVisits = key === visitsKey;
  if (sameVisits && outOfDate === list.outOfDate) return;
  visitsKey = key;
  list = { visits: sameVisits ? list.visits : visits, outOfDate };
  listeners.forEach((tell) => tell());
}

/** Read the visits again: everyone still in the line, plus anything made or closed in the last 24 hours. */
export async function loadVisits(): Promise<void> {
  const thisLoad = ++latestLoad;
  const since = new Date(Date.now() - LIST_HOURS * 3_600_000).toISOString();
  let rows: StoredVisit[] | null = null;
  try {
    const { data, error } = await supabaseBrowser()
      .from("visits")
      .select("*")
      .or(`status.in.(${ACTIVE_STATUSES.join(",")}),created_at.gte."${since}",closed_at.gte."${since}"`);
    if (!error && Array.isArray(data)) rows = data as StoredVisit[];
  } catch {
    // Treated like any other failed read below.
  }
  if (thisLoad !== latestLoad) return; // a newer read or a saved change has happened since; it wins
  if (rows) show(rows, false);
  else show(list.visits, true); // keep what was on screen, marked as possibly out of date
}

/** Put one freshly saved or freshly read visit into the copy straight away, then read everything again. */
export function putVisit(visit: StoredVisit): void {
  const others = (list.visits ?? []).filter((v) => v.id !== visit.id);
  latestLoad++; // a read that started before this change must not put the old row back
  show([...others, visit], list.outOfDate);
  void loadVisits();
}

/** While a staff screen is open: read now, every 15 seconds, and when the tab comes back. */
export function watchVisits(onChange: () => void): () => void {
  listeners.add(onChange);
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const readNow = async () => {
    await loadVisits();
    if (stopped) return;
    clearTimeout(timer);
    timer = setTimeout(readNow, list.outOfDate ? RETRY_MS : REREAD_MS);
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
