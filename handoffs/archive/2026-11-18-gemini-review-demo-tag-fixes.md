# Gemini review, round 2: fixes to the Demo tag

Model: Gemini Hydrogen 4, High, in a new chat. Your job is to find problems, not to confirm.

## Context

A concept prototype of a virtual ER waiting room (Next.js App Router, React, Tailwind, Vitest). Synthetic data only. The staff screen shows a small "Demo" tag next to the visit code of demo visits (`is_demo = true`). Round 1 found: no space between the code and the tag, an `inline` tag with padding and border, the tag missing in Recently closed, and test gaps. Owner choices: a screen reader says "ABC234, Demo visit"; no tag on the patient slip (`VisitSlip`); the "·" separators on the whole staff screen are a later step, not this one.

`DemoTag` is used in `VisitRow.tsx` (inside `<p className="font-mono text-xl font-bold tracking-widest">` right after `{visit.code}`), in `ExpectedArrivals.tsx` (after `<span className="font-mono text-lg font-bold tracking-widest">{visit.code}</span>`, then " · needs reassessment" or " · started ... ago"), and now in `RecentlyClosed.tsx`.

## Questions

1. With the fragment that starts with `{" "}`, is the text a screen reader gets "ABC234 , Demo visit" in each of the 3 places? Is there any place where the space or the comma is lost, or doubled?
2. In `RecentlyClosed.tsx`, the line is `<DemoTag isDemo={visit.is_demo} /> {closedLabel(visit)}`. For a real visit, `DemoTag` returns null. Does that leave a double space, or a leading space, that matters?
3. Does `ml-1` plus a real space give too much gap next to `tracking-widest` text? Is `inline-block` with `py-0.5` and `border-2` inside a `text-xl` line OK in a `flex items-baseline` row?
4. Do the new tests prove the 3 fixes (space and comma, tag in Recently closed, reassess branch)? Could a wrong change still pass them?

## Changed files (line counts)

- components/staff/DemoTag.tsx: 13 lines
- components/staff/RecentlyClosed.tsx: 105 lines
- components/staff/RecentlyClosed.test.tsx: 34 lines (new)
- components/staff/VisitRow.test.tsx: 55 lines
- components/staff/ExpectedArrivals.test.tsx: 54 lines

## Diff

```diff
diff --git a/components/staff/DemoTag.tsx b/components/staff/DemoTag.tsx
index 8a65cf0..d3ada9e 100644
--- a/components/staff/DemoTag.tsx
+++ b/components/staff/DemoTag.tsx
@@ -1,10 +1,13 @@
-// A small "Demo" tag next to a visit code on the staff screen. It shows only for demo (synthetic) visits.
+// A small "Demo" tag next to a visit code on the staff screen. It shows only for demo visits.
 
 export function DemoTag({ isDemo }: { isDemo: boolean }) {
   if (!isDemo) return null;
   return (
-    <span data-testid="demo-tag" className="ml-2 rounded border-2 border-slate-700 bg-slate-100 px-1.5 py-0.5 align-middle font-sans text-sm font-bold tracking-normal text-slate-900">
-      Demo<span className="sr-only"> visit, synthetic data</span>
-    </span>
+    <>
+      {" "}
+      <span data-testid="demo-tag" className="ml-1 inline-block whitespace-nowrap rounded border-2 border-slate-700 bg-slate-100 px-1.5 py-0.5 font-sans text-sm font-bold tracking-normal text-slate-900">
+        <span className="sr-only">, </span>Demo<span className="sr-only"> visit</span>
+      </span>
+    </>
   );
 }
diff --git a/components/staff/ExpectedArrivals.test.tsx b/components/staff/ExpectedArrivals.test.tsx
index 8ebb9fe..432f03d 100644
--- a/components/staff/ExpectedArrivals.test.tsx
+++ b/components/staff/ExpectedArrivals.test.tsx
@@ -26,14 +26,27 @@ describe("ExpectedArrivals demo tag", () => {
   const now = new Date("2026-11-15T20:00:00Z");
   const input = { id: "v1", code: "ABC234", access_token: "TOKEN", site: "A" as const, language: "en" };
 
+  /** The visible and spoken text of the page, with the tags removed. */
+  const text = (html: string) => html.replace(/<[^>]+>/g, "");
+  /** The inner HTML of the list item with this test id. */
+  const itemHtml = (html: string, testId: string) => html.match(new RegExp(`data-testid="${testId}"[^>]*>([\\s\\S]*?)</li>`))?.[1] ?? "";
+
   it("shows a Demo tag next to the code of a demo expected arrival", () => {
     const visit = startFromHome({ ...input, is_demo: true }, now);
     const html = renderToStaticMarkup(<ExpectedArrivals visits={[visit]} site="A" now={now} onChoose={() => {}} />);
-    expect(html).toMatch(/data-testid="expected-ABC234"[\s\S]*data-testid="demo-tag"[^>]*>Demo</);
+    expect(itemHtml(html, "expected-ABC234")).toContain('data-testid="demo-tag"');
+    expect(text(html)).toContain(", Demo visit");
+    expect(text(html)).not.toContain("synthetic");
+  });
+
+  it("shows a Demo tag for a demo visit back for reassessment", () => {
+    const visit = { ...startFromHome({ ...input, is_demo: true }, now), status: "needs_reassessment" as const, triaged_at: now.toISOString() };
+    const html = renderToStaticMarkup(<ExpectedArrivals visits={[visit]} site="A" now={now} onChoose={() => {}} />);
+    expect(itemHtml(html, "reassess-ABC234")).toContain('data-testid="demo-tag"');
   });
 
   it("shows no Demo tag for a real expected arrival", () => {
-    const visit = startFromHome(input, now);
+    const visit = startFromHome({ ...input, is_demo: false }, now);
     const html = renderToStaticMarkup(<ExpectedArrivals visits={[visit]} site="A" now={now} onChoose={() => {}} />);
     expect(html).toContain("ABC234");
     expect(html).not.toContain("demo-tag");
diff --git a/components/staff/RecentlyClosed.test.tsx b/components/staff/RecentlyClosed.test.tsx
new file mode 100644
index 0000000..581afc5
--- /dev/null
+++ b/components/staff/RecentlyClosed.test.tsx
@@ -0,0 +1,34 @@
+// Checks that the Recently closed list shows the Demo tag only for demo visits, after the code.
+
+import { renderToStaticMarkup } from "react-dom/server";
+import { describe, expect, it, vi } from "vitest";
+import { checkInAtDesk, markArrived } from "@/lib/visitActions";
+import { RecentlyClosed } from "./RecentlyClosed";
+
+// The Undo and Reopen buttons save through Supabase; the render test never presses them.
+vi.mock("@/data/staffActions", () => ({}));
+
+const now = new Date("2026-11-15T20:00:00Z");
+const minutesAgo = (min: number) => new Date(now.getTime() - min * 60_000);
+const input = { id: "v1", code: "ABC234", access_token: "TOKEN", site: "A" as const, ctas_level: 4 as const, language: "en" };
+const render = (visit: Parameters<typeof RecentlyClosed>[0]["visits"][number]) =>
+  renderToStaticMarkup(<RecentlyClosed visits={[visit]} site="A" onUndoResult={vi.fn()} onReopened={vi.fn()} />);
+
+/** A visit already marked arrived, so it shows in Recently closed. */
+const closed = (isDemo: boolean) => markArrived(checkInAtDesk({ ...input, is_demo: isDemo }, "waiting", minutesAgo(30)), now)!;
+
+/** The inner HTML of the list item for one visit code. */
+const itemHtml = (html: string, code: string) => html.match(new RegExp(`data-testid="closed-${code}"[^>]*>([\\s\\S]*?)</li>`))?.[1] ?? "";
+
+describe("RecentlyClosed demo tag", () => {
+  it("shows a Demo tag inside the closed row for a demo visit", () => {
+    const html = render(closed(true));
+    expect(itemHtml(html, "ABC234")).toContain('data-testid="demo-tag"');
+  });
+
+  it("shows no Demo tag inside the closed row for a real visit", () => {
+    const html = render(closed(false));
+    expect(html).toContain("ABC234");
+    expect(itemHtml(html, "ABC234")).not.toContain("demo-tag");
+  });
+});
diff --git a/components/staff/RecentlyClosed.tsx b/components/staff/RecentlyClosed.tsx
index 9a72c19..e03777e 100644
--- a/components/staff/RecentlyClosed.tsx
+++ b/components/staff/RecentlyClosed.tsx
@@ -10,6 +10,7 @@ import { reopenVisit, undoCloseVisit } from "@/data/staffActions";
 import { CLOSED_PAGE_SIZE, closedLabel, recentlyClosed } from "@/lib/recentlyClosed";
 import type { Site, Visit } from "@/lib/visit";
 import { Button } from "@/components/Button";
+import { DemoTag } from "./DemoTag";
 
 type Props = {
   visits: Visit[];
@@ -79,7 +80,8 @@ export function RecentlyClosed({ visits, site, onUndoResult, onReopened }: Props
           <li key={visit.id} tabIndex={-1} className="rounded-lg border-2 border-slate-300 bg-white p-3" data-testid={`closed-${visit.code}`}>
             <div className="flex flex-wrap items-center justify-between gap-2">
               <p>
-                <span className="font-mono font-bold tracking-widest">{visit.code}</span> {closedLabel(visit)}
+                <span className="font-mono font-bold tracking-widest">{visit.code}</span>
+                <DemoTag isDemo={visit.is_demo} /> {closedLabel(visit)}
               </p>
               <Button variant="secondary" aria-disabled={savingId !== null} onClick={() => undo(visit)}>
                 {savingId === visit.id ? "Saving…" : visit.status === "unable_to_reach" ? "Reopen" : "Undo"}
diff --git a/components/staff/VisitRow.test.tsx b/components/staff/VisitRow.test.tsx
index eb9e120..993a467 100644
--- a/components/staff/VisitRow.test.tsx
+++ b/components/staff/VisitRow.test.tsx
@@ -34,13 +34,22 @@ describe("VisitRow times", () => {
 });
 
 describe("VisitRow demo tag", () => {
+  /** The visible and spoken text of the row, with the tags removed. */
+  const text = (html: string) => html.replace(/<[^>]+>/g, "");
+
   it("shows a Demo tag next to the code for a demo visit", () => {
     const html = render(checkInAtDesk({ ...input, is_demo: true }, "waiting", minutesAgo(10)));
     expect(html).toContain('data-testid="demo-tag"');
-    expect(html).toMatch(/data-testid="demo-tag"[^>]*>Demo</);
+    expect(html).toMatch(/data-testid="demo-tag"[^>]*>/);
+  });
+
+  it("reads the demo tag as ', Demo visit' after the code, with no 'synthetic' wording", () => {
+    const html = render(checkInAtDesk({ ...input, is_demo: true }, "waiting", minutesAgo(10)));
+    expect(text(html)).toContain(", Demo visit");
+    expect(text(html)).not.toContain("synthetic");
   });
 
   it("shows no Demo tag for a real visit", () => {
-    expect(render(checkInAtDesk(input, "waiting", minutesAgo(10)))).not.toContain("demo-tag");
+    expect(render(checkInAtDesk({ ...input, is_demo: false }, "waiting", minutesAgo(10)))).not.toContain("demo-tag");
   });
 });
```

## Checked

- `npm test`: 66 files, 384 tests passed.
- `npm run lint`: no errors.
- `npm run build`: passed.

## Not checked

- The tag on a real screen in a browser, at 320 px, or at 200% zoom.
- A real screen reader (NVDA, VoiceOver).

## Response

Skipped by the owner on 2026-11-18. No review was done.
