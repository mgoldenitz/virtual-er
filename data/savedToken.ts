// Remembers this phone's visit token in browser storage, so reopening the site
// brings the visit back without the patient typing anything.

import { isAccessToken, normalizeToken } from "@/lib/codes";
import { linkLanguage } from "@/lib/text/languages";

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

/** The token to open (or null), whether the link just opened was damaged, and the language it carried. */
export type LinkResult = { token: string | null; brokenLink: boolean; language: string | null };

/**
 * Take a token from the link's #t=... part (never sent to a server), save it,
 * and remove it from the address bar. Falls back to the token saved earlier.
 * A damaged link opens no visit and also forgets the saved one, so neither now nor after a
 * refresh does the phone quietly show an older visit than the one the patient tried to open.
 */
export function takeTokenFromLink(): LinkResult {
  const language = linkLanguage(window.location.hash);
  const match = window.location.hash.match(/[#&]t=([^&]*)/);
  if (!match) return { token: loadSavedToken(), brokenLink: false, language };
  window.history.replaceState(null, "", window.location.pathname);
  const decoded = decodeLinkPart(match[1]);
  const token = decoded === null ? null : normalizeToken(decoded);
  if (token === null || !isAccessToken(token)) {
    forgetSavedToken();
    return { token: null, brokenLink: true, language };
  }
  saveToken(token);
  return { token, brokenLink: false, language };
}

/**
 * The link printed on the desk slip and carried by the QR code. The QR link also carries the
 * visit's language (only a language code, never anything about the patient), so the phone shows
 * that language before the visit loads. The typed link leaves it out to stay short.
 */
export function patientLink(origin: string, token: string, language?: string): string {
  return `${origin}/patient#t=${token}${language ? `&l=${language}` : ""}`;
}
