// Remembers the text size chosen on the patient screen in browser storage, so it stays on this phone.
// Nothing else about the patient is stored.

import { useSyncExternalStore } from "react";
import { isTextSize, TEXT_SIZE_KEY, type TextSize } from "@/lib/textSize";

const listeners = new Set<() => void>();
let chosen: TextSize | undefined; // undefined = not read from storage yet

function read(): TextSize {
  if (chosen !== undefined) return chosen;
  try {
    const saved = window.localStorage.getItem(TEXT_SIZE_KEY);
    chosen = isTextSize(saved) ? saved : "normal";
  } catch {
    chosen = "normal"; // storage blocked: no remembered choice
  }
  return chosen;
}

/** Save the choice and tell every part of the screen that shows it. */
export function chooseTextSize(size: string): void {
  if (!isTextSize(size)) return;
  chosen = size;
  try {
    window.localStorage.setItem(TEXT_SIZE_KEY, size);
  } catch {
    // Storage blocked: the choice still works on this page, it just won't be remembered.
  }
  listeners.forEach((tell) => tell());
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** The text size chosen on this phone, or "normal" if none (also while the page is built on the server). */
export function useChosenTextSize(): TextSize {
  return useSyncExternalStore(subscribe, read, () => "normal");
}
