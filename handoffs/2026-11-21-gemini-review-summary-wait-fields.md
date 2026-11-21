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

## Response

Gemini Hydrogen 4, High, 2026-11-21 (pasted by the owner):

## 1. SPEC hard rule 1

The 6 new fields cannot carry a display code, access token, or clock time of day: `lib/dashboardNumbers.ts:123-188` populates them strictly with integer visit counts and elapsed-second sums, and `lib/summaryInput.ts:41-46` copies only those 6 numeric fields by name.

For the special case (`recalled === 1`): strictly under SPEC rule 1 in this synthetic-data prototype ("Store no real personal or health information... never a code, token or time"), sending `offerToCallSeconds` when `recalled === 1` does **not** violate the rule—an elapsed duration in seconds is not a code, token, or time of day, and the existing 17 fields already do the exact same thing when `arrivedAfterRecall === 1` (`recallToArrivalSeconds`) or `surveyResponses === 1` (`surveyScoreSum`). However, it **does** expose one visit's exact wait in seconds (`n = 1` small-cell leak), which becomes a real privacy/re-identification problem if real patient data is ever used or if "totals" is meant to hide single-visit outcomes.

* **Single-visit (`recalled === 1`) wait leaks one visit's exact duration and is labeled an "average"**
* **File and line:** `lib/summaryInput.ts:41-46` and `lib/summaryPrompt.ts:18`.
* **What goes wrong:** When `recalled` is `1` (or increases by `1` between two summary clicks), `offerToCallSeconds` equals that single visit's exact offer-to-recall wait in seconds, and one of `waitUnder30`..`wait120plus` is `1` while the other three are `0`. `SUMMARY_RULES` only guards `recalled is 0`, so Claude divides by `1` and presents one patient's wait as an "average".
* **Example input:** `{ ...siteBase, recalled: 1, offerToCallSeconds: 2130, waitUnder30: 0, wait30to59: 1, wait60to119: 0, wait120plus: 0 }`. Claude receives that one visit's exact 35m 30s wait (`2130` s) and reports an "average" of 36 minutes.
* **Smallest fix:** If this is acceptable for synthetic-only data (matching `recallToArrivalSeconds` and `surveyScoreSum`), document that `n = 1` sums match single-visit values; otherwise suppress the average/bands in `summaryInput` when `recalled < 2` (or update `lib/summaryPrompt.ts:18` to say `"If recalled is 1, note that only one visit was recalled rather than calling it an average"`).

---

## 2. The 2 new rules

`"Divide it by recalled, then by 60"` does **not** guarantee the same number as the dashboard row `"Average minutes from offer to recall"`, and `"If recalled is 0, say there is no wait data yet"` conflicts with `"If most counts are 0, say that there is not much to report yet"` as well as per-site and `waitingNow > 0` cases.

* **Missing rounding rule and LLM arithmetic drift vs. the dashboard row**
* **File and line:** `lib/summaryPrompt.ts:18`.
* **What goes wrong:** The rule tells Claude to divide `offerToCallSeconds` by `recalled`, then by `60`, without saying to round to the nearest whole minute. Claude can output decimals (e.g., `27.8 minutes`), truncate, round `.5` down/to-even instead of JavaScript's half-up `Math.round`, or mis-divide large integers in prose—disagreeing with the dashboard's rounded whole-minute row. (In addition, the line right above at `lib/summaryPrompt.ts:16` tells Claude to divide `recallToArrivalSeconds` by `arrivedAfterRecall` without `"then by 60"`, making the two adjacent seconds-based rules inconsistent.)
* **Example input:** Site A has `recalled: 2, offerToCallSeconds: 3660` (mean `30.5` minutes -> dashboard rounds half-up to `31`), or `recalled: 6, offerToCallSeconds: 25017` (`69.4917` minutes -> dashboard shows `69`, while LLM arithmetic or rounding can produce `69.5` or `70`).
* **Smallest fix:** Pre-compute rounded whole-minute averages in `lib/summaryInput.ts` (matching the dashboard calculation) or at minimum add `"and round to the nearest whole minute"` to `lib/summaryPrompt.ts:18` (and fix `"then by 60"` on line 16).

* **Band rule omits `round(seconds / 60)`, creating an apparent conflict near `.5`-minute boundaries**
* **File and line:** `lib/summaryPrompt.ts:20`.
* **What goes wrong:** `lib/waitBand.ts` bins waits using `round(seconds / 60)` (`1770` s = `29.5` min -> `30` -> `wait30to59`). Line 20 states `"minutes from offer to recall: under 30, 30 to 59..."` without mentioning rounding. If Claude sees `recalled: 1, offerToCallSeconds: 1780` (`29.67` min) with `wait30to59: 1`, unrounded arithmetic (`29.67`) looks like it contradicts `wait30to59: 1`.
* **Example input:** `{ ...siteBase, recalled: 1, offerToCallSeconds: 1780, waitUnder30: 0, wait30to59: 1, wait60to119: 0, wait120plus: 0 }`.
* **Smallest fix:** Change `lib/summaryPrompt.ts:20` to `"count the recalled visits by rounded minutes from offer to recall: under 30, 30 to 59, 60 to 119, and 120 or more"`.

* **`"If recalled is 0, say there is no wait data yet"` conflicts with `"not much to report yet"`, single-site activity, and `waitingNow > 0`**
* **File and line:** `lib/summaryPrompt.ts:20, 22` (and length cap on line 8).
* **What goes wrong:**
1. When both sites start the day at `0` (all counts `0`), both `"say there is no wait data yet"` (line 20) and `"say that there is not much to report yet"` (line 22) trigger simultaneously inside a 2–3 sentence cap, causing redundant filler or forcing Claude to drop one rule.
2. Line 20 is not scoped per site: if Site A has `recalled: 5` and Site B has `recalled: 0`, saying `"there is no wait data yet"` without specifying Site B contradicts Site A's wait data.
3. When patients *are* waiting off-site (`waitingNow: 8`, `recalled: 0`), saying `"no wait data yet"` misleads staff into thinking nobody is waiting or the wait system is broken, when really no patients have been recalled yet.
* **Example input:** Site A `{ waitingNow: 8, triaged: 10, offered: 8, accepted: 8, recalled: 0, offerToCallSeconds: 0, waitUnder30: 0, wait30to59: 0, wait60to119: 0, wait120plus: 0 }` and Site B all `0`s.
* **Smallest fix:** Replace the second sentence of `lib/summaryPrompt.ts:20` with `"If recalled is 0 for a site (and other counts are non-zero), say no visits have been recalled there yet."`

---

## 3. The tests

* **If a 24th field is added to `SiteNumbers` and sent by accident:** `lib/summaryInput.test.ts` **does** fail the `Object.keys(out.sites[site]).sort()` vs `KEYS` check *if* `KEYS` is left at 23 and the field is always present on the output object. However, removing `SummarySite` (`Omit<SiteNumbers, ...>`) removes the TypeScript safeguard, and `KEYS` is only checked against the test fixture.
* **If one of the 2 rule lines is removed:** `lib/summaryPrompt.test.ts` **does** fail (`expect(waitRule).toBeDefined()` or `expect(bandRule).toBeDefined()`). However, the assertions inside those checks are weak enough that removing critical parts of either rule still passes.

* **Removing `SummarySite` turns TypeScript into a force-send trap, and optional 24th fields bypass `KEYS`**
* **File and line:** `lib/summaryInput.ts:9, 22` and `lib/summaryInput.test.ts` (`KEYS` check).
* **What goes wrong:** Previously `SummaryInput` used `SummarySite = Omit<SiteNumbers, ...>`, so adding a dashboard-only field to `SiteNumbers` did not allow `siteTotals` to return it. Now `siteTotals(n: SiteNumbers): SiteNumbers` requires returning *all* fields of `SiteNumbers`: adding a 24th field (like a clock time or display string) to `SiteNumbers` breaks `npm run build` unless `siteTotals` also sends it to Claude (and forces updating `numbers()` in `lib/summaryInput.test.ts`, right next to `KEYS`). Worse, if a 24th field on `SiteNumbers` is optional (`extra?: string`) and copied conditionally (`...(n.extra ? { extra: n.extra } : {})`), `numbers(1)` leaves it unset, `Object.keys` still has 23 keys, and all tests pass.
* **Example input:** Add `lastCallTime?: string` to `SiteNumbers` in `lib/dashboardNumbers.ts`, copy it conditionally in `siteTotals`, and run `npm test`: `lib/summaryInput.test.ts` passes even though `lastCallTime` is sent whenever present.
* **Smallest fix:** Restore an explicit allow-list type `type SummarySite = Pick<SiteNumbers, ...>` (or keep `SummarySite` distinct from `SiteNumbers`) in `lib/summaryInput.ts:9, 22` so adding a 24th field to `SiteNumbers` never forces `siteTotals` to send it, and pass a full object with any optional fields populated in `lib/summaryInput.test.ts`.

* **`lib/summaryInput.test.ts` does not verify the values of 3 of the 6 new wait fields**
* **File and line:** `lib/summaryInput.test.ts` (the 3 new `expect` lines at the bottom of the 23-key test).
* **What goes wrong:** The test only asserts values for `recalled`, `offerToCallSeconds`, and `wait120plus`, while `waitUnder30`, `wait30to59`, and `wait60to119` are only checked with `typeof v === "number"`. Swapping `wait30to59: n.wait60to119` and `wait60to119: n.wait30to59` (or hardcoding `waitUnder30: 0`) in `lib/summaryInput.ts` passes every test.
* **Example input:** In `lib/summaryInput.ts:43-45`, set `waitUnder30: 0` or swap `wait30to59` and `wait60to119`, then run `npx vitest run lib/summaryInput`: all tests pass.
* **Smallest fix:** Add `expect` value checks for `waitUnder30`, `wait30to59`, and `wait60to119` (or assert `expect(out.sites.A).toEqual(numbers(1))` and `expect(out.sites.B).toEqual(numbers(100))`).

* **`lib/summaryPrompt.test.ts` passes even when the core math, rounding/band bounds, and `"no wait data yet"` instructions are deleted**
* **File and line:** `lib/summaryPrompt.test.ts` (`"tells Claude how to read the wait numbers, and to give no average when recalled is 0"`).
* **What goes wrong:** The test only verifies that `offerToCallSeconds` + `/sum/i` + `recalled` appear in one rule, the four band names appear in another rule, and `/recalled is 0/` appears *somewhere* in `SUMMARY_RULES`. It never checks `"60"`, `"divide"`, `"do not give that average"`, the band cutoffs (`"under 30"`, `"30 to 59"`, `"60 to 119"`, `"120 or more"`), `"no wait data yet"`, or that `"recalled is 0"` is in *both* rules.
* **Example input:** Edit `lib/summaryPrompt.ts:18` to `"offerToCallSeconds is a sum for recalled."` (dropping `"divide"`, `"60"`, and `"do not give that average"`) and delete `"If recalled is 0, say there is no wait data yet."` from line 20 while putting `"recalled is 0"` only in line 18: `lib/summaryPrompt.test.ts` still passes.
* **Smallest fix:** Assert `expect(waitRule).toContain("60")`, `expect(waitRule).toMatch(/divide/i)`, `expect(waitRule).toMatch(/recalled is 0.*do not give/i)`, and assert that `bandRule` matches `/under 30.*30 to 59.*60 to 119.*120 or more/i` and `/recalled is 0.*no wait data yet/i`.

## Claude's check

1. n = 1 wait: valid as a fact, not a rule break. The dashboard row already shows the same average with "(1 visit)" next to it (components/dashboard/SiteNumbers.tsx:45-46), so the summary tells staff nothing the screen does not. Data is synthetic. Owner decision: the wording when `recalled` is 1.
2a. Rounding: valid. The dashboard uses `Math.round(totalSeconds / count / 60)` (lib/dashboardShare.ts:8). The old line 16 also has no "then by 60", so Claude can give seconds as minutes: a real fault from before this change. Fix: both rules say "then by 60, and round to the nearest whole minute". I do not pre-compute averages, because that changes the 23 fields Gemini just checked.
2b. Band rounding: valid. Fix: "by minutes from offer to recall, rounded to the nearest whole minute".
2c. "no wait data yet": valid in parts 2 and 3 (not per site; misleading when patients wait). Part 1 is minor. Owner decision: the new words.
3a. Type safeguard: valid. Fix: an explicit `SummarySite = Pick<SiteNumbers, ...23 names>`, so a new `SiteNumbers` field does not break the build and is not sent. The optional-field case is unlikely; the Pick type also covers it, because a field not in the Pick cannot be in the return type.
3b. Values of 3 fields: valid. Fix: `expect(out.sites.A).toEqual(numbers(1))` and the same for B.
3c. Prompt test: partly valid. Fix: check "60", "round" and "do not give that average" in the wait rule, the 4 cutoffs and "round" in the band rule, and the chosen zero wording in the band rule. I do not pin the full text.
