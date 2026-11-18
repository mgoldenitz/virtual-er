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
