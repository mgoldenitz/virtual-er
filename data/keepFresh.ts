// Keeps one thing re-read from the database while a screen is showing it: now, on a timer,
// and when the tab comes back or the connection returns. Used by the patient's visit and the
// staff list until live updates are built. Only one read runs at a time.

const RETRY_MS = 5_000; // sooner while reads are failing

/**
 * `read` reads once (it must never throw); `failing` says whether the last read failed.
 * Returns a function that stops the timer.
 */
export function keepFresh(read: () => Promise<void>, failing: () => boolean, everyMs: number): () => void {
  let stopped = false;
  let reading = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const readNow = async () => {
    if (stopped || reading) return; // a read already on its way will bring the fresh answer
    reading = true;
    clearTimeout(timer);
    await read();
    reading = false;
    if (!stopped) timer = setTimeout(readNow, failing() ? RETRY_MS : everyMs);
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
    document.removeEventListener("visibilitychange", onBack);
    window.removeEventListener("online", onBack);
  };
}
