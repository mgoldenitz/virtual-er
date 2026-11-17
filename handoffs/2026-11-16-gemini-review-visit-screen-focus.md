# Gemini review: focus when the whole patient screen changes

Model: Gemini Hydrogen 4, High, in a new chat. If there are no Gemini Hydrogen 4 credits, use Gemini 3.6 Flash, High.

## Text to paste

You review one small fix in a Next.js App Router and React 19 prototype of a virtual ER waiting room (synthetic data only). Find problems. Do not confirm that the fix is good. For each problem, give the file, the steps that make it happen, and the smallest fix. The full diff is below the questions.

Background. `useReportFocusOnLeave(ref, onLost)` calls `onLost` in a layout-effect cleanup when a part leaves while focus is inside it. `useRescueFocus(targetId, lostRef)` runs after every render and moves focus to the element with that id if `lostRef.current` is true and focus is on nothing that is still on the page. A part that leaves cannot rescue its own focus, so the rescue must be in a part that stays.

The bug (from the last review): the patient page switches between 4 screens: "Loading…", "We cannot load your visit" (after several failed reads in a row), the no-visit or broken-link box (for example after staff issue a new link for a lost phone), and the visit. When the visit screen left with focus inside it, the rescue in `PatientStatus` left with it, and focus dropped to the page body. The new headings had no `tabIndex`.

The fix:
1. `components/patient/FocusBox.tsx`: the keyed box from `PatientStatus.tsx` moved to its own file (no change in what it does), with an optional `className`.
2. `components/patient/VisitScreen.tsx`: the page's screen switch moved here. It picks a `screen` name (`loading`, `unavailable`, `none`, `visit`), puts the screen in `<FocusBox key={screen}>`, and has its own `lostFocus` flag and `useRescueFocus("status-heading", ...)`. The loading line and the two new headings get `id="status-heading"` and `tabIndex={-1}`. The visit screen still has the inner rescue in `PatientStatus`.
3. `app/patient/page.tsx` renders `VisitScreen`.
4. New test `VisitScreen.click.test.tsx`: focus on the waiting heading, then the result becomes the broken-link screen or "unavailable"; focus must be on the new heading.

Questions:
1. Can the outer rescue (in `VisitScreen`) and the inner rescue (in `PatientStatus`) both act on one change, or can one move focus at a wrong time? Can a flag stay true and move focus later?
2. The visit parts used to be direct children of `<main className="space-y-5">`; now they are inside a `<div className="space-y-5">`. Does this change the layout, the page order, or what a screen reader reads?
3. The "Loading…" paragraph now has `id="status-heading"` and `tabIndex={-1}`. Is focus on it a problem, for example when a new link opens on the same page (only the `#t=...` part changes) and the screen goes visit, loading, visit?
4. Can the new test pass while the bug is there? (I checked that it fails when `key={screen}` is removed: focus stays on the body.)
5. Is there a simpler way to reach the same goal?

## Checked

- The new test failed before the fix ("expected undefined to be 'This link did not work'"), at commit `e1b94e9`.
- With the fix (`5bc78b7`), both tests pass. With `key={screen}` removed for a short time, both fail again (focus on the body).
- The move to `VisitScreen` (`0772ba8`) passed `npm test` (297 tests), lint and build before the fix.
- After the fix: `npm test`: 54 files, 299 tests pass. `npm run lint` and `npm run build` exit 0.
- GitHub checks passed on the push of `5bc78b7` (run `43994683672`).

## Not checked

- The visit, loading, visit change on a new link in the same tab (question 3) has no test.
- No test on a real phone or with a real screen reader.
- The layout after the move was not checked in a browser or with Playwright screenshots.

## Diff

```diff
diff --git a/app/patient/page.tsx b/app/patient/page.tsx
index 213dc57..b4fb3be 100644
--- a/app/patient/page.tsx
+++ b/app/patient/page.tsx
@@ -12,11 +12,10 @@ import { EmergencyLine } from "@/components/EmergencyLine";
 import { LanguageSwitch } from "@/components/LanguageSwitch";
 import { PatientShell } from "@/components/PatientShell";
 import { OfflineBanner } from "@/components/patient/OfflineBanner";
-import { StatusAndSound } from "@/components/patient/StatusAndSound";
-import { StatusAnnouncer } from "@/components/patient/StatusAnnouncer";
 import { TextSizeSwitch } from "@/components/patient/TextSizeSwitch";
+import { VisitScreen } from "@/components/patient/VisitScreen";
 import { isDeadToken } from "@/lib/deadToken";
-import { fill, textFor } from "@/lib/text";
+import { textFor } from "@/lib/text";
 import { languageInfo, patientLanguage } from "@/lib/text/languages";
 
 export default function PatientPage() {
@@ -53,12 +52,10 @@ export default function PatientPage() {
   }, [deadToken]);
   const linkFailed = brokenLink || deadToken;
   const loading = token === undefined || result === undefined;
-  const unavailable = result === "unavailable";
   const view = result === "unavailable" ? null : result;
   // The phone's own choice first, so even "Loading…" and the 911 line are in that language.
   const language = patientLanguage(chosenLanguage, view?.language);
   const t = textFor(language);
-  const p = t.patient;
 
   // The first time the called screen is actually on screen, record seen_at
   // (shown, not necessarily read). A tab in the background waits until it is brought forward.
@@ -102,43 +99,17 @@ export default function PatientPage() {
       <EmergencyLine language={language} />
       <OfflineBanner language={language} />
 
-      {loading ? (
-        <p>{p.loading}</p>
-      ) : unavailable ? (
-        <section aria-labelledby="unavailable-heading" className="clean-card space-y-2">
-          <h2 id="unavailable-heading" className="text-2xl font-bold">
-            {p.unavailableHeading}
-          </h2>
-          <p className="text-lg">{p.unavailableText}</p>
-        </section>
-      ) : !view ? (
-        <section aria-labelledby="none-heading" className="clean-card space-y-2">
-          <h2 id="none-heading" className="text-2xl font-bold">
-            {linkFailed ? p.brokenLinkHeading : p.noVisitHeading}
-          </h2>
-          {linkFailed && (
-            <p className="text-lg">{p.brokenLinkText}</p>
-          )}
-          <p className="text-lg">{p.findVisitHelp}</p>
-        </section>
-      ) : (
-        <>
-          <p className="text-base">
-            {t.visitCode}:{" "}
-            <bdi>
-              <strong className="font-mono tracking-widest">{view.code}</strong>
-            </bdi>{" "}
-            · <bdi>{fill(t.siteName, { site: view.site })}</bdi>
-          </p>
-          <StatusAndSound view={view} token={token ?? null} language={language} onOnMyWay={onOnMyWay} sending={sending} online={online} />
-          {notSaved && (
-            <p role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
-              {p.notSaved}
-            </p>
-          )}
-          <StatusAnnouncer key={token} status={view.status} language={language} />
-        </>
-      )}
+      <VisitScreen
+        loading={loading}
+        result={result}
+        linkFailed={linkFailed}
+        token={token ?? null}
+        language={language}
+        onOnMyWay={onOnMyWay}
+        sending={sending}
+        online={online}
+        notSaved={notSaved}
+      />
     </main>
     </PatientShell>
   );
diff --git a/components/patient/FocusBox.tsx b/components/patient/FocusBox.tsx
new file mode 100644
index 0000000..b899b2d
--- /dev/null
+++ b/components/patient/FocusBox.tsx
@@ -0,0 +1,24 @@
+"use client";
+
+// A box around one screen of the patient page. When the box leaves the page with focus inside it
+// (for example a new screen comes in its place), it calls onFocusLost, so a part that stays can
+// move focus to the new heading.
+
+import { useRef, type ReactNode } from "react";
+import { useReportFocusOnLeave } from "./useFocusRescue";
+
+type Props = {
+  onFocusLost: () => void;
+  className?: string;
+  children: ReactNode;
+};
+
+export function FocusBox({ onFocusLost, className, children }: Props) {
+  const box = useRef<HTMLDivElement>(null);
+  useReportFocusOnLeave(box, onFocusLost);
+  return (
+    <div ref={box} className={className}>
+      {children}
+    </div>
+  );
+}
diff --git a/components/patient/PatientStatus.tsx b/components/patient/PatientStatus.tsx
index 212e28b..d543de3 100644
--- a/components/patient/PatientStatus.tsx
+++ b/components/patient/PatientStatus.tsx
@@ -4,12 +4,13 @@
 // Waiting, Please head back now, Ready at the desk, and the states before and after those.
 
 import Link from "next/link";
-import { useRef, type ReactNode, type RefObject } from "react";
+import { useRef, type RefObject } from "react";
 import type { PatientView } from "@/lib/patientView";
 import { textFor, type PatientText } from "@/lib/text";
 import { formatWaitRange } from "@/lib/waitText";
 import { Button } from "@/components/Button";
 import { CallReminder } from "./CallReminder";
+import { FocusBox } from "./FocusBox";
 import { useReportFocusOnLeave, useRescueFocus } from "./useFocusRescue";
 
 type Props = {
@@ -152,15 +153,16 @@ export function PatientStatus({ view, language, onOnMyWay, sending, lostFocus }:
   // A focused part that left with this change (for example "I'm on my way"): focus goes to the heading.
   const markLost = useRescueFocus("status-heading", lostFocus ?? ownFlag);
   const kind = viewKind(view);
+  // A new screen gets a new box (the key), so the old box leaves and tells this screen if it held focus.
   return (
-    <ViewBox key={kind} onFocusLost={markLost}>
+    <FocusBox key={kind} onFocusLost={markLost}>
       {kind === "expired" && <Expired t={t} />}
       {kind === "waiting" && <Waiting view={view} language={language} t={t} />}
       {kind === "called" && (
         <Called view={view} language={language} onOnMyWay={onOnMyWay} sending={sending} t={t} onFocusLost={markLost} />
       )}
       {kind === "other" && <OtherStatus view={view} t={t} />}
-    </ViewBox>
+    </FocusBox>
   );
 }
 
@@ -171,13 +173,3 @@ function viewKind(view: PatientView): "expired" | "waiting" | "called" | "other"
   if (view.status === "called" || view.status === "on_the_way") return "called";
   return "other";
 }
-
-/**
- * Holds one screen. A new screen gets a new box (the key above), so the old box leaves the page.
- * If focus was inside it (for example on the old heading), it tells the status screen.
- */
-function ViewBox({ onFocusLost, children }: { onFocusLost: () => void; children: ReactNode }) {
-  const box = useRef<HTMLDivElement>(null);
-  useReportFocusOnLeave(box, onFocusLost);
-  return <div ref={box}>{children}</div>;
-}
diff --git a/components/patient/VisitScreen.click.test.tsx b/components/patient/VisitScreen.click.test.tsx
new file mode 100644
index 0000000..a7ac302
--- /dev/null
+++ b/components/patient/VisitScreen.click.test.tsx
@@ -0,0 +1,100 @@
+// @vitest-environment happy-dom
+// Checks VisitScreen when the whole screen changes: the visit goes away (a new link was issued, or
+// the visit could not be read) while focus is on its heading. Focus must go to the new heading.
+
+import { act } from "react";
+import { createRoot, type Root } from "react-dom/client";
+import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
+import type { PatientView } from "@/lib/patientView";
+import { textFor } from "@/lib/text";
+import { playAlert, stopVibration, unlockSound } from "./alertSound";
+import { VisitScreen } from "./VisitScreen";
+
+// The tap's save, the clock and the sound player are replaced, so each test controls them.
+vi.mock("@/data/patientVisit", () => ({ recordStillHere: vi.fn().mockResolvedValue("saved") }));
+const NOW = new Date("2026-11-16T12:00:00Z");
+vi.mock("@/components/useNow", () => ({ useNow: () => NOW }));
+vi.mock("./alertSound", () => ({ unlockSound: vi.fn(), playAlert: vi.fn(), stopVibration: vi.fn() }));
+
+// Tells React that this file runs its updates inside act().
+(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
+
+const p = textFor("en").patient;
+
+// Triaged 10 minutes ago, so the "I'm still here" prompt is not due yet.
+const waiting: PatientView = {
+  code: "ABC234",
+  site: "A",
+  language: "en",
+  status: "waiting",
+  placeInLine: 2,
+  waitLow: 20,
+  waitHigh: 40,
+  calledAt: null,
+  lastStillHereAt: null,
+  triagedAt: "2026-11-16T11:50:00Z",
+  seen: false,
+  closed: false,
+  expired: false,
+};
+
+let container: HTMLDivElement;
+let root: Root;
+
+const show = (result: PatientView | null | "unavailable", linkFailed = false) =>
+  act(() =>
+    root.render(
+      <VisitScreen
+        loading={false}
+        result={result}
+        linkFailed={linkFailed}
+        token="t"
+        language="en"
+        onOnMyWay={() => {}}
+        sending={false}
+        online
+        notSaved={false}
+      />,
+    ),
+  );
+
+/** Shows the waiting visit and puts focus on its heading. */
+function focusOnWaitingHeading() {
+  show(waiting);
+  const heading = container.querySelector<HTMLElement>("#status-heading");
+  expect(heading?.textContent).toBe(p.waitingHeading);
+  heading?.focus();
+  expect(document.activeElement).toBe(heading);
+}
+
+beforeEach(() => {
+  vi.mocked(unlockSound).mockReset().mockResolvedValue(true);
+  vi.mocked(playAlert).mockReset().mockReturnValue(new Promise(() => {}));
+  vi.mocked(stopVibration).mockReset();
+  container = document.createElement("div");
+  document.body.appendChild(container);
+  root = createRoot(container);
+});
+
+afterEach(() => {
+  act(() => root.unmount());
+  container.remove();
+});
+
+describe("VisitScreen when the whole screen changes", () => {
+  it("moves focus to the broken-link heading when the link stops working", () => {
+    focusOnWaitingHeading();
+    show(null, true);
+    const heading = container.querySelector("#status-heading");
+    expect(heading?.textContent).toBe(p.brokenLinkHeading);
+    expect(document.activeElement).toBe(heading);
+  });
+
+  it("moves focus to the could-not-load heading when the visit can no longer be read", () => {
+    focusOnWaitingHeading();
+    show("unavailable");
+    const heading = container.querySelector("#status-heading");
+    expect(heading?.textContent).toBe(p.unavailableHeading);
+    expect(document.activeElement).toBe(heading);
+  });
+});
diff --git a/components/patient/VisitScreen.tsx b/components/patient/VisitScreen.tsx
new file mode 100644
index 0000000..03057d3
--- /dev/null
+++ b/components/patient/VisitScreen.tsx
@@ -0,0 +1,90 @@
+"use client";
+
+// The part of the patient page below the 911 line: "Loading…", the "could not load" box, the
+// no-visit or broken-link box, or the visit itself (code, status, sound box and announcer).
+// This part stays on the page when the screen changes, so it is the one that moves focus to the
+// new heading when the old screen left with focus inside it.
+
+import { useRef } from "react";
+import type { PatientView } from "@/lib/patientView";
+import { fill, textFor } from "@/lib/text";
+import { FocusBox } from "./FocusBox";
+import { StatusAndSound } from "./StatusAndSound";
+import { StatusAnnouncer } from "./StatusAnnouncer";
+import { useRescueFocus } from "./useFocusRescue";
+
+type Props = {
+  /** True until the link is read and the first answer for the visit comes in. */
+  loading: boolean;
+  /** The visit, null if the token opens no visit, or "unavailable" if it could not be read. */
+  result: PatientView | null | "unavailable" | undefined;
+  /** True when the link was broken or no longer opens a visit (for example after a new link). */
+  linkFailed: boolean;
+  token: string | null;
+  language: string;
+  onOnMyWay: () => void;
+  sending: boolean;
+  online: boolean;
+  /** True when "I'm on my way" could not be saved. */
+  notSaved: boolean;
+};
+
+type Screen = "loading" | "unavailable" | "none" | "visit";
+
+export function VisitScreen({ loading, result, linkFailed, token, language, onOnMyWay, sending, online, notSaved }: Props) {
+  const t = textFor(language);
+  const p = t.patient;
+  const view = result === "unavailable" ? null : result;
+  // True when the old screen left with focus inside it; then focus goes to the new heading.
+  const lostFocus = useRef(false);
+  const markLost = useRescueFocus("status-heading", lostFocus);
+
+  // Which of the 4 screens shows. "Loading…" comes first: while loading, result can be undefined.
+  const screen: Screen = loading ? "loading" : result === "unavailable" ? "unavailable" : !view ? "none" : "visit";
+
+  // A new screen gets a new box (the key), so the old box leaves and reports if it held focus.
+  return (
+    <FocusBox key={screen} onFocusLost={markLost} className="space-y-5">
+      {screen === "loading" && (
+        <p id="status-heading" tabIndex={-1}>
+          {p.loading}
+        </p>
+      )}
+      {screen === "unavailable" && (
+        <section aria-labelledby="status-heading" className="clean-card space-y-2">
+          <h2 id="status-heading" tabIndex={-1} className="text-2xl font-bold">
+            {p.unavailableHeading}
+          </h2>
+          <p className="text-lg">{p.unavailableText}</p>
+        </section>
+      )}
+      {screen === "none" && (
+        <section aria-labelledby="status-heading" className="clean-card space-y-2">
+          <h2 id="status-heading" tabIndex={-1} className="text-2xl font-bold">
+            {linkFailed ? p.brokenLinkHeading : p.noVisitHeading}
+          </h2>
+          {linkFailed && <p className="text-lg">{p.brokenLinkText}</p>}
+          <p className="text-lg">{p.findVisitHelp}</p>
+        </section>
+      )}
+      {screen === "visit" && view && (
+        <>
+          <p className="text-base">
+            {t.visitCode}:{" "}
+            <bdi>
+              <strong className="font-mono tracking-widest">{view.code}</strong>
+            </bdi>{" "}
+            · <bdi>{fill(t.siteName, { site: view.site })}</bdi>
+          </p>
+          <StatusAndSound view={view} token={token} language={language} onOnMyWay={onOnMyWay} sending={sending} online={online} />
+          {notSaved && (
+            <p role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
+              {p.notSaved}
+            </p>
+          )}
+          <StatusAnnouncer key={token} status={view.status} language={language} />
+        </>
+      )}
+    </FocusBox>
+  );
+}
```
