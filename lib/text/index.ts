// Picks the patient text for a language. A language without its own text yet gets English,
// so every screen always has every sentence (including the 911 line, SPEC rule 3).

import { en, type PatientText } from "./en";

export type { PatientText };

/** Text for each language the app has. Two more languages are added in Phase 3. */
const TEXT: Record<string, PatientText> = { en };

export function textFor(language: string | null | undefined): PatientText {
  return (language && TEXT[language]) || en;
}
