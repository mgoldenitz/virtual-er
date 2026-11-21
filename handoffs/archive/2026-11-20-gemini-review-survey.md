# Gemini review: the patient survey (Phase 5, Part B)

Model: Gemini Hydrogen 4, High, in a new chat. If you have no Gemini Hydrogen 4 credits, use Gemini 3.6 Flash, High.

## What to paste into Gemini

Paste everything from "Prompt" to the end of this file. The file has no keys, tokens, passwords or real patient data. The tokens in the checks (`ZZZZ...S0`) are made up.

## Prompt

You review a small change to a concept prototype: a virtual ER waiting room. Low-acuity patients wait off-site and follow their place in line on their phone. Synthetic data only. Next.js App Router, React, Supabase (Postgres with row-level security; patients use the `anon` role and reach data only through `security definer` functions that need the visit's access token).

Find problems. Do not confirm that the change is good. For each problem, give the file and line, a concrete case that goes wrong, and the smallest fix. Say "not sure" when you are not sure.

### What the change does

After staff mark a patient "arrived", the visit is closed and the phone shows "Ready at the desk". The phone now shows one survey question: "How would you rate your waiting experience?" with the scores 0 to 10 as radio buttons and a Submit button. After a saved score, the phone says "Thank you for your feedback." and does not ask again.

Rules (from the spec): the score is optional. The patient submits once. Only a visit that arrived (closed) gets the survey. The phone never reads the score back; it reads only `survey_done` (true or false).

### Settled decisions (do not report these as faults)

- "Pick, then Submit" (owner, 2026-11-20): a radio group and a Submit button, not 11 buttons that save on tap.
- Undo of an arrival keeps the score (owner, 2026-11-20). After a second "Mark arrived", the phone shows thank you, not a second survey.
- "Score keeps version" (owner, 2026-11-20): a change to `survey_score` alone does not raise `visits.version`. Reason: staff actions save only `where version = the version I read` (helper `changeVisit` below). A staff Undo seconds after the survey was refused once. Staff never see or change the score. Every other change still raises the version (check case 13).
- `survey.notSaved` is a new text, because the old `patient.notSaved` is about "on your way". The French, Arabic, Urdu and Mandarin texts are drafts; a fluent human reviews them later.
- `SurveyBox.tsx` compares `result !== "saved"` inline (a trivial check, accepted).

### Questions

1. `submit_survey` (migration 20261120000000_survey.sql): can a patient save a score for a visit that is not theirs, not arrived, not closed, or already scored? Can it save a score outside 0 to 10? Is there a race when two Submits arrive at the same time?
2. The version trigger (20261120010000_survey_keeps_version.sql): the test is `(to_jsonb(new) - 'survey_score' - 'version') = (to_jsonb(old) - 'survey_score' - 'version')`. Is there a case where another column changes and the version still stays? A case where only the score changes and the version still goes up? Does the order of the `now()` lines after it matter?
3. `SurveyBox.tsx`: keyboard and screen reader use (fieldset and legend, radio labels, the status and alert roles, focus after Submit and after a failed save), a double Submit, and what shows when the save fails or the network is down.
4. Is a state missing on the phone (for example: the survey saved, then staff Undo, then the visit is removed instead of arrived)?
5. Anything in the tests that passes for the wrong reason.

## Checked (output in this session or in docs/progress.md)

- `npm test`: 88 test files, 556 tests pass. `npm run lint`: no faults. `npm run build`: passed.
- `npm run e2e` two times in a row: 37 passed, 37 passed (phone 390 x 844 and laptop 1280 x 800, with axe checks). The demo simulator was on during these runs.
- `supabase/checks/survey.sql` on the live database (run by the owner in the SQL Editor): 13 of 13 ok. On a local Postgres copy (PGlite): case 12 failed before the version fix, 13 of 13 ok after it; `demo_tick.sql` all rows in range.
- `supabase/checks/permissions.sql` live: unchanged; `anon` and `authenticated` get EXECUTE on `submit_survey` and nothing new on tables; no table without row-level security.

## Not checked

- A real phone (only Playwright's phone size in Chromium).
- A real screen reader (only axe and the roles in the tests).
- The draft translations of `survey.notSaved`.
- The dashboard numbers that use `survey_score` (`daily_stats`, written by `delete_old_visits`); this change does not touch them.

## Line counts of the changed files (after the change)

Code: `components/patient/SurveyBox.tsx` 87 (new), `components/patient/StatusAndSound.tsx` 51, `data/patientVisit.ts` 171, `lib/survey.ts` 22 (new), `lib/patientView.ts` 25, `lib/patientViewFromRow.ts` 51, `lib/text/en.ts` 202, `lib/text/fr.ts` 171, `lib/text/ar.ts` 172, `lib/text/ur.ts` 173, `lib/text/zh.ts` 171.
Database: `supabase/migrations/20261120000000_survey.sql` 113 (new), `supabase/migrations/20261120010000_survey_keeps_version.sql` 51 (new), `supabase/checks/survey.sql` 72 (new), `supabase/checks/permissions.sql` 73.
Tests: `components/patient/SurveyBox.click.test.tsx` 112 (new), `lib/survey.test.ts` 63 (new), `lib/patientViewFromRow.test.ts` 78, `e2e/recall-arrive.spec.ts` 68. Nine other test files got one fixture line `surveyDone: false,`.

## The diff (code, database and the main tests; the 9 one-line fixture changes are left out)

```diff
diff --git a/components/patient/StatusAndSound.tsx b/components/patient/StatusAndSound.tsx
index 524f505..729dbc8 100644
--- a/components/patient/StatusAndSound.tsx
+++ b/components/patient/StatusAndSound.tsx
@@ -3,6 +3,7 @@
 // The "I'm still here" prompt, the status screen and the sound box of the patient page, with the one
 // flag they share: when the prompt or the sound box leaves the page with focus inside it, the status
 // screen moves focus to its heading.
+// The survey box shows under the status screen once the visit has arrived and closed (SurveyBox).
 // The page and the click test both use this part, so the test checks the real wiring.
 
 import { useRef } from "react";
@@ -10,6 +11,7 @@ import type { PatientView } from "@/lib/patientView";
 import { PatientStatus } from "./PatientStatus";
 import { SoundSwitch } from "./SoundSwitch";
 import { StillHerePrompt } from "./StillHerePrompt";
+import { SurveyBox } from "./SurveyBox";
 
 type Props = {
   view: PatientView;
@@ -34,6 +36,7 @@ export function StatusAndSound({ view, token, language, onOnMyWay, sending, onli
       <div className={online ? "" : "rounded-xl border-4 border-dashed border-slate-700 p-1"} data-testid="status-frame">
         <PatientStatus view={view} language={language} onOnMyWay={onOnMyWay} sending={sending} lostFocus={lostFocus} />
       </div>
+      {token && <SurveyBox view={view} token={token} language={language} />}
       {(view.status === "waiting" || view.status === "called") && (
         <SoundSwitch
           status={view.status}
diff --git a/components/patient/SurveyBox.click.test.tsx b/components/patient/SurveyBox.click.test.tsx
new file mode 100644
index 0000000..e1f0916
--- /dev/null
+++ b/components/patient/SurveyBox.click.test.tsx
@@ -0,0 +1,112 @@
+// @vitest-environment happy-dom
+// The survey on the "Ready at the desk" screen: pick a score from 0 to 10, then Submit.
+// The save is replaced, so each test controls its answer.
+
+import { act } from "react";
+import { createRoot, type Root } from "react-dom/client";
+import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
+import { submitSurvey } from "@/data/patientVisit";
+import type { PatientView } from "@/lib/patientView";
+import { textFor } from "@/lib/text";
+import { SurveyBox } from "./SurveyBox";
+
+vi.mock("@/data/patientVisit", () => ({ submitSurvey: vi.fn().mockResolvedValue("saved") }));
+
+// Tells React that this file runs its updates inside act().
+(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
+
+const s = textFor("en").survey;
+
+const arrived: PatientView = {
+  code: "ABC234",
+  site: "A",
+  language: "en",
+  status: "arrived",
+  placeInLine: null,
+  waitLow: null,
+  waitHigh: null,
+  calledAt: "2026-11-20T11:00:00Z",
+  lastStillHereAt: null,
+  triagedAt: "2026-11-20T10:00:00Z",
+  seen: true,
+  closed: true,
+  expired: false,
+  surveyDone: false,
+};
+
+let container: HTMLDivElement;
+let root: Root;
+
+function show(view: PatientView) {
+  act(() => root.render(<SurveyBox view={view} token="t" language="en" />));
+}
+
+const radios = () => [...container.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
+const submit = () => [...container.querySelectorAll("button")].find((b) => b.textContent === s.submit);
+const pick = (n: number) => act(() => radios().find((r) => r.value === String(n))?.click());
+
+beforeEach(() => {
+  container = document.createElement("div");
+  document.body.appendChild(container);
+  root = createRoot(container);
+  vi.mocked(submitSurvey).mockClear();
+  vi.mocked(submitSurvey).mockResolvedValue("saved");
+});
+
+afterEach(() => {
+  act(() => root.unmount());
+  container.remove();
+});
+
+describe("SurveyBox", () => {
+  it("names the group of 11 scores with the SPEC question", () => {
+    show(arrived);
+    expect(container.querySelector("fieldset legend")?.textContent).toBe(s.question);
+    expect(radios().map((r) => r.value)).toEqual(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
+    expect(container.textContent).toContain(s.low);
+    expect(container.textContent).toContain(s.high);
+    expect(container.textContent).toContain(s.note);
+  });
+
+  it("sends nothing when Submit is pressed with no score picked", async () => {
+    show(arrived);
+    await act(async () => submit()?.click());
+    expect(submitSurvey).not.toHaveBeenCalled();
+  });
+
+  it("sends the picked score with the token", async () => {
+    show(arrived);
+    pick(8);
+    await act(async () => submit()?.click());
+    expect(submitSurvey).toHaveBeenCalledWith("t", 8);
+  });
+
+  it("sends the last score picked when the patient changes it", async () => {
+    show(arrived);
+    pick(3);
+    pick(9);
+    await act(async () => submit()?.click());
+    expect(submitSurvey).toHaveBeenCalledWith("t", 9);
+  });
+
+  it.each(["refused", "not_saved"] as const)("shows the survey's not-saved line when the answer is %s", async (answer) => {
+    vi.mocked(submitSurvey).mockResolvedValue(answer);
+    show(arrived);
+    pick(5);
+    await act(async () => submit()?.click());
+    expect(container.querySelector('[role="alert"]')?.textContent).toBe(s.notSaved);
+    expect(radios()).toHaveLength(11);
+  });
+
+  it("shows the thank-you and no scores once the score is saved", () => {
+    show({ ...arrived, surveyDone: true });
+    expect(container.textContent).toContain(s.thanks);
+    expect(radios()).toHaveLength(0);
+    expect(submit()).toBeUndefined();
+  });
+
+  it("shows nothing for a visit that is not arrived and closed", () => {
+    show({ ...arrived, status: "on_the_way", closed: false });
+    expect(container.textContent).toBe("");
+  });
+});
diff --git a/components/patient/SurveyBox.tsx b/components/patient/SurveyBox.tsx
new file mode 100644
index 0000000..4db0d1c
--- /dev/null
+++ b/components/patient/SurveyBox.tsx
@@ -0,0 +1,87 @@
+"use client";
+
+// The survey on the patient's "Ready at the desk" screen: one question, a score from 0 to 10, and Submit.
+// It shows only after the visit is closed and arrived, and only once (lib/survey.ts decides which step).
+
+import { useState, type FormEvent } from "react";
+import { submitSurvey } from "@/data/patientVisit";
+import type { PatientView } from "@/lib/patientView";
+import { isSurveyScore, surveyStep } from "@/lib/survey";
+import { textFor } from "@/lib/text";
+import { Button } from "@/components/Button";
+
+/** The 11 scores the patient can pick, 0 to 10. */
+const SCORES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
+
+type Props = {
+  view: PatientView;
+  /** The visit's token, sent with the score. */
+  token: string;
+  language: string;
+};
+
+export function SurveyBox({ view, token, language }: Props) {
+  const [score, setScore] = useState<number | null>(null);
+  const [sending, setSending] = useState(false);
+  const [notSaved, setNotSaved] = useState(false);
+  const t = textFor(language).survey;
+  const step = surveyStep(view);
+
+  if (step === null) return null;
+  if (step === "thanks") {
+    return (
+      <p role="status" className="clean-card font-semibold">
+        {t.thanks}
+      </p>
+    );
+  }
+
+  async function onSubmit(event: FormEvent<HTMLFormElement>) {
+    event.preventDefault();
+    if (score === null || !isSurveyScore(score) || sending) return;
+    setSending(true);
+    const result = await submitSurvey(token, score);
+    setSending(false);
+    // On "saved" the page re-reads the visit, so the step turns to "thanks" by itself.
+    setNotSaved(result !== "saved");
+  }
+
+  return (
+    <form onSubmit={onSubmit} className="clean-card space-y-3">
+      <fieldset className="space-y-3">
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
+        <div className="flex justify-between gap-2 text-sm">
+          <span>{t.low}</span>
+          <span>{t.high}</span>
+        </div>
+      </fieldset>
+      <p className="text-sm">{t.note}</p>
+      <Button type="submit" disabled={sending} className="w-full text-lg">
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
diff --git a/data/patientVisit.ts b/data/patientVisit.ts
index 7333dd7..551501f 100644
--- a/data/patientVisit.ts
+++ b/data/patientVisit.ts
@@ -157,3 +157,15 @@ export function confirmOnMyWayByToken(token: string): Promise<ChangeResult> {
 export function recordStillHere(token: string): Promise<ChangeResult> {
   return patientStep("record_still_here", token);
 }
+
+/** Save the 0 to 10 survey score once. Only after the visit is closed, arrived and waited off-site (SPEC rule 5). */
+export async function submitSurvey(token: string, score: number): Promise<ChangeResult> {
+  try {
+    const { data, error } = await supabaseBrowser().rpc("submit_survey", { p_token: token, p_score: score });
+    if (error || typeof data !== "boolean") return "not_saved";
+    await refreshPatientView(token); // show the result straight away
+    return data ? "saved" : "refused";
+  } catch {
+    return "not_saved";
+  }
+}
diff --git a/e2e/recall-arrive.spec.ts b/e2e/recall-arrive.spec.ts
index 80cdbb9..a3989c1 100644
--- a/e2e/recall-arrive.spec.ts
+++ b/e2e/recall-arrive.spec.ts
@@ -1,4 +1,4 @@
-// Recall and arrival: staff recall a waiting patient, the patient is on the way, staff mark arrived, and Undo brings the visit back to the list.
+// Recall and arrival: staff recall a waiting patient, the patient is on the way, staff mark arrived, the patient answers the survey, and Undo brings the visit back; a second arrival shows thank you, not a second survey.
 
 import { expect, test } from "@playwright/test";
 import { axeFaults } from "./helpers/axe";
@@ -7,8 +7,10 @@ import { openPatient } from "./helpers/patient";
 import { openStaff } from "./helpers/staff";
 
 const EMERGENCY = "If your symptoms get worse, call 911 or come back to the emergency department now.";
+// The survey's fieldset has this question as its name. (The text size switch has radio buttons too.)
+const SURVEY = "How would you rate your waiting experience?";
 
-test("recall, on the way, arrived, then undo the arrival", async ({ browser }) => {
+test("recall, on the way, arrived, the survey, then undo and arrive again",async ({ browser }) => {
   const staff = await openStaff(browser);
   const patient = await openPatient(browser);
   try {
@@ -39,6 +41,13 @@ test("recall, on the way, arrived, then undo the arrival", async ({ browser }) =
     await expect(patient.getByText(EMERGENCY).first()).toBeVisible();
     expect(await axeFaults(patient)).toEqual([]);
 
+    // The survey: pick 8, Submit, and the phone says thank you instead of asking again.
+    await patient.getByRole("radio", { name: "8" }).check();
+    await patient.getByRole("button", { name: "Submit" }).click();
+    await expect(patient.getByRole("status").filter({ hasText: "Thank you for your feedback." })).toBeVisible();
+    await expect(patient.getByRole("group", { name: SURVEY })).toHaveCount(0);
+    expect(await axeFaults(patient)).toEqual([]);
+
     // Undo in Recently closed: the row shows on the list again.
     await staff.getByTestId(`closed-${code}`).getByRole("button", { name: "Undo" }).click();
     await expect(row).toBeVisible();
@@ -46,6 +55,12 @@ test("recall, on the way, arrived, then undo the arrival", async ({ browser }) =
     // Undo puts the visit back to on_the_way, so the phone shows the called screen again.
     await expect(patient.getByRole("heading", { name: "Please head back now" })).toBeVisible();
     await expect(patient.getByRole("heading", { name: "Status: Ready at the desk" })).toHaveCount(0);
+
+    // A second arrival keeps the score (owner decision 2026-11-20): thank you, and no second survey.
+    await row.getByRole("button", { name: "Mark arrived" }).click();
+    await expect(patient.getByRole("heading", { name: "Status: Ready at the desk" })).toBeVisible();
+    await expect(patient.getByRole("status").filter({ hasText: "Thank you for your feedback." })).toBeVisible();
+    await expect(patient.getByRole("group", { name: SURVEY })).toHaveCount(0);
   } finally {
     await staff.context().close();
     await patient.context().close();
diff --git a/lib/patientView.ts b/lib/patientView.ts
index 947dab5..6dfcf25 100644
--- a/lib/patientView.ts
+++ b/lib/patientView.ts
@@ -20,4 +20,6 @@ export type PatientView = {
   closed: boolean;
   /** Started from home, never triaged, and past the 6 hours staff keep expecting it. */
   expired: boolean;
+  /** True once the survey score is saved (lib/survey.ts). The phone never gets the score itself. */
+  surveyDone: boolean;
 };
diff --git a/lib/patientViewFromRow.ts b/lib/patientViewFromRow.ts
index 8773aab..1c24cb3 100644
--- a/lib/patientViewFromRow.ts
+++ b/lib/patientViewFromRow.ts
@@ -22,6 +22,8 @@ export type PatientVisitRow = {
   expired: boolean;
   /** Added in 20261111050000_still_here.sql; missing (undefined) before that change has run. */
   triaged_at?: string | null;
+  /** Added in 20261120000000_survey.sql; missing (undefined) before that change has run. */
+  survey_done?: boolean;
 };
 
 export function patientViewFromRow(row: PatientVisitRow): PatientView {
@@ -44,5 +46,6 @@ export function patientViewFromRow(row: PatientVisitRow): PatientView {
     seen: row.seen,
     closed: row.closed,
     expired: row.expired,
+    surveyDone: row.survey_done ?? false,
   };
 }
diff --git a/lib/survey.test.ts b/lib/survey.test.ts
new file mode 100644
index 0000000..186c21b
--- /dev/null
+++ b/lib/survey.test.ts
@@ -0,0 +1,63 @@
+import { describe, expect, it } from "vitest";
+import type { PatientView } from "./patientView";
+import { isSurveyScore, surveyStep } from "./survey";
+import type { VisitStatus } from "./visit";
+
+// Staff marked the patient arrived: the visit is closed and no score is saved yet.
+const arrived: PatientView = {
+  code: "ABC234",
+  site: "A",
+  language: "en",
+  status: "arrived",
+  placeInLine: null,
+  waitLow: null,
+  waitHigh: null,
+  calledAt: "2026-11-20T11:00:00Z",
+  lastStillHereAt: null,
+  triagedAt: "2026-11-20T10:00:00Z",
+  seen: true,
+  closed: true,
+  expired: false,
+  surveyDone: false,
+};
+
+describe("which survey step the patient sees (SPEC line 69, hard rule 5)", () => {
+  it("asks the question when the visit arrived, is closed and has no score", () => {
+    expect(surveyStep(arrived)).toBe("ask");
+  });
+
+  it("says thank you when the score is already saved", () => {
+    expect(surveyStep({ ...arrived, surveyDone: true })).toBe("thanks");
+  });
+
+  it("shows nothing for an arrived visit that is not closed", () => {
+    expect(surveyStep({ ...arrived, closed: false })).toBeNull();
+  });
+
+  const others: VisitStatus[] = [
+    "pre_arrival",
+    "waiting",
+    "called",
+    "on_the_way",
+    "unable_to_reach",
+    "needs_reassessment",
+    "removed",
+    "declined",
+    "not_eligible",
+  ];
+  it.each(others)("shows nothing for a %s visit, closed or not, done or not", (status) => {
+    expect(surveyStep({ ...arrived, status })).toBeNull();
+    expect(surveyStep({ ...arrived, status, closed: false })).toBeNull();
+    expect(surveyStep({ ...arrived, status, surveyDone: true })).toBeNull();
+  });
+});
+
+describe("a survey score", () => {
+  it.each([0, 1, 5, 9, 10])("accepts %s", (n) => {
+    expect(isSurveyScore(n)).toBe(true);
+  });
+
+  it.each([-1, 11, 7.5, Number.NaN, Number.POSITIVE_INFINITY])("refuses %s", (n) => {
+    expect(isSurveyScore(n)).toBe(false);
+  });
+});
diff --git a/lib/survey.ts b/lib/survey.ts
new file mode 100644
index 0000000..3f0fe26
--- /dev/null
+++ b/lib/survey.ts
@@ -0,0 +1,22 @@
+// The survey rules (SPEC line 69 and hard rule 5): which survey step the patient's phone shows,
+// and which scores may be sent. The database function submit_survey checks the same things.
+
+import type { PatientView } from "./patientView";
+
+/** "ask" = show the question; "thanks" = the score is saved; null = no survey on this screen. */
+export type SurveyStep = "ask" | "thanks" | null;
+
+/**
+ * Only a closed visit that arrived gets the survey (an arrived visit always waited off-site).
+ * After the score is saved, the phone says thank you instead, also after an Undo and a second arrival.
+ */
+export function surveyStep(view: PatientView): SurveyStep {
+  if (view.status !== "arrived" || !view.closed) return null;
+  if (!view.surveyDone) return "ask";
+  return "thanks";
+}
+
+/** A whole number from 0 to 10. */
+export function isSurveyScore(score: number): boolean {
+  return Number.isInteger(score) && score >= 0 && score <= 10;
+}
diff --git a/lib/text/ar.ts b/lib/text/ar.ts
index 9d30da1..c6f4998 100644
--- a/lib/text/ar.ts
+++ b/lib/text/ar.ts
@@ -157,6 +157,7 @@ export const ar: PatientText = {
     submit: "إرسال",
     thanks: "شكرا لك على ملاحظاتك.",
     note: "الإجابة اختيارية. لا يتم حفظ اسمك.",
+    notSaved: "لم يتم حفظ إجابتك. يرجى المحاولة مرة أخرى.",
   },
   offline: "أنت غير متصل بالإنترنت. أعد الاتصال بالإنترنت لمعرفة حالتك.",
 };
diff --git a/lib/text/en.ts b/lib/text/en.ts
index bb3c9da..e702535 100644
--- a/lib/text/en.ts
+++ b/lib/text/en.ts
@@ -185,6 +185,7 @@ export const en = {
     submit: "Submit",
     thanks: "Thank you for your feedback.",
     note: "Answering is optional. Your name is not stored.",
+    notSaved: "Your answer did not save. Please try again.",
   },
   offline: "You are offline. Reconnect to the internet to see your status.",
 };
diff --git a/lib/text/fr.ts b/lib/text/fr.ts
index 62c165c..b1256d4 100644
--- a/lib/text/fr.ts
+++ b/lib/text/fr.ts
@@ -157,6 +157,7 @@ export const fr: PatientText = {
     submit: "Soumettre",
     thanks: "Merci pour vos commentaires.",
     note: "La réponse est facultative. Votre nom n'est pas enregistré.",
+    notSaved: "Votre réponse n'a pas été enregistrée. Veuillez réessayer.",
   },
   offline: "Vous êtes hors ligne. Reconnectez-vous à Internet pour voir votre statut.",
 };
diff --git a/lib/text/ur.ts b/lib/text/ur.ts
index 232da8f..865cba5 100644
--- a/lib/text/ur.ts
+++ b/lib/text/ur.ts
@@ -157,6 +157,7 @@ export const ur: PatientText = {
     submit: "جمع کرائیں",
     thanks: "آپ کے فیڈ بیک کا شکریہ۔",
     note: "جواب دینا اختیاری ہے۔ آپ کا نام محفوظ نہیں کیا جاتا ہے۔",
+    notSaved: "آپ کا جواب محفوظ نہیں ہوا۔ براہ کرم دوبارہ کوشش کریں۔",
   },
   offline: "آپ آف لائن ہیں۔ اپنا سٹیٹس دیکھنے کے لیے دوبارہ انٹرنیٹ سے کنیکٹ کریں۔",
 };
diff --git a/lib/text/zh.ts b/lib/text/zh.ts
index b7d9125..aebf4ce 100644
--- a/lib/text/zh.ts
+++ b/lib/text/zh.ts
@@ -157,6 +157,7 @@ export const zh: PatientText = {
     submit: "提交",
     thanks: "感谢您的反馈。",
     note: "回答是可选的。您的名字不会被保存。",
+    notSaved: "您的回答未保存。请重试。",
   },
   offline: "您已离线。请重新连接到互联网以查看您的状态。",
 };
diff --git a/supabase/checks/permissions.sql b/supabase/checks/permissions.sql
index b0db395..2c7dda4 100644
--- a/supabase/checks/permissions.sql
+++ b/supabase/checks/permissions.sql
@@ -13,12 +13,16 @@
 -- revoked from them, so the list stays the same. 20261118010000_clear_demo_data.sql gives
 -- authenticated EXECUTE on clear_demo_data (staff only, the function checks is_staff), so that
 -- one line is added to the list. 20261118120000_daily_stats_staff_read.sql gives authenticated
--- SELECT on daily_stats (the policy lets only staff see rows), so that line is added too:
+-- SELECT on daily_stats (the policy lets only staff see rows), so that line is added too.
+-- 20261120000000_survey.sql gives anon and authenticated EXECUTE on submit_survey (SPEC hard
+-- rule 5: the patient submits the survey score once; it needs the visit's token), so those
+-- two lines are added:
 --   anon           table     change_signal       SELECT
 --   anon           function  confirm_on_my_way   EXECUTE
 --   anon           function  get_patient_visit   EXECUTE
 --   anon           function  record_seen         EXECUTE
 --   anon           function  record_still_here   EXECUTE
+--   anon           function  submit_survey       EXECUTE
 --   authenticated  table     change_signal       SELECT
 --   authenticated  table     daily_stats         SELECT
 --   authenticated  table     site_settings       SELECT, UPDATE
@@ -29,12 +33,13 @@
 --   authenticated  function  is_staff            EXECUTE
 --   authenticated  function  record_seen         EXECUTE
 --   authenticated  function  record_still_here   EXECUTE
+--   authenticated  function  submit_survey       EXECUTE
 -- Also listed, and fine: rls_auto_enable, for both roles. Supabase made it when the project
 -- was created; it turns on row-level security for each new table. It is an event trigger
 -- function, which Postgres refuses to run as an ordinary call.
 -- Also expected: every table listed has row-level security on (see the second query).
 -- Supabase's security advisor warns that anon can run get_patient_visit, record_seen,
--- confirm_on_my_way and record_still_here. That is on purpose (SPEC hard rule 5); each needs the visit's token.
+-- confirm_on_my_way, record_still_here and submit_survey. That is on purpose (SPEC hard rule 5); each needs the visit's token.
 
 -- Table rights use has_table_privilege, not information_schema.role_table_grants: that view
 -- shows only roles the current user belongs to, so through the read-only Supabase connection
diff --git a/supabase/checks/survey.sql b/supabase/checks/survey.sql
new file mode 100644
index 0000000..5766886
--- /dev/null
+++ b/supabase/checks/survey.sql
@@ -0,0 +1,72 @@
+-- Check for the survey (migration 20261120000000_survey.sql): submit_survey and the new
+-- survey_done column of get_patient_visit.
+-- Run the whole file at once (do not select and run one part): the Editor shows only the last
+-- result, so the file keeps each result in a temp table and shows all rows at the end.
+-- It saves nothing: everything happens inside "begin ... rollback".
+-- The synthetic visits start as waiting (the step trigger refuses a new visit as arrived) and
+-- then move along allowed steps, as the staff screen does.
+--
+-- Cases 12 and 13 (20261120010000_survey_keeps_version.sql): the score alone does not raise the
+-- version, so a staff Undo right after the survey is not refused; other changes still raise it.
+--
+-- Expected result: 13 rows, each with result = ok.
+
+begin;
+
+insert into public.visits (code, access_token, site, source, status, triaged_at) values
+  ('ZZZZ5A', 'ZZZZZZZZZZZZZZZZZZZZZZZZS0', 'A', 'desk', 'waiting', now()),  -- arrives, answers 7
+  ('ZZZZ5B', 'ZZZZZZZZZZZZZZZZZZZZZZZZS1', 'A', 'desk', 'waiting', now()),  -- on the way, not closed
+  ('ZZZZ5C', 'ZZZZZZZZZZZZZZZZZZZZZZZZS2', 'A', 'desk', 'waiting', now()),  -- removed (left)
+  ('ZZZZ5D', 'ZZZZZZZZZZZZZZZZZZZZZZZZS3', 'A', 'desk', 'waiting', now());  -- arrives, gives no score
+insert into public.visits (code, access_token, site, source, status, triaged_at, offered_at, closed_at) values
+  ('ZZZZ5E', 'ZZZZZZZZZZZZZZZZZZZZZZZZS4', 'A', 'desk', 'declined', now(), now(), now());
+
+update public.visits set status = 'arrived', arrived_at = now(), closed_at = now()
+  where code in ('ZZZZ5A', 'ZZZZ5D');
+update public.visits set status = 'called', called_at = now() where code = 'ZZZZ5B';
+update public.visits set status = 'on_the_way', confirmed_at = now() where code = 'ZZZZ5B';
+update public.visits set status = 'removed', removed_reason = 'left', closed_at = now() where code = 'ZZZZ5C';
+
+create temp table survey_rows (check_case text, expected text, got text);
+
+-- The versions before the survey (case 12) and before another change (case 13).
+create temp table versions_before as
+  select code, version from public.visits where code in ('ZZZZ5A', 'ZZZZ5B');
+
+insert into survey_rows select '1 on the way, not closed: refused', 'false',
+  public.submit_survey('ZZZZZZZZZZZZZZZZZZZZZZZZS1', 7)::text;
+insert into survey_rows select '2 removed: refused', 'false',
+  public.submit_survey('ZZZZZZZZZZZZZZZZZZZZZZZZS2', 7)::text;
+insert into survey_rows select '3 declined: refused', 'false',
+  public.submit_survey('ZZZZZZZZZZZZZZZZZZZZZZZZS4', 7)::text;
+insert into survey_rows select '4 arrived, score 11: refused', 'false',
+  public.submit_survey('ZZZZZZZZZZZZZZZZZZZZZZZZS0', 11)::text;
+insert into survey_rows select '5 arrived, score -1: refused', 'false',
+  public.submit_survey('ZZZZZZZZZZZZZZZZZZZZZZZZS0', -1)::text;
+insert into survey_rows select '6 a token that opens no visit: refused', 'false',
+  public.submit_survey('ZZZZZZZZZZZZZZZZZZZZZZZZXX', 7)::text;
+insert into survey_rows select '7 arrived, score 7: saved', 'true',
+  public.submit_survey('ZZZZZZZZZZZZZZZZZZZZZZZZS0', 7)::text;
+insert into survey_rows select '8 the second try: refused', 'false',
+  public.submit_survey('ZZZZZZZZZZZZZZZZZZZZZZZZS0', 8)::text;
+insert into survey_rows select '9 the score stays 7', '7',
+  (select survey_score::text from public.visits where code = 'ZZZZ5A');
+insert into survey_rows select '10 survey_done after the score', 'true',
+  (select survey_done::text from public.get_patient_visit('ZZZZZZZZZZZZZZZZZZZZZZZZS0'));
+insert into survey_rows select '11 survey_done with no score', 'false',
+  (select survey_done::text from public.get_patient_visit('ZZZZZZZZZZZZZZZZZZZZZZZZS3'));
+insert into survey_rows select '12 the survey keeps the version',
+  (select version::text from versions_before where code = 'ZZZZ5A'),
+  (select version::text from public.visits where code = 'ZZZZ5A');
+
+update public.visits set last_still_here_at = now() where code = 'ZZZZ5B';
+insert into survey_rows select '13 another change still raises the version',
+  (select (version + 1)::text from versions_before where code = 'ZZZZ5B'),
+  (select version::text from public.visits where code = 'ZZZZ5B');
+
+select check_case, expected, got,
+       case when got is not distinct from expected then 'ok' else 'FAIL' end as result
+from survey_rows
+order by split_part(check_case, ' ', 1)::integer;
+
+rollback;
diff --git a/supabase/migrations/20261120000000_survey.sql b/supabase/migrations/20261120000000_survey.sql
new file mode 100644
index 0000000..f7b22bb
--- /dev/null
+++ b/supabase/migrations/20261120000000_survey.sql
@@ -0,0 +1,113 @@
+-- Phase 5, the survey (SPEC line 69 and hard rule 5): the patient may submit the survey score
+-- once, only after the visit is closed, and only if the visit waited off-site and arrived.
+-- 1. New function submit_survey(token, score). "Arrived" can come only from waiting, called or
+--    on_the_way (visits_check_step), so every arrived visit waited off-site.
+--    The step trigger checks only status moves and the site, so this update (same status) passes.
+-- 2. get_patient_visit gets one new column, survey_done (true once a score is saved). The phone
+--    never gets the score itself back. A new column changes the return type, so the function is
+--    dropped and made again, and its rights are given again below.
+-- Undo of an arrival keeps the score (owner decision 2026-11-20), so a second arrival shows
+-- "Thank you for your feedback." and no second survey.
+
+-- ---------------------------------------------------------------------------
+-- Submit the survey score: once, only for a closed visit that arrived, 0 to 10.
+-- Returns true when the score was saved, false when it was refused.
+-- ---------------------------------------------------------------------------
+create function public.submit_survey(p_token text, p_score integer)
+returns boolean
+language plpgsql
+security definer
+set search_path = ''
+as $$
+begin
+  update public.visits
+  set survey_score = p_score
+  where access_token = p_token
+    and status = 'arrived'
+    and closed_at is not null
+    and survey_score is null
+    and p_score between 0 and 10;
+  return found;
+end;
+$$;
+
+-- ---------------------------------------------------------------------------
+-- The patient read, as in 20261116000000_wait_gap_distinct_moments.sql, plus survey_done.
+-- ---------------------------------------------------------------------------
+drop function public.get_patient_visit(text);
+
+create function public.get_patient_visit(p_token text)
+returns table (
+  code text,
+  site text,
+  language text,
+  status text,
+  place_in_line integer,
+  -- Average minutes between the last 6 distinct call-back moments of the last 3 hours at this
+  -- site, rounded to whole minutes so it cannot be used to work out exactly when other patients
+  -- were called. Null with fewer than 2 distinct moments.
+  average_gap_minutes integer,
+  called_at timestamptz,
+  last_still_here_at timestamptz,
+  seen boolean,
+  closed boolean,
+  -- Started from home, never triaged, and 6 or more hours old (lib/expectedArrivals.ts).
+  expired boolean,
+  -- When this visit was triaged (the start of off-site waiting).
+  triaged_at timestamptz,
+  -- True once the survey score is saved (lib/survey.ts). The score itself is not sent.
+  survey_done boolean
+)
+language sql
+stable
+security definer
+set search_path = ''
+as $$
+  select
+    me.code,
+    me.site,
+    me.language,
+    me.status,
+    case when me.status = 'waiting' and me.triaged_at is not null then (
+      select count(*)::integer + 1
+      from public.visits other
+      where other.site = me.site
+        and other.status = 'waiting'
+        and other.triaged_at is not null
+        and (other.triaged_at, other.id) < (me.triaged_at, me.id)
+    ) end,
+    case when me.status = 'waiting' then (
+      -- The average of the gaps between 6 moments is (last - first) / 5.
+      select case when count(*) >= 2
+        then round(extract(epoch from max(moments.called_at) - min(moments.called_at)) / 60 / (count(*) - 1))::integer
+      end
+      from (
+        select distinct other.called_at
+        from public.visits other
+        where other.site = me.site
+          and other.called_at is not null
+          and other.called_at >= now() - interval '3 hours'
+        order by other.called_at desc
+        limit 6
+      ) moments
+    ) end,
+    me.called_at,
+    me.last_still_here_at,
+    me.seen_at is not null,
+    me.closed_at is not null,
+    me.status = 'pre_arrival' and me.triaged_at is null
+      and me.created_at <= now() - interval '6 hours',
+    me.triaged_at,
+    me.survey_score is not null
+  from public.visits me
+  where me.access_token = p_token;
+$$;
+
+-- ---------------------------------------------------------------------------
+-- Rights: patients (anon) and signed-in users reach these only with a visit's token.
+-- ---------------------------------------------------------------------------
+revoke execute on function public.get_patient_visit(text) from public, anon, authenticated;
+revoke execute on function public.submit_survey(text, integer) from public, anon, authenticated;
+
+grant execute on function public.get_patient_visit(text) to anon, authenticated;
+grant execute on function public.submit_survey(text, integer) to anon, authenticated;
diff --git a/supabase/migrations/20261120010000_survey_keeps_version.sql b/supabase/migrations/20261120010000_survey_keeps_version.sql
new file mode 100644
index 0000000..f5d2f01
--- /dev/null
+++ b/supabase/migrations/20261120010000_survey_keeps_version.sql
@@ -0,0 +1,51 @@
+-- Phase 5, the survey: a change to survey_score alone does not raise the visit's version.
+-- Why: a staff action saves only "where version = the version I read" (data/staffActions.ts).
+-- The patient answers the survey at the desk, and staff may press Undo seconds later, before
+-- their screen reads the visit again. With a new version, that Undo was refused once
+-- ("it changed since it was closed"). Staff never see or change the score, so it cannot
+-- conflict with a staff action (owner decision 2026-11-20, "Score keeps version").
+-- Every other change still raises the version (supabase/checks/survey.sql, case 13).
+-- The body is the same as in 20261110090134_visit_version_and_database_times.sql, except the
+-- version line of the update branch. "create or replace" keeps the trigger.
+
+create or replace function public.visits_before_write()
+returns trigger
+language plpgsql
+security invoker
+set search_path = ''
+as $$
+begin
+  if tg_op = 'INSERT' then
+    new.version := 1;
+    new.created_at := now();
+    if new.triaged_at is not null then new.triaged_at := now(); end if;
+    if new.offered_at is not null then new.offered_at := now(); end if;
+    if new.last_still_here_at is not null then new.last_still_here_at := now(); end if;
+    if new.called_at is not null then new.called_at := now(); end if;
+    if new.seen_at is not null then new.seen_at := now(); end if;
+    if new.confirmed_at is not null then new.confirmed_at := now(); end if;
+    if new.review_flagged_at is not null then new.review_flagged_at := now(); end if;
+    if new.arrived_at is not null then new.arrived_at := now(); end if;
+    if new.closed_at is not null then new.closed_at := now(); end if;
+  else
+    -- The whole row, without the score and the version: the same means only the score changed.
+    if (to_jsonb(new) - 'survey_score' - 'version') = (to_jsonb(old) - 'survey_score' - 'version') then
+      new.version := old.version;
+    else
+      new.version := old.version + 1;
+    end if;
+    new.created_at := old.created_at;
+    if new.triaged_at is distinct from old.triaged_at and new.triaged_at is not null then new.triaged_at := now(); end if;
+    if new.offered_at is distinct from old.offered_at and new.offered_at is not null then new.offered_at := now(); end if;
+    if new.last_still_here_at is distinct from old.last_still_here_at and new.last_still_here_at is not null then new.last_still_here_at := now(); end if;
+    if new.called_at is distinct from old.called_at and new.called_at is not null then new.called_at := now(); end if;
+    if new.seen_at is distinct from old.seen_at and new.seen_at is not null then new.seen_at := now(); end if;
+    if new.confirmed_at is distinct from old.confirmed_at and new.confirmed_at is not null then new.confirmed_at := now(); end if;
+    if new.review_flagged_at is distinct from old.review_flagged_at and new.review_flagged_at is not null then new.review_flagged_at := now(); end if;
+    if new.arrived_at is distinct from old.arrived_at and new.arrived_at is not null then new.arrived_at := now(); end if;
+    if new.closed_at is distinct from old.closed_at and new.closed_at is not null then new.closed_at := now(); end if;
+  end if;
+  return new;
+end;
+$$;
+revoke execute on function public.visits_before_write() from public, anon, authenticated;
```

## Helpers that the changed lines call (not in the diff)

data/patientVisit.ts, lines 62 to 100 (refreshPatientView) and 132 to 145 (patientStep):

```ts
function entryFor(token: string): Entry {
  let entry = entries.get(token);
  if (!entry) {
    entry = { key: "", failures: 0, latestRead: 0, watchers: 0 };
    entries.set(token, entry);
  }
  return entry;
}

async function readFromDatabase(token: string): Promise<PatientView | null | "failed"> {
  try {
    const { data, error } = await supabaseBrowser().rpc("get_patient_visit", { p_token: token });
    if (error || !Array.isArray(data)) return "failed";
    return data.length === 0 ? null : patientViewFromRow(data[0] as PatientVisitRow);
  } catch {
    return "failed";
  }
}

/** Read the visit again and tell the screens if anything changed. */
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

/**
 * While a screen is showing this token: read now, on every live update, every 15 seconds, and
 * when the tab comes back.
 * There is one timer per token however many parts of the screen are listening.

async function patientStep(
  step: "record_seen" | "confirm_on_my_way" | "record_still_here",
  token: string,
): Promise<ChangeResult> {
  try {
    const { data, error } = await supabaseBrowser().rpc(step, { p_token: token });
    if (error || typeof data !== "boolean") return "not_saved";
    await refreshPatientView(token); // show the result straight away
    return data ? "saved" : "refused";
  } catch {
    return "not_saved";
  }
}

```

data/staffActions.ts, lines 40 to 75 (changeVisit, the version lock):

```ts
async function changeVisit(id: string, step: (visit: Visit) => Visit | null): Promise<ChangeResult> {
  const before = cachedVisit(id);
  const after = before ? step(before) : null;
  if (!before || !after) {
    void loadVisits();
    return "refused";
  }
  const changed = changedFields(before, after);
  if (Object.keys(changed).length === 0) return "refused"; // nothing to save
  try {
    const { data, error } = await supabaseBrowser()
      .from("visits")
      .update(changed)
      .eq("id", id)
      .eq("version", before.version)
      .select();
    if (error) {
      // "refused": the step check does not allow this move. "paused": the site was paused on
      // another screen. Either way, read the list (and the pause switch) again.
      const result = resultForError(error.code);
      if (result === "paused") void reloadSitePauses();
      if (result !== "not_saved") void loadVisits();
      return result;
    }
    if (!Array.isArray(data)) return "not_saved";
    if (data.length === 0) {
      // Someone else (another staff screen, or the patient) changed this visit first.
      void loadVisits();
      return "refused";
    }
    putVisit(data[0] as StoredVisit);
    return "saved";
  } catch {
    return "not_saved";
  }
}
```

The original trigger body: the first function in supabase/migrations/20261110090134_visit_version_and_database_times.sql. It is the same as the new one, except that its update branch has only `new.version := old.version + 1;`.

---

Note (merge, 2026-11-21): this review ran 2 times. `phase5-e2e` ran it on 2026-11-20 (the second response below) and fixed it in 2 Gemini rounds. `claude-features` ran it again on 2026-11-21 by mistake (the first response below). When `phase5-e2e` was merged into `claude-features`, the owner kept the `phase5-e2e` survey code, tests and `survey.sql`. The `claude-features` fixes are not in the code.

## Response (second run, `claude-features`, 2026-11-21, not used)

Pasted from Gemini Hydrogen 4, High, on 2026-11-21, as given.

### 1. `submit_survey` (`supabase/migrations/20261120000000_survey.sql` and `data/patientVisit.ts`)

In `submit_survey` (`supabase/migrations/20261120000000_survey.sql`, lines 16–32), the `WHERE` predicates (`access_token = p_token`, `status = 'arrived'`, `closed_at is not null`, `survey_score is null`, `p_score between 0 and 10`) block saves for another visit, non-arrived or unclosed visits, already-scored visits, `NULL` inputs, and scores outside `0`–`10`. Under Postgres `READ COMMITTED`, two concurrent `Submit` calls serialize on the row lock: the second waits, re-evaluates `survey_score is null` against the committed row, updates 0 rows, and returns `false`. (Not sure whether `public.visits` itself has a `CHECK (survey_score between 0 and 10)` constraint since the table schema is not in the diff.)

* **Post-save read failure or exception tells the patient their saved score did not save**
* **File and line:** `data/patientVisit.ts`, lines 162–171; `components/patient/SurveyBox.tsx`, lines 43–46.
* **Concrete case:** A patient taps Submit; `submit_survey` commits the score and returns `true`, then `await refreshPatientView(token)` (line 166) either hits a transient read failure (`readFromDatabase` returns `"failed"`, keeping `entry.shown.surveyDone === false` when `entry.failures` is `1`) or throws into the `catch` block (lines 168–170). If it throws, `submitSurvey` returns `"not_saved"` and `SurveyBox` shows `"Your answer did not save. Please try again."` even though the score saved. If the read fails softly once, `step` remains `"ask"` (because `SurveyBox` relies solely on `view.surveyDone` to switch to `"thanks"`), so the patient taps Submit again, `submit_survey` returns `false` (`"refused"`), and line 46 shows `"Your answer did not save. Please try again."`.
* **Smallest fix:** Wrap `await refreshPatientView(token);` in its own `try { await refreshPatientView(token); } catch {}` in `data/patientVisit.ts` line 166, and track a local `savedLocally` flag in `SurveyBox.tsx` when `result === "saved"` (reset when `step === null` or `token` changes) so the screen advances to `"thanks"` immediately.

### 2. Version trigger (`supabase/migrations/20261120010000_survey_keeps_version.sql`)

* **Yes, the order of `created_at` and the `now()` lines after the `to_jsonb` check matters**
* **File and line:** `supabase/migrations/20261120010000_survey_keeps_version.sql`, lines 32–46.
* **Concrete case:** Line 32 compares `(to_jsonb(new) - 'survey_score' - 'version')` to `(to_jsonb(old) - 'survey_score' - 'version')` *before* line 37 resets `new.created_at := old.created_at` and lines 38–46 overwrite changed `*_at` timestamps with `now()`. If an `UPDATE` supplies a different `created_at` (which line 37 immediately discards), or updates `called_at` to another value within the same transaction where `old.called_at` already equals `now()` (which line 41 resets back to `now()`), line 32 sees a difference and increments `new.version` even though no column in the saved row actually changed.
* **Smallest fix:** Move `new.created_at := old.created_at;` and the nine `now()` normalization lines (lines 37–46) above the `if (to_jsonb(new) ...)` check (lines 32–36) so the trigger compares the final row values.
* **Other column / score-only questions**
* **Another column changes and `version` stays:** Not for existing `visits` columns (beyond `survey_score` and `version`), because `to_jsonb` includes every column (with `null` keys preserved, full microsecond `timestamptz` precision, and normalized `numeric` scale). Note that if SQL ever overwrites an existing `survey_score` (`7` -> `8`) or clears it to `NULL` without touching other columns, `version` also stays unchanged.
* **Only `survey_score` changes and `version` goes up:** Not from `visits_before_write` alone; not sure whether any other `BEFORE UPDATE` trigger ordered alphabetically before `visits_before_write` or any stored generated column depending on `survey_score` exists on `public.visits` (though case 12 in `supabase/checks/survey.sql` passed on the live database).

### 3. `SurveyBox.tsx` and `StatusAndSound.tsx`

* **Focus drops to `document.body` after a successful Submit, and iOS VoiceOver may drop the thank-you announcement**
* **File and line:** `components/patient/SurveyBox.tsx`, lines 31–37 and 77; `components/patient/StatusAndSound.tsx`, line 39.
* **Concrete case:** A keyboard or screen-reader user activates Submit; when `view.surveyDone` turns `true`, `SurveyBox` unmounts `<form>` (removing the focused Submit button) and mounts `<p role="status">{t.thanks}</p>`. `SurveyBox` does not move focus and `StatusAndSound` does not pass `lostFocus` to `SurveyBox`, so focus falls to `document.body`; newly mounted `role="status"` regions are also frequently missed by iOS VoiceOver.
* **Smallest fix:** Focus a `tabIndex={-1}` ref on the thank-you element when transitioning from `"ask"` to `"thanks"` after a submit (avoiding `role="status"` on the focused element itself if you want to prevent double announcements, or keeping a persistent empty `<div role="status">` mounted and updating its text).

* **Focus drops to `document.body` when staff click Undo while focus is inside `SurveyBox`**
* **File and line:** `components/patient/StatusAndSound.tsx`, lines 3–6 and 39; `components/patient/SurveyBox.tsx`, lines 30–37 and 50–85.
* **Concrete case:** While the visit is `arrived` (`closed: true`), a keyboard user focuses a radio button, Submit, or the thank-you card, and staff click **Undo** (`status` returns to `on_the_way`, `closed: false`). `SurveyBox` returns `null` (line 30) and unmounts the focused element, while `PatientStatus` switches to `"Please head back now"`. Because `StatusAndSound.tsx` line 39 does not pass `lostFocus` to `SurveyBox`, `PatientStatus` never rescues focus to `#status-heading` and focus drops to `document.body`.
* **Smallest fix:** Pass an `onFocusLost` callback (setting `lostFocus.current = true`) from `StatusAndSound.tsx` line 39 into `SurveyBox` and wrap `SurveyBox`'s non-null output with `useReportFocusOnLeave`.

* **Double Submit race before React re-renders**
* **File and line:** `components/patient/SurveyBox.tsx`, lines 25 and 41–44.
* **Concrete case:** `sending` is React state, so `setSending(true)` (line 42) does not update `sending` synchronously inside `onSubmit`. Two rapid activations in the same tick (e.g., pressing Enter twice or double-tapping before re-render) both pass `if (... || sending) return;` and fire two `submitSurvey` calls; the second call is refused by the database and can flip `sending` back early or set `notSaved = true`.
* **Smallest fix:** Guard `onSubmit` with a synchronous `const sendingRef = useRef(false);` alongside `sending` state.

* **Focus loss while sending and after a failed save**
* **File and line:** `components/patient/SurveyBox.tsx`, lines 42–46 and 77.
* **Concrete case:** `components/Button.tsx` is not in the diff, so not sure whether `<Button disabled="{sending}">` renders a native `disabled` attribute or `aria-disabled`. If it sets native `disabled`, pressing Submit immediately drops focus from the button to `document.body` while `sending` is `true`, and focus remains stranded on `document.body` when `setSending(false)` runs after a failed save.
* **Smallest fix:** Use `aria-disabled={sending}` (with the `sendingRef` guard) so the button stays focusable while sending.

* **Second consecutive failed save does not re-announce `role="alert"`**
* **File and line:** `components/patient/SurveyBox.tsx`, lines 40–46 and 80–84.
* **Concrete case:** After a first failed submit sets `notSaved = true`, `<p role="alert">{t.notSaved}</p>` stays mounted. Tapping Submit a second time without leaving `"ask"` never calls `setNotSaved(false)` before `await submitSurvey(...)`, so on a second failure `notSaved` stays `true`, the DOM node does not change, and screen readers make no new announcement.
* **Smallest fix:** Call `setNotSaved(false);` at the start of `onSubmit` (line 42) and when picking a radio score (`onChange`, line 64).

* **Scale labels (`t.low` / `t.high`) are not tied to the radio group and appear after all 11 radios**
* **File and line:** `components/patient/SurveyBox.tsx`, lines 51–75.
* **Concrete case:** `<fieldset>` + `<legend>` and `<label>` wrapping each `<input type="radio">` give each button a numeric label (`"0"`–`"10"`), but `t.low` (`"0 = Very poor"`) and `t.high` (`"10 = Excellent"`) sit in `<span>` elements *after* the radios (lines 71–74) with no programmatic link. A screen-reader user tabbing into the group hears `"0, radio button"` without knowing whether `0` is best or worst until navigating past all 11 options.
* **Smallest fix:** Move lines 71–74 above the radios (under `<legend>`) and connect them via `aria-describedby` on `<fieldset>` (or include `sr-only` scale hints inside the `0` and `10` `<label>` elements).

* **Pressing Submit with no score is a silent no-op**
* **File and line:** `components/patient/SurveyBox.tsx`, lines 41 and 76–79.
* **Concrete case:** Submit is enabled when `score === null`, and `t.note` says `"Answering is optional."`. A patient who taps Submit to skip—or taps before picking a score—hits `if (score === null ...)` (line 41) and gets no visual or screen-reader feedback.
* **Smallest fix:** Set `aria-disabled={score === null || sending}` and show an inline `role="status"` hint if activated while `score === null`.

* **Stale `score` and `notSaved` survive Undo and a second arrival**
* **File and line:** `components/patient/SurveyBox.tsx`, lines 24–30 and 46.
* **Concrete case:** Patient picks `8`, Submit fails (`score = 8`, `notSaved = true`), staff click Undo (`step === null`, `SurveyBox` stays mounted returning `null`), and staff later click Mark arrived (`step === "ask"`). The survey reopens with `8` pre-selected and the red `"Your answer did not save"` error already showing.
* **Smallest fix:** Render the `<form>` inside a child component mounted only when `step === "ask"` so leaving `"ask"` resets `score` and `notSaved`.

* **Offline state is not shown or framed on `SurveyBox`**
* **File and line:** `components/patient/StatusAndSound.tsx`, lines 36–39; `components/patient/SurveyBox.tsx`, lines 50–85.
* **Concrete case:** When `!online`, `StatusAndSound` wraps `PatientStatus` in the dashed `status-frame` border (lines 36–38), while `SurveyBox` renders outside it at full prominence with an enabled Submit button. An offline patient picks a score, taps Submit, and only then sees `"Your answer did not save. Please try again."`.
* **Smallest fix:** Pass `online` into `SurveyBox` (or include `SurveyBox` inside the offline frame) and warn/disable submission while `!online`.

### 4. Missing states on the phone

* **Survey saved → staff Undo → visit ends as `removed` or `unable_to_reach` (and `daily_stats`)**
* **File and line:** `lib/survey.ts`, lines 13–17; `supabase/migrations/20261120000000_survey.sql`, lines 23–28.
* **Concrete case:** On the phone, `surveyStep` returns `null` for `removed` and `unable_to_reach` even when `surveyDone` is `true`, so the phone does not show `"Thank you for your feedback."` on the ended screen. In Postgres, however, because Undo keeps `survey_score`, a visit marked `arrived` by mistake, scored, undone, and later closed as `removed` or `unable_to_reach` keeps a non-null `survey_score` on a non-arrived visit. Because `delete_old_visits` / `daily_stats` is not in the diff, not sure whether `daily_stats` filters survey metrics by `status = 'arrived'` or counts any row with `survey_score is not null`.
* **Smallest fix:** If `daily_stats` does not already check `status = 'arrived'` for survey metrics, add `and status = 'arrived'` there (or clear `survey_score` when closing a visit as `removed` or `unable_to_reach`).

* **Saved-on-server but read-failed UI state** and **offline survey state:** Covered in sections 1 and 3 above.

### 5. Tests that pass for the wrong reason

* **`SurveyBox.click.test.tsx` never transitions `view` after `"saved"`, never tests boundary scores `0`/`10`, and never tests `StatusAndSound` wiring**
* **File and line:** `components/patient/SurveyBox.click.test.tsx`, lines 13, 46, 63–65, and 77–90; `components/patient/StatusAndSound.tsx`, line 6.
* **Concrete cases:**
  * `submitSurvey` is mocked to return `"saved"` without triggering a re-render to `{ ...arrived, surveyDone: true }`, so lines 77–89 pass even if `SurveyBox` fails to clear `notSaved` or loses focus on transition.
  * `pick(n)` and line 64 inspect `input[type="radio"]` by `r.value`, passing even if `<label>` associations were broken (`<div>` instead of `<label>`).
  * Only scores `8`, `3`, `9`, and `5` are picked; a classic `if (!score ...)` bug in `SurveyBox.tsx` line 41 would silently block score `0` while every test passes.
  * `StatusAndSound.tsx` line 6 claims the click test uses `StatusAndSound` to check real wiring, yet `SurveyBox.click.test.tsx` renders `<SurveyBox>` directly—so dropping `<SurveyBox>` or `token` from `StatusAndSound.tsx` line 39 passes all unit tests.
  * Double Submit (pending promise), retry-after-failure (`"not_saved"` then `"saved"`), and non-English `notSaved` strings are untested.
* **Smallest fix:** Add a `StatusAndSound` wiring test, select radios by `<label>` text, test boundary scores `0` and `10`, and test double-click while pending plus failure-then-`"saved"` recovery.

* **`supabase/checks/survey.sql` skips boundary scores `0`/`10`, `NULL`, `anon` execution, and Undo + re-arrival**
* **File and line:** `supabase/checks/survey.sql`, lines 36–65.
* **Concrete cases:**
  * Only `7` (inside) and `-1`/`11` (outside) are tested, so `p_score > 0 and p_score < 10` (excluding `0` and `10`) would pass all 13 checks.
  * All calls run as the SQL Editor role rather than `set local role anon;`, so missing `GRANT EXECUTE ... TO anon` would pass `survey.sql` (caught only by inspecting `permissions.sql`).
  * `closed_at is null` on `status = 'arrived'`, `NULL` arguments, and an Undo + second arrival on `ZZZZ5A` are untested in SQL.
* **Smallest fix:** Add cases for `0`, `10`, `NULL`, `set local role anon` around a `submit_survey` + `get_patient_visit` check, and an Undo + re-arrival check on `ZZZZ5A`.

* **`e2e/recall-arrive.spec.ts` does not check that the thank-you message disappears during Undo**
* **File and line:** `e2e/recall-arrive.spec.ts`, lines 55–57.
* **Concrete case:** After Undo, lines 56–57 check `"Please head back now"` and `"Status: Ready at the desk"` (`toHaveCount(0)`), but never assert `"Thank you for your feedback."` is hidden while `on_the_way`; a bug leaving `"thanks"` rendered on `on_the_way` would pass.
* **Smallest fix:** Assert `await expect(patient.getByRole("status").filter({ hasText: "Thank you for your feedback." })).toHaveCount(0);` at line 58.

* **`data/patientVisit.ts` (`submitSurvey`) and `lib/patientViewFromRow.test.ts`**
* **File and line:** `data/patientVisit.ts`, lines 162–171; `lib/patientViewFromRow.test.ts` (not in diff).
* **Concrete case:** No unit test in the diff exercises `submitSurvey` directly (`SurveyBox.click.test.tsx` mocks it), leaving error/exception/refusal branches in `data/patientVisit.ts` untested in Vitest; not sure what the 78 lines of `lib/patientViewFromRow.test.ts` cover because its diff is omitted.
* **Smallest fix:** Add unit tests for `submitSurvey` covering `"saved"`, `"refused"`, `"not_saved"`, and `refreshPatientView` failure/throw.

---

## Claude's check (2026-11-21)

I read each named file and line in the code as it is now.

Correct, and worth a fix:
- 1, a read that fails after a save: correct in part. `refreshPatientView` cannot throw, because `readFromDatabase` (data/patientVisit.ts line 71) catches all errors. But the soft fail is real. `afterFailedRead` (lib/failedRead.ts line 14) keeps the old view after 1 failed read, so the step stays "ask". A second Submit is refused, and the phone then says "did not save", but the score did save. Fix: after "saved", SurveyBox shows the thank-you text at once.
- 3, focus after Submit and after Undo: correct. The Submit button leaves the page, and StatusAndSound.tsx line 39 gives SurveyBox no `onFocusLost`. The rescue that already exists (`useReportFocusOnLeave`, used in FocusBox, SoundSwitch and StillHerePrompt) fixes both cases. Button.tsx sets the native `disabled` attribute, so the "focus while sending" case is real too, and the same rescue fixes it.
- 3, a second failure is not announced again: correct. Fix: `setNotSaved(false)` at the start of Submit and when a score is picked.
- 3, the 0 and 10 words come after the 11 radios: correct. Fix: put them under the legend, with `aria-describedby` on the fieldset.
- 3, an old score and an old error stay after Undo and a second arrival: correct. SurveyBox stays mounted and returns null (line 30). Fix: put the form in a child part that shows only in "ask".
- 3, a double Submit: in part. React 18 runs the updates of each click before the next click, so this case is unlikely. A `useRef` guard costs 3 lines, so add it.
- 5, tests: correct. No test picks 0 or 10, and no test tries again after a failure. No StatusAndSound test shows SurveyBox (the e2e test checks the real page). The e2e test does not check that the thank-you text goes away after Undo. survey.sql does not try 0, 10 or null.

Not correct, or not worth a change:
- 1, `submit_survey` itself: Gemini found no fault. `visits.survey_score` has `check (survey_score between 0 and 10)` (20261110060756_tables_and_security.sql line 53).
- 2, the order in the trigger: no real case. No app code sets `created_at`, or sets a time to a new value in the same transaction. If it happens, the only result is one extra version, which is the safe direction (the old behaviour). No change.
- 2, a staff change to an existing score keeps the version: staff screens never write `survey_score`. No change.
- 5, `submitSurvey` unit tests: it has the same shape as `patientStep` (lines 132-144), and the click test plus the e2e test cover it. Low value.

Product decisions (asked of the owner in the same turn):
- Submit with no score picked does nothing (3).
- A score stays on a visit that ends `removed` or `unable_to_reach` after Undo (4). `daily_stats` (20261120030000_wait_and_recall_stats.sql line 80) and `lib/dashboardNumbers.ts` count it, because they check only `survey_score is not null and closed_at is not null`.
- Offline: the survey is not in the dashed frame and does not warn (3).

The fixes touch components/, e2e/ and supabase/checks/, so they need a plan first (CLAUDE.md).

Owner's decisions (2026-11-21):
- No score picked: Submit looks off (`aria-disabled`) until the patient picks a score. No new text.
- A score on a visit that ends `removed` or `unable_to_reach`: keep counting it. Add a known-issues line. No code change.
- Offline: leave as is. The "did not save" message tells the patient.

---

## Response (first run, `phase5-e2e`, 2026-11-20, this code was kept)

Gemini Hydrogen 4, High, new chat, 2026-11-20. Pasted as given.

## 1. `submit_survey` (`supabase/migrations/20261120000000_survey.sql`)

No flaw found in the `WHERE` guards or concurrency locking for the normal `submit_survey` path (`supabase/migrations/20261120000000_survey.sql`, lines 23–30):

* **Ownership, status, closed, one-time, and range:** `access_token = p_token`, `status = 'arrived'`, `closed_at is not null`, `survey_score is null`, and `p_score between 0 and 10` reject missing/NULL tokens, NULL scores, non-arrived visits, unclosed visits, duplicate submissions, and out-of-range integers. Non-integer numbers fail Postgres `integer` parameter parsing before the function runs.
* **Concurrent Submits:** Under Postgres `READ COMMITTED`, two simultaneous `submit_survey` calls serialize on the row lock acquired by `UPDATE`; the second transaction re-evaluates `survey_score is null` against the committed row, updates 0 rows, and returns `false`.
* **Not sure:** `visits_check_step` is not in the diff, so this relies on the comment on line 4 that `"arrived"` can only come from `waiting`, `called`, or `on_the_way` (every arrived visit waited off-site).

One client-side handling problem around `submit_survey`:

1. **Saved score leaves the screen on the form if the follow-up read fails**
* **File and line:** `data/patientVisit.ts`, lines 165–167; `components/patient/SurveyBox.tsx`, lines 43–46.
* **Concrete case:** A patient taps Submit; `submit_survey` commits `survey_score = 8` and returns `true`, then a brief connection drop causes `refreshPatientView(token)` (`get_patient_visit`) to fail on line 166. `refreshPatientView` swallows the fetch error and passes `entry.shown` to `afterFailedRead` (not in the diff; not sure how many failures it tolerates before showing `"unavailable"`, though on a first failure it likely keeps the cached view with `surveyDone: false`). `submitSurvey` returns `"saved"`, `SurveyBox` sets `notSaved` to `false`, and the screen stays on the 0–10 form with no confirmation. If the patient taps Submit again, `submit_survey` returns `false` (`"refused"`), and if the read still fails, `SurveyBox` shows the red `"Your answer did not save"` alert even though the score was saved.
* **Smallest fix:** In `SurveyBox.tsx`, track a local `savedLocally` boolean when `result === "saved"` (reset if `view.status !== "arrived" || !view.closed`) and render the `"thanks"` state when `step === "thanks" || (step === "ask" && savedLocally)`.

## 2. The version trigger (`supabase/migrations/20261120010000_survey_keeps_version.sql`)

1. **Another column changes and `version` still stays:**
* Not sure for other triggers: PostgreSQL fires `BEFORE UPDATE` triggers in alphabetical order by trigger name, so `visits_before_write` runs *before* any trigger named alphabetically after it (such as `visits_check_step`, though the comment says that trigger only checks). If any trigger named after `visits_before_write` modifies a column in `NEW`, `visits_before_write` will not see that change and will keep `old.version`.
* Within `visits_before_write` itself, no column change slips past unless a column type has distinct SQL values that serialize identically in `to_jsonb` (such as `numeric` trailing zeros or `citext` casing; full `visits` column types are not in the diff).
* **Clearing or overwriting `survey_score` outside `submit_survey`:** Because `'survey_score'` is stripped on line 32, any SQL update that changes only `survey_score` (including setting it back to `NULL` or changing an existing score) keeps `old.version`.

2. **Only the score changes and `version` still goes up:**
* Not sure if any `BEFORE UPDATE` trigger named alphabetically *before* `visits_before_write` exists and mutates a column (e.g., an `updated_at` timestamp) on every update; if none exists, `submit_survey` changing only `survey_score` keeps `old.version`.

3. **Does the order of the `now()` lines after the version check matter?**
* **File and line:** `supabase/migrations/20261120010000_survey_keeps_version.sql`, lines 32–46.
* **Concrete case:** Because line 32 checks `to_jsonb(new)` *before* `new.created_at := old.created_at;` (line 37) and the `now()` lines (lines 38–46):
* If an `UPDATE` sets `created_at` to a different value (or updates a `*_at` column to a different timestamp during a transaction where `now()` happens to equal `old.*_at`), line 32 sees a difference and bumps `version`, and then lines 37–46 overwrite `new.*` back to `old.*`—bumping `version` even though the stored row did not change.
* Conversely, for `submit_survey` (`set survey_score = p_score`), none of the `*_at` columns are `distinct from old.*_at`, so lines 38–46 do not run and the order makes no difference there.
* **Smallest fix:** Move `new.created_at := old.created_at;` and the `now()` assignments (lines 37–46) above the version comparison on line 32 (note that keeping `new.created_at := old.created_at` before the check also stops a redundant `SET created_at` from bumping `version` when nothing else changed).

## 3. `SurveyBox.tsx` (`components/patient/SurveyBox.tsx` and `components/patient/StatusAndSound.tsx`)

1. **Focus drops to `document.body` after a successful Submit, and the thank-you message may not be announced on iOS VoiceOver**
* **File and line:** `components/patient/SurveyBox.tsx`, lines 29–37 and 77; `components/patient/StatusAndSound.tsx`, line 39.
* **Concrete case:** A keyboard or VoiceOver user picks `8`, tabs to `Submit`, and activates it. Once `refreshPatientView` sets `view.surveyDone = true`, `SurveyBox` switches to `step === "thanks"`, unmounting `<form>` (including the focused `Submit` button) and newly mounting `<p role="status">{t.thanks}</p>`. `StatusAndSound` does not pass `lostFocus` to `SurveyBox`, and `SurveyBox` does not move focus, so focus falls to `document.body` and iOS VoiceOver often misses a newly mounted `role="status"` element.
* **Smallest fix:** Keep a persistent `<div role="status">` mounted inside `SurveyBox`, give the thank-you `<p>` `tabIndex={-1}` and a `ref`, and call `.focus()` on it when `step` changes from `"ask"` to `"thanks"` after a submit.

2. **Pressing `Submit` with no score selected is a silent no-op**
* **File and line:** `components/patient/SurveyBox.tsx`, lines 41 and 77–79.
* **Concrete case:** `Button` is enabled (`disabled={sending}` is `false`) when `score === null`. A patient who thinks "Answering is optional" means they can press Submit to skip, or a user who taps Submit without picking a number, gets zero visual or screen-reader feedback when line 41 silently returns.
* **Smallest fix:** Set `disabled={score === null || sending}` on line 77 (note: `SurveyBox.click.test.tsx` line 73 only tests that `submitSurvey` is not called, so `disabled` still passes it), or add a polite/alert validation message under the button when submitted with `score === null`.

3. **Scale labels (`0 = Very poor`, `10 = Excellent`) are not programmatically tied to the radio group**
* **File and line:** `components/patient/SurveyBox.tsx`, lines 51–75.
* **Concrete case:** `t.low` and `t.high` sit in plain `<span>`s *after* all 11 radios. A screen-reader user tabbing into the group hears `"How would you rate your waiting experience?"` and `"0, radio button, not checked"` without knowing whether `0` is best or worst until after navigating past all 11 options.
* **Smallest fix:** Put `id="survey-scale"` on the `t.low` / `t.high` container (line 71) and add `aria-describedby="survey-scale"` to `<fieldset>` (line 51).

4. **Double-submit race before React re-renders**
* **File and line:** `components/patient/SurveyBox.tsx`, lines 25 and 41–44.
* **Concrete case:** `sending` is React state, so `setSending(true)` does not update `sending` synchronously inside `onSubmit`. Two rapid submit triggers in the same tick (e.g., pressing Enter while double-clicking, or a fast synthetic click before commit) both see `sending === false` and fire two concurrent `submitSurvey` RPCs. The second RPC returns `"refused"`, which can flash `notSaved` or flip `sending` back to `false` early while the first call is still in flight.
* **Smallest fix:** Add `const sendingRef = useRef(false);` and guard `onSubmit` synchronously (`if (sendingRef.current) return; sendingRef.current = true; ... sendingRef.current = false;`).

5. **Focus loss while `sending` is `true` and after a failed save**
* **File and line:** `components/patient/SurveyBox.tsx`, lines 42–46 and 77.
* **Concrete case:** `components/Button.tsx` is not in the diff, so not sure whether `<Button disabled="{sending}">` renders native `disabled` or `aria-disabled`. If it sets native `disabled` on `<button>`, pressing Submit disables the focused button and drops focus to `document.body`; when the save fails (`setSending(false)`), focus stays lost on `document.body` instead of returning to the button or moving to the error.
* **Smallest fix:** Keep focus on the button using `aria-disabled={sending}` (matching `VisitRow.tsx` in the existing codebase) alongside the `sendingRef` guard, or restore focus to a button `ref` after `setSending(false)` when `result !== "saved"`.

6. **Second consecutive save failure does not re-announce `role="alert"`**
* **File and line:** `components/patient/SurveyBox.tsx`, lines 40–46 and 80–84.
* **Concrete case:** The patient taps Submit while offline and `<p role="alert">{t.notSaved}</p>` appears. They tap Submit a second time and it fails again; because `notSaved` remained `true` throughout, the `<p role="alert">` node never unmounts or changes, so screen readers give no announcement on the retry failure.
* **Smallest fix:** Call `setNotSaved(false);` at the start of `onSubmit` (line 42) and inside `onChange` when picking a score (line 64).

7. **Stale `notSaved` and `score` survive an Undo + second arrival**
* **File and line:** `components/patient/SurveyBox.tsx`, lines 24–28 and 46.
* **Concrete case:** A patient picks `8`, taps Submit, and the save fails (`notSaved = true`, `score = 8`). Staff click Undo (`step` becomes `null`), then later click Mark arrived again (`step` becomes `"ask"`). Because `SurveyBox` stayed mounted while returning `null`, the new survey screen opens with `8` already selected and the red `"Your answer did not save"` error already showing before the patient touches anything.
* **Smallest fix:** Move the `<form>` into a child component rendered only when `step === "ask"` so it unmounts and resets state whenever `step` leaves `"ask"`.

8. **Offline state does not visually frame or warn inside `SurveyBox`**
* **File and line:** `components/patient/StatusAndSound.tsx`, lines 36–39; `components/patient/SurveyBox.tsx`, lines 50–85.
* **Concrete case:** On `/patient` while `!online`, `StatusAndSound` wraps `PatientStatus` in the dashed offline frame (`status-frame`), while `SurveyBox` sits outside it at full prominence with an active `Submit` button. A patient offline sees the survey as ready to submit and only learns it cannot save after picking a score and tapping Submit.
* **Smallest fix:** Pass `online` into `SurveyBox` (or put `SurveyBox` inside a styled wrapper when `!online`) and disable/suppress submission or show the offline notice when `!online`.

## 4. Missing states on the phone

1. **Question 4 example (`survey saved` -> `staff Undo` -> `removed` / `unable_to_reach`):**
* **Phone UI (`lib/survey.ts`, lines 13–17):** `surveyStep` returns `null` when `view.status` is `"removed"` or `"unable_to_reach"`, even if `view.surveyDone` is `true`. That avoids showing `"Thank you for your feedback."` on the `"Your off-site wait has ended"` screen.
* **Database residue (`supabase/migrations/20261120000000_survey.sql`, lines 23–28):** Because Undo keeps `survey_score` (settled decision), if staff accidentally mark the wrong visit `arrived`, the patient submits a score, staff click Undo, and the visit later ends as `removed` or `unable_to_reach`, `visits.survey_score` remains populated on a non-arrived visit. (`daily_stats` / `delete_old_visits` are not in the diff, so not sure whether `daily_stats` filters `survey_score` by `status = 'arrived'`.)
* **Smallest fix (if `daily_stats` does not already filter):** Filter `survey_score` metrics by `status = 'arrived'` in `delete_old_visits` (or clear `survey_score` when closing a visit as `removed` / `unable_to_reach` rather than on Undo).

2. **Saved-on-server but read-failed UI state:** Covered in Question 1 problem 1 (`data/patientVisit.ts`, line 166).

3. **Offline state on the survey form:** Covered in Question 3 problem 8 (`components/patient/StatusAndSound.tsx`, line 39).

## 5. Tests passing for the wrong reason or missing coverage

1. **`SurveyBox.click.test.tsx` tests `SurveyBox` in isolation with a mocked `submitSurvey` that never transitions the view**
* **File and line:** `components/patient/SurveyBox.click.test.tsx`, lines 13, 77–89, and 101–106.
* **Concrete case:** `submitSurvey` is mocked to return `"saved"` without triggering `refreshPatientView`. Line 77 passes even if a bug in `SurveyBox` left `notSaved` stuck `true`, failed to move focus when unmounting `<form>`, or left the page on `"ask"` when `refreshPatientView` failed. Meanwhile `StatusAndSound.tsx` line 6 states that the click test uses `StatusAndSound` to check real wiring, yet `SurveyBox.click.test.tsx` renders `<SurveyBox>` directly and never tests `StatusAndSound`.
* **Smallest fix:** Add a test rendering `StatusAndSound` (with `token="t"` and without `token`) and update the mocked `"saved"` test to verify that transitioning to `{ ...arrived, surveyDone: true }` leaves no `role="alert"` and manages focus.

2. **`SurveyBox.click.test.tsx` accesses radios by `value` attribute rather than accessible label**
* **File and line:** `components/patient/SurveyBox.click.test.tsx`, lines 46 and 63–65.
* **Concrete case:** `pick(n)` queries `input[type="radio"]` by `r.value === String(n)` and line 64 checks `radios().map((r) => r.value)`. Those assertions would still pass if every `<label>` lost its `<input>` association (e.g., via `<div>` instead of `<label>`) or had empty accessible names for screen readers.
* **Smallest fix:** Assert each radio's accessible label text (`r.closest("label")?.textContent?.trim()`) matches `"0"`..`"10"` and click the `<label>` in `pick()`.

3. **`SurveyBox.click.test.tsx` does not test double Submit, consecutive failures, retry-after-failure, or non-English text**
* **File and line:** `components/patient/SurveyBox.click.test.tsx`, lines 77–100.
* **Concrete case:** Clicking Submit twice while `submitSurvey` is unresolved, failing twice in a row, recovering on a second Submit, and rendering `fr`/`ur`/`ar`/`zh` `notSaved` strings are all untested.
* **Smallest fix:** Add a pending-promise double-click test (asserting `submitSurvey` is called once) and a failure-then-`"saved"` test (asserting `role="alert"` disappears).

4. **`supabase/checks/survey.sql` misses the `0` and `10` boundary scores, `closed_at is null`, Undo/re-arrival persistence, and `anon` role execution**
* **File and line:** `supabase/checks/survey.sql`, lines 36–66.
* **Concrete case:** Only score `7` (inside) and `-1`/`11` (outside) are tested; an off-by-one bug like `p_score > 0 and p_score < 10` would pass all 13 cases. Likewise, every non-arrived case is tested, but `arrived` with `closed_at is null` is not (if reachable), `NULL` inputs are untested, Case 13 tests `last_still_here_at` on `ZZZZ5B` instead of an Undo on `ZZZZ5A` (which leaves the Undo + 2nd arrival + score-retention path untested in SQL), and running as the SQL Editor user (`postgres`) would pass even if `anon` lacked `EXECUTE`.
* **Smallest fix:** Add boundary cases for scores `0` and `10` (on separate arrived rows) and `NULL`, test `set local role anon` around a `submit_survey` + `get_patient_visit` check, and add an Undo (`status = 'on_the_way', arrived_at = null, closed_at = null`) + second arrival check on `ZZZZ5A` verifying `version` advances and `survey_score` stays `7`.

5. **`e2e/recall-arrive.spec.ts` does not verify the thank-you card disappears during Undo**
* **File and line:** `e2e/recall-arrive.spec.ts`, lines 55–57.
* **Concrete case:** After staff click Undo, lines 56–57 check that `"Please head back now"` is visible and `"Status: Ready at the desk"` is gone, but never assert that `"Thank you for your feedback."` is gone while `status` is `on_the_way`. (If a bug kept `"thanks"` mounted on `on_the_way`, lines 55–63 would still pass.)
* **Smallest fix:** Add `await expect(patient.getByRole("status").filter({ hasText: "Thank you for your feedback." })).toHaveCount(0);` at line 58.

6. **`lib/patientViewFromRow.test.ts`:** Not in the diff, so not sure what its 78 lines cover.

## Check of the response (Claude, 2026-11-20)

Read in this session: `components/Button.tsx`, `lib/failedRead.ts`, `supabase/migrations/20261111200000_pause_safety_limit.sql`, the trigger list in the migrations, and the `survey_score` uses in `lib/dashboardNumbers.ts` and the `daily_stats` migrations.

Real, fix:
- 1.1 Saved, but the read after it fails. `afterFailedRead` keeps the old view after 1 failed read, so the form stays. A second Submit gets `refused` and shows "did not save", which is false. Fix in `SurveyBox`: remember a saved answer and show thank you.
- 3.1 Focus after a saved Submit falls to the page body. Fix: move focus to the thank-you line.
- 3.3 The 0 and 10 labels are not tied to the group. Fix: `aria-describedby` on the fieldset.
- 3.5 `Button` passes the native `disabled` (Button.tsx line 23), so focus leaves the Submit button while it sends. Fix: `aria-disabled` and a guard in `onSubmit`, as `VisitRow.tsx` does.
- 3.6 A second failed save is not read out again. Fix: clear `notSaved` at the start of `onSubmit`.
- 3.7 Old score and old alert stay after Undo and a second arrival, because `SurveyBox` stays mounted. Fix: a child form that mounts only on step `ask`.
- 5.2, 5.4, 5.5 Test gaps that are real: radios found by value, not by label; no score 0 or 10 case; no `anon` role case; no check that thank you is gone after Undo.

Not a problem:
- 2.1 Trigger order. `visits_limit_pause` runs after `visits_before_write`, but it changes `followup_paused_until` only when that column already changed, so the version already went up. `visits_check_step` only checks.
- 2.3 Order of the `now()` lines. Staff send only changed fields (`changedFields`), never `created_at`. A changed `*_at` column also changes the stored row, so the version must go up. The "now() equals old" case needs the same transaction. No change.
- 3.4 Double Submit. React applies a click update before the next click event, and the database refuses a second score. The guard from 3.5 covers the rest.

Owner decision needed:
- 3.2 Submit with no score does nothing and says nothing.
- 3.8 Submit is active while the phone is offline.
- 4.1 A score stays on a visit that is undone and then ends as `removed` or `unable_to_reach`. `lib/dashboardNumbers.ts` line 105 and the `daily_stats` cleanup count every score, with no status filter.

Owner decisions (2026-11-20):
- 3.2 Gray out Submit until a score is picked.
- 3.8 Keep Submit active offline; a failed save shows "Your answer did not save."
- 4.1 Count every score. No change to the dashboard or `daily_stats`.
