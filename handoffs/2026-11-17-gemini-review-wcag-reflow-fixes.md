# Gemini review: WCAG reflow fixes and the vibrate console error

Model: Gemini Hydrogen 4, High, in a new chat. If there are no Gemini Hydrogen 4 credits, use Gemini 3.6 Flash, High.

## What to paste into Gemini

Everything from "Prompt" to the end of the diff.

## Prompt

You review a concept prototype: a virtual ER waiting room (Next.js 16 App Router, React 19, Tailwind 4, Vitest). Synthetic data only. Find problems. Do not confirm that the code is good. For each problem, give the file, the line, what goes wrong, and a small fix. Say "no problem found" for a question only after you checked it.

The translations (French, Urdu, Arabic, Mandarin) are drafts. A fluent human reviewer checks them later. Do not review the translated words.

What changed (8 commits, diff below):

1. WCAG 1.4.10 reflow. axe-core 4.14.0 found no rule faults, but parts went off the right side of the screen at 200% text:
   - The patient language menu (`components/LanguageSwitch.tsx`) was wider than the screen. Fix: `max-w-full` on the `select`.
   - `/staff` was 433 px wide on a 390 px phone (100% text) and 841 px wide on a 768 px tablet (200% text). Cause: the page grid had no column rule, so its `auto` column grew to the width of the language `select` in check-in ("Français (French), draft until checked"). Fix in `app/staff/page.tsx`: `grid grid-cols-1 gap-6 lg:grid-cols-2`; the site label row wraps; `max-w-full` on the site and language selects and on the visit code box.
   - At 390 px and 200% text, the check-in fieldsets kept their browser default `min-width: min-content`, and the CTAS row did not wrap. Fix: `min-w-0` on both fieldsets, `flex-wrap` on the CTAS row, `max-w-full` on the visit code label.
2. Console error "Blocked call to navigator.vibrate" on each patient page load. Cause: the unmount cleanup in `components/patient/SoundSwitch.tsx` calls `stopVibration()`, which called `navigator.vibrate(0)` before any user tap (React Strict Mode in dev mounts and unmounts once at load). Fix in `components/patient/alertSound.ts`: a module flag `vibrationStarted`, set when `vibrate()` asks the phone for a vibration; `stopVibration()` returns at once when it is false, and clears it before the call. The test "stops a running vibration" now calls `playAlert()` first (the owner approved this setup change).

Questions:

1. Can any staff or patient part still go off the screen at 320 px or 390 px with 200% text, from the changed lines? Name the part and the width.
2. `grid-cols-1` below `lg` and `lg:grid-cols-2` at 1024 px and wider: is there a width or text size where the two staff columns are too narrow for their content?
3. Does `max-w-full` on a `select` make a long choice unreadable for a screen reader or a keyboard user? Is the cut-off choice text a WCAG fault (1.4.10 or 1.3.1)?
4. `vibrationStarted` is one module flag shared by every `SoundSwitch` on the page. Find a case where it stops a vibration that should go on, or leaves one running that should stop (for example a vibration that the phone ended by itself, two boxes, or a page that stays open across visits).
5. Do the class tests (they read class names from `renderToStaticMarkup` output) prove the reflow fix, or can they pass while the page still goes off the screen? Suggest a better check if one exists that does not need a signed-in staff session.
6. Anything else in the diff that is wrong.

Helper the changed lines call but that is not in the diff:

`components/patient/SoundSwitch.tsx` (194 lines), the two calls of `stopVibration()`:

```tsx
  function turnOff() {
    attempt.current += 1;
    busy.current = false;
    // A tap gives its own answer for focus, so an old answer from a failed repeat beep must not stay.
    backgroundFocus.current = null;
    setState("off");
    stopVibration();
  }

  // When the box leaves the page ("I'm on my way"), a beep that still waits must not play, and a
  // vibration must stop.
  useEffect(() => {
    return () => {
      attempt.current += 1;
      stopVibration();
    };
  }, []);
```

Line count of each changed file after the change:
- `app/staff/page.tsx`: 155
- `components/LanguageSwitch.tsx`: 37
- `components/LanguageSwitch.test.tsx`: 23 (new)
- `components/patient/alertSound.ts`: 111
- `components/patient/alertSound.test.ts`: 190
- `components/staff/CheckInPanel.tsx`: 275
- `components/staff/CheckInPanel.test.tsx`: 144
- `components/staff/ExpectedArrivals.tsx`: 121
- `components/staff/ExpectedArrivals.test.tsx`: 22 (new)

Checked (output in this session):
- `npm test`: 60 test files, 334 tests passed.
- `npm run lint`: 0 errors, 2 warnings (both from local helper scripts that are not in the repo).
- `npm run build`: passed.
- axe-core 4.14.0, WCAG 2.0, 2.1 and 2.2 A and AA rules, with a check of every part's position: patient screens (start, no visit, broken link, login, not yet triaged, `waiting`, `called`, `on_the_way`) at 320, 390 and 1280 px, five languages, 100% and 200% text: no fault, nothing off the screen. `/staff` at 390, 768 and 1280 px, 100% and 200% text: no fault, nothing off the screen.
- Console on /patient: 0 vibrate errors in 10 loads after the fix (30 in 30 before).

Not checked:
- `/staff` at 320 px.
- A real phone (vibration on Android after the fix).
- A screen reader on the staff selects.

## Diff

```diff
diff --git a/app/staff/page.tsx b/app/staff/page.tsx
index cc57b18..76b0266 100644
--- a/app/staff/page.tsx
+++ b/app/staff/page.tsx
@@ -70,7 +70,7 @@ export default function StaffPage() {
     <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
       <header className="glass-panel flex flex-wrap items-center justify-between gap-3">
         <h1 className="text-2xl font-bold">Staff: Virtual Waiting Room</h1>
-        <label className="flex items-center gap-2">
+        <label className="flex flex-wrap items-center gap-2">
           <span className="font-semibold">Site</span>
           <select
             value={site}
@@ -79,7 +79,7 @@ export default function StaffPage() {
               setSlip(null);
               setHomeVisit(null);
             }}
-            className="min-h-11 rounded-lg border-2 border-control px-3"
+            className="min-h-11 max-w-full rounded-lg border-2 border-control px-3"
           >
             <option value="A">Demo Site A</option>
             <option value="B">Demo Site B</option>
@@ -100,7 +100,7 @@ export default function StaffPage() {
         </div>
       )}
 
-      <div className="grid gap-6 lg:grid-cols-2">
+      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
         <div className="space-y-4">
           {visits && now && (
             <ExpectedArrivals visits={visits} site={site} now={now} onChoose={chooseHomeVisit} />
diff --git a/components/LanguageSwitch.test.tsx b/components/LanguageSwitch.test.tsx
new file mode 100644
index 0000000..a5f9330
--- /dev/null
+++ b/components/LanguageSwitch.test.tsx
@@ -0,0 +1,23 @@
+// Checks the language menu: it can never be wider than its box, so text at 200% does not make the page scroll sideways.
+
+import { renderToStaticMarkup } from "react-dom/server";
+import { describe, expect, it, vi } from "vitest";
+import { LanguageSwitch } from "./LanguageSwitch";
+
+// The menu saves the choice on the phone; the test does not need that.
+vi.mock("@/data/savedLanguage", () => ({ chooseLanguage: vi.fn() }));
+
+// The class list of the <select> tag in the rendered HTML.
+function selectClasses(html: string): string[] {
+  const tag = html.match(/<select[^>]*>/)?.[0] ?? "";
+  return (tag.match(/class="([^"]*)"/)?.[1] ?? "").split(" ");
+}
+
+describe("LanguageSwitch", () => {
+  it("keeps the menu inside the screen width (WCAG reflow at 200% text)", () => {
+    for (const language of ["en", "fr", "ur", "ar", "zh"]) {
+      const html = renderToStaticMarkup(<LanguageSwitch language={language} />);
+      expect(selectClasses(html)).toContain("max-w-full");
+    }
+  });
+});
diff --git a/components/LanguageSwitch.tsx b/components/LanguageSwitch.tsx
index 51cf3ff..2c62d07 100644
--- a/components/LanguageSwitch.tsx
+++ b/components/LanguageSwitch.tsx
@@ -18,7 +18,7 @@ export function LanguageSwitch({ language }: { language: string }) {
         <select
           value={current.code}
           onChange={(e) => chooseLanguage(e.target.value)}
-          className="min-h-11 rounded-lg border-2 border-control bg-card px-3"
+          className="min-h-11 max-w-full rounded-lg border-2 border-control bg-card px-3"
         >
           {LANGUAGES.map((l) => (
             <option key={l.code} value={l.code} lang={l.code} dir={l.dir}>
diff --git a/components/patient/alertSound.test.ts b/components/patient/alertSound.test.ts
index 1393da8..d48bdf5 100644
--- a/components/patient/alertSound.test.ts
+++ b/components/patient/alertSound.test.ts
@@ -167,8 +167,24 @@ describe("playAlert", () => {
 
 describe("stopVibration", () => {
   it("stops a running vibration", async () => {
-    const { stopVibration } = await load();
+    const { playAlert, stopVibration } = await load();
+    await playAlert();
     stopVibration();
     expect(vibrate).toHaveBeenCalledWith(0);
   });
+
+  it("does not call the phone when no vibration started", async () => {
+    // Before a tap the browser blocks every vibrate call and writes an error in the console.
+    const { stopVibration } = await load();
+    stopVibration();
+    expect(vibrate).not.toHaveBeenCalled();
+  });
+
+  it("calls the phone only once for one vibration", async () => {
+    const { playAlert, stopVibration } = await load();
+    await playAlert();
+    stopVibration();
+    stopVibration();
+    expect(vibrate.mock.calls.filter((call) => call[0] === 0)).toHaveLength(1);
+  });
 });
diff --git a/components/patient/alertSound.ts b/components/patient/alertSound.ts
index 8b304b4..c01bd5b 100644
--- a/components/patient/alertSound.ts
+++ b/components/patient/alertSound.ts
@@ -81,17 +81,28 @@ export async function playAlert(stillWanted: () => boolean = () => true): Promis
   }
 }
 
+/**
+ * True after vibrate() asked the phone for a vibration, until stopVibration() stops it. Before a tap
+ * the browser blocks every vibrate call with a console error, so stopVibration() calls only when needed.
+ */
+let vibrationStarted = false;
+
 /** One vibration pattern (200 ms on, 100 ms off, 200 ms on) where the phone allows it. */
 function vibrate(): void {
   try {
-    if (typeof navigator.vibrate === "function") navigator.vibrate([200, 100, 200]);
+    if (typeof navigator.vibrate === "function") {
+      navigator.vibrate([200, 100, 200]);
+      vibrationStarted = true;
+    }
   } catch {
     // Ignore: the on-screen words remain the real alert.
   }
 }
 
-/** Stops a vibration that is running. Phones with no vibration are ignored. */
+/** Stops a vibration that is running. Does nothing when no vibration started, or the phone has none. */
 export function stopVibration(): void {
+  if (!vibrationStarted) return;
+  vibrationStarted = false;
   try {
     navigator.vibrate?.(0);
   } catch {
diff --git a/components/staff/CheckInPanel.test.tsx b/components/staff/CheckInPanel.test.tsx
index 73c490c..b9492e5 100644
--- a/components/staff/CheckInPanel.test.tsx
+++ b/components/staff/CheckInPanel.test.tsx
@@ -119,3 +119,26 @@ describe("CheckInPanel while off-site waiting is paused", () => {
     expect(render(true)).toMatch(/<button[^>]*>Waits on-site<\/button>/);
   });
 });
+
+describe("CheckInPanel on a narrow screen", () => {
+  it("keeps the language menu inside the screen width (WCAG reflow)", () => {
+    // Without max-w-full the menu is as wide as its longest choice, and the staff page scrolls sideways.
+    const tag = render(false).match(/<select[^>]*>/)?.[0] ?? "";
+    const classes = (tag.match(/class="([^"]*)"/)?.[1] ?? "").split(" ");
+    expect(classes).toContain("max-w-full");
+  });
+
+  it("lets each fieldset get narrower than its contents (a fieldset has min-width: min-content by default)", () => {
+    const tags = render(false).match(/<fieldset[^>]*>/g) ?? [];
+    expect(tags.length).toBeGreaterThan(0);
+    for (const tag of tags) {
+      expect((tag.match(/class="([^"]*)"/)?.[1] ?? "").split(" ")).toContain("min-w-0");
+    }
+  });
+
+  it("lets the CTAS 4 and CTAS 5 choices go onto two lines", () => {
+    // The row is the element just before the first CTAS radio button.
+    const row = render(false).match(/<div class="([^"]*)"><label[^>]*><input type="radio"/)?.[1] ?? "";
+    expect(row.split(" ")).toContain("flex-wrap");
+  });
+});
diff --git a/components/staff/CheckInPanel.tsx b/components/staff/CheckInPanel.tsx
index db23752..c191fb1 100644
--- a/components/staff/CheckInPanel.tsx
+++ b/components/staff/CheckInPanel.tsx
@@ -177,9 +177,9 @@ export function CheckInPanel({
         </p>
       )}
 
-      <fieldset disabled={!!homeProblem}>
+      <fieldset disabled={!!homeProblem} className="min-w-0">
         <legend className="font-semibold">CTAS level (chosen by the triage nurse)</legend>
-        <div className="mt-2 flex gap-3">
+        <div className="mt-2 flex flex-wrap gap-3">
           {([4, 5] as const).map((level) => (
             <label
               key={level}
@@ -198,7 +198,7 @@ export function CheckInPanel({
         </div>
       </fieldset>
 
-      <fieldset disabled={!!homeProblem}>
+      <fieldset disabled={!!homeProblem} className="min-w-0">
         <legend className="font-semibold">Eligibility checklist</legend>
         <div className="mt-2 space-y-2">
           {CHECKLIST.map((item) => (
@@ -220,7 +220,7 @@ export function CheckInPanel({
         <select
           value={language}
           onChange={(e) => setLanguage(e.target.value)}
-          className="mt-2 block min-h-11 rounded-lg border-2 border-control px-3"
+          className="mt-2 block min-h-11 max-w-full rounded-lg border-2 border-control px-3"
         >
           {LANGUAGES.map((l) => (
             <option key={l.code} value={l.code}>
diff --git a/components/staff/ExpectedArrivals.test.tsx b/components/staff/ExpectedArrivals.test.tsx
new file mode 100644
index 0000000..5bca3df
--- /dev/null
+++ b/components/staff/ExpectedArrivals.test.tsx
@@ -0,0 +1,22 @@
+// Checks the visit code box in Expected arrivals: it can never be wider than its column, so the staff page does not scroll sideways at 200% text.
+
+import { renderToStaticMarkup } from "react-dom/server";
+import { describe, expect, it, vi } from "vitest";
+import { ExpectedArrivals } from "./ExpectedArrivals";
+
+// The box looks up a code in the database; the test does not need that.
+vi.mock("@/data/staffActions", () => ({ findVisitByCode: vi.fn() }));
+
+describe("ExpectedArrivals on a narrow screen", () => {
+  it("keeps the visit code box inside the screen width (WCAG reflow)", () => {
+    const html = renderToStaticMarkup(
+      <ExpectedArrivals visits={[]} site="A" now={new Date()} onChoose={() => {}} />,
+    );
+    const tag = html.match(/<input[^>]*>/)?.[0] ?? "";
+    const classes = (tag.match(/class="([^"]*)"/)?.[1] ?? "").split(" ");
+    expect(classes).toContain("max-w-full");
+    // The label around the box is a flex item, so it needs its own limit too.
+    const label = html.match(/<label class="([^"]*)"><span[^>]*>Visit code/)?.[1] ?? "";
+    expect(label.split(" ")).toContain("max-w-full");
+  });
+});
diff --git a/components/staff/ExpectedArrivals.tsx b/components/staff/ExpectedArrivals.tsx
index 3da3263..963aa58 100644
--- a/components/staff/ExpectedArrivals.tsx
+++ b/components/staff/ExpectedArrivals.tsx
@@ -58,14 +58,14 @@ export function ExpectedArrivals({ visits, site, now, onChoose }: Props) {
         Started from home, not yet triaged. Not in the waiting line.
       </p>
       <form onSubmit={find} className="flex flex-wrap items-end gap-2">
-        <label className="block">
+        <label className="block max-w-full">
           <span className="font-semibold">Visit code</span>
           <input
             value={typed}
             onChange={(e) => setTyped(e.target.value)}
             autoComplete="off"
             spellCheck={false}
-            className="mt-1 block min-h-11 w-40 rounded-lg border-2 border-control px-3 font-mono uppercase tracking-widest"
+            className="mt-1 block min-h-11 w-40 max-w-full rounded-lg border-2 border-control px-3 font-mono uppercase tracking-widest"
           />
         </label>
         <Button type="submit" variant="secondary" aria-disabled={looking}>
```
