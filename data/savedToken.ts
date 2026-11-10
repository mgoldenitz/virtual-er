// Remembers this phone's visit token in browser storage, so reopening the site
// brings the visit back without the patient typing anything.

import { normalizeToken } from "@/lib/codes";

const TOKEN_KEY = "vwr.patientToken";

export function loadSavedToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Storage blocked: the visit still works in this tab, it just won't be remembered.
  }
}

/**
 * Take a token from the link's #t=... part (never sent to a server), save it,
 * and remove it from the address bar. Falls back to the token saved earlier.
 */
export function takeTokenFromLink(): string | null {
  const match = window.location.hash.match(/[#&]t=([^&]+)/);
  if (match) {
    const token = normalizeToken(decodeURIComponent(match[1]));
    saveToken(token);
    window.history.replaceState(null, "", window.location.pathname);
    return token;
  }
  return loadSavedToken();
}

/** The link printed on the desk slip and carried by the QR code. */
export function patientLink(origin: string, token: string): string {
  return `${origin}/patient#t=${token}`;
}
