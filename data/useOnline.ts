// Tells whether this phone or laptop has an internet connection, and updates when that changes.

import { useSyncExternalStore } from "react";

/**
 * Asks again when the connection changes, and also when the page comes back on screen: a phone
 * that was locked or in the background can miss the "online" and "offline" events.
 */
export function watchConnection(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

// While the page is built on the server there is no browser to ask, so assume online (no banner).
function getServerSnapshot(): boolean {
  return true;
}

/** True when the browser has a connection. Re-renders when the connection drops or comes back. */
export function useOnline(): boolean {
  return useSyncExternalStore(watchConnection, getSnapshot, getServerSnapshot);
}
