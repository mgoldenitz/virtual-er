# Gemini review: simulated wait range default (2026-11-18)

Model: Gemini Hydrogen 4, High, in a new chat. If no Hydrogen 4 credits: Gemini 3.6 Flash, High.

## Prompt to paste

You review a small change in a concept prototype of a virtual ER waiting room (synthetic data only, no hospital systems). Find problems. Do not confirm that the change is good.

Rule: the wait range a patient sees is simulated. It must never use a real hospital's numbers (SPEC rule 8). It is tied only to place in line and the average gap between recent call-backs.

What changed (commits ca958e9 and cab4248, branch phase4-dashboard):

- `DEFAULT_GAP_MINUTES = 15` moved from `lib/queue.ts` to `lib/demoTimes.ts` (the file that holds all the demo's placeholder times). `lib/queue.ts` and `lib/patientViewFromRow.ts` now import it from there. The value did not change.
- New test in `lib/queue.test.ts`: place 10 gives 120 to 190 minutes at a 15-minute gap, and 135 to 215 at 17.

Changed files and their line counts after the change: `lib/demoTimes.ts` 30, `lib/queue.ts` 74, `lib/patientViewFromRow.ts` (import line only), `lib/queue.test.ts` 111.

Added to `lib/demoTimes.ts`:

```ts
// Wait range (SPEC rule 8: simulated, never a hospital's real numbers).

/** Simulated minutes per place in line, used until a site has 2 call-backs in its history. */
export const DEFAULT_GAP_MINUTES = 15;
```

Helpers the changed lines call (in `lib/queue.ts`, not changed):

```ts
export const MIN_GAP_MINUTES = 5;

export function averageCallGap(visits: Visit[], site: Site): number {
  const times = visits
    .filter((v) => v.site === site && v.called_at)
    .map((v) => new Date(v.called_at!).getTime())
    .sort((a, b) => a - b)
    .slice(-6); // 6 call-backs give 5 gaps
  if (times.length < 2) return DEFAULT_GAP_MINUTES;
  const gaps = times.slice(1).map((t, i) => (t - times[i]) / 60_000);
  const avg = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;
  return Math.max(avg, MIN_GAP_MINUTES);
}

export function waitRange(place: number, gapMinutes: number): { low: number; high: number } {
  const middle = place * gapMinutes;
  const low = Math.max(5, Math.floor((middle * 0.8) / 5) * 5);
  const high = Math.max(low + 5, Math.ceil((middle * 1.25) / 5) * 5);
  return { low, high };
}
```

In `lib/patientViewFromRow.ts`, the patient screen uses the database's gap (whole minutes, null with fewer than 2 call-back moments in the last 3 hours):

```ts
const gap = Math.max(row.average_gap_minutes ?? DEFAULT_GAP_MINUTES, MIN_GAP_MINUTES);
```

New test:

```ts
it("gives a 2 to 3 hour range behind a full demo line", () => {
  expect(waitRange(10, 15)).toEqual({ low: 120, high: 190 }); // 9 ahead, default gap
  // Live demo gap on 2026-11-18: 16.7 minutes, which get_patient_visit rounds to 17.
  expect(waitRange(10, 17)).toEqual({ low: 135, high: 215 });
});
```

Questions:
1. Is any of the test's expected numbers wrong? Work each one out.
2. Is there a way the moved constant can now give a different value or a circular import?
3. Does `lib/demoTimes.ts` look like a place for real clinical numbers, so that someone could later put a hospital's real figure there? Suggest a fix if yes.

## Checked (output in this session)

- `npm test`: 80 test files, 463 tests pass. `npm run lint`: passed. `npm run build`: passed.
- SQL (read-only) at about 23:45 Toronto: site A 9 waiting, site B 10 waiting, average call-back gap 16.7 minutes at both sites.
- `supabase/migrations/20261116000000_wait_gap_distinct_moments.sql` line 52 rounds the gap to whole minutes.

## Not checked

- The range on a patient screen in a browser (needs a visit token; demo visits have none that Claude can use).
