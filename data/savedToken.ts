// Remembers this phone's visit token in browser storage, so reopening the site
// brings the visit back without the patient typing anything.

import { isAccessToken, normalizeToken } from "@/lib/codes";

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

function forgetSavedToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage blocked: nothing was saved anyway.
  }
}

function decodeLinkPart(text: string): string | null {
  try {
    return decodeURIComponent(text);
  } catch {
    return null; // broken %-codes, for example a link cut short when typed
  }
}

/** The token to open (or null), and whether the link just opened was damaged. */
export type LinkResult = { token: string | null; brokenLink: boolean };

/**
 * Take a token from the link's #t=... part (never sent to a server), save it,
 * and remove it from the address bar. Falls back to the token saved earlier.
 * A damaged link opens no visit and also forgets the saved one, so neither now nor after a
 * refresh does the phone quietly show an older visit than the one the patient tried to open.
 */
export function takeTokenFromLink(): LinkResult {
  const match = window.location.hash.match(/[#&]t=([^&]*)/);
  if (!match) return { token: loadSavedToken(), brokenLink: false };
  window.history.replaceState(null, "", window.location.pathname);
  const decoded = decodeLinkPart(match[1]);
  const token = decoded === null ? null : normalizeToken(decoded);
  if (token === null || !isAccessToken(token)) {
    forgetSavedToken();
    return { token: null, brokenLink: true };
  }
  saveToken(token);
  return { token, brokenLink: false };
}

/** The link printed on the desk slip and carried by the QR code. */
export function patientLink(origin: string, token: string): string {
  return `${origin}/patient#t=${token}`;
}
