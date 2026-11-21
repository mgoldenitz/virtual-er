// The languages the app offers, and which one a patient's screen shows.
// "approved" turns true only after a fluent speaker has checked that language (SPEC);
// until then its screens show the draft notice.

export type LanguageInfo = {
  code: string;
  /** The language's name written in that language, so a patient can find their own. */
  name: string;
  /** The English name, shown beside the own-script name (some phone screen readers cannot read the script). */
  englishName: string;
  dir: "ltr" | "rtl";
  approved: boolean;
};

export const LANGUAGES: LanguageInfo[] = [
  { code: "en", name: "English", englishName: "English", dir: "ltr", approved: true },
  { code: "fr", name: "Français", englishName: "French", dir: "ltr", approved: false },
  { code: "ur", name: "اردو", englishName: "Urdu", dir: "rtl", approved: false },
  { code: "ar", name: "العربية", englishName: "Arabic", dir: "rtl", approved: false },
  { code: "zh", name: "中文（简体）", englishName: "Mandarin", dir: "ltr", approved: false },
];

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);

/** The browser storage key that remembers the language chosen on this phone. */
export const LANGUAGE_KEY = "vwr.language";

/** The "l=" part of a desk QR link. The head script (lib/languageScript.ts) uses the same rule. */
export const LINK_LANGUAGE_PATTERN = /[#&]l=([a-z]{2,3})(?:&|$)/;

/** The language's details; English for an unknown code. */
export function languageInfo(code: string | null | undefined): LanguageInfo {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

/** How a language is listed in a menu: its own name, then the English name, for example "اردو (Urdu)". */
export function menuLabel(info: LanguageInfo): string {
  return info.code === "en" ? info.name : `${info.name} (${info.englishName})`;
}

/**
 * The language carried by a desk QR link (the "l=" part after #), or null. The desk sets it from
 * the visit, so a patient who scans the slip sees their language even before the visit loads.
 */
export function linkLanguage(hash: string): string | null {
  const match = hash.match(LINK_LANGUAGE_PATTERN);
  return match && LANGUAGE_CODES.includes(match[1]) ? match[1] : null;
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
