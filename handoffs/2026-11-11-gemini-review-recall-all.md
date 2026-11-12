# Handoff: review "Recall all off-site patients" (Phase 3)

For: Gemini 3.1 Pro, High, in a new chat. No keys, tokens, passwords or patient data are in this file.

## Context

A Next.js (App Router, TypeScript) and Supabase (PostgreSQL) concept prototype of a virtual emergency department waiting room. Patients follow their visit on their own phone with no login; staff sign in. Staff screens normally save one visit at a time, sending only the changed fields and only if the visit's version number still matches. A database trigger replaces every newly filled time with the database's `now()` and raises the version. Row-level security lets only signed-in staff read or change visits.

SPEC rule: a "Call everyone back" button for a surge or a system problem, with a confirmation step. The owner renamed it "Recall all off-site patients" to match the per-patient button "Recall patient" (was "Call back").

What was built:
- Rule `lib/recallAll.ts`: `recallAllTargets` (patients with status waiting at one site, in line order; recalled, closed, other-site and untriaged visits are left out) and `recallAllMessage` (what staff are told). Tests in `lib/recallAll.test.ts`.
- Save `recallAll(ids)` in `data/staffActions.ts`: one database update that sets status called and called_at for exactly the ids shown in the confirmation, and only those still waiting (`.in("id", ids).eq("status", "waiting")`). It does not check version numbers; it reports how many were recalled and how many had changed elsewhere.
- `components/staff/RecallAllPanel.tsx`: red button with the count; a confirmation naming the site, the number and the visit codes, with focus moved to the question; Cancel returns focus to the button. Shown only when someone is waiting off-site at the site.
- `components/Button.tsx` now accepts a ref (props type widened to the standard button props).
- Also in this diff: the owner's new wording for the answered-call flag, and a fix for duplicate React keys on the staff page.

Checked: 144 unit tests, type check, lint. Tested in the browser by the owner on localhost with two waiting patients: count, confirmation, Cancel, recall, message, button hidden afterwards and at a site with nobody waiting.

## Find problems (do not just confirm)

1. Correctness: can the recall reach a patient who was not in the confirmation, miss one who was, or change a visit another screen changed in the meantime in a harmful way? Is skipping the version check here safe, given the `status = waiting` condition?
2. Is a single bulk update acceptable under the existing row-level security and triggers (version, times, change signal)? Any surprise from updating several rows in one statement?
3. Safety and wording: could a nurse press it by mistake or misread the confirmation? Is "There is no undo: recalled patients stay recalled." accurate and clear?
4. Accessibility: focus handling, the result message (announced through an existing role="status" line), keyboard use.
5. Anything in the diff that breaks existing behaviour.

Answer with a numbered list: file, line or area, the problem, how it fails, and a suggested fix. Say "nothing found" for a question with no problem.

## The change (git diff)

```diff
diff --git a/app/staff/page.tsx b/app/staff/page.tsx
index 5046900..4fdd498 100644
--- a/app/staff/page.tsx
+++ b/app/staff/page.tsx
@@ -12,6 +12,7 @@ import type { Site, Visit } from "@/lib/visit";
 import { CheckInPanel } from "@/components/staff/CheckInPanel";
 import { ExpectedArrivals } from "@/components/staff/ExpectedArrivals";
 import { ProgressAnnouncer } from "@/components/staff/ProgressAnnouncer";
+import { RecallAllPanel } from "@/components/staff/RecallAllPanel";
 import { RecentlyClosed } from "@/components/staff/RecentlyClosed";
 import { SignOutButton } from "@/components/staff/SignOutButton";
 import { VisitRow } from "@/components/staff/VisitRow";
@@ -119,6 +120,7 @@ export default function StaffPage() {
           <p role="status" className="min-h-6 font-semibold">
             {announcement}
           </p>
+          {visits && <RecallAllPanel key={`recall-${site}`} visits={visits} site={site} onResult={setAnnouncement} />}
           {visits === null || now === null ? (
             <p>{outOfDate ? "No list to show yet." : "Loading…"}</p>
           ) : line.length === 0 ? (
@@ -136,7 +138,7 @@ export default function StaffPage() {
               ))}
             </ol>
           )}
-          {visits && <RecentlyClosed key={site} visits={visits} site={site} onUndoResult={onUndoResult} onReopened={chooseHomeVisit} />}
+          {visits && <RecentlyClosed key={`closed-${site}`} visits={visits} site={site} onUndoResult={onUndoResult} onReopened={chooseHomeVisit} />}
           {visits && <ProgressAnnouncer visits={visits} site={site} />}
         </section>
       </div>
diff --git a/components/Button.tsx b/components/Button.tsx
index b16e4f4..1991908 100644
--- a/components/Button.tsx
+++ b/components/Button.tsx
@@ -1,6 +1,6 @@
 // One button style for the whole app: large touch target, visible keyboard focus.
 
-import type { ButtonHTMLAttributes } from "react";
+import type { ComponentPropsWithRef } from "react";
 
 type Variant = "primary" | "secondary" | "danger";
 
@@ -15,7 +15,7 @@ export function Button({
   className = "",
   type = "button",
   ...props
-}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
+}: ComponentPropsWithRef<"button"> & { variant?: Variant }) {
   return (
     <button
       type={type}
diff --git a/components/staff/FollowUpPanel.tsx b/components/staff/FollowUpPanel.tsx
index 5094c4a..c150c94 100644
--- a/components/staff/FollowUpPanel.tsx
+++ b/components/staff/FollowUpPanel.tsx
@@ -43,7 +43,7 @@ function flagFor(followUp: StaffFollowUp, visit: Visit, now: Date): { text: stri
       };
     case "contacted_not_arrived":
       return {
-        text: "Answered the phone, not here yet: they haven’t tapped ‘I’m on my way’ or arrived.",
+        text: "Answered the phone, but hasn’t arrived or tapped ‘I’m on my way’ yet.",
         tone: AMBER,
       };
     case "on_way_not_arrived": {
diff --git a/components/staff/RecallAllPanel.tsx b/components/staff/RecallAllPanel.tsx
new file mode 100644
index 0000000..617a0f0
--- /dev/null
+++ b/components/staff/RecallAllPanel.tsx
@@ -0,0 +1,78 @@
+"use client";
+
+// The "Recall all off-site patients" button for a surge or a system problem, with a
+// confirmation that names the site and how many patients it reaches. Only the patients
+// counted in that confirmation are recalled (lib/recallAll.ts).
+
+import { useEffect, useRef, useState } from "react";
+import { recallAll } from "@/data/staffActions";
+import { recallAllMessage, recallAllTargets } from "@/lib/recallAll";
+import type { Site, Visit } from "@/lib/visit";
+import { Button } from "@/components/Button";
+
+type Props = {
+  visits: Visit[];
+  site: Site;
+  /** Called with words for staff and screen readers after a recall, or after a failed one. */
+  onResult: (message: string) => void;
+};
+
+export function RecallAllPanel({ visits, site, onResult }: Props) {
+  /** The visits shown in the open confirmation, or null when it is closed. */
+  const [asked, setAsked] = useState<Visit[] | null>(null);
+  const [saving, setSaving] = useState(false);
+  const question = useRef<HTMLHeadingElement>(null);
+  const openButton = useRef<HTMLButtonElement>(null);
+  const targets = recallAllTargets(visits, site);
+
+  // Move focus to the question when it opens, so keyboard and screen-reader users land on it.
+  useEffect(() => {
+    if (asked) question.current?.focus();
+  }, [asked]);
+
+  const cancel = () => {
+    setAsked(null);
+    // Focus goes back to the button once it is shown again.
+    window.setTimeout(() => openButton.current?.focus(), 0);
+  };
+
+  const confirm = async () => {
+    if (!asked || saving) return;
+    setSaving(true);
+    const result = await recallAll(asked.map((v) => v.id));
+    setSaving(false);
+    onResult(recallAllMessage(result, site));
+    if (!result.notSaved) setAsked(null);
+  };
+
+  if (!asked) {
+    if (targets.length === 0) return null;
+    return (
+      <Button ref={openButton} variant="danger" onClick={() => setAsked(targets)}>
+        Recall all off-site patients ({targets.length})
+      </Button>
+    );
+  }
+
+  const n = asked.length;
+  return (
+    <div className="space-y-3 rounded-xl border-4 border-red-800 bg-white p-4" data-testid="recall-all-confirm">
+      <h3 ref={question} tabIndex={-1} className="text-lg font-bold text-red-900">
+        Recall all {n} {n === 1 ? "patient" : "patients"} waiting off-site at Demo Site {site}?
+      </h3>
+      <p>
+        Each patient&apos;s phone will show &ldquo;Please head back now&rdquo;. Use this for a surge or a system problem.
+        There is no undo: recalled patients stay recalled.
+      </p>
+      <p className="font-mono tracking-widest">{asked.map((v) => v.code).join(" · ")}</p>
+      <div className="flex flex-wrap gap-2">
+        <Button variant="danger" aria-disabled={saving} onClick={confirm}>
+          {saving ? "Saving…" : `Yes, recall all ${n}`}
+        </Button>
+        <Button variant="secondary" aria-disabled={saving} onClick={cancel}>
+          Cancel
+        </Button>
+      </div>
+    </div>
+  );
+}
diff --git a/data/staffActions.ts b/data/staffActions.ts
index c0489bd..3b1fd96 100644
--- a/data/staffActions.ts
+++ b/data/staffActions.ts
@@ -6,6 +6,7 @@
 
 import { changedFields } from "@/lib/changedFields";
 import { makeAccessToken, makeUniqueDisplayCode, normalizeDisplayCode } from "@/lib/codes";
+import type { RecallAllResult } from "@/lib/recallAll";
 import type { ChangeResult, Site, Visit } from "@/lib/visit";
 import {
   callBack,
@@ -112,6 +113,29 @@ export const callBackVisit = (id: string) => changeVisit(id, (v) => callBack(v,
 export const markVisitArrived = (id: string) => changeVisit(id, (v) => markArrived(v, serverNow()));
 export const removeVisit = (id: string, reason: "left" | "no_show") =>
   changeVisit(id, (v) => markRemoved(v, reason, serverNow()));
+/**
+ * "Recall all off-site patients": recall, in one database update, exactly the visits staff saw
+ * in the confirmation, and only those still waiting (one recalled or closed on another screen
+ * meanwhile is left alone and counted as changed). The database sets called_at itself.
+ */
+export async function recallAll(ids: string[]): Promise<RecallAllResult> {
+  if (ids.length === 0) return { recalled: 0, changed: 0, notSaved: false };
+  try {
+    const { data, error } = await supabaseBrowser()
+      .from("visits")
+      .update({ status: "called", called_at: serverNow().toISOString() })
+      .in("id", ids)
+      .eq("status", "waiting")
+      .select();
+    if (error || !Array.isArray(data)) return { recalled: 0, changed: 0, notSaved: true };
+    (data as StoredVisit[]).forEach(putVisit);
+    if (data.length < ids.length) void loadVisits();
+    return { recalled: data.length, changed: ids.length - data.length, notSaved: false };
+  } catch {
+    return { recalled: 0, changed: 0, notSaved: true };
+  }
+}
+
 /** Record one simulated phone call ("Phoned, answered" or "Phoned, no answer"). */
 export const recordPhoneCallFor = (id: string, result: "answered" | "no_answer") =>
   changeVisit(id, (v) => recordPhoneCall(v, result, serverNow()));
diff --git a/lib/recallAll.test.ts b/lib/recallAll.test.ts
new file mode 100644
index 0000000..94bd9c4
--- /dev/null
+++ b/lib/recallAll.test.ts
@@ -0,0 +1,37 @@
+// Checks who "Recall all off-site patients" reaches, and what staff are told afterwards.
+
+import { describe, expect, it } from "vitest";
+import { recallAllMessage, recallAllTargets } from "./recallAll";
+import { callBack, checkInAtDesk, startFromHome } from "./visitActions";
+
+const t0 = new Date("2026-11-11T20:00:00Z");
+const at = (min: number) => new Date(t0.getTime() + min * 60_000);
+const desk = (id: string, min: number, site: "A" | "B" = "A") =>
+  checkInAtDesk({ id, code: id, access_token: id, site, ctas_level: 4, language: "en" }, "waiting", at(min));
+
+describe("recallAllTargets", () => {
+  it("includes only patients still waiting off-site at the site, in line order", () => {
+    const visits = [
+      desk("late", 5),
+      desk("early", 1),
+      callBack(desk("called", 2), at(10))!,
+      desk("otherSite", 3, "B"),
+      checkInAtDesk({ id: "d", code: "d", access_token: "d", site: "A", ctas_level: 5, language: "en" }, "declined", at(4)),
+      startFromHome({ id: "h", code: "h", access_token: "h", site: "A", language: "en" }, at(0)),
+    ];
+    expect(recallAllTargets(visits, "A").map((v) => v.id)).toEqual(["early", "late"]);
+  });
+});
+
+describe("recallAllMessage", () => {
+  it("says how many were recalled, and how many had changed elsewhere", () => {
+    expect(recallAllMessage({ recalled: 1, changed: 0, notSaved: false }, "A")).toBe("Recalled 1 patient at Demo Site A.");
+    expect(recallAllMessage({ recalled: 3, changed: 1, notSaved: false }, "B")).toBe(
+      "Recalled 3 patients at Demo Site B. 1 patient had already changed on another screen; check the list.",
+    );
+  });
+
+  it("says plainly when nothing was saved", () => {
+    expect(recallAllMessage({ recalled: 0, changed: 0, notSaved: true }, "A")).toContain("No one was recalled");
+  });
+});
diff --git a/lib/recallAll.ts b/lib/recallAll.ts
new file mode 100644
index 0000000..c8201c0
--- /dev/null
+++ b/lib/recallAll.ts
@@ -0,0 +1,25 @@
+// "Recall all off-site patients" (SPEC "Call everyone back", renamed by the owner on
+// 2026-11-11): for a surge or a system problem, staff recall at once every patient still
+// waiting off-site at one site. Only those shown in the confirmation are recalled.
+
+import { activeLine } from "./queue";
+import type { Site, Visit } from "./visit";
+
+/** Patients still waiting off-site (not yet recalled) at one site, in line order. */
+export function recallAllTargets(visits: Visit[], site: Site): Visit[] {
+  return activeLine(visits, site).filter((v) => v.status === "waiting");
+}
+
+/** How a "Recall all" went: recalled, already changed elsewhere, or not saved. */
+export type RecallAllResult = { recalled: number; changed: number; notSaved: boolean };
+
+/** Plain words for staff (and screen readers) after "Recall all". */
+export function recallAllMessage(result: RecallAllResult, site: Site): string {
+  if (result.notSaved) {
+    return "Not saved: the database could not be reached. No one was recalled. Try again.";
+  }
+  const people = (n: number) => `${n} ${n === 1 ? "patient" : "patients"}`;
+  const recalled = `Recalled ${people(result.recalled)} at Demo Site ${site}.`;
+  if (result.changed === 0) return recalled;
+  return `${recalled} ${people(result.changed)} had already changed on another screen; check the list.`;
+}
```
