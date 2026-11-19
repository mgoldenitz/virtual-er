# Gemini Hydrogen 4, High: does each dashboard number have a clear definition?

Date: 2026-11-18. Use a new Gemini chat. Paste everything below the line.

---

You review a concept prototype of a virtual ER waiting room. Low-acuity patients (CTAS 4 or 5) wait off-site after triage and come back when staff recall them. Synthetic data only. The staff dashboard (/dashboard) is built. Your job is to find problems, not to confirm. Do not praise.

Question: for each number on the dashboard, is the definition clear and complete to a charge nurse or a manager who reads only the screen? And does the code count exactly what the SPEC text and the label say?

For each problem, give: the label, what is unclear or wrong, an example visit or situation where a reader would misread the number, and the smallest fix (a label change, a short note on the screen, or a code change). Put the problems in order, the most likely to mislead first. If a number has no problem, say "no problem" in one line. Do not suggest new numbers unless a current one cannot be read without one.

Points to look at (not a full list):

1. "Now" counts have no date test. A visit left `waiting` from yesterday still counts. Is that clear from "Now"?
2. Each "Today" number counts on the date of its own event (offered on `offered_at`, declined on `offered_at`, arrivals on `arrived_at`, no-shows on `closed_at`, started from home on `created_at`). So "Offered" can include a visit triaged yesterday, and "12 of 14 triaged" can mix two groups of visits. Can the share go over 100%? Is it read correctly?
3. "Accepted" is offered minus declined, so a visit that was offered and then left or was a no-show still counts as accepted.
4. "Reached triage" sits under "Started from home" in the list, with no visible tie to it.
5. "Average minutes from recall to arrival" leaves out an arrival with no `called_at` (a patient who came back before the recall).
6. Survey numbers count on `closed_at`, not on the time the patient answered.
7. The rounding: halves round up (12.5 minutes shows 13; 6.75 shows 6.8).

## Checked (output in this session or in docs/progress.md)

- 2026-11-18: 80 test files, 462 tests pass; lint passed; build passed (after the synthetic-visits test).
- 20 synthetic visits (Gemini 3.6 Flash, High) give the numbers that a hand count of the rules gives, for both sites, all shown values and the Demo switch (`lib/dashboardSynthetic.test.ts`).
- Browser, 2026-11-18, 23:20 Toronto, Demo view with the demo simulator running: every number on the screen agrees with a SQL count. Site A: waiting 9, recalled 2, offered 12 of 14 triaged (86%), accepted 11 of 12 offered (92%), declined 1, minutes "-" (0 visits). Site B: waiting 9, recalled 1, offered 13 of 14 (93%), accepted 12 of 13 (92%), declined 1, minutes 18 (2 visits), started from home 1, reached triage 1. At 390 px and at 200% text there is no sideways scroll.

## Not checked

- Survey numbers in a browser (the demo simulator writes no survey score). The synthetic test covers them.
- The "out of date" warning in a browser.
- `daily_stats` totals in a browser (visits are moved there after 24 hours; unit tests in `lib/dashboardNumbers.test.ts` cover the sum).

## Earlier review

A Gemini review of the metric definitions ran before the build (2026-11-18). Its outcome is the SPEC text below. Settled by the owner, so do not report these as faults: the Real / Demo switch, never mixed; the share offered uses CTAS 4 or 5 triaged today as its bottom number; a share with a bottom number of 0 shows "-"; "Left" counts on `closed_at`; the labels listed in the SPEC.

## SPEC text: /dashboard

```
A "Show" switch with two buttons, Real (first, and on when the page opens; not saved) and Demo. Real and demo visits are never mixed; daily_stats keeps them apart through its is_demo key. Demo Site A and Demo Site B are two columns; on a phone they stack.

"Now" (the visits in the table at this moment):

- Waiting off-site: status waiting.
- Recalled, not yet arrived: status called or on_the_way.
- Back for reassessment: status needs_reassessment.

"Today (since midnight, Toronto time)". Each number counts a visit on the America/Toronto date of its own event, and adds the daily_stats row for (today, site, is_demo) (hard rule 4):

- Offered off-site waiting: "8 of 10 triaged (80%)". Top: offered_at today. Bottom: CTAS 4 or 5 with triaged_at today.
- Accepted: "6 of 8 offered (75%)". Accepted is offered minus declined.
- Declined: status declined, on offered_at.
- Average minutes from recall to arrival: "14 (5 visits)". arrived_at minus called_at, over visits with status arrived and called_at set, on arrived_at. A desk arrival with no called_at stays out.
- No-shows (status removed, removed_reason no_show), Unable to reach (nurse confirmed) (status unable_to_reach), Left (status removed, removed_reason left): on closed_at.
- Started from home: source home, on created_at. Reached triage: those of them with triaged_at set.
- Survey responses, Average score (0 to 10), Scored 9 or 10: visits with a survey_score, on closed_at.

Percentages and minutes round to whole numbers; the average score rounds to one decimal place. A share or average whose bottom number is 0 shows "-" on screen, with the screen-reader text "no data yet".
```

SPEC hard rule 4 (short): visits older than 24 hours are deleted; just before that, each visit's numbers are added to `daily_stats` on the date of each event. The dashboard shows a day as the `daily_stats` totals plus the visits still in the table.

## The code

Line counts: `lib/dashboardNumbers.ts` 168, `lib/dashboardShare.ts` 23, `lib/torontoDay.ts` 14, `lib/visitCount.ts` 6, `components/dashboard/SiteNumbers.tsx` 84 (the screen labels).

### lib/dashboardNumbers.ts

```ts
// Counts the staff dashboard numbers for one day, per site: the live visits plus the daily_stats totals.
// Raw counts and sums only. Percentages and averages are worked out by another file.

import { torontoDay } from "./torontoDay";
import type { Site, Visit } from "./visit";

/** One row of daily_stats (see supabase/migrations/20261116100000_daily_stats_and_cleanup.sql). */
export type DailyStatsRow = {
  day: string;
  site: Site;
  is_demo: boolean;
  triaged_ctas_4_5: number;
  not_eligible: number;
  offered: number;
  declined: number;
  called_and_arrived: number;
  call_to_arrival_seconds: number;
  arrived: number;
  no_shows: number;
  removed_left: number;
  unable_to_reach: number;
  open_at_deletion: number;
  started_from_home: number;
  home_reached_triage: number;
  survey_responses: number;
  survey_score_sum: number;
  survey_9_or_10: number;
};

/** The visit fields the dashboard reads. */
export type DashboardVisit = Pick<
  Visit,
  | "site"
  | "source"
  | "ctas_level"
  | "status"
  | "removed_reason"
  | "created_at"
  | "triaged_at"
  | "offered_at"
  | "called_at"
  | "arrived_at"
  | "closed_at"
  | "survey_score"
  | "is_demo"
>;

/** Raw counts and sums for one site. */
export type SiteNumbers = {
  waitingNow: number;
  recalledNow: number;
  reassessmentNow: number;
  triaged: number;
  offered: number;
  declined: number;
  accepted: number;
  arrivedAfterRecall: number;
  recallToArrivalSeconds: number;
  noShows: number;
  unableToReach: number;
  left: number;
  startedFromHome: number;
  homeReachedTriage: number;
  surveyResponses: number;
  surveyScoreSum: number;
  survey9or10: number;
};

/** Counts every number for both sites. Only rows whose is_demo equals isDemo are used. */
export function dashboardNumbers(
  visits: DashboardVisit[],
  stats: DailyStatsRow[],
  today: string,
  isDemo: boolean,
): Record<Site, SiteNumbers> {
  return {
    A: siteNumbers("A", visits, stats, today, isDemo),
    B: siteNumbers("B", visits, stats, today, isDemo),
  };
}

function siteNumbers(
  site: Site,
  allVisits: DashboardVisit[],
  allStats: DailyStatsRow[],
  today: string,
  isDemo: boolean,
): SiteNumbers {
  const visits = allVisits.filter((v) => v.site === site && v.is_demo === isDemo);
  const stats = allStats.filter((s) => s.site === site && s.is_demo === isDemo && s.day === today);

  // True when this moment falls on today's Toronto date.
  const on = (iso: string | null): boolean => iso !== null && torontoDay(iso) === today;
  // Count the live visits that pass a test.
  const countVisits = (test: (v: DashboardVisit) => boolean): number => visits.filter(test).length;
  // Add up one daily_stats column over today's rows.
  const fromStats = (column: (s: DailyStatsRow) => number): number =>
    stats.reduce((total, s) => total + column(s), 0);

  // Visits that were called, then arrived today (the set behind the call-to-arrival average).
  const calledAndArrived = visits.filter(
    (v) => v.status === "arrived" && v.called_at !== null && on(v.arrived_at),
  );
  // Visits that answered a survey today (closed today with a score).
  const surveyed = visits.filter((v) => v.survey_score !== null && on(v.closed_at));
  // Visits started from home today.
  const startedHome = visits.filter((v) => v.source === "home" && on(v.created_at));

  const offered = countVisits((v) => on(v.offered_at)) + fromStats((s) => s.offered);
  const declined =
    countVisits((v) => v.status === "declined" && on(v.offered_at)) + fromStats((s) => s.declined);

  return {
    // Live now: no date test, because daily_stats has no "now" numbers.
    waitingNow: countVisits((v) => v.status === "waiting"),
    recalledNow: countVisits((v) => v.status === "called" || v.status === "on_the_way"),
    reassessmentNow: countVisits((v) => v.status === "needs_reassessment"),

    // CTAS 4 or 5 patients triaged today.
    triaged:
      countVisits((v) => (v.ctas_level === 4 || v.ctas_level === 5) && on(v.triaged_at)) +
      fromStats((s) => s.triaged_ctas_4_5),
    // Visits offered off-site waiting today.
    offered,
    // Offered today and then declined.
    declined,
    // Offered minus declined.
    accepted: offered - declined,

    // Called, then arrived today.
    arrivedAfterRecall: calledAndArrived.length + fromStats((s) => s.called_and_arrived),
    // Total seconds from call-back to arrival, rounded to whole seconds per visit.
    recallToArrivalSeconds:
      calledAndArrived.reduce((total, v) => total + secondsBetween(v.called_at, v.arrived_at), 0) +
      fromStats((s) => s.call_to_arrival_seconds),

    // Removed today as no-shows, or as left.
    noShows:
      countVisits((v) => v.status === "removed" && v.removed_reason === "no_show" && on(v.closed_at)) +
      fromStats((s) => s.no_shows),
    left:
      countVisits((v) => v.status === "removed" && v.removed_reason === "left" && on(v.closed_at)) +
      fromStats((s) => s.removed_left),
    // Confirmed unable to reach today.
    unableToReach:
      countVisits((v) => v.status === "unable_to_reach" && on(v.closed_at)) +
      fromStats((s) => s.unable_to_reach),

    // Started from home today, and of those, reached triage.
    startedFromHome: startedHome.length + fromStats((s) => s.started_from_home),
    homeReachedTriage:
      startedHome.filter((v) => v.triaged_at !== null).length + fromStats((s) => s.home_reached_triage),

    // Survey answers given today: the count, the score total, and the 9 or 10 scores.
    surveyResponses: surveyed.length + fromStats((s) => s.survey_responses),
    surveyScoreSum:
      surveyed.reduce((total, v) => total + (v.survey_score ?? 0), 0) + fromStats((s) => s.survey_score_sum),
    survey9or10:
      surveyed.filter((v) => v.survey_score === 9 || v.survey_score === 10).length +
      fromStats((s) => s.survey_9_or_10),
  };
}

// Whole seconds from one time to another (0 if either time is missing).
function secondsBetween(from: string | null, to: string | null): number {
  if (from === null || to === null) return 0;
  return Math.round((Date.parse(to) - Date.parse(from)) / 1000);
}
```

### lib/dashboardShare.ts

```ts
// Turns the dashboard's raw counts into the numbers people read: a whole percentage or a whole
// average. When the bottom number is 0 there is nothing to divide, so it gives null, and the
// screen shows "-" (with the screen-reader text "no data yet").

/** Whole minutes on average, for example 840 seconds over 1 visit gives 14. Null when count is 0. */
export function averageMinutes(totalSeconds: number, count: number): number | null {
  if (count === 0) return null;
  return Math.round(totalSeconds / count / 60);
}

/** The average survey score, rounded to one decimal place (for example 8.5). Null when count is 0. */
export function averageScore(scoreSum: number, count: number): number | null {
  if (count === 0) return null;
  return Math.round((scoreSum / count) * 10) / 10;
}

/** Whole percent of top in bottom, for example 8 of 10 gives 80. Null when bottom is 0. */
export function share(top: number, bottom: number): number | null {
  if (bottom === 0) return null;
  if (top === 0) return 0;
  if (top === bottom) return 100;
  return Math.round((top/bottom)*100);
}
```

### lib/torontoDay.ts

```ts
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
```

### lib/visitCount.ts

```ts
// Staff wording: a number of visits in plain words ("1 visit", "3 visits").

/** "1 visit", "2 visits", "0 visits". */
export function visitCount(n: number): string {
  return `${n} ${n === 1 ? "visit" : "visits"}`;
}
```

### components/dashboard/SiteNumbers.tsx

```tsx
// One site's dashboard numbers: the "Now" counts and the "Today" counts, as label and value pairs.
// A percentage or average with nothing to divide by shows a dash, read aloud as "no data yet".

import type { ReactNode } from "react";
import type { SiteNumbers as Counts } from "@/lib/dashboardNumbers";
import { averageMinutes, averageScore, share } from "@/lib/dashboardShare";
import { visitCount } from "@/lib/visitCount";

type Props = {
  site: "A" | "B";
  numbers: Counts;
};

/** The dash shown when a share or average has no data: seen as "-", read aloud as "no data yet". */
function NoData() {
  return (
    <>
      <span aria-hidden="true">-</span>
      <span className="sr-only">no data yet</span>
    </>
  );
}

/** A whole percent such as "80%", or the NoData dash (with no "%") when there is no data. */
function Percent({ value }: { value: number | null }) {
  return value === null ? <NoData /> : <>{value}%</>;
}

/** One label and value pair in the list. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-3 border-b border-slate-200 py-2">
      <dt className="font-semibold">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function SiteNumbers({ site, numbers: n }: Props) {
  const offeredShare = share(n.offered, n.triaged);
  const acceptedShare = share(n.accepted, n.offered);
  const minutes = averageMinutes(n.recallToArrivalSeconds, n.arrivedAfterRecall);
  const score = averageScore(n.surveyScoreSum, n.surveyResponses);
  const nineOrTenShare = share(n.survey9or10, n.surveyResponses);

  return (
    <section aria-labelledby={`site-${site}-heading`} className="glass-panel space-y-3">
      <h2 id={`site-${site}-heading`} className="text-xl font-bold">
        Demo Site {site}
      </h2>

      <h3 className="text-lg font-bold">Now</h3>
      <dl>
        <Row label="Waiting off-site">{n.waitingNow}</Row>
        <Row label="Recalled, not yet arrived">{n.recalledNow}</Row>
        <Row label="Back for reassessment">{n.reassessmentNow}</Row>
      </dl>

      <h3 className="text-lg font-bold">Today (since midnight, Toronto time)</h3>
      <dl>
        <Row label="Offered off-site waiting">
          {n.offered} of {n.triaged} triaged ({<Percent value={offeredShare} />})
        </Row>
        <Row label="Accepted">
          {n.accepted} of {n.offered} offered ({<Percent value={acceptedShare} />})
        </Row>
        <Row label="Declined">{n.declined}</Row>
        <Row label="Average minutes from recall to arrival">
          {minutes === null ? <NoData /> : minutes} ({visitCount(n.arrivedAfterRecall)})
        </Row>
        <Row label="No-shows">{n.noShows}</Row>
        <Row label="Unable to reach (nurse confirmed)">{n.unableToReach}</Row>
        <Row label="Left">{n.left}</Row>
        <Row label="Started from home">{n.startedFromHome}</Row>
        <Row label="Reached triage">{n.homeReachedTriage}</Row>
        <Row label="Survey responses">{n.surveyResponses}</Row>
        <Row label="Average score (0 to 10)">{score === null ? <NoData /> : score}</Row>
        <Row label="Scored 9 or 10">
          {n.survey9or10} ({<Percent value={nineOrTenShare} />})
        </Row>
      </dl>
    </section>
  );
}
```

