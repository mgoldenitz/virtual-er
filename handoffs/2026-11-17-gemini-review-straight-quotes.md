# Gemini review: straight-quotes cleanup

Model: Gemini Hydrogen 4, High, in a new chat. Project: a concept prototype of a virtual ER waiting room (Next.js App Router, React, TypeScript). Synthetic data only. This file has no keys and no patient data.

## What changed

The project rule: code and English screen text use straight quotes only (no curly quote marks, no `&ldquo;` and the rest). In JSX, text with ' or " goes in a JS string. Four staff texts still had curly quotes; SPEC.md line 83 had the same text as one of them. A new test, `lib/straightQuotes.test.ts`, reads every .ts and .tsx file in app/, components/, data/ and lib/ and fails on a curly quote. It skips `lib/text/zh.ts`, because Chinese uses its own quote marks. The words did not change.

Commits: `7019694` (test, failed on the 4 files), `8115a3c` (fix), `b81e188` (SPEC and docs).

Line counts after the change: `components/staff/ExpectedArrivals.tsx` 121, `components/staff/FollowUpPanel.tsx` 166, `components/staff/RecallAllPanel.tsx` 83, `components/staff/VisitRow.tsx` 128, `lib/straightQuotes.test.ts` 35. The changed lines call no new helper (`same`, `AMBER` and `STILL_HERE_ANSWER_WITHIN_MINUTES` were there before and did not change).

## Checked

- The guard test failed on exactly the 4 staff files before the fix, and passed after it.
- A put-back `&ldquo;` in `ExpectedArrivals.tsx` made the guard test fail; the file was restored.
- `npm test`: 58 test files, 327 tests passed. `npm run lint`: no problems. `npm run build`: passed.

## Not checked

- The 4 texts on the staff screen in a browser (no test reads these texts).
- The guard test on a machine other than Windows (it changes \ to / in paths).

## Questions (find problems; do not confirm)

1. Does any changed line render different words or spaces from before? Look closely at `RecallAllPanel.tsx`: a JS string ends with a space, and the next line is plain JSX text.
2. Can the guard test pass while a curly quote is still in one of these folders (for example a file type or a path it does not read, or a quote mark it does not list)?
3. Is there a simpler or more readable way for a beginner to write these 4 lines?
4. Anything else that breaks a project rule: one job per file, no file over 300 lines, straight quotes.

For each problem give: severity (blocker, should fix, minor), file and line, what goes wrong, a concrete case, and the smallest fix.

## Diff

```diff
diff --git a/SPEC.md b/SPEC.md
index 20fde3e..6c52fa5 100644
--- a/SPEC.md
+++ b/SPEC.md
@@ -80,7 +80,7 @@ App name: TBD (I will choose it). Use "Virtual Waiting Room" as a placeholder.
 - Confirmed but not arrived: a set time after confirmed_at (a setting, default 30 minutes), flag "On the way, not arrived". Never remove the visit automatically. This is a demo setting, not a clinically validated deadline.
 - No-response follow-up after "Recall patient" (all times are settings so I can shorten them for testing; they are placeholders, and a hospital's clinical lead would set the real ones):
   - 0 minutes: patient screen alert (plus optional text in the Twilio add-on).
-  - 10 minutes, no confirmation: second alert on the patient screen; flag on the staff screen: "No reply 10 min after call-back. Phone the patient now." (owner, 2026-11-11; was "Phone this patient.") The demo stores no phone numbers, so phone calls are simulated: staff record each attempt with a button ("Phoned, answered" or "Phoned, no answer"). A hospital version would take the number from its registration system. "Phoned, answered" saves last_phone_result, clears the phone flag and pauses escalation until followup_paused_until (a setting, default 10 minutes). After the pause, the ladder continues from the time elapsed since called_at; it does not restart. A visit with an answered call that still does not arrive is flagged "Answered the phone, but hasn’t arrived or tapped ‘I’m on my way’ yet." (owner, 2026-11-11; was "Contacted, not yet arrived"), never "Review: unable to reach".
+  - 10 minutes, no confirmation: second alert on the patient screen; flag on the staff screen: "No reply 10 min after call-back. Phone the patient now." (owner, 2026-11-11; was "Phone this patient.") The demo stores no phone numbers, so phone calls are simulated: staff record each attempt with a button ("Phoned, answered" or "Phoned, no answer"). A hospital version would take the number from its registration system. "Phoned, answered" saves last_phone_result, clears the phone flag and pauses escalation until followup_paused_until (a setting, default 10 minutes). After the pause, the ladder continues from the time elapsed since called_at; it does not restart. A visit with an answered call that still does not arrive is flagged "Answered the phone, but hasn't arrived or tapped "I'm on my way" yet." (owner, 2026-11-11; was "Contacted, not yet arrived"), never "Review: unable to reach".
   - 20 minutes: flag: "Still no reply 20 min after call-back. Phone the patient again." (owner, 2026-11-11; was "Phone a second time"); the patient screen shows the "Please return now" message.
   - 30 minutes, with no answered call: the visit is flagged "Review: unable to reach" and stays in the line until a nurse confirms. On confirmation the status becomes unable_to_reach and the visit leaves the active line. The app does not record this as left without being seen; staff follow hospital policy outside the app.
   - If an unable_to_reach patient arrives later, staff can reopen the visit, which clears closed_at and sends it back to triage for reassessment (status: needs_reassessment).
diff --git a/components/staff/ExpectedArrivals.tsx b/components/staff/ExpectedArrivals.tsx
index 9f3ef96..111873e 100644
--- a/components/staff/ExpectedArrivals.tsx
+++ b/components/staff/ExpectedArrivals.tsx
@@ -78,7 +78,7 @@ export function ExpectedArrivals({ visits, site, now, onChoose }: Props) {
       {reassess.length > 0 && (
         <div className="space-y-2">
           <h3 className="font-bold">Back for reassessment ({reassess.length})</h3>
-          <p className="text-sm text-slate-700">Reopened after &ldquo;unable to reach&rdquo;. Triage again before they rejoin the line.</p>
+          <p className="text-sm text-slate-700">{'Reopened after "unable to reach". Triage again before they rejoin the line.'}</p>
           <ul className="space-y-2">
             {reassess.map((visit) => (
               <li
diff --git a/components/staff/FollowUpPanel.tsx b/components/staff/FollowUpPanel.tsx
index 00d040b..65054ed 100644
--- a/components/staff/FollowUpPanel.tsx
+++ b/components/staff/FollowUpPanel.tsx
@@ -78,7 +78,7 @@ export function flagFor(followUp: StaffFollowUp, visit: Visit, now: Date): Flag
         RED,
       );
     case "contacted_not_arrived":
-      return same("Answered the phone, but hasn’t arrived or tapped ‘I’m on my way’ yet.", AMBER);
+      return same(`Answered the phone, but hasn't arrived or tapped "I'm on my way" yet.`, AMBER);
     case "on_way_not_arrived": {
       const since = visit.confirmed_at ? minutesBetween(visit.confirmed_at, now) : 0;
       return {
diff --git a/components/staff/RecallAllPanel.tsx b/components/staff/RecallAllPanel.tsx
index 250cbf3..8ee38cf 100644
--- a/components/staff/RecallAllPanel.tsx
+++ b/components/staff/RecallAllPanel.tsx
@@ -66,7 +66,7 @@ export function RecallAllPanel({ visits, site, onResult }: Props) {
         Recall all {patientCount(n)} waiting off-site at Demo Site {site}?
       </h3>
       <p>
-        Each patient&apos;s phone will show &ldquo;Please head back now&rdquo;. Use this for a surge or a system problem.
+        {`Each patient's phone will show "Please head back now". Use this for a surge or a system problem. `}
         There is no undo: recalled patients stay recalled.
       </p>
       <p className="font-mono tracking-widest">{asked.map((v) => v.code).join(" · ")}</p>
diff --git a/components/staff/VisitRow.tsx b/components/staff/VisitRow.tsx
index d96b01a..9e5c295 100644
--- a/components/staff/VisitRow.tsx
+++ b/components/staff/VisitRow.tsx
@@ -87,7 +87,7 @@ export function VisitRow({ visit, now, onShowSlip, onLeftList }: Props) {
       {stillHereState({ status: visit.status, triagedAt: visit.triaged_at, lastStillHereAt: visit.last_still_here_at }, now) ===
         "missed" && (
         <p className="mt-2 rounded-lg border-2 border-red-800 bg-red-50 p-2 font-semibold text-red-900" data-testid="still-here-flag">
-          Missed &ldquo;I&apos;m still here&rdquo;: no tap within {STILL_HERE_ANSWER_WITHIN_MINUTES} min of the prompt. Not a health check.
+          {`Missed "I'm still here": no tap within ${STILL_HERE_ANSWER_WITHIN_MINUTES} min of the prompt. Not a health check.`}
         </p>
       )}
       <FollowUpPanel visit={visit} now={now} saving={saving} act={act} />
diff --git a/lib/straightQuotes.test.ts b/lib/straightQuotes.test.ts
new file mode 100644
index 0000000..9a2d476
--- /dev/null
+++ b/lib/straightQuotes.test.ts
@@ -0,0 +1,35 @@
+// Checks that code and English screen text use straight quotes only (CLAUDE.md rule):
+// no curly quote marks and no HTML names for them (the "ldquo" family).
+
+import { readdirSync, readFileSync } from "node:fs";
+import { describe, expect, it } from "vitest";
+
+// The folders that hold the app's code and screen text.
+const FOLDERS = ["app", "components", "data", "lib"];
+
+// Chinese uses its own quote marks (for example in the "turn on sound" line), so it keeps them.
+const SKIP = ["lib/text/zh.ts"];
+
+// The four curly quote marks, made from their number codes so this file does not match itself.
+const CURLY_MARKS = String.fromCharCode(0x2018, 0x2019, 0x201c, 0x201d);
+const CURLY = new RegExp(`[${CURLY_MARKS}]|&[lr][sd]quo;`);
+
+/** Every .ts and .tsx file in the folders above, as a path with forward slashes. */
+function codeFiles(): string[] {
+  return FOLDERS.flatMap((folder) =>
+    readdirSync(folder, { recursive: true, encoding: "utf8" })
+      .map((name) => `${folder}/${name.replaceAll("\\", "/")}`)
+      .filter((path) => /\.tsx?$/.test(path) && !SKIP.includes(path)),
+  );
+}
+
+describe("straight quotes", () => {
+  it("no code file has a curly quote", () => {
+    const found = codeFiles().flatMap((path) =>
+      readFileSync(path, "utf8")
+        .split("\n")
+        .flatMap((line, i) => (CURLY.test(line) ? [`${path}:${i + 1}`] : [])),
+    );
+    expect(found).toEqual([]);
+  });
+});
```
