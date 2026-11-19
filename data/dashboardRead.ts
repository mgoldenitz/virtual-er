// One job: read the staff dashboard's numbers from the database (today's daily_stats rows and the
// visits table, for demo or real visits), keep them in memory, and read them again like
// data/visitCache.ts does. It never reads access_token or code.

import type { DailyStatsRow, DashboardVisit } from "@/lib/dashboardNumbers";
import { torontoDay } from "@/lib/torontoDay";
import { keepFresh } from "./keepFresh";
import { serverNow } from "./serverClock";
import { supabaseBrowser } from "./supabaseBrowser";

/** `visits` is null until the first read works; `outOfDate` is true when the last read failed. */
export type DashboardData = {
  visits: DashboardVisit[] | null;
  stats: DailyStatsRow[];
  today: string;
  outOfDate: boolean;
};

export const EMPTY_DASHBOARD: DashboardData = { visits: null, stats: [], today: "", outOfDate: false };

// Only these visit fields are read. Nothing here may name access_token or code.
const VISIT_FIELDS =
  "site, source, ctas_level, status, removed_reason, created_at, triaged_at, offered_at, called_at, arrived_at, closed_at, survey_score, is_demo";
const REREAD_MS = 15_000; // in case a live update was missed

type Store = {
  data: DashboardData;
  key: string; // the JSON of the numbers, to tell when they really changed
  latest: number; // counts reads, so an old read cannot overwrite a newer one
  listeners: Set<() => void>;
  stopReading: (() => void) | null;
};

// One store for demo visits and one for real visits.
const stores = new Map<boolean, Store>();

function storeFor(isDemo: boolean): Store {
  let store = stores.get(isDemo);
  if (!store) {
    store = { data: EMPTY_DASHBOARD, key: "", latest: 0, listeners: new Set(), stopReading: null };
    stores.set(isDemo, store);
  }
  return store;
}

export function readDashboard(isDemo: boolean): DashboardData {
  return storeFor(isDemo).data;
}

function show(store: Store, next: DashboardData): void {
  const key = JSON.stringify([next.visits, next.stats, next.today]);
  const same = key === store.key;
  if (same && next.outOfDate === store.data.outOfDate) return;
  // Keep the old lists when the numbers did not change, so screens do not redraw for nothing.
  store.data = same ? { ...store.data, outOfDate: next.outOfDate } : next;
  store.key = key;
  store.listeners.forEach((tell) => tell());
}

/** Read today's numbers for one mode. Both reads must work, or the copy on screen is kept and marked out of date. */
export async function loadDashboard(isDemo: boolean): Promise<void> {
  const store = storeFor(isDemo);
  const thisLoad = ++store.latest;
  let next: DashboardData | null = null;
  try {
    const today = torontoDay(serverNow().toISOString());
    const db = supabaseBrowser();
    const [visitRead, statsRead] = await Promise.all([
      db.from("visits").select(VISIT_FIELDS).eq("is_demo", isDemo),
      db.from("daily_stats").select("*").eq("is_demo", isDemo).eq("day", today),
    ]);
    if (!visitRead.error && !statsRead.error && Array.isArray(visitRead.data) && Array.isArray(statsRead.data)) {
      next = {
        visits: visitRead.data as DashboardVisit[],
        stats: statsRead.data as DailyStatsRow[],
        today,
        outOfDate: false,
      };
    }
  } catch {
    // Treated like a failed read below.
  }
  if (thisLoad !== store.latest) return; // a newer read started; it wins
  if (next) show(store, next);
  else show(store, { ...store.data, outOfDate: true });
}

/**
 * While a dashboard is open: read now, on every live update, every 15 seconds, and when the tab
 * comes back. There is one timer per mode however many parts of the screen are listening.
 */
export function watchDashboard(isDemo: boolean, onChange: () => void): () => void {
  const store = storeFor(isDemo);
  store.listeners.add(onChange);
  if (!store.stopReading) {
    store.stopReading = keepFresh(() => loadDashboard(isDemo), () => store.data.outOfDate, REREAD_MS);
  }
  return () => {
    store.listeners.delete(onChange);
    if (store.listeners.size === 0 && store.stopReading) {
      store.stopReading();
      store.stopReading = null;
    }
  };
}
