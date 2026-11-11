// Picks the patient text for a language. A language without its own text gets English,
// so every screen always has every sentence (including the 911 line, SPEC rule 3).

import { ar } from "./ar";
import { en, type PatientText } from "./en";
import { fr } from "./fr";
import { ur } from "./ur";
import { zh } from "./zh";

export type { PatientText };

/** Text for each language the app offers (lib/text/languages.ts lists them). */
const TEXT: Record<string, PatientText> = { en, fr, ur, ar, zh };

/** Puts values into a sentence's {braces}, for example fill("{low} to {high} minutes", { low: 40, high: 60 }). */
export function fill(sentence: string, values: Record<string, string | number>): string {
  return sentence.replace(/\{(\w+)\}/g, (whole, name: string) => (name in values ? String(values[name]) : whole));
}

export function textFor(language: string | null | undefined): PatientText {
  return (language && TEXT[language]) || en;
}
