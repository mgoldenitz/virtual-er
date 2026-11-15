// The shape of the hour and minute words for one language (the words are in en.ts, fr.ts and so on).
// Each word form holds "{n}" where the number goes. Arabic leaves "{n}" out for 1 and 2
// ("ساعة", "ساعتين"), because natural Arabic says the count with the word itself.

/**
 * Word forms named by the browser's plural rules (Intl.PluralRules): for example English uses
 * "one" (1) and "other" (2, 3, ...); Arabic also uses "two", "few" (3 to 10) and "many" (11 to 99).
 * "other" is always there, so a missing form falls back to it.
 */
export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

export type DurationWords = {
  /** The language code the plural rules use, for example "ar". */
  locale: string;
  hour: PluralForms;
  minute: PluralForms;
  /** Joins hours and minutes, for example "{h} {m}" or Arabic "{h} و{m}". */
  join: string;
  /**
   * Urdu only: the hour word when a whole hour is the low end of a range, just before "سے"
   * ("1 گھنٹے سے 2 گھنٹے"). Other languages leave it out and use `hour`.
   */
  hourLow?: PluralForms;
};
