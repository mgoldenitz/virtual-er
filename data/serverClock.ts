// Keeps this device's clock in step with the server's: asks /api/time when first needed and
// again every 10 minutes, and gives the corrected time. If the server cannot be asked, the
// device's own clock is used (the database's safety limit on pauses still applies).

import { clockOffset } from "@/lib/clockOffset";

const RESYNC_MS = 10 * 60_000;
/** After a failed try, wait this long before asking again. */
const RETRY_MS = 60_000;

let offsetMs = 0;
let lastSync = -Infinity;
let lastTry = -Infinity;
let syncing = false;

async function sync(): Promise<void> {
  syncing = true;
  lastTry = Date.now();
  try {
    const sentAt = Date.now();
    const answer = await fetch("/api/time", { cache: "no-store" });
    const receivedAt = Date.now();
    if (!answer.ok) return;
    const { now } = (await answer.json()) as { now: number };
    const offset = clockOffset(sentAt, Number(now), receivedAt);
    if (offset !== null) {
      offsetMs = offset;
      lastSync = receivedAt;
    }
  } catch {
    // Offline or the server could not be reached: keep the last offset.
  } finally {
    syncing = false;
  }
}

/** Ask the server for its time if that has not been done in the last 10 minutes (browser only). */
function syncClock(): void {
  if (typeof window === "undefined" || syncing) return;
  if (Date.now() - lastSync < RESYNC_MS || Date.now() - lastTry < RETRY_MS) return;
  void sync();
}

/** The current time by the server's clock (as best known). */
export function serverNow(): Date {
  syncClock();
  return new Date(Date.now() + offsetMs);
}
