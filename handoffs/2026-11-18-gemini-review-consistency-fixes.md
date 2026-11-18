# Gemini review: the workflow consistency fixes

Model: Gemini Hydrogen 4, High, in a new chat. (If there are no credits: Gemini 3.6 Flash, High.)

## Question to paste

You review a concept prototype of a virtual ER waiting room (Next.js App Router, React, TypeScript, Supabase). Synthetic data only. Low-acuity patients wait off-site and follow their place in line on their phone; staff recall them.

The diff below makes 3 small changes. Find problems. Do not confirm that it is good. For each problem, give the file and line, what goes wrong, and the smallest fix.

1. Staff "Recall patient" now asks first: `Recall visit {code}? The patient's phone will show "Please head back now". There is no undo.`, with "Yes, recall patient" and "Cancel" (new file `components/staff/RecallPanel.tsx`). After a saved recall, focus moves to the row's progress line, because the button leaves the page when the status becomes `called`.
2. The patient screen with no visit: the no-visit and broken-link screens show the scan help and a link to the start page. The replaced-link screen (a staff member gave the visit a new link) shows neither.
3. A failed "I'm still here" tap shows its own message, `stillHere.notSaved`, in place of `patient.notSaved` (which talks about the desk and "on your way").

Settled decisions; do not report these as faults:
- "Mark arrived", "Left" and "No-show" keep one tap, because each has Undo under "Recently closed" (`components/staff/VisitRow.tsx` lines 103, 115 and 118). Only a recall has no undo.
- `RecallPanel` takes focus back on "Cancel" only when focus is on the page body or null (`components/staff/RecallPanel.tsx` line 35). This stops it taking focus from the progress line after a saved recall.
- The replaced-link text stays "Please ask the emergency department desk for help." (`lib/text/en.ts`, `patient.replacedLinkText`).
- The English line "Your tap did not save. Staff may not know you are still waiting. Please try again." is the owner's choice.
- The 4 translated lines are drafts; a fluent human will check them. Do not review the wording of the translations.

Questions:
a. Can a staff member recall the wrong patient, or recall twice, with the new confirm step (for example when the list re-orders while the question is open, or with a double tap on "Yes")?
b. Is the focus order right for a keyboard and screen-reader user in each path: open the question, "Yes" saved, "Yes" not saved, "Cancel"?
c. On the patient side, is any no-visit screen now missing a way forward, or showing a way that makes a second visit for the same person?
d. Do the tests prove each change? Name any path that has no test.

## Changed files and line counts (after the change)

- components/patient/StillHerePrompt.tsx: 124
- components/patient/StillHerePrompt.click.test.tsx: 145
- components/patient/VisitScreen.tsx: 104
- components/patient/VisitScreen.click.test.tsx: 185
- components/staff/RecallPanel.tsx: 70 (new)
- components/staff/RecallPanel.click.test.tsx: 84 (new)
- components/staff/VisitRow.tsx: 131
- components/staff/VisitRow.click.test.tsx: 73 (new)
- lib/text/en.ts: 201; fr.ts: 170; ur.ts: 172; ar.ts: 171; zh.ts: 170 (1 or 2 lines each)

## Checked

In this session, after commit `de4d51c`: `npm test` 65 test files, 367 tests pass; `npm run lint` 0 errors, 2 warnings (helper scripts outside the app); `npm run build` passed. Browser at 390 px: the start link shows on the no-visit and broken-link screens; the recall question opens with focus on "Yes, recall patient", and "Cancel" puts focus back on "Recall patient" with the visit still `waiting`.

## Not checked

- A real screen reader (NVDA, VoiceOver, TalkBack) on the recall question.
- "Yes" when the save fails, in a browser (only in the tests).
- Whether the translated lines read naturally.

## Helpers the changed lines call (not in the diff)

`data/staffActions.ts` line 136 (unchanged):

```ts
export const callBackVisit = (id: string) => changeVisit(id, (v) => callBack(v, serverNow()));
```

`components/Button.tsx` (unchanged, 26 lines):

```tsx
// One button style for the whole app: large touch target, visible keyboard focus.

import type { ComponentPropsWithRef } from "react";

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

## Diff (code and tests, 9024340^ to de4d51c)

```diff
diff --git a/components/patient/StillHerePrompt.click.test.tsx b/components/patient/StillHerePrompt.click.test.tsx
index e044296..5622d0f 100644
--- a/components/patient/StillHerePrompt.click.test.tsx
+++ b/components/patient/StillHerePrompt.click.test.tsx
@@ -6,6 +6,7 @@ import { act } from "react";
 import { createRoot, type Root } from "react-dom/client";
 import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
 import type { PatientView } from "@/lib/patientView";
+import { recordStillHere } from "@/data/patientVisit";
 import { textFor } from "@/lib/text";
 import { StillHerePrompt } from "./StillHerePrompt";
 
@@ -132,4 +133,13 @@ describe("StillHerePrompt tap", () => {
     show(tapped);
     expect(document.activeElement).toBe(document.body);
   });
+
+  it("says the tap did not save, without telling a waiting patient to go to the desk", async () => {
+    vi.mocked(recordStillHere).mockResolvedValueOnce("not_saved");
+    show(due);
+    await act(async () => button()?.click());
+    const alert = container.querySelector('[role="alert"]');
+    expect(alert?.textContent).toBe("Your tap did not save. Staff may not know you are still waiting. Please try again.");
+    expect(alert?.textContent).not.toBe(textFor("en").patient.notSaved);
+  });
 });
diff --git a/components/patient/StillHerePrompt.tsx b/components/patient/StillHerePrompt.tsx
index 6c47dc9..da48a5d 100644
--- a/components/patient/StillHerePrompt.tsx
+++ b/components/patient/StillHerePrompt.tsx
@@ -87,7 +87,7 @@ export function StillHerePrompt({ view, token, language, lostFocus }: Props) {
           </Button>
           {notSaved && (
             <p role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
-              {t.patient.notSaved}
+              {t.stillHere.notSaved}
             </p>
           )}
         </PromptCard>
diff --git a/components/patient/VisitScreen.click.test.tsx b/components/patient/VisitScreen.click.test.tsx
index bf4df4f..25fc51b 100644
--- a/components/patient/VisitScreen.click.test.tsx
+++ b/components/patient/VisitScreen.click.test.tsx
@@ -143,3 +143,43 @@ describe("VisitScreen when the whole screen changes", () => {
     expect(document.activeElement).toBe(heading);
   });
 });
+
+describe("VisitScreen help on the no-visit, broken-link and replaced-link screens", () => {
+  /** Shows a screen with no visit. */
+  const showNone = (linkFailed: boolean, linkReplaced: boolean) =>
+    act(() =>
+      root.render(
+        <VisitScreen
+          loading={false}
+          result={null}
+          linkFailed={linkFailed}
+          linkReplaced={linkReplaced}
+          token="t"
+          language="en"
+          onOnMyWay={() => {}}
+          sending={false}
+          online
+          notSaved={false}
+        />,
+      ),
+    );
+  const startLink = () => container.querySelector<HTMLAnchorElement>('a[href="/"]');
+
+  it("has no slip help and no start-page link when the link was replaced", () => {
+    showNone(true, true);
+    expect(container.textContent).not.toContain(p.findVisitHelp);
+    expect(startLink()).toBeNull();
+  });
+
+  it("links to the start page when there is no visit", () => {
+    showNone(false, false);
+    expect(container.textContent).toContain(p.findVisitHelp);
+    expect(startLink()?.textContent).toBe(p.expiredNewVisit);
+  });
+
+  it("links to the start page when the link is broken", () => {
+    showNone(true, false);
+    expect(container.textContent).toContain(p.findVisitHelp);
+    expect(startLink()?.textContent).toBe(p.expiredNewVisit);
+  });
+});
diff --git a/components/patient/VisitScreen.tsx b/components/patient/VisitScreen.tsx
index cd02bc7..7c87d0b 100644
--- a/components/patient/VisitScreen.tsx
+++ b/components/patient/VisitScreen.tsx
@@ -5,6 +5,7 @@
 // This part stays on the page when the screen changes, so it is the one that moves focus to the
 // new heading when the old screen left with focus inside it.
 
+import Link from "next/link";
 import { useRef } from "react";
 import type { PatientView } from "@/lib/patientView";
 import { fill, textFor } from "@/lib/text";
@@ -67,7 +68,17 @@ export function VisitScreen({ loading, result, linkFailed, linkReplaced = false,
           </h2>
           {linkReplaced && <p className="text-lg">{p.replacedLinkText}</p>}
           {linkFailed && !linkReplaced && <p className="text-lg">{p.brokenLinkText}</p>}
-          <p className="text-lg">{p.findVisitHelp}</p>
+          {/* The old slip no longer works after a new link, and a new visit could make a second visit for the same person. */}
+          {!linkReplaced && (
+            <>
+              <p className="text-lg">{p.findVisitHelp}</p>
+              <p className="text-lg">
+                <Link href="/" className="font-semibold text-brand underline underline-offset-2">
+                  {p.expiredNewVisit}
+                </Link>
+              </p>
+            </>
+          )}
         </section>
       )}
       {screen === "visit" && view && (
diff --git a/components/staff/RecallPanel.click.test.tsx b/components/staff/RecallPanel.click.test.tsx
new file mode 100644
index 0000000..500d453
--- /dev/null
+++ b/components/staff/RecallPanel.click.test.tsx
@@ -0,0 +1,84 @@
+// @vitest-environment happy-dom
+// Presses the "Recall patient" buttons in a test browser (happy-dom): one tap only asks, the
+// question names the visit, where focus goes, and that "Yes" does nothing while a change is saving.
+
+import { act } from "react";
+import { createRoot, type Root } from "react-dom/client";
+import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
+import { RecallPanel } from "./RecallPanel";
+
+// Tells React that this file runs its updates inside act().
+(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
+
+let container: HTMLDivElement;
+let root: Root;
+
+function show(saving: boolean, onConfirm = vi.fn()) {
+  act(() => root.render(<RecallPanel code="ABC234" saving={saving} onConfirm={onConfirm} />));
+  return onConfirm;
+}
+
+/** The button whose words start with `words` (some buttons also hold hidden words for screen readers). */
+const button = (words: string) => [...container.querySelectorAll("button")].find((b) => b.textContent?.startsWith(words));
+
+async function press(words: string) {
+  const target = button(words);
+  if (!target) throw new Error(`No button "${words}"`);
+  // A real tap or Enter key puts focus on the button first; happy-dom's click() alone does not.
+  target.focus();
+  await act(async () => target.click());
+}
+
+/** Lets the panel's one-tick focus wait (setTimeout 0) run. */
+const nextTick = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
+
+beforeEach(() => {
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
+describe("RecallPanel taps", () => {
+  it("asks first: one tap recalls nothing, names the visit, and moves focus to Yes", async () => {
+    const onConfirm = show(false);
+    await press("Recall patient");
+    expect(onConfirm).not.toHaveBeenCalled();
+    expect(container.textContent).toContain(
+      `Recall visit ABC234? The patient's phone will show "Please head back now". There is no undo.`,
+    );
+    expect(button("Recall patient")).toBeUndefined();
+    expect(button("Cancel")).toBeDefined();
+    expect(document.activeElement).toBe(button("Yes, recall patient"));
+  });
+
+  it("Cancel closes the question, recalls nothing, and brings focus back to Recall patient", async () => {
+    const onConfirm = show(false);
+    await press("Recall patient");
+    await press("Cancel");
+    await nextTick();
+    expect(onConfirm).not.toHaveBeenCalled();
+    expect(button("Yes, recall patient")).toBeUndefined();
+    expect(document.activeElement).toBe(button("Recall patient"));
+  });
+
+  it("Yes recalls once", async () => {
+    const onConfirm = show(false);
+    await press("Recall patient");
+    await press("Yes, recall patient");
+    expect(onConfirm).toHaveBeenCalledTimes(1);
+  });
+
+  it("Yes does nothing while a change is still saving", async () => {
+    const onConfirm = show(false);
+    await press("Recall patient");
+    show(true, onConfirm);
+    await press("Yes, recall patient");
+    expect(onConfirm).not.toHaveBeenCalled();
+    expect(button("Yes, recall patient")).toBeDefined();
+  });
+});
diff --git a/components/staff/RecallPanel.tsx b/components/staff/RecallPanel.tsx
new file mode 100644
index 0000000..901b6e9
--- /dev/null
+++ b/components/staff/RecallPanel.tsx
@@ -0,0 +1,70 @@
+"use client";
+
+// The "Recall patient" button for one waiting visit. Staff must confirm first, because a recall
+// has no undo: the phone shows "Please head back now" at once. This file only asks; the parent saves.
+
+import { useEffect, useRef, useState } from "react";
+import { Button } from "@/components/Button";
+
+type Props = {
+  /** The visit code, read out with the button and shown in the question. */
+  code: string;
+  /** True while a change is on its way. "Yes" does nothing then. */
+  saving: boolean;
+  /** Called once staff confirm. */
+  onConfirm: () => void;
+};
+
+type Mode = "idle" | "confirm";
+
+export function RecallPanel({ code, saving, onConfirm }: Props) {
+  const [mode, setMode] = useState<Mode>("idle");
+  const recallButton = useRef<HTMLButtonElement>(null);
+  const yesButton = useRef<HTMLButtonElement>(null);
+
+  // When the confirm question opens, focus moves to "Yes" for keyboard and screen-reader users.
+  useEffect(() => {
+    if (mode === "confirm") yesButton.current?.focus();
+  }, [mode]);
+
+  // Back to the first state. The "Recall patient" button is drawn again, so focus waits one tick.
+  // It does not take focus back if the parent already moved it (a fast save).
+  const returnToRecall = () => {
+    setMode("idle");
+    window.setTimeout(() => {
+      const lost = !document.activeElement || document.activeElement === document.body;
+      if (lost) recallButton.current?.focus();
+    }, 0);
+  };
+
+  // After "Yes" the parent saves. If the save works, the parent moves focus on, because this
+  // button leaves the page once the visit is called; if not, focus stays on "Recall patient".
+  const confirm = () => {
+    if (saving) return;
+    onConfirm();
+    returnToRecall();
+  };
+
+  if (mode === "idle") {
+    return (
+      <Button ref={recallButton} aria-disabled={saving} onClick={() => setMode("confirm")}>
+        Recall patient<span className="sr-only"> {code}</span>
+      </Button>
+    );
+  }
+  return (
+    <div className="w-full space-y-2">
+      <p className="font-semibold">
+        {`Recall visit ${code}? The patient's phone will show "Please head back now". There is no undo.`}
+      </p>
+      <div className="flex flex-wrap gap-2">
+        <Button variant="danger" ref={yesButton} aria-disabled={saving} onClick={confirm}>
+          Yes, recall patient
+        </Button>
+        <Button variant="secondary" onClick={returnToRecall}>
+          Cancel
+        </Button>
+      </div>
+    </div>
+  );
+}
diff --git a/components/staff/VisitRow.click.test.tsx b/components/staff/VisitRow.click.test.tsx
new file mode 100644
index 0000000..ee024aa
--- /dev/null
+++ b/components/staff/VisitRow.click.test.tsx
@@ -0,0 +1,73 @@
+// @vitest-environment happy-dom
+// Presses "Recall patient" on a staff row in a test browser (happy-dom): it saves only after "Yes",
+// and focus then moves to the progress line, because the "Recall patient" button leaves the page.
+
+import { act } from "react";
+import { createRoot, type Root } from "react-dom/client";
+import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
+import { callBackVisit } from "@/data/staffActions";
+import { checkInAtDesk } from "@/lib/visitActions";
+import { VisitRow } from "./VisitRow";
+
+// The save is replaced, so the test controls what it returns.
+vi.mock("@/data/staffActions", () => ({
+  callBackVisit: vi.fn(),
+  issueNewVisitLink: vi.fn(),
+  markVisitArrived: vi.fn(),
+  removeVisit: vi.fn(),
+}));
+
+// Tells React that this file runs its updates inside act().
+(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
+
+const now = new Date("2026-11-18T20:00:00Z");
+const input = { id: "v1", code: "ABC234", access_token: "TOKEN", site: "A" as const, ctas_level: 4 as const, language: "en" };
+const waiting = checkInAtDesk(input, "waiting", new Date(now.getTime() - 30 * 60_000));
+
+let container: HTMLDivElement;
+let root: Root;
+
+const button = (words: string) => [...container.querySelectorAll("button")].find((b) => b.textContent?.startsWith(words));
+
+async function press(words: string) {
+  const target = button(words);
+  if (!target) throw new Error(`No button "${words}"`);
+  target.focus();
+  await act(async () => target.click());
+}
+
+beforeEach(() => {
+  vi.mocked(callBackVisit).mockReset();
+  container = document.createElement("div");
+  document.body.appendChild(container);
+  root = createRoot(container);
+  act(() => root.render(<VisitRow visit={waiting} now={now} onShowSlip={vi.fn()} onLeftList={vi.fn()} />));
+});
+
+afterEach(() => {
+  act(() => root.unmount());
+  container.remove();
+});
+
+describe("VisitRow recall", () => {
+  it("saves nothing on the first tap", async () => {
+    await press("Recall patient");
+    expect(callBackVisit).not.toHaveBeenCalled();
+  });
+
+  it("after Yes and a save, moves focus to the progress line", async () => {
+    vi.mocked(callBackVisit).mockResolvedValue("saved");
+    await press("Recall patient");
+    await press("Yes, recall patient");
+    expect(callBackVisit).toHaveBeenCalledWith("v1");
+    expect(document.activeElement).toBe(container.querySelector('[data-testid="progress"]'));
+  });
+
+  it("after Yes and a failed save, shows the not-saved note and keeps the progress line out of focus", async () => {
+    vi.mocked(callBackVisit).mockResolvedValue("not_saved");
+    await press("Recall patient");
+    await press("Yes, recall patient");
+    expect(container.textContent).toContain("Not saved");
+    expect(document.activeElement).not.toBe(container.querySelector('[data-testid="progress"]'));
+  });
+});
diff --git a/components/staff/VisitRow.tsx b/components/staff/VisitRow.tsx
index 9e5c295..54dc7b2 100644
--- a/components/staff/VisitRow.tsx
+++ b/components/staff/VisitRow.tsx
@@ -3,7 +3,7 @@
 // One patient in the staff's off-site list: minutes waited, call-back progress and actions.
 // The no-response flags and phone-call buttons are in FollowUpPanel.
 
-import { useState, type ReactNode } from "react";
+import { useRef, useState, type ReactNode } from "react";
 import { callBackVisit, issueNewVisitLink, markVisitArrived, removeVisit } from "@/data/staffActions";
 import { minutesBetween } from "@/lib/queue";
 import { STILL_HERE_ANSWER_WITHIN_MINUTES } from "@/lib/demoTimes";
@@ -13,6 +13,7 @@ import { Button } from "@/components/Button";
 import { Duration } from "./Duration";
 import { FollowUpPanel } from "./FollowUpPanel";
 import { NewLinkPanel } from "./NewLinkPanel";
+import { RecallPanel } from "./RecallPanel";
 
 type Props = {
   visit: Visit;
@@ -55,7 +56,7 @@ export function VisitRow({ visit, now, onShowSlip, onLeftList }: Props) {
   /** A short "it worked" message, for a change that keeps the patient on the list. */
   const [okNote, setOkNote] = useState("");
   /** Save one change and show what happened. `leftListMessage` is announced when the patient leaves the list. */
-  const act = async (change: () => Promise<ChangeResult>, leftListMessage?: string) => {
+  const act = async (change: () => Promise<ChangeResult>, leftListMessage?: string): Promise<ChangeResult | undefined> => {
     if (saving) return; // while one change is on its way, further presses do nothing
     setSaving(true);
     setOkNote("");
@@ -65,6 +66,12 @@ export function VisitRow({ visit, now, onShowSlip, onLeftList }: Props) {
       onLeftList(leftListMessage);
     }
     setNote(result === "saved" ? "" : result === "not_saved" ? NOT_SAVED : CHANGED);
+    return result;
+  };
+  /** The progress line, which stays on the page when the "Recall patient" button leaves it. */
+  const progressLine = useRef<HTMLParagraphElement>(null);
+  const recall = async () => {
+    if ((await act(() => callBackVisit(visit.id))) === "saved") progressLine.current?.focus();
   };
   /** After "Issue a new link" saves: open the slip with the new QR code and say what happened. */
   const showNewLink = (updated: Visit) => {
@@ -81,7 +88,7 @@ export function VisitRow({ visit, now, onShowSlip, onLeftList }: Props) {
           CTAS {visit.ctas_level} · waited <strong><Duration minutes={waited} /></strong>
         </p>
       </div>
-      <p className="mt-1 font-semibold" data-testid="progress">
+      <p ref={progressLine} tabIndex={-1} className="mt-1 font-semibold" data-testid="progress">
         {progress(visit, now)}
       </p>
       {stillHereState({ status: visit.status, triagedAt: visit.triaged_at, lastStillHereAt: visit.last_still_here_at }, now) ===
@@ -92,11 +99,7 @@ export function VisitRow({ visit, now, onShowSlip, onLeftList }: Props) {
       )}
       <FollowUpPanel visit={visit} now={now} saving={saving} act={act} />
       <div className="mt-3 flex flex-wrap gap-2">
-        {visit.status === "waiting" && (
-          <Button aria-disabled={saving} onClick={() => act(() => callBackVisit(visit.id))}>
-            Recall patient<span className="sr-only"> {visit.code}</span>
-          </Button>
-        )}
+        {visit.status === "waiting" && <RecallPanel code={visit.code} saving={saving} onConfirm={recall} />}
         <Button variant="secondary" aria-disabled={saving} onClick={() => act(() => markVisitArrived(visit.id), `Visit ${visit.code} marked arrived. Undo is under Recently closed.`)}>
           Mark arrived
         </Button>
diff --git a/lib/text/ar.ts b/lib/text/ar.ts
index fefce53..9d30da1 100644
--- a/lib/text/ar.ts
+++ b/lib/text/ar.ts
@@ -126,6 +126,7 @@ export const ar: PatientText = {
     button: "أنا لا أزال هنا",
     thanks: "شكرًا لك.",
     meaning: "هذا يخبر الموظفين أنك لا تزال تنتظر. إنه ليس فحصًا لصحتك.",
+    notSaved: "لم يتم حفظ نقرتك. قد لا يعلم الموظفون أنك لا تزال تنتظر. يرجى المحاولة مرة أخرى.",
   },
   secondAlert: "يرجى العودة إلى قسم الطوارئ في الحال. قد يتصل الموظفون بهاتفك.",
   returnNow: {
diff --git a/lib/text/en.ts b/lib/text/en.ts
index 3eb7671..bb3c9da 100644
--- a/lib/text/en.ts
+++ b/lib/text/en.ts
@@ -150,6 +150,8 @@ export const en = {
     button: "I'm still here",
     thanks: "Thank you.",
     meaning: "This tells staff you are still waiting. It is not a check of your health.",
+    /** The tap could not be saved. No desk or "come back" words: the patient is still waiting off-site. */
+    notSaved: "Your tap did not save. Staff may not know you are still waiting. Please try again.",
   },
   secondAlert: "Please come back to the emergency department right now. Staff may phone you.",
   returnNow: {
diff --git a/lib/text/fr.ts b/lib/text/fr.ts
index 09ce203..62c165c 100644
--- a/lib/text/fr.ts
+++ b/lib/text/fr.ts
@@ -126,6 +126,7 @@ export const fr: PatientText = {
     button: "Je suis toujours ici",
     thanks: "Merci.",
     meaning: "Cela indique au personnel que vous attendez toujours. Ce n'est pas un bilan de votre santé.",
+    notSaved: "Votre appui sur le bouton n'a pas été enregistré. Le personnel ne sait peut-être pas que vous attendez toujours. Veuillez réessayer.",
   },
   secondAlert: "Veuillez revenir au service des urgences immédiatement. Le personnel peut appeler votre téléphone.",
   returnNow: {
diff --git a/lib/text/ur.ts b/lib/text/ur.ts
index cdaaef6..232da8f 100644
--- a/lib/text/ur.ts
+++ b/lib/text/ur.ts
@@ -126,6 +126,7 @@ export const ur: PatientText = {
     button: "میں اب بھی یہاں ہوں",
     thanks: "شکریہ۔",
     meaning: "یہ عملے کو بتاتا ہے کہ آپ اب بھی انتظار کر رہے ہیں۔ یہ آپ کی صحت کا چیک نہیں ہے۔",
+    notSaved: "آپ کا ٹیپ محفوظ نہیں ہوا۔ ہو سکتا ہے عملہ نہ جانتا ہو کہ آپ اب بھی انتظار کر رہے ہیں۔ براہ کرم دوبارہ کوشش کریں۔",
   },
   secondAlert: "براہ کرم فوراً ایمرجنسی ڈیپارٹمنٹ واپس آ جائیں۔ عملہ آپ کے فون پر کال کر سکتا ہے۔",
   returnNow: {
diff --git a/lib/text/zh.ts b/lib/text/zh.ts
index 505165e..b7d9125 100644
--- a/lib/text/zh.ts
+++ b/lib/text/zh.ts
@@ -126,6 +126,7 @@ export const zh: PatientText = {
     button: "我还在",
     thanks: "谢谢。",
     meaning: "这告诉工作人员您仍在等待。这不是对您健康状况的检查。",
+    notSaved: "您的点击未保存。工作人员可能不知道您仍在等待。请重试。",
   },
   secondAlert: "请立即回到急诊室。工作人员可能会拨打您的电话。",
   returnNow: {
```
