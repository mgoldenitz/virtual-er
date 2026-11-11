// The languages the app offers, and which one a patient's screen shows.
// "approved" turns true only after a fluent speaker has checked that language (SPEC);
// until then its screens show the draft notice.

export type LanguageInfo = {
  code: string;
  /** The language's name written in that language, so a patient can find their own. */
  name: string;
  dir: "ltr" | "rtl";
  approved: boolean;
};

export const LANGUAGES: LanguageInfo[] = [
  { code: "en", name: "English", dir: "ltr", approved: true },
  { code: "fr", name: "Français", dir: "ltr", approved: false },
  { code: "ur", name: "اردو", dir: "rtl", approved: false },
  { code: "ar", name: "العربية", dir: "rtl", approved: false },
  { code: "zh", name: "中文（简体）", dir: "ltr", approved: false },
];

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);

/** The language's details; English for an unknown code. */
export function languageInfo(code: string | null | undefined): LanguageInfo {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

/**
 * The language a patient's screen shows: the one chosen on this phone, else the visit's own
 * language, else English. The phone's choice is known before the visit loads, so even the
 * loading screen and the 911 line are in the patient's language.
 */
export function patientLanguage(chosenOnPhone: string | null, visitLanguage: string | null | undefined): string {
  if (chosenOnPhone && LANGUAGE_CODES.includes(chosenOnPhone)) return chosenOnPhone;
  if (visitLanguage && LANGUAGE_CODES.includes(visitLanguage)) return visitLanguage;
  return "en";
}
