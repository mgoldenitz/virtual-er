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

## Response

Gemini Hydrogen 4, High, 2026-11-17.

### 1. Off-screen parts at 320 px or 390 px with 200% text (from the changed lines)

No problem found in the changed lines themselves. At 200% text (`1rem = 32px`), `grid-cols-1` (`minmax(0, 1fr)`) prevents grid-track blow-out, `min-w-0` overrides browser `min-width: min-content` on both `<fieldset>` elements, `flex-wrap` wraps the CTAS radio row, and `max-w-full` (`box-sizing: border-box`) caps the `<select>` elements, the `<input className="... w-40 max-w-full">` (`320px` nominal width), and its flex-item `<label className="block max-w-full">` to their parent's content box (`160-192 px` inside padded cards at 320 px viewport; `230-262 px` at 390 px). (See Question 6 item 1 for a latent risk on `app/staff/page.tsx` line 73 if site option labels ever become longer than "Demo Site A".)

### 2. Width or text size where `lg:grid-cols-2` makes the two staff columns too narrow

No problem found under Tailwind v4's default `rem`-based breakpoints: `lg` is `64rem` (`1024 px` at 100% text, `1536 px` at 150% text, `2048 px` at 200% text), which matches `<main className="... max-w-5xl ...">` (`64rem`). Whenever `lg:grid-cols-2` activates (`>= 64rem`), subtracting `px-4` (`2rem`) and `gap-6` (`1.5rem`) leaves `(64 - 3.5) / 2 = 30.25 rem` (`484 px` at 100% text, `968 px` at 200% text) per column, which fits `ExpectedArrivals`, `VisitRow`, and `CheckInPanel`.

(Note: if `lg` were ever overridden to a fixed `1024px` pixel media query while text is at 200%, each column would shrink to `~360-392 px` = `11.25-12.25 rem`, forcing the `w-40` (`320 px`) visit code box and multi-button rows into cramped vertical stacks.)

### 3. `max-w-full` on `<select>` for screen readers, keyboard users, and WCAG 1.4.10 / 1.3.1

No problem found.

- Screen readers: `max-w-full` only constrains the visual width of the closed `<select>` trigger box; the full `<option>` strings (including "Français (French), draft until checked") remain intact in the DOM and accessibility tree.
- Keyboard users: Opening the native `<select>` menu (`Space` / `Enter` / `Alt+DownArrow`) renders the browser's popup listbox wide enough to display the full option text.
- WCAG 1.4.10 and 1.3.1: Visual clipping of a closed `<select>` without horizontal page scrolling, where full option text is readable when opened, is neither a WCAG 1.4.10 Reflow failure nor a WCAG 1.3.1 Info and Relationships failure.

### 4. Cases where the shared `vibrationStarted` flag misbehaves

1. `vibrate()` ignores `navigator.vibrate()` returning `false`, re-triggering blocked-call console errors.
   - File and line: `components/patient/alertSound.ts`, lines 92-96
   - What goes wrong: Per the Vibration API spec, `navigator.vibrate([200, 100, 200])` returns `false` (without throwing) when the browser blocks vibration (e.g., missing sticky user activation, hidden tab, or unsupported hardware). Because `vibrate()` sets `vibrationStarted = true` unconditionally, a later `stopVibration()` sees `vibrationStarted === true` and calls `navigator.vibrate(0)` anyway, producing the exact "Blocked call to navigator.vibrate" console error.
   - Small fix: Set the flag only when `navigator.vibrate` returns `true`:

```ts
if (typeof navigator.vibrate === "function" && navigator.vibrate([200, 100, 200])) {
  vibrationStarted = true;
}
```

2. 500 ms pattern ending on its own leaves `vibrationStarted` stuck `true`, and two `SoundSwitch` boxes cancel each other.
   - File and line: `components/patient/alertSound.ts`, lines 88-106
   - What goes wrong: `[200, 100, 200]` finishes after 500 ms on the phone, yet `vibrationStarted` stays `true` indefinitely until `stopVibration()` runs (so unmounting `SoundSwitch` minutes later unnecessarily calls `navigator.vibrate(0)` after sticky activation may have expired). With two `SoundSwitch` boxes on one page, Box A starting a vibration sets `vibrationStarted = true`, and Box B turning off or unmounting within 500 ms calls `navigator.vibrate(0)` and sets `vibrationStarted = false`, stopping Box A's active vibration while Box A is still alerting.
   - Small fix: Auto-clear `vibrationStarted` after the 500 ms pattern duration (and clear that timer in `stopVibration()`), and track active vibrating owners (e.g., a `Set<symbol>` or counter) so `navigator.vibrate(0)` is only called when the last active owner stops.

3. Transitioning out of `"called"` without unmounting (`"called"` to `"waiting"` on Undo, or switching visits on an open SPA page) leaves a running vibration unstopped.
   - File and line: `components/patient/alertSound.ts`, lines 88-106; `components/patient/SoundSwitch.tsx`, lines 176-194
   - What goes wrong: `<SoundSwitch>` stays mounted across `"waiting"` and `"called"`, and only calls `stopVibration()` inside `turnOff()` and on unmount. If staff undo a recall (`"called"` to `"waiting"`) or the open page switches from a `"called"` visit to a `"waiting"` visit within 500 ms of a vibration starting, `<SoundSwitch>` never unmounts and `stopVibration()` is never called, leaving the vibration running after the visit is no longer `"called"`.
   - Small fix: In `SoundSwitch.tsx`, call `stopVibration()` inside the `[status, state]` effect cleanup whenever leaving `"called"` (or when `status !== "called"`).

### 5. Do the `renderToStaticMarkup` class tests prove the reflow fix?

No, they can pass while the page still scrolls sideways:

- Missing parent constraints: Rendering `<LanguageSwitch/>`, `<CheckInPanel/>`, or `<ExpectedArrivals/>` alone tests `max-w-full` (`max-width: 100%`) without any ancestor flex/grid container. If a parent flex row lacks `flex-wrap` or `min-w-0`, `100%` resolves to an overflowing parent width and the page still scrolls horizontally.
- `app/staff/page.tsx` is untested: None of the new tests render `StaffPage`, so removing `grid-cols-1`, `flex-wrap`, or `max-w-full` in `app/staff/page.tsx` leaves all unit tests green while `/staff` overflows again.
- Overridden classes and unchecked siblings: Checking `.split(" ").toContain("max-w-full")` ignores conflicting classes (e.g., `min-w-fit`, `whitespace-nowrap`) and never checks unbreakable text or buttons elsewhere in the tree.

Better check without a signed-in staff session: Run a Playwright viewport check at `320 x 800` and `390 x 844` with `document.documentElement.style.fontSize = "200%"` that asserts `document.documentElement.scrollWidth <= document.documentElement.clientWidth` and `el.getBoundingClientRect().right <= window.innerWidth` for all visible elements:

1. Run it directly on `/` and `/patient` across all 5 languages (`en`, `fr`, `ur`, `ar`, `zh`).
2. Run it on `/staff` without a real login by intercepting Supabase auth/REST calls with `page.route(...)` (returning a stubbed staff session and synthetic visit list) or rendering `<CheckInPanel>`, `<ExpectedArrivals>`, and `<VisitRow>` inside a dev/test route using the real `<main className="mx-auto w-full max-w-5xl ..."><div className="grid grid-cols-1 gap-6 lg:grid-cols-2">` wrapper.

### 6. Anything else in the diff that is wrong

1. Site `<label>` flex item in `app/staff/page.tsx` lacks `max-w-full`.
   - File and line: `app/staff/page.tsx`, line 73
   - What goes wrong: `<label className="flex flex-wrap items-center gap-2">` is a flex item inside `<header>` without `max-w-full` (unlike `<label className="block max-w-full">` in `ExpectedArrivals.tsx`, line 61). A flex item's automatic minimum width follows its child `<select>`'s widest `<option>` `min-content`, so if a site name is ever longer than "Demo Site A", `<label>` and `<select className="... max-w-full">` will expand past a 320 px screen at 200% text.
   - Small fix: Change line 73 to `<label className="flex max-w-full flex-wrap items-center gap-2">`.

2. Brittle HTML attribute-order regexes in the new reflow tests.
   - File and line: `components/staff/CheckInPanel.test.tsx`, lines 126, 132, 141; `components/staff/ExpectedArrivals.test.tsx`, lines 15, 19; `components/LanguageSwitch.test.tsx`, lines 12-13
   - What goes wrong: Patterns like `/<div class="([^"]*)"><label[^>]*><input type="radio"/` and `/<label class="([^"]*)"><span[^>]*>Visit code/` require `class` to be the sole attribute on the tag and zero whitespace between tags. Adding a `data-*` attribute, `id`, or JSX whitespace makes `.match(...)` return `null` (falling back to `""` and failing for unrelated reasons) or match an earlier sibling element.
   - Small fix: Parse the rendered HTML with `new DOMParser().parseFromString(html, "text/html")` (or `happy-dom`/`jsdom`) and inspect `element.classList` via `querySelector` / `querySelectorAll`.

3. `alertSound.test.ts` mock `vibrate` returns `undefined` instead of `boolean`.
   - File and line: `components/patient/alertSound.test.ts`, lines 168-189
   - What goes wrong: The `vibrate` spy does not mock the DOM `boolean` return value (`true`/`false`), so the suite passes even when `vibrate()` ignores a `false` return from `navigator.vibrate([200, 100, 200])`.
   - Small fix: Have the default mock return `true` and add a test where `vibrate.mockReturnValueOnce(false)` confirms `stopVibration()` does not call `navigator.vibrate(0)`.

## Claude's check

- 1, 2, 3: no problem found, and I agree. Point 2 depends on `lg` being in rem (Tailwind 4 default; `app/globals.css` does not change it).
- 4.1: correct in principle. Chrome returns false from a blocked `navigator.vibrate` call, and `vibrate()` sets `vibrationStarted` all the same. The path is narrow: `shouldAlert` needs the sound turned on by a tap and the page visible, so a blocked start is rare. The fix is one line, and the flag then means what its comment says. Fix with a test (same as 6.3).
- 4.2: rejected. Sticky activation does not expire while the page is open, so a late `vibrate(0)` after a tap gives no error. There is only one `SoundSwitch` on the page (`components/patient/StatusAndSound.tsx` line 38).
- 4.3: rejected, no path. `called` cannot go back to `waiting` (`lib/allowedSteps.ts` line 16: `on_the_way`, `arrived`, `removed`, `unable_to_reach`). Each of those statuses removes `SoundSwitch` (`StatusAndSound.tsx` line 37), and the unmount cleanup calls `stopVibration()`. The vibration is 500 ms long in any case.
- 5: partly correct. The class tests are guards for the classes, not proof of the layout; the proof is the browser check (`.playwright-mcp/axe-staff.js`, not in the repo). Correct that nothing guards the 3 class changes in `app/staff/page.tsx`. Options for the owner below. A Playwright test runner with stubbed Supabase calls is a new dependency and a bigger change; not now.
- 6.1: latent only. The site menu has two fixed choices ("Demo Site A", "Demo Site B"), and the check at 390 px and 200% text gave no part off the screen. Adding `max-w-full` to the label costs one class. Owner choice.
- 6.2: partly correct. A missed match gives `""`, so the test fails loud, not silent. A wrong match is possible only if another element has the same shape; none does now. The project already has happy-dom (click tests), so a parse with `querySelector` is possible. Optional.
- 6.3: correct, goes with 4.1.

## Outcome (owner choice, 2026-11-17)

- 4.1 and 6.3: fixed. Test `22cdce8` (failed first), fix `8ae12a7`. 335 tests pass, lint 0 errors, build passes.
- 5: noted in `docs/known-issues.md`; no Playwright test runner now.
- 6.1 and 6.2: not done (owner choice).
- 4.2 and 4.3: rejected (see the check above).
