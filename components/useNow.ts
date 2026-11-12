// Gives the current time (corrected to the server's clock, data/serverClock.ts) and refreshes
// it every 15 seconds, so "minutes waited" keeps counting.
// Returns null while the page is first built on the server, because the time must come from
// the viewer's browser, not from whenever the page happened to be built.

import { useSyncExternalStore } from "react";
import { serverNow } from "@/data/serverClock";

const EVERY_MS = 15_000;
let current: Date | null = null;

function subscribe(onTick: () => void): () => void {
  const timer = setInterval(() => {
    current = serverNow();
    onTick();
  }, EVERY_MS);
  return () => clearInterval(timer);
}

function getSnapshot(): Date {
  // Refresh if the stored time is missing or older than one tick (for example after sleep).
  if (!current || serverNow().getTime() - current.getTime() >= EVERY_MS) current = serverNow();
  return current;
}

export function useNow(): Date | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
