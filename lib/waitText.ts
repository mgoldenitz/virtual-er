// Turns a number of minutes into words a patient reads ("1 hour 35 minutes"), and builds the
// wait range line in the patient's language ("45 minutes to 1 hour 20 minutes").

import { fill, textFor } from "./text";
import { arDuration } from "./text/ar";
import type { DurationWords, PluralForms } from "./text/durationWords";
import { enDuration } from "./text/en";
import { frDuration } from "./text/fr";
import { urDuration } from "./text/ur";
import { zhDuration } from "./text/zh";

/** Hour and minute words for each language. A language without its own words gets English, as in textFor(). */
const WORDS: Record<string, DurationWords> = { en: enDuration, fr: frDuration, ur: urDuration, ar: arDuration, zh: zhDuration };

/** Picks the right word form for the number n and puts n in it, for example (forms, 3, "ar") gives "3 ساعات". */
function pickForm(forms: PluralForms, n: number, locale: string): string {
  const form = forms[new Intl.PluralRules(locale).select(n)] ?? forms.other;
  return fill(form, { n });
}

/**
 * Minutes in words: 45 gives "45 minutes", 95 gives "1 hour 35 minutes", 120 gives "2 hours".
 * `end` is "low" when the result is the low end of a range (Urdu uses another hour word there
 * when there are no minutes). A negative or broken number counts as 0, as in formatMinutes().
 */
export function formatDuration(minutes: number, words: DurationWords, end: "low" | "high" = "high"): string {
  const whole = Number.isFinite(minutes) && minutes > 0 ? Math.floor(minutes) : 0;
  if (whole < 60) return pickForm(words.minute, whole, words.locale);
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;
  const hourForms = end === "low" && rest === 0 ? (words.hourLow ?? words.hour) : words.hour;
  const hourText = pickForm(hourForms, hours, words.locale);
  if (rest === 0) return hourText;
  return fill(words.join, { h: hourText, m: pickForm(words.minute, rest, words.locale) });
}

/**
 * The wait range line: "20 to 45 minutes" under an hour, else both ends in hours and minutes.
 * Under an hour the minute word follows the high number only, so Arabic gets the right form
 * for it ("من 5 إلى 10 دقائق", but "من 10 إلى 15 دقيقة").
 */
export function formatWaitRange(low: number, high: number, language: string | null | undefined): string {
  const t = textFor(language).patient;
  const words = (language && WORDS[language]) || enDuration;
  if (high < 60) return fill(t.waitRangeLong, { low, high: formatDuration(high, words) });
  return fill(t.waitRangeLong, { low: formatDuration(low, words, "low"), high: formatDuration(high, words, "high") });
}