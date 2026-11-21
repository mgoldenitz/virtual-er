# Gemini review: the survey fixes (Phase 5, Part B, round 2)

Model: Gemini Hydrogen 4, High, in a new chat (not the chat of round 1). If you have no Gemini Hydrogen 4 credits, use Gemini 3.6 Flash, High.

Round 1: `handoffs/2026-11-20-gemini-review-survey.md`. This is the second round on the same code. Before a third round, Claude asks the owner first.

## What to paste into Gemini

Paste everything from "Prompt" to the end of this file. The file has no keys, tokens, passwords or real patient data. The tokens in the checks (`ZZZZ...S0`) are made up.

## Prompt

You review a small change to a concept prototype: a virtual ER waiting room. Low-acuity patients wait off-site and follow their place in line on their phone. Synthetic data only. Next.js App Router, React 19, Supabase (Postgres with row-level security; patients use the `anon` role and reach data only through `security definer` functions that need the visit's access token).

Find problems. Do not confirm that the change is good. For each problem, give the file and line, a concrete case that goes wrong, and the smallest fix. Say "not sure" when you are not sure.

### Background

After staff mark a patient "arrived", the visit is closed and the phone shows "Ready at the desk" with one survey question: "How would you rate your waiting experience?", the scores 0 to 10 as radio buttons, and Submit. After a saved score, the phone says "Thank you for your feedback." and does not ask again. The phone reads only `surveyDone` (true or false), never the score.

An earlier review found these problems. This change tries to fix them:

- 1.1 The score saves, but the read after it fails: the form stays, and a second Submit says "did not save" (false, the database refuses a second score).
- 3.1 After a saved Submit, the form goes away and focus falls to the page body.
- 3.2 and 3.5 Submit used native `disabled`, so focus left the button while sending; Submit was not grayed out with no score.
- 3.3 The "0 = Very poor" and "10 = Excellent" labels were not tied to the radio group.
- 3.6 A second failed save was not read out again by a screen reader (the same alert element stayed).
- 3.7 After an Undo and a second arrival, the old score and the old alert stayed (the component stayed mounted).
- Test gaps: score 0 and 10, a save as the `anon` role, the thank-you gone after Undo.

### How the fix works

- `lib/survey.ts`: `surveyStep(view, savedHere = false)`. `savedHere` is true when this phone got "saved" back. It gives "thanks" only for an arrived, closed visit, so after an Undo the step is still null.
- `components/patient/SurveyBox.tsx`: holds `savedHere` and picks the step. The thank-you is `<p role="status" tabIndex={-1}>`. Focus moves to it only after a Submit on this phone (a `useEffect` on `savedHere`).
- `components/patient/SurveyForm.tsx` (new): the form. It mounts only on the "ask" step, so score and alert start empty each time. Submit has `aria-disabled={score === null || sending}` (no native `disabled`), and the guard in `onSubmit` stops the press. Each Submit first sets `notSaved` to false, so a second failure renders a new alert element. `useId()` ties the 0/10 labels to the fieldset with `aria-describedby`.

### Settled decisions (do not report these as faults)

- "Pick, then Submit" (owner, 2026-11-20): a radio group and a Submit button, not 11 buttons that save on tap.
- Undo of an arrival keeps the score (owner, 2026-11-20). After a second "Mark arrived", the phone shows thank you, not a second survey.
- "Score keeps version" (owner, 2026-11-20): a change to `survey_score` alone does not raise `visits.version`. Not part of this change.
- Gray out Submit until a score is picked (owner, 3.2): `aria-disabled`, not native `disabled`, so the button stays in the tab order.
- Keep Submit active offline, and fail clearly with the "did not save" alert (owner, 3.8). `components/patient/SurveyForm.tsx` line 71 has no offline check on purpose.
- Count every score on the dashboard, also when a visit is removed after an Undo (owner, 4.1). No dashboard change.
- `savedHere` is not reset when the step turns null (`components/patient/SurveyBox.tsx` line 21). The database keeps the score after an Undo, so the next arrival shows thanks from `surveyDone` anyway.
- `SurveyForm.tsx` keeps `!isSurveyScore(score)` in the guard (line 33), although the radios give only 0 to 10. It is a cheap second check; the database checks too.

### Questions

1. Focus: in `SurveyBox.tsx`, does the focus move to the thank-you work in all cases? For example: the page re-reads the visit (`surveyDone` turns true) at the same time as `onSaved()`; the whole status screen turns "unavailable" after two failed reads and comes back.
2. `aria-disabled` on Submit: does a screen reader say "dimmed" or "unavailable" at the right time? Is a press on Enter in a radio (form submit) also stopped by the guard? Does anything tell the patient why Submit does nothing with no score?
3. The new alert for a second failure: does `setNotSaved(false)` then `setNotSaved(true)` after an `await` really give a new element in React 19, or can React batch them so the element stays?
4. `aria-describedby` on a `fieldset`: do common screen readers (VoiceOver on iOS, TalkBack) read it? Is there a simpler way?
5. `submitSurvey` (helper below) returns "not_saved" if `refreshPatientView` throws after a saved score. Can that happen, and does it bring back problem 1.1?
6. `supabase/checks/survey.sql` case 16: is `set local role anon` then `reset role` a fair test of what the phone can do? What does it not test?
7. Anything in the new tests that passes for the wrong reason.

## Checked (output in this session or in docs/progress.md)

- Failing tests first (`b774cf0`): 7 failed, 32 passed. The double-Submit test passed already before the fix.
- After the fix: `npm test` 88 test files, 565 tests pass. `npm run lint`: no faults. `npm run build`: passed.
- `npm run e2e` two times in a row: 37 passed (2.0 min), 37 passed (2.3 min). Phone 390 x 844 and laptop 1280 x 800, with axe checks.
- `supabase/checks/survey.sql` on the live database (run by the owner in the SQL Editor): 16 of 16 ok (case 14 score 0 saved, case 15 score 10 saved, case 16 anon saved 9).

## Not checked

- A real phone (only Playwright's phone size in Chromium).
- A real screen reader (only axe and the roles in the tests). Questions 2 and 4 depend on this.
- The case where the read after a saved score fails in the real app (only the click test, with the save replaced).

## Line counts of the changed files (after the change)

Code: `components/patient/SurveyBox.tsx` 39, `components/patient/SurveyForm.tsx` 81 (new), `lib/survey.ts` 24.
Database check: `supabase/checks/survey.sql` 90.
Tests: `components/patient/SurveyBox.click.test.tsx` 178, `lib/survey.test.ts` 71, `e2e/recall-arrive.spec.ts` 69.

## Helpers that the changed lines call (not in the diff)

`data/patientVisit.ts` lines 82 to 95 and 162 to 171:

```ts
async function refreshPatientView(token: string): Promise<void> {
  const entry = entryFor(token);
  const thisRead = ++entry.latestRead;
  const read = await readFromDatabase(token);
  if (thisRead !== entry.latestRead) return; // a newer read has started; its answer wins
  entry.failures = read === "failed" ? entry.failures + 1 : 0;
  const next = read === "failed" ? afterFailedRead(entry.shown, entry.failures) : read;
  // Keep the same object until the view really changes, so React does not redraw for nothing.
  const key = JSON.stringify(next);
  if (entry.shown !== undefined && key === entry.key) return;
  entry.key = key;
  entry.shown = next;
  listeners.forEach((tell) => tell());
}

export async function submitSurvey(token: string, score: number): Promise<ChangeResult> {
  try {
    const { data, error } = await supabaseBrowser().rpc("submit_survey", { p_token: token, p_score: score });
    if (error || typeof data !== "boolean") return "not_saved";
    await refreshPatientView(token); // show the result straight away
    return data ? "saved" : "refused";
  } catch {
    return "not_saved";
  }
}
```

`afterFailedRead` (`lib/failedRead.ts`): after 1 failed read it keeps the old view; after 2 failed reads in a row it shows "unavailable".

`components/Button.tsx` (whole file):

```tsx
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

Where SurveyBox shows (`components/patient/StatusAndSound.tsx` line 39):

```tsx
{token && <SurveyBox view={view} token={token} language={language} />}
```

The English survey text (`lib/text/en.ts` lines 180 to 189):

```ts
survey: {
  question: "How would you rate your waiting experience?",
  low: "0 = Very poor",
  high: "10 = Excellent",
  submit: "Submit",
  thanks: "Thank you for your feedback.",
  note: "Answering is optional. Your name is not stored.",
  notSaved: "Your answer did not save. Please try again.",
},
```

## The diff (tests `b774cf0`, then the fix `2e9eac6`)

```diff
diff --git a/components/patient/SurveyBox.click.test.tsx b/components/patient/SurveyBox.click.test.tsx
index e1f0916..14175bd 100644
--- a/components/patient/SurveyBox.click.test.tsx
+++ b/components/patient/SurveyBox.click.test.tsx
@@ -72,6 +72,72 @@ describe("SurveyBox", () => {
     show(arrived);
     await act(async () => submit()?.click());
     expect(submitSurvey).not.toHaveBeenCalled();
+    expect(submit()?.getAttribute("aria-disabled")).toBe("true");
+  });
+
+  it("grays out Submit until a score is picked, and keeps it a real button", () => {
+    show(arrived);
+    expect(submit()?.hasAttribute("disabled")).toBe(false);
+    pick(4);
+    expect(submit()?.getAttribute("aria-disabled")).toBe("false");
+  });
+
+  it("ties the 0 and 10 labels to the group of scores", () => {
+    show(arrived);
+    const id = container.querySelector("fieldset")?.getAttribute("aria-describedby");
+    expect(id).toBeTruthy();
+    const scale = document.getElementById(id ?? "");
+    expect(scale?.textContent).toContain(s.low);
+    expect(scale?.textContent).toContain(s.high);
+  });
+
+  it("says thank you and moves focus to it when the save worked, before the next read shows it", async () => {
+    show(arrived);
+    pick(8);
+    await act(async () => submit()?.click());
+    const thanks = [...container.querySelectorAll('[role="status"]')].find((p) => p.textContent === s.thanks);
+    expect(thanks).toBeDefined();
+    expect(document.activeElement).toBe(thanks);
+    expect(radios()).toHaveLength(0);
+  });
+
+  it("does not move focus to a thank-you that was already there", () => {
+    show({ ...arrived, surveyDone: true });
+    expect(document.activeElement).toBe(document.body);
+  });
+
+  it("shows a new alert for a second failed save, so it is read out again", async () => {
+    vi.mocked(submitSurvey).mockResolvedValue("not_saved");
+    show(arrived);
+    pick(5);
+    await act(async () => submit()?.click());
+    const first = container.querySelector('[role="alert"]');
+    await act(async () => submit()?.click());
+    const second = container.querySelector('[role="alert"]');
+    expect(second?.textContent).toBe(s.notSaved);
+    expect(second).not.toBe(first);
+  });
+
+  it("starts empty after an Undo and a second arrival", async () => {
+    vi.mocked(submitSurvey).mockResolvedValue("not_saved");
+    show(arrived);
+    pick(5);
+    await act(async () => submit()?.click());
+    show({ ...arrived, status: "on_the_way", closed: false });
+    show(arrived);
+    expect(container.querySelector('[role="alert"]')).toBeNull();
+    expect(radios().some((r) => r.checked)).toBe(false);
+  });
+
+  it("sends once when Submit is pressed twice while the first save runs", async () => {
+    let finish: (answer: "saved") => void = () => {};
+    vi.mocked(submitSurvey).mockReturnValue(new Promise((resolve) => (finish = resolve)));
+    show(arrived);
+    pick(6);
+    act(() => submit()?.click());
+    act(() => submit()?.click());
+    await act(async () => finish("saved"));
+    expect(submitSurvey).toHaveBeenCalledTimes(1);
   });
 
   it("sends the picked score with the token", async () => {
diff --git a/components/patient/SurveyBox.tsx b/components/patient/SurveyBox.tsx
index 4db0d1c..c1fc5cf 100644
--- a/components/patient/SurveyBox.tsx
+++ b/components/patient/SurveyBox.tsx
@@ -1,17 +1,13 @@
 "use client";
 
-// The survey on the patient's "Ready at the desk" screen: one question, a score from 0 to 10, and Submit.
-// It shows only after the visit is closed and arrived, and only once (lib/survey.ts decides which step).
+// The survey on the patient's "Ready at the desk" screen. It decides which step shows
+// (lib/survey.ts): nothing, the form (SurveyForm.tsx), or the thank-you.
 
-import { useState, type FormEvent } from "react";
-import { submitSurvey } from "@/data/patientVisit";
+import { useEffect, useRef, useState } from "react";
 import type { PatientView } from "@/lib/patientView";
-import { isSurveyScore, surveyStep } from "@/lib/survey";
+import { surveyStep } from "@/lib/survey";
 import { textFor } from "@/lib/text";
-import { Button } from "@/components/Button";
-
-/** The 11 scores the patient can pick, 0 to 10. */
-const SCORES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
+import { SurveyForm } from "./SurveyForm";
 
 type Props = {
   view: PatientView;
@@ -21,67 +17,23 @@ type Props = {
 };
 
 export function SurveyBox({ view, token, language }: Props) {
-  const [score, setScore] = useState<number | null>(null);
-  const [sending, setSending] = useState(false);
-  const [notSaved, setNotSaved] = useState(false);
+  // True when this phone got "saved" back, so the thank-you shows before the next read.
+  const [savedHere, setSavedHere] = useState(false);
+  const thanks = useRef<HTMLParagraphElement>(null);
   const t = textFor(language).survey;
-  const step = surveyStep(view);
-
-  if (step === null) return null;
-  if (step === "thanks") {
-    return (
-      <p role="status" className="clean-card font-semibold">
-        {t.thanks}
-      </p>
-    );
-  }
+  const step = surveyStep(view, savedHere);
 
-  async function onSubmit(event: FormEvent<HTMLFormElement>) {
-    event.preventDefault();
-    if (score === null || !isSurveyScore(score) || sending) return;
-    setSending(true);
-    const result = await submitSurvey(token, score);
-    setSending(false);
-    // On "saved" the page re-reads the visit, so the step turns to "thanks" by itself.
-    setNotSaved(result !== "saved");
-  }
+  // After a Submit on this phone, the form is gone, so focus moves to the thank-you.
+  // A thank-you that was already there (an old score) does not take focus.
+  useEffect(() => {
+    if (savedHere) thanks.current?.focus();
+  }, [savedHere]);
 
+  if (step === null) return null;
+  if (step === "ask") return <SurveyForm token={token} language={language} onSaved={() => setSavedHere(true)} />;
   return (
-    <form onSubmit={onSubmit} className="clean-card space-y-3">
-      <fieldset className="space-y-3">
-        <legend className="text-lg font-bold">{t.question}</legend>
-        <div className="flex flex-wrap gap-2">
-          {SCORES.map((n) => (
-            <label
-              key={n}
-              className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1 rounded-xl border-2 border-slate-700 px-2 font-semibold"
-            >
-              <input
-                type="radio"
-                name="survey-score"
-                value={n}
-                checked={score === n}
-                onChange={() => setScore(n)}
-                className="h-5 w-5"
-              />
-              {n}
-            </label>
-          ))}
-        </div>
-        <div className="flex justify-between gap-2 text-sm">
-          <span>{t.low}</span>
-          <span>{t.high}</span>
-        </div>
-      </fieldset>
-      <p className="text-sm">{t.note}</p>
-      <Button type="submit" disabled={sending} className="w-full text-lg">
-        {t.submit}
-      </Button>
-      {notSaved && (
-        <p role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
-          {t.notSaved}
-        </p>
-      )}
-    </form>
+    <p ref={thanks} role="status" tabIndex={-1} className="clean-card font-semibold">
+      {t.thanks}
+    </p>
   );
 }
diff --git a/components/patient/SurveyForm.tsx b/components/patient/SurveyForm.tsx
new file mode 100644
index 0000000..86fb246
--- /dev/null
+++ b/components/patient/SurveyForm.tsx
@@ -0,0 +1,81 @@
+"use client";
+
+// The survey form: one question, a score from 0 to 10, and Submit.
+// SurveyBox shows it only on the "ask" step, so the score and the alert start empty each time it shows.
+
+import { useId, useState, type FormEvent } from "react";
+import { submitSurvey } from "@/data/patientVisit";
+import { isSurveyScore } from "@/lib/survey";
+import { textFor } from "@/lib/text";
+import { Button } from "@/components/Button";
+
+/** The 11 scores the patient can pick, 0 to 10. */
+const SCORES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
+
+type Props = {
+  /** The visit's token, sent with the score. */
+  token: string;
+  language: string;
+  /** Called when the database answers "saved". */
+  onSaved: () => void;
+};
+
+export function SurveyForm({ token, language, onSaved }: Props) {
+  const [score, setScore] = useState<number | null>(null);
+  const [sending, setSending] = useState(false);
+  const [notSaved, setNotSaved] = useState(false);
+  const scaleId = useId();
+  const t = textFor(language).survey;
+
+  async function onSubmit(event: FormEvent<HTMLFormElement>) {
+    event.preventDefault();
+    // Submit is only grayed out (aria-disabled), so a press still comes here: this line stops it.
+    if (score === null || !isSurveyScore(score) || sending) return;
+    // Remove the old alert first, so a second failure is a new alert and is read out again.
+    setNotSaved(false);
+    setSending(true);
+    const result = await submitSurvey(token, score);
+    setSending(false);
+    if (result === "saved") onSaved();
+    else setNotSaved(true);
+  }
+
+  return (
+    <form onSubmit={onSubmit} className="clean-card space-y-3">
+      <fieldset aria-describedby={scaleId} className="space-y-3">
+        <legend className="text-lg font-bold">{t.question}</legend>
+        <div className="flex flex-wrap gap-2">
+          {SCORES.map((n) => (
+            <label
+              key={n}
+              className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1 rounded-xl border-2 border-slate-700 px-2 font-semibold"
+            >
+              <input
+                type="radio"
+                name="survey-score"
+                value={n}
+                checked={score === n}
+                onChange={() => setScore(n)}
+                className="h-5 w-5"
+              />
+              {n}
+            </label>
+          ))}
+        </div>
+        <div id={scaleId} className="flex justify-between gap-2 text-sm">
+          <span>{t.low}</span>
+          <span>{t.high}</span>
+        </div>
+      </fieldset>
+      <p className="text-sm">{t.note}</p>
+      <Button type="submit" aria-disabled={score === null || sending} className="w-full text-lg">
+        {t.submit}
+      </Button>
+      {notSaved && (
+        <p role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
+          {t.notSaved}
+        </p>
+      )}
+    </form>
+  );
+}
diff --git a/e2e/recall-arrive.spec.ts b/e2e/recall-arrive.spec.ts
index a3989c1..886c3a6 100644
--- a/e2e/recall-arrive.spec.ts
+++ b/e2e/recall-arrive.spec.ts
@@ -55,6 +55,7 @@ test("recall, on the way, arrived, the survey, then undo and arrive again",async
     // Undo puts the visit back to on_the_way, so the phone shows the called screen again.
     await expect(patient.getByRole("heading", { name: "Please head back now" })).toBeVisible();
     await expect(patient.getByRole("heading", { name: "Status: Ready at the desk" })).toHaveCount(0);
+    await expect(patient.getByText("Thank you for your feedback.")).toHaveCount(0);
 
     // A second arrival keeps the score (owner decision 2026-11-20): thank you, and no second survey.
     await row.getByRole("button", { name: "Mark arrived" }).click();
diff --git a/lib/survey.test.ts b/lib/survey.test.ts
index 186c21b..68649b2 100644
--- a/lib/survey.test.ts
+++ b/lib/survey.test.ts
@@ -30,6 +30,14 @@ describe("which survey step the patient sees (SPEC line 69, hard rule 5)", () =>
     expect(surveyStep({ ...arrived, surveyDone: true })).toBe("thanks");
   });
 
+  it("says thank you when this phone saved the score, before the next read shows it", () => {
+    expect(surveyStep(arrived, true)).toBe("thanks");
+  });
+
+  it("shows nothing after an Undo, also when this phone saved the score", () => {
+    expect(surveyStep({ ...arrived, status: "on_the_way", closed: false }, true)).toBeNull();
+  });
+
   it("shows nothing for an arrived visit that is not closed", () => {
     expect(surveyStep({ ...arrived, closed: false })).toBeNull();
   });
diff --git a/lib/survey.ts b/lib/survey.ts
index 3f0fe26..cc692f9 100644
--- a/lib/survey.ts
+++ b/lib/survey.ts
@@ -9,9 +9,11 @@ export type SurveyStep = "ask" | "thanks" | null;
 /**
  * Only a closed visit that arrived gets the survey (an arrived visit always waited off-site).
  * After the score is saved, the phone says thank you instead, also after an Undo and a second arrival.
+ * `savedHere` is true when this phone got "saved" back, before the next read shows `surveyDone`.
  */
-export function surveyStep(view: PatientView): SurveyStep {
+export function surveyStep(view: PatientView, savedHere = false): SurveyStep {
   if (view.status !== "arrived" || !view.closed) return null;
+  if (savedHere) return "thanks";
   if (!view.surveyDone) return "ask";
   return "thanks";
 }
diff --git a/supabase/checks/survey.sql b/supabase/checks/survey.sql
index 5766886..b293185 100644
--- a/supabase/checks/survey.sql
+++ b/supabase/checks/survey.sql
@@ -9,7 +9,9 @@
 -- Cases 12 and 13 (20261120010000_survey_keeps_version.sql): the score alone does not raise the
 -- version, so a staff Undo right after the survey is not refused; other changes still raise it.
 --
--- Expected result: 13 rows, each with result = ok.
+-- Cases 14 to 16: the lowest and highest score are saved, and a phone (the anon role) can save a score.
+--
+-- Expected result: 16 rows, each with result = ok.
 
 begin;
 
@@ -17,12 +19,15 @@ insert into public.visits (code, access_token, site, source, status, triaged_at)
   ('ZZZZ5A', 'ZZZZZZZZZZZZZZZZZZZZZZZZS0', 'A', 'desk', 'waiting', now()),  -- arrives, answers 7
   ('ZZZZ5B', 'ZZZZZZZZZZZZZZZZZZZZZZZZS1', 'A', 'desk', 'waiting', now()),  -- on the way, not closed
   ('ZZZZ5C', 'ZZZZZZZZZZZZZZZZZZZZZZZZS2', 'A', 'desk', 'waiting', now()),  -- removed (left)
-  ('ZZZZ5D', 'ZZZZZZZZZZZZZZZZZZZZZZZZS3', 'A', 'desk', 'waiting', now());  -- arrives, gives no score
+  ('ZZZZ5D', 'ZZZZZZZZZZZZZZZZZZZZZZZZS3', 'A', 'desk', 'waiting', now()),  -- arrives, gives no score
+  ('ZZZZ5F', 'ZZZZZZZZZZZZZZZZZZZZZZZZS5', 'A', 'desk', 'waiting', now()),  -- arrives, answers 0
+  ('ZZZZ5G', 'ZZZZZZZZZZZZZZZZZZZZZZZZS6', 'A', 'desk', 'waiting', now()),  -- arrives, answers 10
+  ('ZZZZ5H', 'ZZZZZZZZZZZZZZZZZZZZZZZZS7', 'A', 'desk', 'waiting', now());  -- arrives, answers 9 as anon
 insert into public.visits (code, access_token, site, source, status, triaged_at, offered_at, closed_at) values
   ('ZZZZ5E', 'ZZZZZZZZZZZZZZZZZZZZZZZZS4', 'A', 'desk', 'declined', now(), now(), now());
 
 update public.visits set status = 'arrived', arrived_at = now(), closed_at = now()
-  where code in ('ZZZZ5A', 'ZZZZ5D');
+  where code in ('ZZZZ5A', 'ZZZZ5D', 'ZZZZ5F', 'ZZZZ5G', 'ZZZZ5H');
 update public.visits set status = 'called', called_at = now() where code = 'ZZZZ5B';
 update public.visits set status = 'on_the_way', confirmed_at = now() where code = 'ZZZZ5B';
 update public.visits set status = 'removed', removed_reason = 'left', closed_at = now() where code = 'ZZZZ5C';
@@ -64,6 +69,19 @@ insert into survey_rows select '13 another change still raises the version',
   (select (version + 1)::text from versions_before where code = 'ZZZZ5B'),
   (select version::text from public.visits where code = 'ZZZZ5B');
 
+insert into survey_rows select '14 arrived, score 0: saved', 'true',
+  public.submit_survey('ZZZZZZZZZZZZZZZZZZZZZZZZS5', 0)::text;
+insert into survey_rows select '15 arrived, score 10: saved', 'true',
+  public.submit_survey('ZZZZZZZZZZZZZZZZZZZZZZZZS6', 10)::text;
+
+-- Case 16: the phone calls submit_survey as anon. The anon role may not write to the temp table,
+-- so the call goes alone, and the check reads the score after "reset role".
+set local role anon;
+select public.submit_survey('ZZZZZZZZZZZZZZZZZZZZZZZZS7', 9);
+reset role;
+insert into survey_rows select '16 anon saves a score', '9',
+  (select survey_score::text from public.visits where code = 'ZZZZ5H');
+
 select check_case, expected, got,
        case when got is not distinct from expected then 'ok' else 'FAIL' end as result
 from survey_rows
```

## Response

Gemini Hydrogen 4, High, new chat, 2026-11-20. Pasted by the owner, as given.

### 1. Focus after a save (`SurveyBox.tsx`)

* **Concurrent `surveyDone = true` and `onSaved()` causes a two-commit focus drop and live-region collision**:
  * **File and line:** `components/patient/SurveyBox.tsx` lines 24–38 and `data/patientVisit.ts` lines 166–167.
  * **Concrete case:** A patient picks a score and activates Submit. Inside `submitSurvey`, `await refreshPatientView(token)` updates `entry.shown` (`surveyDone = true`) and notifies listeners *before* `submitSurvey` returns `"saved"`. In the first commit, `SurveyBox` sees `surveyDone === true` while `savedHere` is still `false`, so `<SurveyForm>` unmounts (dropping focus from Submit to `document.body`) and `<p ref={thanks} role="status">` mounts without focus. In the next commit, `onSaved()` sets `savedHere = true` and `useEffect` calls `thanks.current?.focus()`. Focus lands on `thanks`, but mounting `role="status"` first and focusing it a commit later can trigger a double announcement or cut off speech in screen readers (not sure of exact timing on real VoiceOver/TalkBack).
  * **Smallest fix:** Remove `role="status"` from the focused `<p ref={thanks} tabIndex={-1}>` in `components/patient/SurveyBox.tsx` line 35 (or move focus when `step` transitions `"ask"` -> `"thanks"` in the same commit instead of waiting for `savedHere` if `refreshPatientView` beat `onSaved()`, noting that `e2e/recall-arrive.spec.ts` queries `role="status"` if removed).
* **Turning `"unavailable"` after two failed reads drops `onSaved()` and leaves focus stranded**:
  * **File and line:** `components/patient/SurveyBox.tsx` lines 21–38, `components/patient/SurveyForm.tsx` lines 37–39, and `data/patientVisit.ts` lines 87–94 and 166–167.
  * **Concrete case:** Suppose 1 background read failed earlier (`entry.failures === 1`). The patient submits a score: `submit_survey` succeeds, then `await refreshPatientView(token)` fails, pushing `entry.failures` to `2`. `afterFailedRead` returns `"unavailable"`, which unmounts `StatusAndSound` and `SurveyBox` before `submitSurvey` returns `"saved"`. `onSaved()` calls `setSavedHere(true)` on an unmounted `SurveyBox` (a no-op), and when reads recover, `SurveyBox` mounts fresh with `savedHere = false` and `surveyDone = true` — so focus never moves to the thank-you (it fell to `document.body` when the `"unavailable"` screen took over). The same loss happens if `savedHere` was already `true` (focus on `thanks`), two background reads fail to `"unavailable"`, and the visit screen comes back.
  * **Smallest fix:** Handle `"unavailable"` recovery focus in the parent patient page/wrapper (outside `StatusAndSound` and `SurveyBox`, e.g., rescuing lost focus to `#status-heading` on recovery) rather than inside `SurveyBox`.
* **Staff Undo while focus is inside `SurveyBox` drops focus to `document.body`**:
  * **File and line:** `components/patient/StatusAndSound.tsx` line 39 and `components/patient/SurveyBox.tsx` lines 32–38.
  * **Concrete case:** A keyboard user has focus on a radio button, Submit, or the focused thank-you `<p>` when staff click Undo (`view.status` becomes `"on_the_way"`, `closed: false`). `SurveyBox` returns `null` and unmounts the focused element, and because `StatusAndSound.tsx` line 39 does not pass `lostFocus` to `SurveyBox`, `PatientStatus` does not rescue focus to `#status-heading`.
  * **Smallest fix:** Pass `onFocusLost={() => { lostFocus.current = true; }}` from `StatusAndSound.tsx` line 39 into `SurveyBox` and wrap `SurveyBox`'s non-null output with `useReportFocusOnLeave`.

### 2. `aria-disabled` on Submit (`SurveyForm.tsx`)

* **Screen-reader announcement ("dimmed" / "unavailable") and `sending` state:**
  * **File and line:** `components/patient/SurveyForm.tsx` lines 36–38 and 71.
  * **Concrete case:** With `aria-disabled={score === null || sending}`, VoiceOver announces `"dimmed"` when `score === null` and keeps the button in the tab order. However, when a user activates Submit and `sending` turns `true`, `aria-disabled` flips to `"true"` on the *already-focused* button with no text change (still `"Submit"`) and no live announcement — so a screen-reader user is not told the form is currently sending. (Not sure of exact phrasing differences across iOS VoiceOver and Android TalkBack without testing on real devices.)
  * **Smallest fix:** Switch the button text to `"Sending…"` (already in `lib/text` for `patient.sending`) or expose an `aria-live="polite"` status while `sending` is `true`.
* **Pressing Enter inside a radio button:**
  * **File and line:** `components/patient/SurveyForm.tsx` lines 30–33 and 53–60.
  * **Result:** Pressing Enter inside a radio input fires `<form onSubmit={onSubmit}>`, so line 33 (`if (score === null || !isSurveyScore(score) || sending) return;`) **does** stop the submit when `score === null` or `sending === true`.
  * **Concrete race on double-submit:** Because `sending` is React state rather than a synchronous ref, two rapid clicks or Enter + click in the same event batch before React commits `sending = true` both see `sending === false` and fire `submitSurvey` twice.
  * **Smallest fix:** Add `const sendingRef = useRef(false);` in `SurveyForm.tsx` and guard `onSubmit` with `sendingRef.current` before `setSending(true)`.
* **Silent no-op when Submit is pressed with no score:**
  * **File and line:** `components/patient/SurveyForm.tsx` lines 33 and 70–71, and `lib/text/en.ts` line 186.
  * **Concrete case:** Line 70 reads `"Answering is optional. Your name is not stored."`. A patient who taps the dimmed Submit button thinking it skips the survey (or taps Submit accidentally before picking a number) hits `if (score === null ...) return;` on line 33 and gets zero visual or screen-reader explanation.
  * **Smallest fix:** When `onSubmit` returns early because `score === null`, show a polite inline hint (e.g., `"Pick a score from 0 to 10 first."` in a `<p role="status">`) or tie a hint to Submit via `aria-describedby`.

### 3. Does React 19 really make a new alert element? (`SurveyForm.tsx`)

* **File and line:** `components/patient/SurveyForm.tsx` lines 30–41 and 74–78.
* **What happens in React 19:** Because `onSubmit` is a discrete DOM event (`SyncLane`), React 19 normally flushes `setNotSaved(false)` and `setSending(true)` synchronously at the end of the event handler before `await submitSurvey(token, score)` resumes, so a failed `submitSurvey` later sets `notSaved = true` in a second commit and mounts a new `<p role="alert">` node.
* **Concrete cases where it can still fail:**
  1. **Same-frame unmount/remount on fast failures:** If `submitSurvey` fails immediately (for example, `supabaseBrowser()` throws synchronously into `catch` or an offline `fetch` rejects in < 16 ms before the browser paints), `<p role="alert">` is removed and re-inserted within the same animation frame. Browsers/accessibility trees can coalesce a same-frame remove-and-add so VoiceOver or TalkBack never announces the second failure (not sure on all browser/screen-reader pairs without real device testing).
  2. **Non-discrete invocation:** If `onSubmit` were ever triggered outside a discrete React event (non-sync lane), React 19 would batch `setNotSaved(false)` and `setNotSaved(true)` into one render if `submitSurvey` settled on a microtask, leaving the original `<p role="alert">` in place.
* **Smallest fix:** Clear `notSaved` as soon as the patient changes any radio score (`onChange={() => { setScore(n); setNotSaved(false); }}` on line 58), or wait one animation frame / vary the alert text when retrying while `notSaved` was already `true`.

### 4. `aria-describedby` on `<fieldset>` (`SurveyForm.tsx`)

* **File and line:** `components/patient/SurveyForm.tsx` lines 45–68.
* **Concrete case:** Not sure of every Android TalkBack version without real device testing, **but** iOS VoiceOver (Safari/WebKit) commonly ignores `aria-describedby` on `<fieldset>` when swiping into the radio buttons inside it, and TalkBack support for `fieldset[aria-describedby]` is inconsistent. Even worse, `<div id={scaleId}>` (`"0 = Very poor"` / `"10 = Excellent"`) sits in the DOM **after** all 11 radios (lines 65–68), so swipe-order users hear `"0"` through `"10"` before ever reaching what `0` and `10` mean.
* **Smallest fix:** Move the `<div id={scaleId}>` scale labels **above** the radio group (directly below `<legend>`), and add `.sr-only` anchor labels inside the `0` and `10` `<label>`s (or include `"0 = Very poor, 10 = Excellent"` inside `<legend>`) so every screen reader announces the scale before or on the first radio.

### 5. `refreshPatientView` error after a saved score (`data/patientVisit.ts`)

* **File and line:** `data/patientVisit.ts` lines 82–95 and 162–171.
* **Can `refreshPatientView` throw?** Not sure whether `readFromDatabase` inside `data/patientVisit.ts` (not in the diff) catches all fetch/JSON errors or can reject; however, if `readFromDatabase`, `JSON.stringify(next)`, or any listener in `listeners` throws inside `refreshPatientView(token)` on line 166, `submitSurvey` jumps straight to `catch { return "not_saved"; }` on lines 169–170.
* **Concrete case (brings back problem 1.1):** `submit_survey` commits the score and returns `true`, then `refreshPatientView(token)` throws. `submitSurvey` returns `"not_saved"`. `SurveyForm` stays mounted with the red `"Your answer did not save"` alert. When the patient taps Submit again, `submit_survey` returns `false` (`"refused"`), and if `refreshPatientView` fails/throws again, `SurveyForm` line 40 shows `"Your answer did not save"` a second time even though the score was saved on the first tap. (Also, if `submit_survey` returns `false` because another tab saved first and `refreshPatientView` fails once—keeping `surveyDone: false` via `afterFailedRead`—line 40 likewise shows `"Your answer did not save"` for a `"refused"` result.)
* **Smallest fix:** Wrap `await refreshPatientView(token);` in its own `try { await refreshPatientView(token); } catch {}` in `data/patientVisit.ts` line 166 so a read failure after a committed `submit_survey` still returns `"saved"` (or `"refused"`).

### 6. The `anon` test in case 16 (`supabase/checks/survey.sql`)

* **File and line:** `supabase/checks/survey.sql` lines 78–83 (`set local role anon;` through `insert into survey_rows ... '16 anon saves a score'`).
* **Is it a fair test?** Only partially: it proves the Postgres `anon` role has `EXECUTE` on `public.submit_survey` and that the `security definer` update writes `survey_score = 9`.
* **What it does NOT test:**
  * **PostgREST / Supabase API layer:** Running in the SQL Editor does not verify that PostgREST exposes `submit_survey` in `public`, that the schema cache was refreshed, or that `authenticator` -> `anon` JWT switching and JSON RPC parameter binding (`p_token`, `p_score`) work over HTTP.
  * **Return value in Case 16:** `select public.submit_survey('ZZZZZZZZZZZZZZZZZZZZZZZZS7', 9);` discards the boolean return value instead of asserting `'true'`.
  * **`anon` read/write restrictions and `get_patient_visit`:** It does not check that `anon` can read `survey_done = true` (without `survey_score`) via `get_patient_visit`, nor that RLS/privileges still block `anon` from reading or updating `public.visits` directly.
* **Smallest fix:** Capture the boolean returned by `submit_survey` as `anon` into a row/variable (or run `get_patient_visit` as `anon` right after) and add a negative check verifying `anon` cannot `select` or `update public.visits` directly; verify the live PostgREST RPC call once against Supabase HTTP.

### 7. Tests that pass for the wrong reason

* **Double-submit test flushes React between clicks (`components/patient/SurveyBox.click.test.tsx` lines 130–139):**
  * **Concrete case:** Lines 135–136 call `act(() => submit()?.click());` twice in separate `act()` blocks, which forces React to commit `sending = true` before the second click. Combining both clicks in one `act(() => { submit()?.click(); submit()?.click(); })` (matching two rapid clicks in one browser frame) currently fails because `SurveyForm.tsx` line 33 only checks `sending` state, not a ref.
  * **Smallest fix:** Put both clicks inside a single `act()` and fix `SurveyForm.tsx` with a `sendingRef`.
* **`aria-disabled` test never checks `sending` or initial `"true"` state (`components/patient/SurveyBox.click.test.tsx` lines 78–83):**
  * **Concrete case:** `"grays out Submit until a score is picked, and keeps it a real button"` checks `hasAttribute("disabled")` is `false`, picks `4`, and checks `aria-disabled` is `"false"` — it never asserts `aria-disabled` is `"true"` while `sending` is `true`. Dropping `|| sending` from `SurveyForm.tsx` line 71 would still pass all tests.
  * **Smallest fix:** Assert `aria-disabled` is `"true"` before `pick(4)` and while a `submitSurvey` promise is pending.
* **Thank-you focus test mocks `submitSurvey` without simulating `refreshPatientView` (`components/patient/SurveyBox.click.test.tsx` lines 94–107):**
  * **Concrete case:** `submitSurvey` resolves `"saved"` without ever flipping `view.surveyDone` to `true`, so the test misses the two-commit race in Question 1, and `submit()?.click()` runs while `document.activeElement` is still `document.body` (never focusing Submit first). Meanwhile, line 104 only mounts directly into `surveyDone: true` instead of testing a transition from `surveyDone: false` -> `true` (background read) or `"unavailable"` -> recovered.
  * **Smallest fix:** Focus `submit()` before clicking in line 97, add a test where `show({ ...arrived, surveyDone: true })` fires *before* `submitSurvey` resolves `"saved"`, and add a test transitioning from `arrived` -> `on_the_way` (Undo) while focus is on a radio or `thanks`.
* **Second-alert test verifies a new DOM node in happy-dom, not a paint boundary (`components/patient/SurveyBox.click.test.tsx` lines 109–119):**
  * **Concrete case:** `expect(second).not.toBe(first)` proves React replaced the `<p role="alert">` node after `act()`, which still passes even if a synchronous/sub-frame failure in a real browser removes and re-adds the node within the same frame.
  * **Smallest fix:** Clear `notSaved` on radio `onChange` (or defer re-showing across a paint frame) and add a test covering picking a score / retrying after failure.
* **Radio Enter-submit and score `0` / `10` unit tests:**
  * **Concrete case:** `SurveyBox.click.test.tsx` tests button `.click()` with no score, never pressing Enter inside a radio input while `score === null` or `sending === true`, and (based on the diff) we cannot see lines 1–71 to verify whether `SurveyBox.click.test.tsx` tests submitting `0` and `10` in React (not sure without the rest of the file).
  * **Smallest fix:** Add unit cases submitting `0`, `10`, and `Enter` on a radio while `sending` is pending.
