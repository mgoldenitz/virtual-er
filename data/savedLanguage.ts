// Remembers the language chosen on this phone in browser storage, so every patient screen
// (even the loading screen, before the visit is read) opens in that language.
// Nothing else about the patient is stored.

import { useSyncExternalStore } from "react";
import { LANGUAGE_CODES } from "@/lib/text/languages";

const LANGUAGE_KEY = "vwr.language";
const listeners = new Set<() => void>();
let chosen: string | null | undefined; // undefined = not read from storage yet

function read(): string | null {
  if (chosen !== undefined) return chosen;
  try {
    const saved = window.localStorage.getItem(LANGUAGE_KEY);
    chosen = saved && LANGUAGE_CODES.includes(saved) ? saved : null;
  } catch {
    chosen = null; // storage blocked: no remembered choice
  }
  return chosen;
}

/** Save the choice and tell every part of the screen that shows text. */
export function chooseLanguage(code: string): void {
  if (!LANGUAGE_CODES.includes(code)) return;
  chosen = code;
  try {
    window.localStorage.setItem(LANGUAGE_KEY, code);
  } catch {
    // Storage blocked: the choice still works on this page, it just won't be remembered.
  }
  listeners.forEach((tell) => tell());
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** The language chosen on this phone, or null if none (also while the page is built on the server). */
export function useChosenLanguage(): string | null {
  return useSyncExternalStore(subscribe, read, () => null);
}
