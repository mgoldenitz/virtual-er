// Keeps one thing re-read from the database while a screen is showing it: now, as soon as
// the database signals a change (live updates), when the tab comes back or the connection
// returns, and on a timer in case a signal was missed. Used by the patient's visit and the
// staff list. Only one read runs at a time.

import { onChangeSignal } from "./changeSignal";

const RETRY_MS = 5_000; // sooner while reads are failing

/**
 * `read` reads once (it must never throw); `failing` says whether the last read failed.
 * Returns a function that stops the timer.
 */
export function keepFresh(read: () => Promise<void>, failing: () => boolean, everyMs: number): () => void {
  let stopped = false;
  let reading = false;
  let again = false; // something asked for a read while one was already on its way
  let timer: ReturnType<typeof setTimeout> | undefined;

  const readNow = async () => {
    if (stopped) return;
    if (reading) {
      again = true; // the read on its way may have started before this change, so read once more after it
      return;
    }
    reading = true;
    clearTimeout(timer);
    await read();
    reading = false;
    if (stopped) return;
    if (again && !failing()) {
      again = false;
      void readNow();
      return;
    }
    again = false;
    timer = setTimeout(readNow, failing() ? RETRY_MS : everyMs);
  };
  const onBack = () => {
    if (document.visibilityState === "visible") void readNow();
  };

  void readNow();
  document.addEventListener("visibilitychange", onBack);
  window.addEventListener("online", onBack);
  const stopListening = onChangeSignal(() => void readNow());
  return () => {
    stopped = true;
    stopListening();
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", onBack);
    window.removeEventListener("online", onBack);
  };
}
