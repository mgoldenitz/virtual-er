// Turns a moment in time into its calendar date in Toronto (for example "2026-11-18"), so "today" on the dashboard means the clinic's day.

// Built once at module level, because making a formatter is slow and the settings never change.
const torontoFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Toronto",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** For example "2026-11-19T04:30:00.000Z" gives "2026-11-18", because that is 23:30 on the 18th in Toronto. */
export function torontoDay(iso: string): string {
  return torontoFormat.format(new Date(iso));
}
