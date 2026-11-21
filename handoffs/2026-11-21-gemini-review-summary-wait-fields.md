# Gemini review: the 6 wait numbers in the Claude dashboard summary

Model: Gemini Hydrogen 4, High, in a new chat. If you have no Gemini Hydrogen 4 credits, use Gemini 3.6 Flash, High.

## Question

Find problems. Do not confirm. This is a concept prototype of a virtual ER waiting room with synthetic data only. Staff press a button on the dashboard, and a server route sends today's totals for sites A and B to Claude, which writes 2 or 3 sentences. Until now, 17 numbers per site were sent. With the owner's OK (2026-11-21), 6 wait numbers are now sent too, and 2 new rules tell Claude how to read them.

Check:
1. SPEC hard rule 1 (below): can the 6 new fields carry anything other than counts and sums? Can a code, a token, a time of day or one visit's own wait leak through them? (For example: if `recalled` is 1, `offerToCallSeconds` is the wait of one visit. Is that a problem for the rule?)
2. The 2 new rules: can Claude misread them? Does "divide by recalled, then by 60" give the same number as the dashboard row "Average minutes from offer to recall"? Can the band rule and the "no wait data yet" line conflict with the other rules (for example "If most counts are 0, say that there is not much to report yet")?
3. The tests: does a test fail if a 24th field is added to `SiteNumbers` and sent by accident? Does a test fail if one of the 2 rule lines is removed?

For each problem: the file and line, what goes wrong, one example input, and the smallest fix.

## SPEC hard rule 1 (SPEC.md:35, the part that applies)

Store no real personal or health information. A visit has two identifiers: a 6-character display code and a long random access token. No names, health card numbers, phone numbers or symptoms are stored.

The summary route sends only the output of `summaryInput()`. Its comment says: "Only the totals from lib/summaryInput.ts go in, never a code, token or time."

## Settled (do not report)

- The fields are copied by name, not spread, so a field added later to `SiteNumbers` is not sent by accident (lib/summaryInput.ts:1-2). This is on purpose.
- The dashboard shows a dash, read aloud as "no data yet", for an average with nothing to divide by (components/dashboard/SiteNumbers.tsx:2).
- A wait is offer to recall (`offered_at` to `called_at`), rounded to whole seconds. A band uses round(seconds / 60): under 30, 30 to 59, 60 to 119, 120 or more (lib/waitBand.ts).

## Changed files (line counts after the change)

- lib/summaryInput.ts: 51 lines
- lib/summaryPrompt.ts: 36 lines
- lib/summaryInput.test.ts: 87 lines
- lib/summaryPrompt.test.ts: 45 lines

## Diff: code

```diff
--- a/lib/summaryInput.ts
+++ b/lib/summaryInput.ts
@@ -4,17 +4,11 @@
 import type { SiteNumbers } from "./dashboardNumbers";
 import type { Site } from "./visit";
 
-/** The 17 numbers per site that may go to Claude. The wait and recall numbers (2026-11-21) are not sent;
- * sending them is an owner decision. */
-type SummarySite = Omit<
-  SiteNumbers,
-  "recalled" | "offerToCallSeconds" | "waitUnder30" | "wait30to59" | "wait60to119" | "wait120plus"
->;
+/** What the summary route sends to Claude: the two sites' totals and whether the numbers are demo numbers.
+ * The wait numbers were added with the owner's OK on 2026-11-21. */
+export type SummaryInput = { isDemo: boolean; sites: Record<Site, SiteNumbers> };
 
-/** What the summary route sends to Claude: the two sites' totals and whether the numbers are demo numbers. */
-export type SummaryInput = { isDemo: boolean; sites: Record<Site, SummarySite> };
-
-/** Copies the 17 SiteNumbers fields for sites A and B into new objects, and nothing else. */
+/** Copies the 23 SiteNumbers fields for sites A and B into new objects, and nothing else. */
 export function summaryInput(numbers: Record<Site, SiteNumbers>, isDemo: boolean): SummaryInput {
   return { isDemo, sites: { A: siteTotals(numbers.A), B: siteTotals(numbers.B) } };
 }
@@ -27,8 +21,8 @@
-// Copies one site's 17 fields by name.
-function siteTotals(n: SiteNumbers): SummarySite {
+// Copies one site's 23 fields by name.
+function siteTotals(n: SiteNumbers): SiteNumbers {
   return {
     waitingNow: n.waitingNow,
     ... (15 unchanged lines, one field each)
     survey9or10: n.survey9or10,
+    recalled: n.recalled,
+    offerToCallSeconds: n.offerToCallSeconds,
+    waitUnder30: n.waitUnder30,
+    wait30to59: n.wait30to59,
+    wait60to119: n.wait60to119,
+    wait120plus: n.wait120plus,
   };
 }
--- a/lib/summaryPrompt.ts
+++ b/lib/summaryPrompt.ts
@@ -14,6 +14,10 @@ export const SUMMARY_RULES: string[] = [
   "Never give medical or clinical advice, and never suggest a change to triage or to who waits off-site.",
   // The totals hold sums, not averages; this stops a wrong average.
   "recallToArrivalSeconds and surveyScoreSum are sums. Divide recallToArrivalSeconds by arrivedAfterRecall for the average minutes from recall to arrival, and surveyScoreSum by surveyResponses for the average score. If the count is 0, do not give that average.",
+  // The wait total is a sum in seconds, like recallToArrivalSeconds.
+  "offerToCallSeconds is the sum, in seconds, of the time from offer to recall over the recalled visits. Divide it by recalled, then by 60, for the average minutes from offer to recall. If recalled is 0, do not give that average.",
+  // The 4 bands count only recalled visits, so they add up to recalled.
+  "waitUnder30, wait30to59, wait60to119 and wait120plus count the recalled visits by minutes from offer to recall: under 30, 30 to 59, 60 to 119, and 120 or more. If recalled is 0, say there is no wait data yet.",
   // A count of 0 is normal early in the day.
   "If most counts are 0, say that there is not much to report yet.",
   // Staff must never read demo numbers as real ones.
```

The other SUMMARY_RULES lines, unchanged: "You write a short summary of today's numbers for emergency department staff." / "Write 2 or 3 short sentences in plain English. No headings, lists, bold or emoji." / "Use only the numbers you are given. Do not guess why a number is high or low." / "If the totals are for demo visits, start with \"Demo numbers:\"."

## Diff: tests

lib/summaryInput.test.ts: the `KEYS` list (the exact keys each site must have) gets the 6 new names after "survey9or10", so it has 23. The test checks `Object.keys(out.sites[site]).sort()` equals `KEYS` sorted, and every value is a number. The test name says 23. New lines in that test:

```ts
    // The wait numbers (owner OK, 2026-11-21) keep their own values.
    expect(out.sites.A.recalled).toBe(1 + 17);
    expect(out.sites.A.offerToCallSeconds).toBe(1 + 18);
    expect(out.sites.B.wait120plus).toBe(100 + 22);
```

An existing test in that file passes `{ ...numbers(1), code: "ABC234" }` and checks that "code" and "ABC234" are not in the output.

lib/summaryPrompt.test.ts, new test:

```ts
  it("tells Claude how to read the wait numbers, and to give no average when recalled is 0", () => {
    const waitRule = SUMMARY_RULES.find((r) => r.includes("offerToCallSeconds"));
    expect(waitRule).toBeDefined();
    expect(waitRule).toMatch(/sum/i);
    expect(waitRule).toContain("recalled");
    const bandRule = SUMMARY_RULES.find((r) => r.includes("waitUnder30"));
    expect(bandRule).toBeDefined();
    for (const band of ["wait30to59", "wait60to119", "wait120plus"]) expect(bandRule).toContain(band);
    expect(SUMMARY_RULES.some((r) => /recalled is 0/.test(r))).toBe(true);
  });
```

## Helper the changed lines use (lib/dashboardNumbers.ts:55-79)

```ts
/** Raw counts and sums for one site. */
export type SiteNumbers = {
  waitingNow: number; recalledNow: number; reassessmentNow: number; triaged: number; offered: number;
  declined: number; accepted: number; arrivedAfterRecall: number; recallToArrivalSeconds: number;
  noShows: number; unableToReach: number; left: number; startedFromHome: number; homeReachedTriage: number;
  surveyResponses: number; surveyScoreSum: number; survey9or10: number;
  recalled: number; offerToCallSeconds: number;
  waitUnder30: number; wait30to59: number; wait60to119: number; wait120plus: number;
};
```

How the 6 are counted (lib/dashboardNumbers.ts:123-188): `waits` is the list of offer-to-recall seconds for visits recalled today after an offer. `recalled = waits.length + past stats rows`, `offerToCallSeconds = sum of waits + past stats rows`, and each band is the count of `waits` in that band plus the past stats rows.

## Checked

- `npx vitest run lib/summaryInput lib/summaryPrompt` before the code change: 2 failed (the 23-key test and the new rule test), 9 passed.
- After: `npm test`: 108 files, 676 tests passed. `npm run lint`: no errors. `npm run build`: passed.

## Not checked

- A real Claude answer with the new fields (the route was not called in this session).
- The dashboard page with the summary button after this change.

## What to bring back

Paste Gemini's full answer back to Claude Code.
