# Review: "Demo" tag on staff rows (Phase 4, step 2)

Model: Gemini Hydrogen 4, High, in a new chat.

## What to paste into Gemini

Paste everything below the line "Text for Gemini". The diff is in it.

## Text for Gemini

Find problems in this change. Do not confirm that it is correct. List each problem with the file, the line, and a concrete case where it goes wrong.

The project is a concept prototype of a virtual ER waiting room (Next.js App Router, React, Tailwind). Synthetic data only. Some visits are demo visits (visit.is_demo = true), made by a database simulator. The SPEC says: "Demo visits show a "Demo" tag on the staff screen." Staff use the screen on a laptop or a phone; it must work with a screen reader and at 200% zoom.

Settled, do not report:
- The tag shows only on the staff screen, never on the patient screen.
- The visible word is "Demo"; a screen reader also hears " visit, synthetic data".
- is_demo comes from the database row (select "*"); no data change is needed.

Questions:
1. Can a real visit (is_demo = false) ever show the tag, or a demo visit miss it, on any staff list?
2. Is the screen reader text clear when read with the code (for example "ABC234 Demo visit, synthetic data")? Is there a better order or word?
3. Does the tag break the layout at 320 px width or at 200% zoom, given the code uses font-mono and tracking-widest?
4. Is any staff list that shows a visit code missing the tag (the diff covers VisitRow and ExpectedArrivals only; RecentlyClosed and VisitSlip are not changed)?

Changed files (line counts after the change):
- components/staff/DemoTag.tsx (new, 10 lines)
- components/staff/VisitRow.tsx (147 lines, 5 added, 1 removed)
- components/staff/ExpectedArrivals.tsx (124 lines, 5 added, 2 removed)
- components/staff/VisitRow.test.tsx (46 lines, 12 added)
- components/staff/ExpectedArrivals.test.tsx (41 lines, 19 added)

```
diff --git a/components/staff/DemoTag.tsx b/components/staff/DemoTag.tsx
new file mode 100644
index 0000000..8a65cf0
--- /dev/null
+++ b/components/staff/DemoTag.tsx
@@ -0,0 +1,10 @@
+// A small "Demo" tag next to a visit code on the staff screen. It shows only for demo (synthetic) visits.
+
+export function DemoTag({ isDemo }: { isDemo: boolean }) {
+  if (!isDemo) return null;
+  return (
+    <span data-testid="demo-tag" className="ml-2 rounded border-2 border-slate-700 bg-slate-100 px-1.5 py-0.5 align-middle font-sans text-sm font-bold tracking-normal text-slate-900">
+      Demo<span className="sr-only"> visit, synthetic data</span>
+    </span>
+  );
+}
diff --git a/components/staff/ExpectedArrivals.test.tsx b/components/staff/ExpectedArrivals.test.tsx
index 5bca3df..8ebb9fe 100644
--- a/components/staff/ExpectedArrivals.test.tsx
+++ b/components/staff/ExpectedArrivals.test.tsx
@@ -2,6 +2,7 @@
 
 import { renderToStaticMarkup } from "react-dom/server";
 import { describe, expect, it, vi } from "vitest";
+import { startFromHome } from "@/lib/visitActions";
 import { ExpectedArrivals } from "./ExpectedArrivals";
 
 // The box looks up a code in the database; the test does not need that.
@@ -20,3 +21,21 @@ describe("ExpectedArrivals on a narrow screen", () => {
     expect(label.split(" ")).toContain("max-w-full");
   });
 });
+
+describe("ExpectedArrivals demo tag", () => {
+  const now = new Date("2026-11-15T20:00:00Z");
+  const input = { id: "v1", code: "ABC234", access_token: "TOKEN", site: "A" as const, language: "en" };
+
+  it("shows a Demo tag next to the code of a demo expected arrival", () => {
+    const visit = startFromHome({ ...input, is_demo: true }, now);
+    const html = renderToStaticMarkup(<ExpectedArrivals visits={[visit]} site="A" now={now} onChoose={() => {}} />);
+    expect(html).toMatch(/data-testid="expected-ABC234"[\s\S]*data-testid="demo-tag"[^>]*>Demo</);
+  });
+
+  it("shows no Demo tag for a real expected arrival", () => {
+    const visit = startFromHome(input, now);
+    const html = renderToStaticMarkup(<ExpectedArrivals visits={[visit]} site="A" now={now} onChoose={() => {}} />);
+    expect(html).toContain("ABC234");
+    expect(html).not.toContain("demo-tag");
+  });
+});
diff --git a/components/staff/ExpectedArrivals.tsx b/components/staff/ExpectedArrivals.tsx
index 963aa58..ffcf992 100644
--- a/components/staff/ExpectedArrivals.tsx
+++ b/components/staff/ExpectedArrivals.tsx
@@ -9,6 +9,7 @@ import { useState, type FormEvent } from "react";
 import { findVisitByCode } from "@/data/staffActions";
 import { backForReassessment, expectedArrivals, isExpected } from "@/lib/expectedArrivals";
 import { Duration } from "./Duration";
+import { DemoTag } from "./DemoTag";
 import { minutesBetween } from "@/lib/queue";
 import type { Site, Visit } from "@/lib/visit";
 import { Button } from "@/components/Button";
@@ -87,7 +88,8 @@ export function ExpectedArrivals({ visits, site, now, onChoose }: Props) {
                 data-testid={`reassess-${visit.code}`}
               >
                 <p>
-                  <span className="font-mono text-lg font-bold tracking-widest">{visit.code}</span> · needs reassessment
+                  <span className="font-mono text-lg font-bold tracking-widest">{visit.code}</span>
+                  <DemoTag isDemo={visit.is_demo} /> · needs reassessment
                 </p>
                 <Button variant="secondary" onClick={() => onChoose(visit)}>
                   Triage again<span className="sr-only"> visit {visit.code}</span>
@@ -106,7 +108,8 @@ export function ExpectedArrivals({ visits, site, now, onChoose }: Props) {
               data-testid={`expected-${visit.code}`}
             >
               <p>
-                <span className="font-mono text-lg font-bold tracking-widest">{visit.code}</span> · started{" "}
+                <span className="font-mono text-lg font-bold tracking-widest">{visit.code}</span>
+                <DemoTag isDemo={visit.is_demo} /> · started{" "}
                 <Duration minutes={minutesBetween(visit.created_at, now)} /> ago
               </p>
               <Button variant="secondary" onClick={() => onChoose(visit)}>
diff --git a/components/staff/VisitRow.test.tsx b/components/staff/VisitRow.test.tsx
index c967dc0..eb9e120 100644
--- a/components/staff/VisitRow.test.tsx
+++ b/components/staff/VisitRow.test.tsx
@@ -32,3 +32,15 @@ describe("VisitRow times", () => {
     expect(render(checkInAtDesk(input, "waiting", minutesAgo(45)))).toContain(`waited <strong>${shown("45 min", "45 minutes")}</strong>`);
   });
 });
+
+describe("VisitRow demo tag", () => {
+  it("shows a Demo tag next to the code for a demo visit", () => {
+    const html = render(checkInAtDesk({ ...input, is_demo: true }, "waiting", minutesAgo(10)));
+    expect(html).toContain('data-testid="demo-tag"');
+    expect(html).toMatch(/data-testid="demo-tag"[^>]*>Demo</);
+  });
+
+  it("shows no Demo tag for a real visit", () => {
+    expect(render(checkInAtDesk(input, "waiting", minutesAgo(10)))).not.toContain("demo-tag");
+  });
+});
diff --git a/components/staff/VisitRow.tsx b/components/staff/VisitRow.tsx
index 8fcfbc5..e58223e 100644
--- a/components/staff/VisitRow.tsx
+++ b/components/staff/VisitRow.tsx
@@ -11,6 +11,7 @@ import { lastTapThisWait, stillHereState } from "@/lib/stillHere";
 import type { ChangeResult, Visit } from "@/lib/visit";
 import { Button } from "@/components/Button";
 import { Duration } from "./Duration";
+import { DemoTag } from "./DemoTag";
 import { FollowUpPanel } from "./FollowUpPanel";
 import { NewLinkPanel } from "./NewLinkPanel";
 import { RecallPanel } from "./RecallPanel";
@@ -95,7 +96,10 @@ export function VisitRow({ visit, now, onShowSlip, onLeftList }: Props) {
   return (
     <li className="rounded-xl border-2 border-slate-300 bg-white p-4" data-testid={`row-${visit.code}`}>
       <div className="flex flex-wrap items-baseline justify-between gap-2">
-        <p className="font-mono text-xl font-bold tracking-widest">{visit.code}</p>
+        <p className="font-mono text-xl font-bold tracking-widest">
+          {visit.code}
+          <DemoTag isDemo={visit.is_demo} />
+        </p>
         <p>
           CTAS {visit.ctas_level} · waited <strong><Duration minutes={waited} /></strong>
         </p>
```

## Checked (output in this session, 2026-11-18)

- npm test: 65 files, 380 tests passed (4 new). npm run lint: no errors. npm run build: completed.

## Not checked

- The tag in a browser (no Playwright check, no screenshot at 320 px or 200% zoom).
- A screen reader reading the tag.
- RecentlyClosed and VisitSlip: not changed, so they show no tag.

## What to bring back

Gemini's full answer. Paste it under "Response" below.

## Response

Gemini Hydrogen 4, High, new chat, 2026-11-18. Full answer as pasted:

### Problems Found

1. Demo visits lose their "Demo" tag in RecentlyClosed and VisitSlip
* File & line: components/staff/RecentlyClosed.tsx (unchanged in diff) and components/staff/VisitSlip.tsx (unchanged in diff).
* Concrete case: Staff mark a demo visit (is_demo = true) as arrived or remove it from the active queue; it moves into the "Recently closed" list on /staff with its 6-character code shown and no "Demo" tag. Similarly, when staff open "Show QR again" or "Issue a new link" on a demo visit, VisitSlip displays the visit code on the staff screen without <DemoTag/>.

2. No whitespace between {visit.code} and <DemoTag/> causes screen-reader text concatenation ("ABC234Demo") and prevents wrapping between them
* File & line: components/staff/VisitRow.tsx, lines 99-102; components/staff/ExpectedArrivals.tsx, lines 90-93 and 110-114; components/staff/DemoTag.tsx, lines 6-7.
* Concrete case: Because {visit.code} and <DemoTag/> have no space character between them in the JSX, the rendered DOM text node sequence is ABC234Demo visit, synthetic data. Screen readers that concatenate adjacent inline <span> nodes without injecting spaces announce "ABC234Demo" as one combined word/token instead of reading the code and "Demo" separately. At the same time, lacking a break opportunity forces {visit.code} + DemoTag (~180-195 px wide with font-mono and tracking-widest) to stay on one unbreakable line, which overflows narrow containers at 200% zoom on a phone (~140-160 px inner width).

3. ExpectedArrivals wraps awkwardly with an orphaned middle dot (·) at 320 px width and 200% zoom
* File & line: components/staff/ExpectedArrivals.tsx, lines 90-93 and 110-114.
* Concrete case: At 320 px viewport width (or 200% zoom on a 640 px window), inner card width is ~240-256 px. <span className="font-mono text-lg font-bold tracking-widest">{visit.code}</span> (~118 px) plus <DemoTag/> (ml-2 + px-1.5 + border-2 + "Demo" ≈ 64 px) consumes ~182 px of line 1, forcing a line break right before " · needs reassessment" or " · started 12 min ago". Line 2 begins with a leading middle dot (· needs reassessment), and at 200% zoom on a 375 px phone (187.5 px CSS width), the unbreakable code + DemoTag pair overflows the card horizontally.

4. DemoTag uses display: inline with vertical padding/borders and align-middle inside an items-baseline flex row
* File & line: components/staff/DemoTag.tsx, line 6 (className="ml-2 rounded border-2 ... px-1.5 py-0.5 align-middle ..."); components/staff/VisitRow.tsx, lines 98-102.
* Concrete case: Because <span> defaults to display: inline rather than inline-block whitespace-nowrap, its border-2 and py-0.5 do not contribute to line-box height; if the badge wraps onto a second line on a zoomed phone, its top/bottom borders collide with the line box of {visit.code} above it and ml-2 indents the wrapped badge 8 px from the left edge. In addition, align-middle on the text-sm badge inside a text-xl <p> shifts the baseline of the flex item in VisitRow.tsx line 98 (items-baseline), misaligning {visit.code} with CTAS 4 · waited ... on the same row.

5. Unit tests miss the reassess branch, explicit is_demo: false, and the sr-only text
* File & line: components/staff/ExpectedArrivals.test.tsx, lines 27-40; components/staff/VisitRow.test.tsx, lines 37-45.
* Concrete case: ExpectedArrivals.test.tsx only tests startFromHome (expected-${visit.code} on line 108) and never renders a backForReassessment visit (reassess-${visit.code} on line 92). Both "shows no Demo tag" tests pass input with is_demo omitted (undefined) rather than is_demo: false, and both test files match only >Demo<, so deleting or breaking <span className="sr-only"> visit, synthetic data</span> in DemoTag.tsx line 7 would still pass every test.

### Answers to Questions

1. Can a real visit (is_demo = false) ever show the tag, or a demo visit miss it, on any staff list?
* Real visit showing the tag: No in VisitRow and ExpectedArrivals. if (!isDemo) return null; (DemoTag.tsx line 4) returns null for false (as well as null/undefined).
* Demo visit missing the tag: Yes, on any staff surface not updated in this diff, specifically RecentlyClosed (recently closed demo visits on /staff) and VisitSlip (the QR slip view shown on /staff after check-in, "Show QR again", or "Issue a new link"), as well as repeated {visit.code} mentions inside VisitRow sub-panels (FollowUpPanel, RecallPanel, NewLinkPanel).

2. Is the screen reader text clear when read with the code (for example "ABC234 Demo visit, synthetic data")? Is there a better order or word?
* Clarity with the code: As rendered today ({visit.code}<DemoTag/> with no space), it reads as "ABC234Demo visit, synthetic data", which merges the code and "Demo" into one token. Even with a space added, "ABC234 Demo visit, synthetic data" runs the 6-character identifier directly into the label with no pause, and "synthetic data" is developer terminology rather than clinical/operational language.
* Better order or wording: Keep "Demo" first so visual and speech order match (WCAG 2.5.3 Label in Name), add a leading space and comma/pause separator so it reads "ABC234, demo visit, synthetic data" (or "ABC234, demo visit - test data" if wording is open), and in ExpectedArrivals.tsx replace the bare · separator with an aria-hidden="true" bullet plus a comma/pause so screen readers do not announce "middle dot".

3. Does the tag break the layout at 320 px width or at 200% zoom, given the code uses font-mono and tracking-widest?
* Yes, in ExpectedArrivals.tsx (lines 90-93 and 110-114) and on narrow viewports at 200% zoom:
  * visit.code (6 characters in font-mono text-lg tracking-widest, ~118 px) + <DemoTag/> (~64 px) forms a ~182 px unbreakable block.
  * At 320 px width (or a 640 px laptop window at 200% zoom), the ~240-256 px inner card width cannot fit " · needs reassessment" or " · started 12 min ago" on the same line, wrapping line 2 with a leading ·.
  * At 200% zoom on a 375-412 px phone (187.5-206 px CSS viewport width, ~140-158 px inside card padding), the ~182 px unbreakable code + DemoTag pair overflows the card horizontally, and if DemoTag wraps inside VisitRow (text-xl tracking-widest), its display: inline borders/padding overlap the line above. Adding a space between {visit.code} and <DemoTag/> and giving DemoTag inline-block whitespace-nowrap allows the badge to drop cleanly onto its own line below the code on narrow screens without clipping or border overlap.

4. Is any staff list that shows a visit code missing the tag?
* Yes:
  * components/staff/RecentlyClosed.tsx: Displays visit.code for every closed visit on /staff with no DemoTag, so closed demo visits look identical to closed real visits.
  * components/staff/VisitSlip.tsx: Displays visit.code on the staff screen whenever staff view or reprint a slip (CheckInPanel, "Show QR again", "Issue a new link") with no DemoTag.
  * Secondary code mentions inside VisitRow action panels (RecallPanel.tsx, NewLinkPanel.tsx, FollowUpPanel.tsx): Repeat visit.code inside confirmation prompts without DemoTag, though the parent VisitRow displays DemoTag directly above them.

## Check of the response

Checked against the code on commit `2bc692f`.

1. Tag missing in `RecentlyClosed` and `VisitSlip`. True. `RecentlyClosed.tsx` line 82 shows `{visit.code}` with no tag, and it has the visit row, so the fix is 1 line. Accept. `VisitSlip` gets only `code`, `token` and `language` from `app/staff/page.tsx` line 119, so a tag there needs a new prop. The slip is what the patient gets, so this is a product choice (asked below). The repeats in `RecallPanel`, `NewLinkPanel` and `FollowUpPanel` sit inside a row that already shows the tag. Reject: no change.
2. No space between the code and the tag. True: `VisitRow.tsx` lines 99 to 100 and `ExpectedArrivals.tsx` lines 91 to 92 put `{visit.code}` and `<DemoTag/>` on two lines, and JSX drops that line break. The text is "ABC234Demo". Accept: `DemoTag` adds a real space before the tag, and the screen reader text gets a comma.
3. A "·" can start the next line in `ExpectedArrivals` at 320 px. True, but it was so before the tag too: there are 6 "·" lines in `components/staff/`. Partial accept: the fix for point 4 lets the tag wrap cleanly. The "·" read aloud as "middle dot" is a pattern of the whole staff screen, so it goes in `docs/known-issues.md` and is not fixed in this step.
4. `inline` with padding and border, plus `align-middle` in a baseline row. True. Accept: `inline-block whitespace-nowrap`, and remove `align-middle`.
5. Test gaps. True: no reassess test, `is_demo` left out instead of `false`, and no test of the screen reader text. Accept all 3.

Answer 2 (wording) is a product choice (asked below).
