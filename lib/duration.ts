// How the staff screens show a number of minutes: "45 min" under an hour, "1h 35min" from an
// hour, and "2h" for whole hours. Staff text only (English); the patient wait range has its own
// words in lib/text/.

/** For example 45 gives "45 min", 95 gives "1h 35min", 120 gives "2h". A negative or broken number gives "0 min". */
export function formatMinutes(minutes: number): string {
  // Clean the number first: a broken or negative number counts as 0, and part minutes are dropped.
  const whole = Number.isFinite(minutes) && minutes > 0 ? Math.floor(minutes) : 0;
  if (whole < 60) return `${whole} min`;
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}min`;
}
