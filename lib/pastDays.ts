// Gives the 7 calendar dates before a Toronto date, oldest first, for the dashboard trend view.

const DAY_MS = 24 * 60 * 60 * 1000;

/** For example "2026-11-21" gives "2026-11-14" to "2026-11-20". The day itself is not in the list. */
export function pastDays(day: string): string[] {
  // The date is only a label, so it is read as midnight UTC: UTC has no clock change, so each day is exactly 24 hours.
  const start = Date.parse(`${day}T00:00:00Z`);
  const days: string[] = [];
  for (let back = 7; back >= 1; back--) {
    days.push(new Date(start - back * DAY_MS).toISOString().slice(0, 10));
  }
  return days;
}
