// Whether off-site waiting is paused at each site, kept up to date for the start page and the
// staff screen: read from /api/site-status now, on every live update, when the tab comes back,
// and every minute. Staff turn the switch on or off with setSitePaused.

import { useSyncExternalStore } from "react";
import { parseSitePauses, type SitePauses } from "@/lib/sitePause";
import type { ChangeResult, Site } from "@/lib/visit";
import { keepFresh } from "./keepFresh";
import { supabaseBrowser } from "./supabaseBrowser";

/** `pauses` is null until the first read works; `failed` is true when the last read failed. */
export type PauseState = { pauses: SitePauses | null; failed: boolean };

const EMPTY: PauseState = { pauses: null, failed: false };
const REREAD_MS = 60_000;

let state: PauseState = EMPTY;
let stopReading: (() => void) | null = null;
const listeners = new Set<() => void>();

function show(next: PauseState): void {
  if (next.failed === state.failed && JSON.stringify(next.pauses) === JSON.stringify(state.pauses)) return;
  state = next;
  listeners.forEach((tell) => tell());
}

async function load(): Promise<void> {
  try {
    const answer = await fetch("/api/site-status", { cache: "no-store" });
    const pauses = answer.ok ? parseSitePauses(await answer.json()) : null;
    show(pauses ? { pauses, failed: false } : { pauses: state.pauses, failed: true });
  } catch {
    show({ pauses: state.pauses, failed: true });
  }
}

/** Read the pause switch again now, for example after the database refused a save because of a pause. */
export function reloadSitePauses(): Promise<void> {
  return load();
}

function watch(onChange: () => void): () => void {
  listeners.add(onChange);
  if (!stopReading) stopReading = keepFresh(load, () => state.failed, REREAD_MS);
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0 && stopReading) {
      stopReading();
      stopReading = null;
    }
  };
}

/** React hook: the pause switch for both sites, kept up to date. */
export function useSitePauses(): PauseState {
  return useSyncExternalStore(watch, () => state, () => EMPTY);
}

/**
 * Staff only (row-level security): pause or resume off-site waiting at one site. Saves only if
 * the switch is still as staff saw it, so two screens cannot undo each other's change unseen.
 * The database sets paused_at itself.
 */
export async function setSitePaused(site: Site, paused: boolean): Promise<ChangeResult> {
  try {
    const { data, error } = await supabaseBrowser()
      .from("site_settings")
      .update({ offsite_paused: paused })
      .eq("site", site)
      .eq("offsite_paused", !paused)
      .select("site");
    const result: ChangeResult = error || !Array.isArray(data) ? "not_saved" : data.length === 1 ? "saved" : "refused";
    // "saved" and "refused" both mean the database now holds `paused`, so show it at once.
    if (result !== "not_saved" && state.pauses) show({ pauses: { ...state.pauses, [site]: paused }, failed: state.failed });
    void load();
    return result;
  } catch {
    return "not_saved";
  }
}
