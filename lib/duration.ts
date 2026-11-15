// How the staff screens show a number of minutes: "45 min" under an hour, "1h 35min" from an
// hour, and "2h" for whole hours. Staff text only (English); the patient wait range has its own
// words in lib/text/.

/** For example 45 gives "45 min", 95 gives "1h 35min", 120 gives "2h". A negative or broken number gives "0 min". */
export function formatMinutes(minutes: number): string {
  // TODO(human): turn `minutes` into the words above.
  return `${minutes} min`;
}
