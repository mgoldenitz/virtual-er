# Gemini review: the dashboard analysis views (trend, wait bands, funnel, CSV)

Model: Gemini Hydrogen 4, High, in a new chat. If there are no Hydrogen 4 credits: Gemini 3.6 Flash, High.

## What to paste into Gemini

Paste this whole file, from "Prompt" to the end of "Helpers that the changed lines call". It has no keys, tokens, passwords or real patient data. The codes and tokens in the SQL check (`ZZZZ...`) are synthetic.

## Prompt

You review a change to a concept prototype: a virtual ER waiting room for low-acuity patients (CTAS 4 or 5). It uses Next.js App Router, Supabase (Postgres, row-level security) and Vitest. Synthetic data only. Find problems. Do not confirm that the code is good. For each problem, give the file and line, what goes wrong, a small example (input and the wrong output), and the smallest fix. Say how sure you are (high, medium, low). If you find no problem in an area, say "none found" for that area.

### What the change does

The staff dashboard gets 4 new parts:

1. New numbers per site for today: Recalled, "Average minutes from offer to recall", and 4 wait bands ("Under 30 minutes", "30 to 59 minutes", "60 to 119 minutes", "120 minutes or more").
2. A trend table per site: the 7 dates before today, oldest first.
3. A funnel of today's counts, 8 steps, counts only.
4. A CSV download of the past 7 days (not today), for the mode on screen (Real or Demo).

Visits are deleted 24 hours after `created_at`. Before the delete, `delete_old_visits()` adds each visit's events to `daily_stats` (one row per Toronto date, site and demo flag). The dashboard adds live visits and `daily_stats` rows for each date.

### The definitions (SPEC, owner-approved 2026-11-20)

- Recalled: `called_at` and `offered_at` set, counted on the Toronto date of `called_at`. A visit is called only once. All recalled visits count, also when they later became `needs_reassessment`, `no_show` or `unable_to_reach`.
- Average minutes from offer to recall: "52 (7 visits)". `called_at` minus `offered_at`, over the Recalled visits, on `called_at`. It starts at `offered_at`, because a declined-to-waiting switch moves `offered_at` to the switch time. Patients still waiting are not in it.
- Wait bands: the same visits, by whole minutes rounded like the average.
- Average minutes from recall to arrival (existing): `arrived_at` minus `called_at`, over visits with status `arrived` and `called_at` set, on `arrived_at`.
- "Past 7 days": the 7 dates before today, each counted by the same rules as "Today". A share shows its count ("8 of 10 (80%)"), and an average shows its count in brackets. The wait numbers start on the date their migration runs. A day before that date shows "-" with the note "Wait numbers start on <date>."
- The funnel (Started from home, Reached triage, Triaged CTAS 4 or 5, Offered, Accepted, Recalled, Arrived after recall, Answered survey) shows counts only, with the line "Each row counts what happened today. Desk patients join at Triaged, and some patients come back before a recall, so a lower row can be larger."
- The CSV has the same numbers plus the raw counts, has empty cells before the start date, and does not include today, codes, tokens or visit times.

### Settled decisions (do not report these as faults)

- The wait starts at `offered_at`, not `triaged_at` (owner, 2026-11-20, after an earlier Gemini review of the definitions).
- Rounding: first to whole seconds, then `round(seconds / 60)` for the band. Same in SQL (`20261120030000_wait_and_recall_stats.sql`, the 4 `wait_` event lines) and in `lib/waitBand.ts:9`. The average uses `averageMinutes` (total seconds / count / 60, rounded).
- The funnel has no percent (owner, 2026-11-20). `lib/funnelSteps.ts:1`.
- `WAIT_START_DAY = "2026-11-21"` (`lib/waitStart.ts:2`): the first full day after the migration ran.
- The 2 dashboard reads (visits and `daily_stats`) can count a visit twice for up to 15 seconds when the clean-up runs between them. Accepted, with a known-issues line (owner, 2026-11-20).
- `pastDays` uses UTC date math on the date label (`lib/pastDays.ts:8`). Tests cover both 2026 clock changes.
- Site headings say "Demo Site A" and "Demo Site B" in both modes. This is the existing site name style (`components/dashboard/SiteNumbers.tsx:26`); the sites are made-up.
- `lib/summaryInput.ts`: the 6 new fields do not go to Claude yet (`SummarySite`, line 7). Adding them is the next step, with its own review.
- The table scroll box has `role="region"`, an `aria-label` and `tabIndex={0}` so a keyboard user can scroll it (`components/dashboard/TrendTable.tsx:63`). `relative` keeps the `sr-only` words inside it (a 390 px page went 569 px wide without it).
- `hasPastData` looks only at event counts (`lib/trendNumbers.ts:42`): the other fields only grow when one of those grows.
- CSV line ends are CRLF (`lib/dashboardCsv.ts:42`).
- The check files pause the triggers `visits_before_write` and `visits_check_step` inside `begin ... rollback`, so they can insert visits with old times and late statuses. Step rules have their own check (`allowed_steps.sql`).

### Questions

1. Definitions against code: does each number in `lib/dashboardNumbers.ts` and in `delete_old_visits()` match the definitions above? Look for a visit that counts in one place and not in the other (live versus `daily_stats`), on a different date, or in a different band.
2. Rounding at the band edges: is there any seconds value where `waitBand` in TypeScript and the SQL `round(round(extract(epoch ...)) / 60)` give different bands? Note that JavaScript `Math.round` rounds .5 up toward +infinity and Postgres `round(numeric)` rounds .5 away from zero; the waits are never negative in normal use, but say if a negative wait (clock error) can reach the bands.
3. The migration: is anything in the old body lost or changed? Is the `on conflict` update complete for the 6 new columns? Is `security definer` with `search_path = ''` and the `revoke` correct?
4. The trend: does `trendNumbers` count each past day by the same rules as today? Can a visit that is still live (not yet deleted) count on a past date, and is that right?
5. The CSV: wrong column order, a header that does not match the cells, a value that can contain a comma or a line end, or a spreadsheet risk (a cell that starts with `=`, `+`, `-` or `@`)?
6. Labels and screens: is any label unclear to ER staff, or does it say something the number does not mean? Is any state missing (no data, first day, only demo data, a day before the start date)? Any accessibility fault in the table, the funnel list, the dash with "no data yet", or the download button?
7. Tests that the check files miss: name one synthetic visit that would show a fault the 10 new visits in `daily_stats.sql` do not cover.

## Checked (output in this session or in docs/progress.md)

- `supabase/checks/daily_stats.sql` in the Supabase SQL Editor, after the migration: 7 of 7 rows as expected (owner ran it).
- `supabase/checks/wait_gap.sql`: 5 of 5 rows as expected (owner ran it).
- `npm test`: 106 test files, 655 tests pass at the end of this change (107 files, 671 tests after a later survey fix). `npm run lint` passed. `npm run build` passed.
- Each new lib function had its test first, seen to fail, then the code.
- Playwright on `/dashboard`, Demo on: at 1280 px all parts show, no NaN, no console errors. At 390 px the page is 375 px wide after the `relative` fix.
- The CSV from the button (`virtual-er-stats-demo-2026-11-21.csv`): the 2026-11-20 rows match the tables (A `20,20,100,19,9,25`, B `21,21,100,19,7,24`); wait cells are empty before 2026-11-21.
- Gemini 3.6 Flash wrote 18 synthetic visits with expected numbers; Claude checked each number by hand, all agree; `lib/waitSynthetic.test.ts` (4 tests) passes.

## Not checked

- The CSV opened in a spreadsheet program (Excel or LibreOffice).
- The change on the Vercel deployment.
- A screen reader on the trend table and the funnel.
- A real night of the clean-up job with the new columns (only the rollback check ran).

## Line counts of the changed files (after the change, test files left out)

- `components/dashboard/CsvButton.tsx` 34 (new)
- `components/dashboard/DashboardView.tsx` 58
- `components/dashboard/FunnelView.tsx` 40 (new)
- `components/dashboard/NumberParts.tsx` 33 (new)
- `components/dashboard/SiteNumbers.tsx` 68
- `components/dashboard/TrendTable.tsx` 93 (new)
- `components/dashboard/WaitBands.tsx` 18 (new)
- `data/dashboardRead.ts` 105
- `lib/dashboardCsv.ts` 43 (new)
- `lib/dashboardNumbers.ts` 196
- `lib/funnelSteps.ts` 19 (new)
- `lib/pastDays.ts` 14 (new)
- `lib/summaryInput.ts` 51
- `lib/trendNumbers.ts` 41 (new)
- `lib/visitCount.ts` 11
- `lib/waitBand.ts` 14 (new)
- `lib/waitStart.ts` 2 (new)
- `supabase/checks/daily_stats.sql` 280
- `supabase/checks/wait_gap.sql` 85
- `supabase/migrations/20261120030000_wait_and_recall_stats.sql` 181 (new)

The tests (16 files, not pasted): `CsvButton.click.test.tsx`, `FunnelView.test.tsx`, `SiteNumbers.test.tsx`, `TrendTable.test.tsx`, `dashboardRead.test.ts`, `dashboardCsv.test.ts`, `dashboardNumbers.test.ts`, `dashboardSynthetic.test.ts`, `dashboardWait.test.ts`, `funnelSteps.test.ts`, `pastDays.test.ts`, `summaryPrompt.test.ts`, `trendNumbers.test.ts`, `visitCount.test.ts`, `waitBand.test.ts`, `waitSynthetic.test.ts`.

## The diff (code and database, test files left out)

```diff
diff --git a/components/dashboard/CsvButton.tsx b/components/dashboard/CsvButton.tsx
new file mode 100644
--- /dev/null
+++ b/components/dashboard/CsvButton.tsx
@@ -0,0 +1,34 @@
+"use client";
+
+// The "Download past 7 days (CSV)" button. It makes the CSV text in the browser and saves it as a file.
+// When no past day has a number, a short line shows instead of the button.
+
+import { Button } from "@/components/Button";
+import { dashboardCsv } from "@/lib/dashboardCsv";
+import { hasPastData, trendCsvRows, type TrendDay } from "@/lib/trendNumbers";
+
+type Props = { trend: TrendDay[]; today: string; isDemo: boolean };
+
+export function CsvButton({ trend, today, isDemo }: Props) {
+  if (!hasPastData(trend)) {
+    return <p className="text-sm">No past days to download yet.</p>;
+  }
+
+  function download() {
+    const text = dashboardCsv(trendCsvRows(trend), isDemo);
+    const file = new Blob([text], { type: "text/csv;charset=utf-8" });
+    const url = URL.createObjectURL(file);
+    // A link that is never on the page: clicking it saves the file with this name.
+    const link = document.createElement("a");
+    link.href = url;
+    link.download = `virtual-er-stats-${isDemo ? "demo" : "real"}-${today}.csv`;
+    link.click();
+    URL.revokeObjectURL(url);
+  }
+
+  return (
+    <Button variant="secondary" onClick={download}>
+      Download past 7 days (CSV)
+    </Button>
+  );
+}
diff --git a/components/dashboard/DashboardView.tsx b/components/dashboard/DashboardView.tsx
--- a/components/dashboard/DashboardView.tsx
+++ b/components/dashboard/DashboardView.tsx
@@ -1,19 +1,25 @@
 "use client";
 
-// The dashboard's body: the Real or Demo switch, the day's numbers for both sites, and the words
-// for loading and out-of-date reads. Real visits show unless staff choose Demo; the choice is not saved.
+// The dashboard's body: the Real or Demo switch, the day's numbers for both sites, today's steps,
+// the past 7 days and the CSV download, and the words for loading and out-of-date reads.
+// Real visits show unless staff choose Demo; the choice is not saved.
 
 import { useState } from "react";
 import { useDashboard } from "@/data/useDashboard";
 import { dashboardNumbers } from "@/lib/dashboardNumbers";
+import { trendNumbers } from "@/lib/trendNumbers";
+import { CsvButton } from "@/components/dashboard/CsvButton";
+import { FunnelView } from "@/components/dashboard/FunnelView";
 import { ModeSwitch } from "@/components/dashboard/ModeSwitch";
 import { SiteNumbers } from "@/components/dashboard/SiteNumbers";
 import { SummaryPanel } from "@/components/dashboard/SummaryPanel";
+import { TrendTable } from "@/components/dashboard/TrendTable";
 
 export function DashboardView() {
   const [isDemo, setIsDemo] = useState(false);
   const { visits, stats, today, outOfDate } = useDashboard(isDemo);
   const counts = visits ? dashboardNumbers(visits, stats, today, isDemo) : null;
+  const trend = visits ? trendNumbers(visits, stats, today, isDemo) : [];
 
   return (
     <>
@@ -36,6 +42,10 @@ export function DashboardView() {
             <SiteNumbers site="A" numbers={counts.A} />
             <SiteNumbers site="B" numbers={counts.B} />
           </div>
+          <FunnelView numbers={counts} />
+          <TrendTable site="A" trend={trend} />
+          <TrendTable site="B" trend={trend} />
+          <CsvButton trend={trend} today={today} isDemo={isDemo} />
           <SummaryPanel isDemo={isDemo} />
         </>
       ) : outOfDate ? (
diff --git a/components/dashboard/FunnelView.tsx b/components/dashboard/FunnelView.tsx
new file mode 100644
--- /dev/null
+++ b/components/dashboard/FunnelView.tsx
@@ -0,0 +1,40 @@
+// Today's steps from home start to survey, for both sites, as numbered lists with counts only (no percent).
+// One line under the lists says why a lower row can be larger than the row above it.
+
+import type { SiteNumbers } from "@/lib/dashboardNumbers";
+import { funnelSteps } from "@/lib/funnelSteps";
+
+type Props = { numbers: Record<"A" | "B", SiteNumbers> };
+
+function SiteSteps({ site, n }: { site: "A" | "B"; n: SiteNumbers }) {
+  const name = `Demo Site ${site}, today`;
+  return (
+    <div>
+      <h3 className="font-semibold">{name}</h3>
+      <ol aria-label={name} className="text-sm">
+        {funnelSteps(n).map((step) => (
+          <li key={step.label} className="flex justify-between gap-4 border-b border-slate-200 py-1">
+            <span>{step.label}</span>
+            <span className="font-semibold">{step.count}</span>
+          </li>
+        ))}
+      </ol>
+    </div>
+  );
+}
+
+export function FunnelView({ numbers }: Props) {
+  return (
+    <section className="glass-panel space-y-3">
+      <h2 className="text-lg font-bold">Steps today</h2>
+      <div className="grid gap-4 md:grid-cols-2">
+        <SiteSteps site="A" n={numbers.A} />
+        <SiteSteps site="B" n={numbers.B} />
+      </div>
+      <p className="text-sm">
+        Each row counts what happened today. Desk patients join at Triaged, and some patients come back before a
+        recall, so a lower row can be larger.
+      </p>
+    </section>
+  );
+}
diff --git a/components/dashboard/NumberParts.tsx b/components/dashboard/NumberParts.tsx
new file mode 100644
--- /dev/null
+++ b/components/dashboard/NumberParts.tsx
@@ -0,0 +1,33 @@
+// The small pieces the dashboard uses to show a number: the "no data yet" dash, a percent, and a label and value row.
+
+import type { ReactNode } from "react";
+
+/** The dash shown when a share or average has no data: seen as "-", read aloud as "no data yet". */
+export function NoData() {
+  return (
+    <>
+      <span aria-hidden="true">-</span>
+      <span className="sr-only">no data yet</span>
+    </>
+  );
+}
+
+/** A whole percent such as "80%", or the NoData dash (with no "%") when there is no data. */
+export function Percent({ value }: { value: number | null }) {
+  return value === null ? <NoData /> : <>{value}%</>;
+}
+
+/** A number, or the NoData dash when it is null. */
+export function NumberOrDash({ value }: { value: number | null }) {
+  return value === null ? <NoData /> : <>{value}</>;
+}
+
+/** One label and value pair in a list (inside a <dl>). */
+export function Row({ label, children }: { label: string; children: ReactNode }) {
+  return (
+    <div className="flex flex-wrap justify-between gap-x-3 border-b border-slate-200 py-2">
+      <dt className="font-semibold">{label}</dt>
+      <dd>{children}</dd>
+    </div>
+  );
+}
diff --git a/components/dashboard/SiteNumbers.tsx b/components/dashboard/SiteNumbers.tsx
--- a/components/dashboard/SiteNumbers.tsx
+++ b/components/dashboard/SiteNumbers.tsx
@@ -1,45 +1,22 @@
-// One site's dashboard numbers: the "Now" counts and the "Today" counts, as label and value pairs.
+// One site's dashboard numbers: the "Now" counts, the "Today" counts and the off-site wait bands, as label and value pairs.
 // A percentage or average with nothing to divide by shows a dash, read aloud as "no data yet".
 
-import type { ReactNode } from "react";
 import type { SiteNumbers as Counts } from "@/lib/dashboardNumbers";
 import { averageMinutes, averageScore, share } from "@/lib/dashboardShare";
 import { visitCount } from "@/lib/visitCount";
+import { NumberOrDash, Percent, Row } from "./NumberParts";
+import { WaitBands } from "./WaitBands";
 
 type Props = {
   site: "A" | "B";
   numbers: Counts;
 };
 
-/** The dash shown when a share or average has no data: seen as "-", read aloud as "no data yet". */
-function NoData() {
-  return (
-    <>
-      <span aria-hidden="true">-</span>
-      <span className="sr-only">no data yet</span>
-    </>
-  );
-}
-
-/** A whole percent such as "80%", or the NoData dash (with no "%") when there is no data. */
-function Percent({ value }: { value: number | null }) {
-  return value === null ? <NoData /> : <>{value}%</>;
-}
-
-/** One label and value pair in the list. */
-function Row({ label, children }: { label: string; children: ReactNode }) {
-  return (
-    <div className="flex flex-wrap justify-between gap-x-3 border-b border-slate-200 py-2">
-      <dt className="font-semibold">{label}</dt>
-      <dd>{children}</dd>
-    </div>
-  );
-}
-
 export function SiteNumbers({ site, numbers: n }: Props) {
   const offeredShare = share(n.offered, n.triaged);
   const acceptedShare = share(n.accepted, n.offered);
   const minutes = averageMinutes(n.recallToArrivalSeconds, n.arrivedAfterRecall);
+  const waitMinutes = averageMinutes(n.offerToCallSeconds, n.recalled);
   const score = averageScore(n.surveyScoreSum, n.surveyResponses);
   const nineOrTenShare = share(n.survey9or10, n.surveyResponses);
 
@@ -65,8 +42,11 @@ export function SiteNumbers({ site, numbers: n }: Props) {
           {n.accepted} of {n.offered} offered ({<Percent value={acceptedShare} />})
         </Row>
         <Row label="Declined">{n.declined}</Row>
+        <Row label="Average minutes from offer to recall">
+          <NumberOrDash value={waitMinutes} /> ({visitCount(n.recalled)})
+        </Row>
         <Row label="Average minutes from recall to arrival">
-          {minutes === null ? <NoData /> : minutes} ({visitCount(n.arrivedAfterRecall)})
+          <NumberOrDash value={minutes} /> ({visitCount(n.arrivedAfterRecall)})
         </Row>
         <Row label="No-shows">{n.noShows}</Row>
         <Row label="Unable to reach (nurse confirmed)">{n.unableToReach}</Row>
@@ -74,11 +54,15 @@ export function SiteNumbers({ site, numbers: n }: Props) {
         <Row label="Started from home">{n.startedFromHome}</Row>
         <Row label="Reached triage">{n.homeReachedTriage}</Row>
         <Row label="Survey responses">{n.surveyResponses}</Row>
-        <Row label="Average score (0 to 10)">{score === null ? <NoData /> : score}</Row>
+        <Row label="Average score (0 to 10)">
+          <NumberOrDash value={score} />
+        </Row>
         <Row label="Scored 9 or 10">
           {n.survey9or10} ({<Percent value={nineOrTenShare} />})
         </Row>
       </dl>
+
+      <WaitBands numbers={n} />
     </section>
   );
 }
diff --git a/components/dashboard/TrendTable.tsx b/components/dashboard/TrendTable.tsx
new file mode 100644
--- /dev/null
+++ b/components/dashboard/TrendTable.tsx
@@ -0,0 +1,93 @@
+// One site's past 7 days as a table: one row per day, with each share and average next to its counts.
+// On a phone the table scrolls sideways inside its own box, so the page itself does not.
+
+import type { SiteNumbers } from "@/lib/dashboardNumbers";
+import { averageMinutes, averageScore, share } from "@/lib/dashboardShare";
+import type { TrendDay } from "@/lib/trendNumbers";
+import { responseCount, visitCount } from "@/lib/visitCount";
+import { WAIT_START_DAY } from "@/lib/waitStart";
+import { NoData, NumberOrDash, Percent } from "./NumberParts";
+
+type Props = { site: "A" | "B"; trend: TrendDay[] };
+
+const HEADERS = [
+  "Triaged CTAS 4 or 5",
+  "Offered",
+  "Accepted",
+  "Average minutes from recall to arrival",
+  "Average minutes from offer to recall",
+  "Average score (0 to 10)",
+];
+
+/** The 6 number cells for one day. Before the wait start date, the wait cell is only a dash. */
+function DayCells({ n, hasWait }: { n: SiteNumbers; hasWait: boolean }) {
+  const cell = "border-b border-slate-200 px-2 py-2 text-right";
+  return (
+    <>
+      <td className={cell}>{n.triaged}</td>
+      <td className={cell}>
+        {n.offered} of {n.triaged} (<Percent value={share(n.offered, n.triaged)} />)
+      </td>
+      <td className={cell}>
+        {n.accepted} of {n.offered} (<Percent value={share(n.accepted, n.offered)} />)
+      </td>
+      <td className={cell}>
+        <NumberOrDash value={averageMinutes(n.recallToArrivalSeconds, n.arrivedAfterRecall)} /> (
+        {visitCount(n.arrivedAfterRecall)})
+      </td>
+      <td className={cell}>
+        {hasWait ? (
+          <>
+            <NumberOrDash value={averageMinutes(n.offerToCallSeconds, n.recalled)} /> ({visitCount(n.recalled)})
+          </>
+        ) : (
+          <NoData />
+        )}
+      </td>
+      <td className={cell}>
+        <NumberOrDash value={averageScore(n.surveyScoreSum, n.surveyResponses)} /> ({responseCount(n.surveyResponses)})
+      </td>
+    </>
+  );
+}
+
+export function TrendTable({ site, trend }: Props) {
+  // The dates are "YYYY-MM-DD", so comparing the text compares the dates.
+  const someBeforeStart = trend.some((d) => d.day < WAIT_START_DAY);
+  const caption = `Demo Site ${site}, past 7 days`;
+
+  return (
+    <section className="glass-panel space-y-2">
+      {/* "relative" keeps the absolute sr-only words inside this box, or the phone page scrolls sideways. */}
+      <div className="relative overflow-x-auto" role="region" aria-label={caption} tabIndex={0}>
+        <table className="w-full border-collapse text-sm">
+          <caption className="mb-2 text-left text-lg font-bold">{caption}</caption>
+          <thead>
+            <tr>
+              <th scope="col" className="border-b-2 border-slate-300 px-2 py-2 text-left">
+                Day
+              </th>
+              {HEADERS.map((h) => (
+                <th key={h} scope="col" className="border-b-2 border-slate-300 px-2 py-2 text-right">
+                  {h}
+                </th>
+              ))}
+            </tr>
+          </thead>
+          <tbody>
+            {trend.map((d) => (
+              <tr key={d.day}>
+                <th scope="row" className="whitespace-nowrap border-b border-slate-200 px-2 py-2 text-left">
+                  {d.day}
+                </th>
+                <DayCells n={d.numbers[site]} hasWait={d.day >= WAIT_START_DAY} />
+              </tr>
+            ))}
+          </tbody>
+        </table>
+      </div>
+      <p className="text-sm">Each number counts on the date of its own event.</p>
+      {someBeforeStart && <p className="text-sm">Wait numbers start on {WAIT_START_DAY}.</p>}
+    </section>
+  );
+}
diff --git a/components/dashboard/WaitBands.tsx b/components/dashboard/WaitBands.tsx
new file mode 100644
--- /dev/null
+++ b/components/dashboard/WaitBands.tsx
@@ -0,0 +1,18 @@
+// The 4 off-site wait bands for one site today: how many recalled visits waited each length of time.
+
+import type { SiteNumbers } from "@/lib/dashboardNumbers";
+import { Row } from "./NumberParts";
+
+export function WaitBands({ numbers: n }: { numbers: SiteNumbers }) {
+  return (
+    <>
+      <h3 className="text-lg font-bold">Off-site wait, from offer to recall (recalled today)</h3>
+      <dl>
+        <Row label="Under 30 minutes">{n.waitUnder30}</Row>
+        <Row label="30 to 59 minutes">{n.wait30to59}</Row>
+        <Row label="60 to 119 minutes">{n.wait60to119}</Row>
+        <Row label="120 minutes or more">{n.wait120plus}</Row>
+      </dl>
+    </>
+  );
+}
diff --git a/data/dashboardRead.ts b/data/dashboardRead.ts
--- a/data/dashboardRead.ts
+++ b/data/dashboardRead.ts
@@ -1,8 +1,9 @@
-// One job: read the staff dashboard's numbers from the database (today's daily_stats rows and the
-// visits table, for demo or real visits), keep them in memory, and read them again like
-// data/visitCache.ts does. It never reads access_token or code.
+// One job: read the staff dashboard's numbers from the database (the daily_stats rows for today and
+// the 7 past days, and the visits table, for demo or real visits), keep them in memory, and read them
+// again like data/visitCache.ts does. It never reads access_token or code.
 
 import type { DailyStatsRow, DashboardVisit } from "@/lib/dashboardNumbers";
+import { pastDays } from "@/lib/pastDays";
 import { torontoDay } from "@/lib/torontoDay";
 import { DASHBOARD_VISIT_FIELDS } from "./dashboardFields";
 import { keepFresh } from "./keepFresh";
@@ -55,7 +56,7 @@ function show(store: Store, next: DashboardData): void {
   store.listeners.forEach((tell) => tell());
 }
 
-/** Read today's numbers for one mode. Both reads must work, or the copy on screen is kept and marked out of date. */
+/** Read the numbers for today and the 7 past days, for one mode. Both reads must work, or the copy on screen is kept and marked out of date. */
 export async function loadDashboard(isDemo: boolean): Promise<void> {
   const store = storeFor(isDemo);
   const thisLoad = ++store.latest;
@@ -65,7 +66,8 @@ export async function loadDashboard(isDemo: boolean): Promise<void> {
     const db = supabaseBrowser();
     const [visitRead, statsRead] = await Promise.all([
       db.from("visits").select(DASHBOARD_VISIT_FIELDS).eq("is_demo", isDemo),
-      db.from("daily_stats").select("*").eq("is_demo", isDemo).eq("day", today),
+      // From the first past day on, so one read covers today and the trend view (dashboardNumbers picks each day's rows).
+      db.from("daily_stats").select("*").eq("is_demo", isDemo).gte("day", pastDays(today)[0]),
     ]);
     if (!visitRead.error && !statsRead.error && Array.isArray(visitRead.data) && Array.isArray(statsRead.data)) {
       next = {
diff --git a/lib/dashboardCsv.ts b/lib/dashboardCsv.ts
new file mode 100644
--- /dev/null
+++ b/lib/dashboardCsv.ts
@@ -0,0 +1,43 @@
+// Turns the past days' numbers into CSV text for the staff download: a header line, then one line per day and site.
+// Only counts, shares and averages go in: no codes, tokens or visit times.
+
+import type { SiteNumbers } from "./dashboardNumbers";
+import { averageMinutes, averageScore, share } from "./dashboardShare";
+import type { Site } from "./visit";
+import { WAIT_START_DAY } from "./waitStart";
+
+export type CsvDay = { day: string; site: Site; numbers: SiteNumbers };
+
+export const CSV_HEADER =
+  "day,site,is_demo,triaged,offered,offered_percent,accepted,arrived_after_recall," +
+  "recall_to_arrival_minutes,recalled,offer_to_recall_minutes,survey_responses,survey_average";
+
+// A share or average with nothing to divide by is an empty cell, not "-", so a spreadsheet reads it as blank.
+function cell(value: number | null): string {
+  return value === null ? "" : String(value);
+}
+
+function csvLine({ day, site, numbers: n }: CsvDay, isDemo: boolean): string {
+  // The dates are "YYYY-MM-DD", so comparing the text compares the dates.
+  const hasWait = day >= WAIT_START_DAY;
+  return [
+    day,
+    site,
+    String(isDemo),
+    cell(n.triaged),
+    cell(n.offered),
+    cell(share(n.offered, n.triaged)),
+    cell(n.accepted),
+    cell(n.arrivedAfterRecall),
+    cell(averageMinutes(n.recallToArrivalSeconds, n.arrivedAfterRecall)),
+    hasWait ? cell(n.recalled) : "",
+    hasWait ? cell(averageMinutes(n.offerToCallSeconds, n.recalled)) : "",
+    cell(n.surveyResponses),
+    cell(averageScore(n.surveyScoreSum, n.surveyResponses)),
+  ].join(",");
+}
+
+/** The CSV text, with Windows line ends ("\r\n"), which the CSV standard (RFC 4180) uses and Excel reads. */
+export function dashboardCsv(rows: CsvDay[], isDemo: boolean): string {
+  return [CSV_HEADER, ...rows.map((row) => csvLine(row, isDemo))].map((line) => `${line}\r\n`).join("");
+}
diff --git a/lib/dashboardNumbers.ts b/lib/dashboardNumbers.ts
--- a/lib/dashboardNumbers.ts
+++ b/lib/dashboardNumbers.ts
@@ -3,8 +3,10 @@
 
 import { torontoDay } from "./torontoDay";
 import type { Site, Visit } from "./visit";
+import { waitBand, type WaitBand } from "./waitBand";
 
-/** One row of daily_stats (see supabase/migrations/20261116100000_daily_stats_and_cleanup.sql). */
+/** One row of daily_stats (see supabase/migrations/20261116100000_daily_stats_and_cleanup.sql
+ * and 20261120030000_wait_and_recall_stats.sql). */
 export type DailyStatsRow = {
   day: string;
   site: Site;
@@ -25,6 +27,12 @@ export type DailyStatsRow = {
   survey_responses: number;
   survey_score_sum: number;
   survey_9_or_10: number;
+  called: number;
+  offer_to_call_seconds: number;
+  wait_under_30: number;
+  wait_30_to_59: number;
+  wait_60_to_119: number;
+  wait_120_plus: number;
 };
 
 /** The visit fields the dashboard reads. */
@@ -64,6 +72,12 @@ export type SiteNumbers = {
   surveyResponses: number;
   surveyScoreSum: number;
   survey9or10: number;
+  recalled: number;
+  offerToCallSeconds: number;
+  waitUnder30: number;
+  wait30to59: number;
+  wait60to119: number;
+  wait120plus: number;
 };
 
 /** Counts every number for both sites. Only rows whose is_demo equals isDemo are used. */
@@ -106,6 +120,12 @@ function siteNumbers(
   // Visits started from home today.
   const startedHome = visits.filter((v) => v.source === "home" && on(v.created_at));
 
+  // Visits recalled today after an offer, whatever happened after the recall. Each wait is offer to recall.
+  const waits = visits
+    .filter((v) => v.offered_at !== null && on(v.called_at))
+    .map((v) => secondsBetween(v.offered_at, v.called_at));
+  const inBand = (band: WaitBand): number => waits.filter((w) => waitBand(w) === band).length;
+
   const offered = countVisits((v) => on(v.offered_at)) + fromStats((s) => s.offered);
   const declined =
     countVisits((v) => v.status === "declined" && on(v.offered_at)) + fromStats((s) => s.declined);
@@ -158,6 +178,14 @@ function siteNumbers(
     survey9or10:
       surveyed.filter((v) => v.survey_score === 9 || v.survey_score === 10).length +
       fromStats((s) => s.survey_9_or_10),
+
+    // Recalled today, the total off-site wait in whole seconds, and the waits per band.
+    recalled: waits.length + fromStats((s) => s.called),
+    offerToCallSeconds: waits.reduce((total, w) => total + w, 0) + fromStats((s) => s.offer_to_call_seconds),
+    waitUnder30: inBand("under_30") + fromStats((s) => s.wait_under_30),
+    wait30to59: inBand("30_to_59") + fromStats((s) => s.wait_30_to_59),
+    wait60to119: inBand("60_to_119") + fromStats((s) => s.wait_60_to_119),
+    wait120plus: inBand("120_plus") + fromStats((s) => s.wait_120_plus),
   };
 }
 
diff --git a/lib/funnelSteps.ts b/lib/funnelSteps.ts
new file mode 100644
--- /dev/null
+++ b/lib/funnelSteps.ts
@@ -0,0 +1,19 @@
+// Turns one site's numbers for today into the funnel steps, in order, as label and count (no percent, owner 2026-11-20).
+
+import type { SiteNumbers } from "./dashboardNumbers";
+
+export type FunnelStep = { label: string; count: number };
+
+/** The 8 steps from home start to survey. Desk patients join at "Triaged", so a lower step can be larger. */
+export function funnelSteps(n: SiteNumbers): FunnelStep[] {
+  return [
+    { label: "Started from home", count: n.startedFromHome },
+    { label: "Reached triage (from home)", count: n.homeReachedTriage },
+    { label: "Triaged CTAS 4 or 5 (home and desk)", count: n.triaged },
+    { label: "Offered", count: n.offered },
+    { label: "Accepted", count: n.accepted },
+    { label: "Recalled", count: n.recalled },
+    { label: "Arrived after recall", count: n.arrivedAfterRecall },
+    { label: "Answered survey", count: n.surveyResponses },
+  ];
+}
diff --git a/lib/pastDays.ts b/lib/pastDays.ts
new file mode 100644
--- /dev/null
+++ b/lib/pastDays.ts
@@ -0,0 +1,14 @@
+// Gives the 7 calendar dates before a Toronto date, oldest first, for the dashboard trend view.
+
+const DAY_MS = 24 * 60 * 60 * 1000;
+
+/** For example "2026-11-21" gives "2026-11-14" to "2026-11-20". The day itself is not in the list. */
+export function pastDays(day: string): string[] {
+  // The date is only a label, so it is read as midnight UTC: UTC has no clock change, so each day is exactly 24 hours.
+  const start = Date.parse(`${day}T00:00:00Z`);
+  const days: string[] = [];
+  for (let back = 7; back >= 1; back--) {
+    days.push(new Date(start - back * DAY_MS).toISOString().slice(0, 10));
+  }
+  return days;
+}
diff --git a/lib/summaryInput.ts b/lib/summaryInput.ts
--- a/lib/summaryInput.ts
+++ b/lib/summaryInput.ts
@@ -4,8 +4,15 @@
 import type { SiteNumbers } from "./dashboardNumbers";
 import type { Site } from "./visit";
 
+/** The 17 numbers per site that may go to Claude. The wait and recall numbers (2026-11-21) are not sent;
+ * sending them is an owner decision. */
+type SummarySite = Omit<
+  SiteNumbers,
+  "recalled" | "offerToCallSeconds" | "waitUnder30" | "wait30to59" | "wait60to119" | "wait120plus"
+>;
+
 /** What the summary route sends to Claude: the two sites' totals and whether the numbers are demo numbers. */
-export type SummaryInput = { isDemo: boolean; sites: Record<Site, SiteNumbers> };
+export type SummaryInput = { isDemo: boolean; sites: Record<Site, SummarySite> };
 
 /** Copies the 17 SiteNumbers fields for sites A and B into new objects, and nothing else. */
 export function summaryInput(numbers: Record<Site, SiteNumbers>, isDemo: boolean): SummaryInput {
@@ -21,7 +28,7 @@ export function parseSummaryBody(body: unknown): { isDemo: boolean } | null {
 }
 
 // Copies one site's 17 fields by name.
-function siteTotals(n: SiteNumbers): SiteNumbers {
+function siteTotals(n: SiteNumbers): SummarySite {
   return {
     waitingNow: n.waitingNow,
     recalledNow: n.recalledNow,
diff --git a/lib/trendNumbers.ts b/lib/trendNumbers.ts
new file mode 100644
--- /dev/null
+++ b/lib/trendNumbers.ts
@@ -0,0 +1,41 @@
+// The numbers for the 7 past days, per site, for the trend table and the CSV download.
+// Each day is counted by the same rule as "Today" (dashboardNumbers), on the date of each event.
+
+import type { CsvDay } from "./dashboardCsv";
+import { dashboardNumbers, type DailyStatsRow, type DashboardVisit, type SiteNumbers } from "./dashboardNumbers";
+import { pastDays } from "./pastDays";
+import type { Site } from "./visit";
+
+export type TrendDay = { day: string; numbers: Record<Site, SiteNumbers> };
+
+/** One entry per past day, oldest first. */
+export function trendNumbers(
+  visits: DashboardVisit[],
+  stats: DailyStatsRow[],
+  today: string,
+  isDemo: boolean,
+): TrendDay[] {
+  return pastDays(today).map((day) => ({ day, numbers: dashboardNumbers(visits, stats, day, isDemo) }));
+}
+
+/** The CSV rows: day by day, and site A before site B in each day. */
+export function trendCsvRows(trend: TrendDay[]): CsvDay[] {
+  return trend.flatMap(({ day, numbers }) => [
+    { day, site: "A" as const, numbers: numbers.A },
+    { day, site: "B" as const, numbers: numbers.B },
+  ]);
+}
+
+// The counts that each start with an event on a date. The 3 "Now" counts are left out: they are the same on every date.
+// The other SiteNumbers fields (declined, accepted, seconds, scores, bands) only grow when one of these grows.
+const EVENT_COUNTS = [
+  "startedFromHome", "homeReachedTriage", "triaged", "offered", "recalled",
+  "arrivedAfterRecall", "noShows", "unableToReach", "left", "surveyResponses",
+] as const;
+
+/** True when any past day has a number to download. False gives "No past days to download yet." */
+export function hasPastData(trend: TrendDay[]): boolean {
+  return trend.some((d) =>
+    EVENT_COUNTS.some((key) => d.numbers.A[key] > 0 || d.numbers.B[key] > 0),
+  );
+}
diff --git a/lib/visitCount.ts b/lib/visitCount.ts
--- a/lib/visitCount.ts
+++ b/lib/visitCount.ts
@@ -1,6 +1,11 @@
-// Staff wording: a number of visits in plain words ("1 visit", "3 visits").
+// Staff wording: a number of visits or survey responses in plain words ("1 visit", "3 responses").
 
 /** "1 visit", "2 visits", "0 visits". */
 export function visitCount(n: number): string {
   return `${n} ${n === 1 ? "visit" : "visits"}`;
 }
+
+/** "1 response", "2 responses", "0 responses". */
+export function responseCount(n: number): string {
+  return `${n} ${n === 1 ? "response" : "responses"}`;
+}
diff --git a/lib/waitBand.ts b/lib/waitBand.ts
new file mode 100644
--- /dev/null
+++ b/lib/waitBand.ts
@@ -0,0 +1,14 @@
+// Puts one off-site wait (offered_at to called_at) into one of the 4 bands on the dashboard.
+// The seconds come in already rounded to whole seconds (secondsBetween in dashboardNumbers.ts).
+// The database does the same in delete_old_visits() (20261120030000_wait_and_recall_stats.sql):
+// round(seconds / 60), then < 30, 30 to 59, 60 to 119, 120 or more.
+
+export type WaitBand = "under_30" | "30_to_59" | "60_to_119" | "120_plus";
+
+export function waitBand(seconds: number): WaitBand {
+  const minutes = Math.round(seconds / 60);
+  if (minutes < 30) return "under_30";
+  if (minutes < 60) return "30_to_59";
+  if (minutes < 120) return "60_to_119";
+  return "120_plus";
+}
diff --git a/lib/waitStart.ts b/lib/waitStart.ts
new file mode 100644
--- /dev/null
+++ b/lib/waitStart.ts
@@ -0,0 +1,2 @@
+// The first Toronto date with complete wait numbers in daily_stats (owner, 2026-11-20). Days before it show "-".
+export const WAIT_START_DAY = "2026-11-21";
diff --git a/supabase/checks/daily_stats.sql b/supabase/checks/daily_stats.sql
--- a/supabase/checks/daily_stats.sql
+++ b/supabase/checks/daily_stats.sql
@@ -1,15 +1,16 @@
--- Check for the 24-hour clean-up (migration 20261116100000_daily_stats_and_cleanup.sql).
+-- Check for the 24-hour clean-up (migrations 20261116100000_daily_stats_and_cleanup.sql and 20261120030000_wait_and_recall_stats.sql).
 -- Run the whole file at once in the Supabase SQL Editor, after that migration. It saves nothing:
 -- everything happens inside "begin ... rollback", so the synthetic visits, the paused trigger,
 -- the real visits that the clean-up deletes and the daily_stats rows all come back as they were.
 -- If a number is wrong, the run stops with an error that names the row, what it got and what
--- it expected (and still saves nothing). If all is right, it shows the 5 rows below.
+-- it expected (and still saves nothing). If all is right, it shows the 7 rows below.
 --
 -- Why the trigger is paused: visits_before_write sets every new time to now(), so this check
 -- could not make visits that are more than 24 hours old.
 -- Why the year 2000: no real visit can count on those dates. Toronto is on EST (UTC-5) in
 -- January and on EDT (UTC-4) in July.
--- D1 = 2000-01-01, D2 = 2000-01-02, D3 = 2000-07-01, D4 = 2000-07-02, all Toronto dates.
+-- D1 = 2000-01-01, D2 = 2000-01-02, D3 = 2000-07-01, D4 = 2000-07-02, D5 = 2000-03-01 and
+-- D6 = 2000-03-02 (both on EST, UTC-5), all Toronto dates.
 --
 -- The synthetic visits (all site A and not demo, unless the line says so). As in the app, every
 -- visit triaged as not eligible has a CTAS level, and Mark arrived sets closed_at = arrived_at,
@@ -33,6 +34,18 @@
 --   5R  desk, CTAS 5, triaged and offered D2, arrived 30 min after the call (1800 s), survey 8
 --   5S  desk, CTAS 4, triaged and offered D3 23:00 EDT, called 23:45, arrived D4 00:30 EDT (2700 s).
 --       In UTC its triage is already D4; with a fixed UTC-5 its arrival would still be D3.
+--   5W  desk, CTAS 4, triaged and offered D5 10:00, called 10:29:29 (1769 s, 29 min)
+--   5X  desk, CTAS 4, triaged and offered D5 10:00, called 10:29:30 (1770 s, 30 min)
+--   5Y  desk, CTAS 4, triaged and offered D5 10:00, called 10:29:29.6 (1769.6 s, rounds to 1770 s, 30 min)
+--   5Z  desk, CTAS 4, triaged and offered D5 10:00, called 10:59:29 (3569 s, 59 min)
+--   52  desk, CTAS 4, triaged and offered D5 10:00, called 10:59:30 (3570 s, 60 min)
+--   53  desk, CTAS 4, triaged and offered D5 10:00, called 11:59:29 (7169 s, 119 min)
+--   54  desk, CTAS 4, triaged and offered D5 10:00, called 11:59:30 (7170 s, 120 min)
+--   55  desk, CTAS 4, switched from declined: triaged D5 08:00, offered 10:00, called 10:20
+--       (1200 s from the offer; from triage it would be 140 min)
+--   56  desk, CTAS 4, triaged D5 10:00, offered_at null, called 10:30: not in called
+--   57  desk, CTAS 4, triaged and offered D5 23:50, called D6 00:10 (1200 s): counts on D6,
+--       the called_at date
 --   5P  24 hours 5 minutes old, CTAS 4, not eligible: deleted. It counts on a real date, so the
 --       check reads that day's row before and after (triaged and not eligible), and compares
 --       with a recount.
@@ -43,12 +56,18 @@
 --
 -- Expected numbers, in this order: triaged, not_eligible, offered, declined,
 -- called_and_arrived, call_to_arrival_seconds, arrived, no_shows, removed_left, unable_to_reach,
--- open_at_deletion, started_from_home, home_reached_triage, surveys, score_sum, 9_or_10
---   D1 A false  6 1 5 1 2 2400 2 0 0 0 0 1 1 1 9 1
---   D2 A false  105 0 5 0 3 5400 4 1 1 1 0 1 0 8 64 1
---   D2 B true   4 0 4 0 0 0 0 0 0 0 4 0 0 0 0 0
---   D3 A false  1 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0
---   D4 A false  0 0 0 0 1 2700 1 0 0 0 0 0 0 0 0 0
+-- open_at_deletion, started_from_home, home_reached_triage, surveys, score_sum, 9_or_10,
+-- called, offer_to_call_seconds, wait_under_30, wait_30_to_59, wait_60_to_119, wait_120_plus
+--   D1 A false  6 1 5 1 2 2400 2 0 0 0 0 1 1 1 9 1 4 30600 2 0 1 1
+--   D2 A false  105 0 5 0 3 5400 4 1 1 1 0 1 0 8 64 1 3 13500 0 2 1 0
+--   D2 B true   4 0 4 0 0 0 0 0 0 0 4 0 0 0 0 0 3 9900 0 3 0 0
+--   D3 A false  1 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0 1 2700 0 1 0 0
+--   D4 A false  0 0 0 0 1 2700 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0
+--   D5 A false  10 0 9 0 0 0 0 0 0 0 10 0 0 0 0 0 8 27987 2 3 2 1
+--   D6 A false  0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 1200 1 0 0 0
+-- The wait bands round the wait to whole seconds first, then to whole minutes. 5Y (1769.6 s) is in
+-- 30 to 59; one rounding would put it under 30. Offer to call: 5Q 25 min, 5B 15 min, 5A and 5G
+-- 115 min, 5E 355 min, 5F, 5R, 5T, 5U, 5V 55 min, 5S 45 min.
 -- Notes: 5B counts as triaged on D1 but as arrived on D2. 5G counts as started from home on D1
 -- (its created date) but as triaged on D2. 5J has no call time, so it is in arrived but not in
 -- called_and_arrived. 5K, 5T, 5U and 5V count as open at deletion on their triaged date.
@@ -56,6 +75,9 @@
 begin;
 
 alter table public.visits disable trigger visits_before_write;
+-- The test visits start as arrived, called or removed; visits_check_step (20261117000000) refuses
+-- that for a new visit. This file checks the clean-up totals, not the steps (allowed_steps.sql does).
+alter table public.visits disable trigger visits_check_step;
 
 insert into public.daily_stats (day, site, is_demo, triaged_ctas_4_5, survey_responses, survey_score_sum)
 values ('2000-01-02', 'A', false, 100, 5, 40);
@@ -115,6 +137,36 @@ values
   ('ZZZZ5S', 'ZZZZZZZZZZZZZZZZZZZZZZZZE5', 'A', 'desk', 4, 'arrived', null, false,
    '2000-07-01 23:00 America/Toronto', '2000-07-01 23:00 America/Toronto', '2000-07-01 23:00 America/Toronto',
    '2000-07-01 23:45 America/Toronto', '2000-07-02 00:30 America/Toronto', '2000-07-02 00:30 America/Toronto', null),
+  ('ZZZZ5W', 'ZZZZZZZZZZZZZZZZZZZZZZZZE9', 'A', 'desk', 4, 'called', null, false,
+   '2000-03-01 10:00 America/Toronto', '2000-03-01 10:00 America/Toronto', '2000-03-01 10:00 America/Toronto',
+   '2000-03-01 10:29:29 America/Toronto', null, null, null),
+  ('ZZZZ5X', 'ZZZZZZZZZZZZZZZZZZZZZZZZF0', 'A', 'desk', 4, 'called', null, false,
+   '2000-03-01 10:00 America/Toronto', '2000-03-01 10:00 America/Toronto', '2000-03-01 10:00 America/Toronto',
+   '2000-03-01 10:29:30 America/Toronto', null, null, null),
+  ('ZZZZ5Y', 'ZZZZZZZZZZZZZZZZZZZZZZZZF1', 'A', 'desk', 4, 'called', null, false,
+   '2000-03-01 10:00 America/Toronto', '2000-03-01 10:00 America/Toronto', '2000-03-01 10:00 America/Toronto',
+   '2000-03-01 10:29:29.6 America/Toronto', null, null, null),
+  ('ZZZZ5Z', 'ZZZZZZZZZZZZZZZZZZZZZZZZF2', 'A', 'desk', 4, 'called', null, false,
+   '2000-03-01 10:00 America/Toronto', '2000-03-01 10:00 America/Toronto', '2000-03-01 10:00 America/Toronto',
+   '2000-03-01 10:59:29 America/Toronto', null, null, null),
+  ('ZZZZ52', 'ZZZZZZZZZZZZZZZZZZZZZZZZF3', 'A', 'desk', 4, 'called', null, false,
+   '2000-03-01 10:00 America/Toronto', '2000-03-01 10:00 America/Toronto', '2000-03-01 10:00 America/Toronto',
+   '2000-03-01 10:59:30 America/Toronto', null, null, null),
+  ('ZZZZ53', 'ZZZZZZZZZZZZZZZZZZZZZZZZF4', 'A', 'desk', 4, 'called', null, false,
+   '2000-03-01 10:00 America/Toronto', '2000-03-01 10:00 America/Toronto', '2000-03-01 10:00 America/Toronto',
+   '2000-03-01 11:59:29 America/Toronto', null, null, null),
+  ('ZZZZ54', 'ZZZZZZZZZZZZZZZZZZZZZZZZF5', 'A', 'desk', 4, 'called', null, false,
+   '2000-03-01 10:00 America/Toronto', '2000-03-01 10:00 America/Toronto', '2000-03-01 10:00 America/Toronto',
+   '2000-03-01 11:59:30 America/Toronto', null, null, null),
+  ('ZZZZ55', 'ZZZZZZZZZZZZZZZZZZZZZZZZF6', 'A', 'desk', 4, 'called', null, false,
+   '2000-03-01 08:00 America/Toronto', '2000-03-01 08:00 America/Toronto', '2000-03-01 10:00 America/Toronto',
+   '2000-03-01 10:20 America/Toronto', null, null, null),
+  ('ZZZZ56', 'ZZZZZZZZZZZZZZZZZZZZZZZZF7', 'A', 'desk', 4, 'called', null, false,
+   '2000-03-01 10:00 America/Toronto', '2000-03-01 10:00 America/Toronto', null,
+   '2000-03-01 10:30 America/Toronto', null, null, null),
+  ('ZZZZ57', 'ZZZZZZZZZZZZZZZZZZZZZZZZF8', 'A', 'desk', 4, 'called', null, false,
+   '2000-03-01 23:50 America/Toronto', '2000-03-01 23:50 America/Toronto', '2000-03-01 23:50 America/Toronto',
+   '2000-03-02 00:10 America/Toronto', null, null, null),
   ('ZZZZ5P', 'ZZZZZZZZZZZZZZZZZZZZZZZZE0', 'A', 'desk', 4, 'not_eligible', null, false,
    now() - interval '24 hours 5 minutes', now() - interval '24 hours 5 minutes', null,
    null, null, now() - interval '24 hours 5 minutes', null),
@@ -155,7 +207,8 @@ create function pg_temp.stats_line(d date, s text, demo boolean) returns text la
   select concat_ws(' ', triaged_ctas_4_5, not_eligible, offered, declined,
     called_and_arrived, call_to_arrival_seconds, arrived, no_shows, removed_left, unable_to_reach,
     open_at_deletion, started_from_home, home_reached_triage,
-    survey_responses, survey_score_sum, survey_9_or_10)
+    survey_responses, survey_score_sum, survey_9_or_10,
+    called, offer_to_call_seconds, wait_under_30, wait_30_to_59, wait_60_to_119, wait_120_plus)
   from public.daily_stats where day = d and site = s and is_demo = demo
 $$;
 
@@ -169,11 +222,13 @@ declare
 begin
   for want in
     select * from (values
-      ('2000-01-01'::date, 'A', false, '6 1 5 1 2 2400 2 0 0 0 0 1 1 1 9 1'),
-      ('2000-01-02'::date, 'A', false, '105 0 5 0 3 5400 4 1 1 1 0 1 0 8 64 1'),
-      ('2000-01-02'::date, 'B', true,  '4 0 4 0 0 0 0 0 0 0 4 0 0 0 0 0'),
-      ('2000-07-01'::date, 'A', false, '1 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0'),
-      ('2000-07-02'::date, 'A', false, '0 0 0 0 1 2700 1 0 0 0 0 0 0 0 0 0')
+      ('2000-01-01'::date, 'A', false, '6 1 5 1 2 2400 2 0 0 0 0 1 1 1 9 1 4 30600 2 0 1 1'),
+      ('2000-01-02'::date, 'A', false, '105 0 5 0 3 5400 4 1 1 1 0 1 0 8 64 1 3 13500 0 2 1 0'),
+      ('2000-01-02'::date, 'B', true,  '4 0 4 0 0 0 0 0 0 0 4 0 0 0 0 0 3 9900 0 3 0 0'),
+      ('2000-07-01'::date, 'A', false, '1 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0 1 2700 0 1 0 0'),
+      ('2000-07-02'::date, 'A', false, '0 0 0 0 1 2700 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0'),
+      ('2000-03-01'::date, 'A', false, '10 0 9 0 0 0 0 0 0 0 10 0 0 0 0 0 8 27987 2 3 2 1'),
+      ('2000-03-02'::date, 'A', false, '0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 1200 1 0 0 0')
     ) as w(day, site, is_demo, line)
   loop
     got := pg_temp.stats_line(want.day, want.site, want.is_demo);
@@ -182,8 +237,8 @@ begin
     end if;
   end loop;
 
-  if (select count(*) from public.daily_stats where day < '2001-01-01') <> 5 then
-    raise exception 'expected 5 rows in the year 2000, got %',
+  if (select count(*) from public.daily_stats where day < '2001-01-01') <> 7 then
+    raise exception 'expected 7 rows in the year 2000, got %',
       (select count(*) from public.daily_stats where day < '2001-01-01');
   end if;
 
@@ -216,7 +271,7 @@ begin
 end;
 $$;
 
--- All checks passed. The 5 rows, for a last look.
+-- All checks passed. The 7 rows, for a last look.
 select s.day, s.site, s.is_demo, pg_temp.stats_line(s.day, s.site, s.is_demo) as numbers
 from public.daily_stats s
 where s.day < '2001-01-01'
diff --git a/supabase/checks/wait_gap.sql b/supabase/checks/wait_gap.sql
--- a/supabase/checks/wait_gap.sql
+++ b/supabase/checks/wait_gap.sql
@@ -2,11 +2,12 @@
 -- Run the whole file at once (do not select and run one part): the Editor shows only the last
 -- result, so the file keeps the first results in a temp table and shows all rows at the end.
 -- Run it in the Supabase SQL Editor after that migration. It saves nothing: everything happens
--- inside "begin ... rollback", so the synthetic visits, the paused trigger and the cleared
+-- inside "begin ... rollback", so the synthetic visits, the paused triggers and the cleared
 -- call-back times all go away at the end.
 --
--- Why the trigger is paused: visits_before_write sets every new called_at to now(), so this
--- check could not put call-backs at different times. Why real call-back times are cleared:
+-- Why the triggers are paused: visits_before_write sets every new called_at to now(), so this
+-- check could not put call-backs at different times; visits_check_step refuses a new visit that
+-- starts as arrived or called. Why real call-back times are cleared:
 -- real call-backs at the same site would change the average.
 --
 -- Expected result (5 rows):
@@ -29,6 +30,9 @@
 begin;
 
 alter table public.visits disable trigger visits_before_write;
+-- The test visits start as arrived or called; visits_check_step (20261117000000) refuses that
+-- for a new visit. This file checks the wait gap, not the steps (allowed_steps.sql does).
+alter table public.visits disable trigger visits_check_step;
 update public.visits set called_at = null where called_at is not null;
 
 insert into public.visits (code, access_token, site, source, status, triaged_at, called_at) values
diff --git a/supabase/migrations/20261120030000_wait_and_recall_stats.sql b/supabase/migrations/20261120030000_wait_and_recall_stats.sql
new file mode 100644
--- /dev/null
+++ b/supabase/migrations/20261120030000_wait_and_recall_stats.sql
@@ -0,0 +1,181 @@
+-- Adds the recall and wait numbers to the 24-hour clean-up: how many visits were recalled,
+-- how long they waited from offer to recall, and how the waits fall into four bands.
+-- This migration changes delete_old_visits() in place; it does not edit the old migration files.
+-- Check: supabase/checks/daily_stats.sql (run the whole file after this migration).
+
+-- 1. The new columns. Each one is a total per day, site and demo flag, like the others.
+alter table public.daily_stats
+  add column called integer not null default 0,                   -- visits recalled (called_at and offered_at set), on called_at
+  add column offer_to_call_seconds bigint not null default 0,     -- sum of called_at minus offered_at for those visits; divide by called
+  add column wait_under_30 integer not null default 0,            -- those visits, under 30 whole minutes
+  add column wait_30_to_59 integer not null default 0,            -- those visits, 30 to 59 whole minutes
+  add column wait_60_to_119 integer not null default 0,           -- those visits, 60 to 119 whole minutes
+  add column wait_120_plus integer not null default 0;            -- those visits, 120 whole minutes or more
+
+-- 2. The clean-up function. The body is the same as before, with the new events and columns added.
+-- The wait bands round the wait to whole seconds first, then to whole minutes. The app does the same.
+-- "create or replace" keeps the function's owner and rights; the revoke below repeats them.
+create or replace function public.delete_old_visits()
+returns void
+language plpgsql
+security definer
+set search_path = ''
+as $$
+begin
+  if not pg_try_advisory_xact_lock(hashtext('virtual_er'), hashtext('delete_old_visits')) then
+    return;
+  end if;
+  if not exists (select 1 from public.visits where created_at < now() - interval '24 hours') then
+    return;
+  end if;
+
+  with gone as (
+    delete from public.visits
+    where created_at < now() - interval '24 hours'
+    returning *
+  ),
+  -- One row per number that a deleted visit adds, with the time of the event it counts on.
+  events (site, is_demo, at, metric, amount) as (
+    select site, is_demo, triaged_at, 'triaged_ctas_4_5', 1 from gone
+      where ctas_level in (4, 5) and triaged_at is not null
+    union all
+    select site, is_demo, triaged_at, 'not_eligible', 1 from gone
+      where status = 'not_eligible' and triaged_at is not null
+    union all
+    select site, is_demo, offered_at, 'offered', 1 from gone
+      where offered_at is not null
+    union all
+    select site, is_demo, offered_at, 'declined', 1 from gone
+      where status = 'declined' and offered_at is not null
+    union all
+    select site, is_demo, arrived_at, 'called_and_arrived', 1 from gone
+      where status = 'arrived' and called_at is not null and arrived_at is not null
+    union all
+    select site, is_demo, arrived_at, 'call_to_arrival_seconds',
+           round(extract(epoch from arrived_at - called_at))::bigint from gone
+      where status = 'arrived' and called_at is not null and arrived_at is not null
+    union all
+    select site, is_demo, arrived_at, 'arrived', 1 from gone
+      where status = 'arrived' and arrived_at is not null
+    union all
+    select site, is_demo, closed_at, 'removed_left', 1 from gone
+      where status = 'removed' and removed_reason = 'left' and closed_at is not null
+    union all
+    select site, is_demo, triaged_at, 'open_at_deletion', 1 from gone
+      where status in ('waiting', 'called', 'on_the_way', 'needs_reassessment') and triaged_at is not null
+    union all
+    select site, is_demo, closed_at, 'no_shows', 1 from gone
+      where status = 'removed' and removed_reason = 'no_show' and closed_at is not null
+    union all
+    select site, is_demo, closed_at, 'unable_to_reach', 1 from gone
+      where status = 'unable_to_reach' and closed_at is not null
+    union all
+    select site, is_demo, created_at, 'started_from_home', 1 from gone
+      where source = 'home'
+    union all
+    select site, is_demo, created_at, 'home_reached_triage', 1 from gone
+      where source = 'home' and triaged_at is not null
+    union all
+    select site, is_demo, closed_at, 'survey_responses', 1 from gone
+      where survey_score is not null and closed_at is not null
+    union all
+    select site, is_demo, closed_at, 'survey_score_sum', survey_score from gone
+      where survey_score is not null and closed_at is not null
+    union all
+    select site, is_demo, closed_at, 'survey_9_or_10', 1 from gone
+      where survey_score in (9, 10) and closed_at is not null
+    union all
+    select site, is_demo, called_at, 'called', 1 from gone
+      where called_at is not null and offered_at is not null
+    union all
+    select site, is_demo, called_at, 'offer_to_call_seconds',
+           round(extract(epoch from called_at - offered_at))::bigint from gone
+      where called_at is not null and offered_at is not null
+    union all
+    select site, is_demo, called_at, 'wait_under_30', 1 from gone
+      where called_at is not null and offered_at is not null
+        and round(round(extract(epoch from called_at - offered_at)) / 60) < 30
+    union all
+    select site, is_demo, called_at, 'wait_30_to_59', 1 from gone
+      where called_at is not null and offered_at is not null
+        and round(round(extract(epoch from called_at - offered_at)) / 60) between 30 and 59
+    union all
+    select site, is_demo, called_at, 'wait_60_to_119', 1 from gone
+      where called_at is not null and offered_at is not null
+        and round(round(extract(epoch from called_at - offered_at)) / 60) between 60 and 119
+    union all
+    select site, is_demo, called_at, 'wait_120_plus', 1 from gone
+      where called_at is not null and offered_at is not null
+        and round(round(extract(epoch from called_at - offered_at)) / 60) >= 120
+  ),
+  -- The events added up per Toronto date, site and demo flag.
+  totals as (
+    select (at at time zone 'America/Toronto')::date as day, site, is_demo,
+      coalesce(sum(amount) filter (where metric = 'triaged_ctas_4_5'), 0) as triaged_ctas_4_5,
+      coalesce(sum(amount) filter (where metric = 'not_eligible'), 0) as not_eligible,
+      coalesce(sum(amount) filter (where metric = 'offered'), 0) as offered,
+      coalesce(sum(amount) filter (where metric = 'declined'), 0) as declined,
+      coalesce(sum(amount) filter (where metric = 'called_and_arrived'), 0) as called_and_arrived,
+      coalesce(sum(amount) filter (where metric = 'call_to_arrival_seconds'), 0) as call_to_arrival_seconds,
+      coalesce(sum(amount) filter (where metric = 'arrived'), 0) as arrived,
+      coalesce(sum(amount) filter (where metric = 'no_shows'), 0) as no_shows,
+      coalesce(sum(amount) filter (where metric = 'removed_left'), 0) as removed_left,
+      coalesce(sum(amount) filter (where metric = 'unable_to_reach'), 0) as unable_to_reach,
+      coalesce(sum(amount) filter (where metric = 'open_at_deletion'), 0) as open_at_deletion,
+      coalesce(sum(amount) filter (where metric = 'started_from_home'), 0) as started_from_home,
+      coalesce(sum(amount) filter (where metric = 'home_reached_triage'), 0) as home_reached_triage,
+      coalesce(sum(amount) filter (where metric = 'survey_responses'), 0) as survey_responses,
+      coalesce(sum(amount) filter (where metric = 'survey_score_sum'), 0) as survey_score_sum,
+      coalesce(sum(amount) filter (where metric = 'survey_9_or_10'), 0) as survey_9_or_10,
+      coalesce(sum(amount) filter (where metric = 'called'), 0) as called,
+      coalesce(sum(amount) filter (where metric = 'offer_to_call_seconds'), 0) as offer_to_call_seconds,
+      coalesce(sum(amount) filter (where metric = 'wait_under_30'), 0) as wait_under_30,
+      coalesce(sum(amount) filter (where metric = 'wait_30_to_59'), 0) as wait_30_to_59,
+      coalesce(sum(amount) filter (where metric = 'wait_60_to_119'), 0) as wait_60_to_119,
+      coalesce(sum(amount) filter (where metric = 'wait_120_plus'), 0) as wait_120_plus
+    from events
+    group by 1, 2, 3
+  )
+  -- A day already in daily_stats gets the new numbers added to it, never replaced.
+  insert into public.daily_stats as s (
+    day, site, is_demo, triaged_ctas_4_5, not_eligible, offered, declined,
+    called_and_arrived, call_to_arrival_seconds, arrived, no_shows, removed_left, unable_to_reach,
+    open_at_deletion,
+    started_from_home, home_reached_triage, survey_responses, survey_score_sum, survey_9_or_10,
+    called, offer_to_call_seconds, wait_under_30, wait_30_to_59, wait_60_to_119, wait_120_plus
+  )
+  select day, site, is_demo, triaged_ctas_4_5, not_eligible, offered, declined,
+    called_and_arrived, call_to_arrival_seconds, arrived, no_shows, removed_left, unable_to_reach,
+    open_at_deletion,
+    started_from_home, home_reached_triage, survey_responses, survey_score_sum, survey_9_or_10,
+    called, offer_to_call_seconds, wait_under_30, wait_30_to_59, wait_60_to_119, wait_120_plus
+  from totals
+  on conflict (day, site, is_demo) do update set
+    triaged_ctas_4_5 = s.triaged_ctas_4_5 + excluded.triaged_ctas_4_5,
+    not_eligible = s.not_eligible + excluded.not_eligible,
+    offered = s.offered + excluded.offered,
+    declined = s.declined + excluded.declined,
+    called_and_arrived = s.called_and_arrived + excluded.called_and_arrived,
+    call_to_arrival_seconds = s.call_to_arrival_seconds + excluded.call_to_arrival_seconds,
+    arrived = s.arrived + excluded.arrived,
+    no_shows = s.no_shows + excluded.no_shows,
+    removed_left = s.removed_left + excluded.removed_left,
+    unable_to_reach = s.unable_to_reach + excluded.unable_to_reach,
+    open_at_deletion = s.open_at_deletion + excluded.open_at_deletion,
+    started_from_home = s.started_from_home + excluded.started_from_home,
+    home_reached_triage = s.home_reached_triage + excluded.home_reached_triage,
+    survey_responses = s.survey_responses + excluded.survey_responses,
+    survey_score_sum = s.survey_score_sum + excluded.survey_score_sum,
+    survey_9_or_10 = s.survey_9_or_10 + excluded.survey_9_or_10,
+    called = s.called + excluded.called,
+    offer_to_call_seconds = s.offer_to_call_seconds + excluded.offer_to_call_seconds,
+    wait_under_30 = s.wait_under_30 + excluded.wait_under_30,
+    wait_30_to_59 = s.wait_30_to_59 + excluded.wait_30_to_59,
+    wait_60_to_119 = s.wait_60_to_119 + excluded.wait_60_to_119,
+    wait_120_plus = s.wait_120_plus + excluded.wait_120_plus;
+end;
+$$;
+
+-- Only the cron job (and the owner in the SQL Editor) runs it; patients, staff and the
+-- service key cannot.
+revoke execute on function public.delete_old_visits() from public, anon, authenticated, service_role;
```

## Helpers that the changed lines call (not in the diff)

`lib/dashboardShare.ts` (whole file):

```ts
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

Inside `lib/dashboardNumbers.ts` (`siteNumbers`, before the new lines, and the helper at line 193):

```ts
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

function secondsBetween(from: string | null, to: string | null): number {
  if (from === null || to === null) return 0;
  return Math.round((Date.parse(to) - Date.parse(from)) / 1000);
}
```

`lib/torontoDay.ts`:

```ts
const torontoFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Toronto",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function torontoDay(iso: string): string {
  return torontoFormat.format(new Date(iso));
}
```

`data/dashboardFields.ts`:

```ts
export const DASHBOARD_VISIT_FIELDS =
  "site, source, ctas_level, status, removed_reason, created_at, triaged_at, offered_at, called_at, arrived_at, closed_at, survey_score, is_demo";
```

`data/useDashboard.ts`:

```ts
export function useDashboard(isDemo: boolean): DashboardData {
  const subscribe = useCallback((onChange: () => void) => watchDashboard(isDemo, onChange), [isDemo]);
  const getSnapshot = useCallback(() => readDashboard(isDemo), [isDemo]);
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_DASHBOARD);
}
```

`components/Button.tsx`:

```tsx
type Variant = "primary" | "secondary" | "danger";

const styles: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-strong",
  secondary: "border-2 border-slate-700 bg-white text-slate-900 hover:bg-slate-100",
  danger: "bg-red-800 text-white hover:bg-red-900",
};

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ComponentPropsWithRef<"button"> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={`min-h-11 rounded-xl px-4 py-2 text-base font-semibold focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-slate-950 disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
```

## Response

Gemini Hydrogen 4, High, new chat, 2026-11-21. Pasted by the owner, unchanged.

### 1. Definitions against code

- Sub-millisecond `Date.parse` truncation can disagree between live `dashboardNumbers` and `delete_old_visits()` on a band edge.
  - File and line: `lib/dashboardNumbers.ts:195` (`secondsBetween`) vs. `supabase/migrations/20261120030000_wait_and_recall_stats.sql:92, 96, 100, 104, 108`.
  - What goes wrong: `Date.parse` truncates fractional seconds past 3 digits (milliseconds), whereas Postgres `timestamptz` subtraction preserves microseconds. At a `.5`-second rounding edge near a band boundary, live counts and `daily_stats` can put the same visit in different bands and `offerToCallSeconds` totals.
  - Example: `offered_at = "2026-11-21T10:00:00.000900Z"`, `called_at = "2026-11-21T10:29:29.500000Z"` (true wait `1769.4991` s). Live `secondsBetween` truncates `.000900` to `.000`, producing `1769.500` s, then `1770` s, then `30` min (`wait30to59`); after clean-up, Postgres rounds `1769.4991` s to `1769` s, then `29` min (`wait_under_30`).
  - Smallest fix: None needed if timestamps are only ever millisecond-precision from JS; otherwise parse sub-millisecond digits or round timestamps to milliseconds on write.
  - How sure: High that the precision difference exists; low likelihood of occurring in practice.
- All other definitions in `lib/dashboardNumbers.ts` and `delete_old_visits()` match each other and the SPEC (`recalled` counts all statuses once on `called_at` when `offered_at` is set; `offer_to_call_seconds` and the 4 wait bands use the same cohort and date; `recall_to_arrival_seconds` requires `status = 'arrived'` and `called_at` set on `arrived_at`). (The funnel label mismatch for `homeReachedTriage` is covered in Section 6.)

### 2. Rounding at the band edges

- Band-edge rounding mismatch (non-negative or negative integer seconds): none found. For any whole `seconds` value, JavaScript `Math.round(seconds / 60)` (`lib/waitBand.ts:9`) and SQL `round(round(extract(epoch ...)) / 60)` produce the same band. Even on negative half-minutes where `Math.round` and Postgres `round(numeric)` diverge (e.g., `-1770` s gives `-29` in JS vs. `-30` in SQL), both values are `< 30` and fall in `under_30`.
- Negative waits (clock error) reach the wait bands and `offerToCallSeconds`.
  - File and line: `lib/dashboardNumbers.ts:124-126, 184-188, 193-196` and the migration lines 91-109.
  - What goes wrong: Neither `dashboardNumbers` nor `delete_old_visits()` checks `called_at >= offered_at` or clamps negative durations to `0`. A clock step-back or manual edit producing `called_at < offered_at` increments `waitUnder30` / `wait_under_30` and subtracts seconds from `offerToCallSeconds` / `offer_to_call_seconds` (and at `-0.5` s, JS gives `0` s while SQL gives `-1` s).
  - Example: `offered_at = "2026-11-21T10:05:00Z"` and `called_at = "2026-11-21T10:00:00Z"` increments `waitUnder30` by `1` and adds `-300` to `offerToCallSeconds`; as the sole recall of the day, "Average minutes from offer to recall" displays `-5 (1 visit)`.
  - Smallest fix: Clamp negative durations to `0` with `Math.max(0, ...)` in `lib/dashboardNumbers.ts:126` (and `195`) and `greatest(0, ...)` in the migration lines 92 to 108.
  - How sure: High.

### 3. The migration

- None found. All 16 existing metrics, the advisory lock, the 24-hour delete CTE, `totals` aggregation, `on conflict ... do update` (including all 6 new columns), `security definer` with `set search_path = ''`, and `revoke execute` from `public, anon, authenticated, service_role` are complete and intact.

### 4. The trend

- Rule parity and live visits on past dates: `trendNumbers` calls `dashboardNumbers(visits, stats, day, isDemo)` for each past day, so all event-based metrics use the same rules as today. A live visit (not yet deleted) can count on a past date, which is right: otherwise yesterday's row would omit un-deleted visits until the clean-up runs.
- `TrendDay` carries today's live `*Now` counts on every past date.
  - File and line: `lib/trendNumbers.ts:9, 18`.
  - What goes wrong: `waitingNow`, `recalledNow` and `reassessmentNow` are not filtered by `day`, so every `TrendDay.numbers` has today's live queue counts. `TrendTable`, `dashboardCsv` and `hasPastData` ignore them, but a future consumer would get today's queue for 7 days ago.
  - Example: With 3 `waiting` visits live on `2026-11-21`, `trendNumbers(...)[0]` (`day: "2026-11-14"`) has `numbers.A.waitingNow === 3`.
  - Smallest fix: Zero them out or omit them via a `PastSiteNumbers` type inside `trendNumbers`.
  - How sure: High.

### 5. The CSV

- Column order, header/cell alignment, and commas or line ends: none found.
- Negative durations can emit cells starting with `-` (`lib/dashboardCsv.ts:31, 34`). Spreadsheets parse plain `"-5"` as a negative number rather than a formula, though clamping removes it. Fix: clamp as in Section 2. How sure: High.
- Synchronous `URL.revokeObjectURL` immediately after `link.click()` (`components/dashboard/CsvButton.tsx:25-26`) can cancel the download in some browsers. Fix: `setTimeout(() => URL.revokeObjectURL(url), 1000)`. How sure: Medium.

### 6. Labels and screens

- Funnel "Reached triage (from home)" contradicts "Each row counts what happened today" (`lib/funnelSteps.ts:11`, `components/dashboard/FunnelView.tsx:35`). `homeReachedTriage` counts on `created_at`, not `triaged_at`. ("Answered survey" likewise counts on `closed_at`, not survey time.) Example: a home visit created `2026-11-20 23:50` and triaged `2026-11-21 00:15` gives "Reached triage (from home): 0" and "Triaged CTAS 4 or 5: 1" on `2026-11-21`. Fix: label "Started from home today and reached triage", or a note. How sure: High.
- "Average minutes from offer to recall" does not say which visits are in it (`SiteNumbers.tsx:45`, `TrendTable.tsx:18`). Example: 10 patients waiting 3 hours and 1 recalled `no_show` after 10 minutes reads `10 (1 visit)`. Fix: "Average minutes from offer to recall (recalled visits)". How sure: Medium.
- No empty state on `TrendTable`: on day 1 it shows two 7-row grids of `0`, `0 of 0 (-)` and `- (0 visits)`. Fix: one message ("No past days with visits yet.") when `!hasPastData(trend)`. How sure: High.
- `NoData` announces "no data yet" for days before the start date and for finished 0-visit days (`NumberParts.tsx:6-13`, `TrendTable.tsx:29-49`). Fix: a `label` prop on `NoData`, "not tracked" before the start date, "not applicable" for a 0 bottom. How sure: High.
- `TrendTable` has no heading, its `<caption>` scrolls off-screen on a phone, and its title is announced twice (`TrendTable.tsx:60-65`). Fix: an `<h2 id>` above the scroll box, `aria-labelledby` on the box and the table, and no `<caption>`. How sure: High.
- `FunnelView` puts the label and count spans with no separator: textContent "Offered12" (`FunnelView.tsx:16-17`). Fix: `<span className="sr-only">: </span>` or `{" "}` between them. How sure: High.
- `CsvButton` does not show Real or Demo in its text (`CsvButton.tsx:30-32`). Fix: `Download past 7 days (${isDemo ? "demo " : ""}CSV)`. How sure: Medium.

### 7. Tests that the check files miss

- A negative-wait synthetic visit: `offered_at = '2000-03-01 10:05'`, `called_at = '2000-03-01 10:00'` (Toronto, `called`, CTAS 4, desk, site A, not demo). None of `5W` to `57` tests `called_at < offered_at`. How sure: High.
- `daily_stats.sql:81-82` pre-inserts the `2000-01-02 A false` row with `0` in all 6 new columns, so the check would still pass if `on conflict` overwrote `called = excluded.called` instead of adding.

## Claude's check of the response

Valid, fix (no product decision needed):

- 5, revoke: correct risk. Move `URL.revokeObjectURL` into a `setTimeout`. `CsvButton.click.test.tsx` must then wait for the timer (fake timers).
- 6, trend table heading: correct. The `<caption>` is inside the scroll box, so it scrolls away, and the region `aria-label` repeats it. Fix: an `<h2>` above the box, `aria-labelledby` on the box. The tests in `TrendTable.test.tsx` that find the caption must change to find the heading.
- 6, funnel separator: correct, textContent is "Offered12". Add a separator between the 2 spans.
- 7, conflict row: correct, a real gap in the check. Give the pre-inserted `2000-01-02 A false` row non-zero values in the 6 new columns and raise that row's expected line by the same values. The owner runs `daily_stats.sql` again.

Valid, owner decision (asked in this turn):

- 6, "Reached triage (from home)" counts on `created_at`. True in both JS and SQL (decisions from 2026-11-16). The fix is a label or a note.
- 6, "Average minutes from offer to recall" label.
- 6, no empty state on the trend tables.
- 6, the spoken words of the dash before the start date.

Not accepted:

- 2, 5 and 7, negative waits and a clamp: the app cannot make `called_at < offered_at`. `visits_before_write` sets both times from the database `now()`, and the switch that moves `offered_at` is allowed only from `declined` (no `called_at`), and its Undo only before the recall (`20261119010000_declined_switch_checks.sql:56-60`). Only a manual SQL edit can do it. A clamp to 0 would hide that edit, not repair it; a negative number shows it.
- 1, sub-millisecond: true (`now()` has microseconds, `Date.parse` keeps milliseconds), but a visit changes band only when its wait is within 1 ms of a half-second at a band edge, and only between the live count and the stored count. Goes in known-issues.md, no code change.
- 4, `*Now` counts in `TrendDay`: true, but nothing reads them. No change now.
- 6, Real or Demo in the CSV button text: the mode switch is above it and the file name says `demo` or `real`. No change, unless the owner wants it.

Owner decisions (2026-11-21):

- Funnel row label: "Started from home today and reached triage".
- "Average minutes from offer to recall": no change.
- Trend tables: one line "No past days with visits yet." when no past day has a number (`hasPastData` false).
- The dash before the start date: no change ("no data yet").
