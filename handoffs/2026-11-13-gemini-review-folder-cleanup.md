# Handoff: review the folder-by-folder cleanup (no behaviour change intended)

For: Gemini 3.1 Pro, High, in a new chat. No keys, tokens, passwords or patient data are in this file.

## Context

A Next.js 16 (App Router, TypeScript) and Supabase concept prototype of a virtual emergency department waiting room. The owner asked for the code to be organized so a beginner can read it: screens in app/, shared pieces in components/, saving and loading (Supabase calls, browser storage) in data/, rules in lib/ with tests, one job per file, no file over 300 lines, and reuse before writing anything new. The cleanup was meant to change how the code is arranged without changing what the app does.

What changed (four commits after save point savepoint-2026-11-13):
- AGENTS.md: the same organization rules as CLAUDE.md, so Codex follows them too.
- lib: new `lib/patientCount.ts` ("1 patient", "3 patients") with a test, replacing three hand-written copies in `lib/recallAll.ts`, `components/staff/PauseSwitch.tsx` and `components/staff/RecallAllPanel.tsx`.
- data: new `data/staffSignIn.ts` (`signInStaff`, `signOutStaff`). The staff login form and sign-out button used to call Supabase's sign-in service directly; they now call these.
- app: new `data/startHomeVisit.ts` (server only). The `/api/start-visit` route used to call the database function `start_home_visit` itself; it now only checks the request, calls this function and turns its answer into a status code.

Left alone on purpose: `proxy.ts` (Next.js needs it at the project root, and Supabase's guide says nothing may run between creating its connection and checking the sign-in); `components/useNow.ts` (a shared clock used by several screens); word-picking helpers inside staff components (the deciding rules are already in lib/).

Checked: 148 unit tests, type check, lint and a production build pass. On the built app: start page and login answer 200, /staff while signed out redirects to /login?next=%2Fstaff, and a bad start request gets {"result":"bad_request"} with 400. Not checked: a real sign-in, a real sign-out and a real start from home (those need the owner's staff account or would write a visit to the database).

## Find problems (do not just confirm)

1. Behaviour: compare each "before" and "after" in the diff. Is there any input or failure (wrong password, no connection, a non-staff account, the sign-in service throwing, the database refusing, a missing server setting, a taken code) where the app now answers, shows or logs something different from before?
2. Security: does anything server-only now risk reaching the browser, or does any token or key reach a log or an answer it did not before?
3. Organization: does each new file have one job and sit in the right folder by the rules above? Is anything still in the wrong folder, or still repeated, that this cleanup missed?
4. Readability for a beginner: are the file comments and names clear?

Answer with a numbered list: file, line or area, the problem, how it fails, and a suggested fix. Say "nothing found" for a question with no problem.

## The change (git diff)

```diff
diff --git a/AGENTS.md b/AGENTS.md
index af3b7c8..1231110 100644
--- a/AGENTS.md
+++ b/AGENTS.md
@@ -7,3 +7,18 @@ This version has breaking changes — APIs, conventions, and file structure may
 This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.
 
 <!-- END:nextjs-agent-rules -->
+
+## Rules for this project (same as CLAUDE.md)
+
+Read SPEC.md and CLAUDE.md before any work. SPEC.md's hard rules win over anything else. The owner is new to coding: explain each new file in one plain sentence, and never ask for keys, tokens or passwords in chat.
+
+Keep the app organized so a beginner can read it:
+
+- Screens go in app/ (Next.js App Router: each screen is a folder with a page.tsx). Never create a pages/ folder.
+- Shared pieces (buttons, the footer, the 911 line, layout parts) go in components/.
+- Saving and loading go in data/: Supabase calls, browser storage, and demo data.
+- Rules that decide things go in lib/, as small functions with tests.
+- One job per file.
+- No file over 300 lines. Split it before it gets there.
+- Before writing anything new, check whether it already exists and reuse it.
+- Clean up one folder at a time, without changing what the app does. Check the app still works after each folder, then make a save point (a Git commit with a short plain-English message).
diff --git a/app/api/start-visit/route.ts b/app/api/start-visit/route.ts
index 3dde7d8..68db0ee 100644
--- a/app/api/start-visit/route.ts
+++ b/app/api/start-visit/route.ts
@@ -1,13 +1,11 @@
 // The server route a phone calls to start a visit from home (SPEC rule 5). The phone sends
-// only a site and a language; this route makes the code and token, and the database function
-// start_home_visit sets source = home and status = pre_arrival itself, refuses while off-site
-// waiting is paused, and allows 10 starts per site per minute.
+// only a site and a language; data/startHomeVisit.ts makes the code and token, and the database
+// function start_home_visit sets source = home and status = pre_arrival itself, refuses while
+// off-site waiting is paused, and allows 10 starts per site per minute.
 
-import { supabaseServer } from "@/data/supabaseServer";
-import { makeAccessToken, makeDisplayCode } from "@/lib/codes";
+import { startHomeVisit } from "@/data/startHomeVisit";
 import { parseStartVisitRequest } from "@/lib/startVisitRequest";
 
-const TRIES = 3; // a new code and token each time the database says "taken"
 const MAX_BODY_CHARACTERS = 200;
 
 function answer(body: { result: string; token?: string }, status: number): Response {
@@ -27,33 +25,9 @@ export async function POST(request: Request): Promise<Response> {
   const wanted = parseStartVisitRequest(body);
   if (!wanted) return answer({ result: "bad_request" }, 400);
 
-  try {
-    const supabase = supabaseServer();
-    for (let attempt = 0; attempt < TRIES; attempt++) {
-      const token = makeAccessToken();
-      const { data, error } = await supabase.rpc("start_home_visit", {
-        p_site: wanted.site,
-        p_language: wanted.language,
-        p_code: makeDisplayCode(),
-        p_token: token,
-      });
-      if (error) {
-        // Written to the server log only (Vercel's runtime logs). Holds no token or key.
-        console.error("start-visit: database refused", { code: error.code, message: error.message });
-        break;
-      }
-      if (data === "saved") return answer({ result: "saved", token }, 200);
-      if (data === "paused") return answer({ result: "paused" }, 409);
-      if (data === "busy") return answer({ result: "busy" }, 429);
-      if (data !== "taken") {
-        console.error("start-visit: unexpected answer from start_home_visit", { answer: String(data).slice(0, 40) });
-        break;
-      }
-    }
-  } catch (problem) {
-    // A missing setting or an unreachable database: the phone gets the same plain answer,
-    // and the reason goes to the server log only.
-    console.error("start-visit: could not reach the database", problem instanceof Error ? problem.message : "unknown");
-  }
+  const started = await startHomeVisit(wanted.site, wanted.language);
+  if (started.result === "saved") return answer({ result: "saved", token: started.token }, 200);
+  if (started.result === "paused") return answer({ result: "paused" }, 409);
+  if (started.result === "busy") return answer({ result: "busy" }, 429);
   return answer({ result: "error" }, 500);
 }
diff --git a/components/staff/LoginForm.tsx b/components/staff/LoginForm.tsx
index dbcf807..ac9c90f 100644
--- a/components/staff/LoginForm.tsx
+++ b/components/staff/LoginForm.tsx
@@ -1,12 +1,12 @@
 "use client";
 
-// The email and password form on the staff login screen. After signing in it checks the
-// account is marked staff; an account that is not is signed straight out again.
+// The email and password form on the staff login screen. The sign-in itself, and the check
+// that the account is marked staff, are in data/staffSignIn.ts.
 
 import { useRouter, useSearchParams } from "next/navigation";
 import { useState, type FormEvent } from "react";
-import { supabaseBrowser } from "@/data/supabaseBrowser";
-import { isStaffAccount, pageAfterSignIn, type StaffClaims } from "@/lib/staffAccess";
+import { signInStaff } from "@/data/staffSignIn";
+import { pageAfterSignIn } from "@/lib/staffAccess";
 import { Button } from "@/components/Button";
 
 const WRONG = "Email or password not recognised. Check them and try again.";
@@ -29,27 +29,15 @@ export function LoginForm() {
     event.preventDefault();
     setBusy(true);
     setProblem("");
-    const supabase = supabaseBrowser();
-    try {
-      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
-      if (error) {
-        setProblem(error.status && error.status < 500 ? WRONG : NO_CONNECTION);
-        return;
-      }
-      const { data } = await supabase.auth.getClaims();
-      if (!isStaffAccount((data?.claims ?? null) as StaffClaims)) {
-        await supabase.auth.signOut();
-        setProblem(NOT_STAFF);
-        return;
-      }
+    const result = await signInStaff(email, password);
+    if (result === "signed_in") {
       setPassword("");
       router.replace(pageAfterSignIn(next));
       router.refresh();
-    } catch {
-      setProblem(NO_CONNECTION);
-    } finally {
-      setBusy(false);
+    } else {
+      setProblem(result === "wrong" ? WRONG : result === "not_staff" ? NOT_STAFF : NO_CONNECTION);
     }
+    setBusy(false);
   }
 
   return (
diff --git a/components/staff/PauseSwitch.tsx b/components/staff/PauseSwitch.tsx
index d12285e..7404de1 100644
--- a/components/staff/PauseSwitch.tsx
+++ b/components/staff/PauseSwitch.tsx
@@ -7,6 +7,7 @@
 
 import { useEffect, useRef, useState } from "react";
 import { setSitePaused } from "@/data/sitePauses";
+import { patientCount } from "@/lib/patientCount";
 import type { ChangeResult, Site } from "@/lib/visit";
 import { Button } from "@/components/Button";
 
@@ -22,8 +23,6 @@ type Props = {
 
 type Mode = "idle" | "confirmPause" | "confirmResume";
 
-const people = (n: number) => `${n} ${n === 1 ? "patient" : "patients"}`;
-
 export function PauseSwitch({ site, paused, offSiteCount, onResult }: Props) {
   const [mode, setMode] = useState<Mode>("idle");
   const [checked, setChecked] = useState(false);
@@ -85,7 +84,7 @@ export function PauseSwitch({ site, paused, offSiteCount, onResult }: Props) {
           <p>
             No new off-site sign-ups: the start page sends patients to the emergency department, and check-in offers
             on-site waiting only. Check every outstanding recall, and offer on-site waiting to the{" "}
-            {people(offSiteCount)} still off-site.
+            {patientCount(offSiteCount)} still off-site.
           </p>
           {mode === "idle" && (
             <Button variant="secondary" onClick={() => setMode("confirmResume")}>
@@ -107,7 +106,7 @@ export function PauseSwitch({ site, paused, offSiteCount, onResult }: Props) {
             Pause off-site waiting at Demo Site {site}?
           </h4>
           <p>
-            Use this for downtime or a contact problem. New patients will wait on-site. The {people(offSiteCount)}{" "}
+            Use this for downtime or a contact problem. New patients will wait on-site. The {patientCount(offSiteCount)}{" "}
             already off-site keep their visits, and you will be asked to check each one.
           </p>
           <div className="flex flex-wrap gap-2">
diff --git a/components/staff/RecallAllPanel.tsx b/components/staff/RecallAllPanel.tsx
index e704562..250cbf3 100644
--- a/components/staff/RecallAllPanel.tsx
+++ b/components/staff/RecallAllPanel.tsx
@@ -6,6 +6,7 @@
 
 import { useEffect, useRef, useState } from "react";
 import { recallAll } from "@/data/staffActions";
+import { patientCount } from "@/lib/patientCount";
 import { recallAllMessage, recallAllTargets } from "@/lib/recallAll";
 import type { Site, Visit } from "@/lib/visit";
 import { Button } from "@/components/Button";
@@ -62,7 +63,7 @@ export function RecallAllPanel({ visits, site, onResult }: Props) {
   return (
     <div className="space-y-3 rounded-xl border-4 border-red-800 bg-white p-4" data-testid="recall-all-confirm">
       <h3 ref={question} tabIndex={-1} className="text-lg font-bold text-red-900">
-        Recall all {n} {n === 1 ? "patient" : "patients"} waiting off-site at Demo Site {site}?
+        Recall all {patientCount(n)} waiting off-site at Demo Site {site}?
       </h3>
       <p>
         Each patient&apos;s phone will show &ldquo;Please head back now&rdquo;. Use this for a surge or a system problem.
diff --git a/components/staff/SignOutButton.tsx b/components/staff/SignOutButton.tsx
index aa56f79..86ed606 100644
--- a/components/staff/SignOutButton.tsx
+++ b/components/staff/SignOutButton.tsx
@@ -4,7 +4,7 @@
 
 import { useRouter } from "next/navigation";
 import { useState } from "react";
-import { supabaseBrowser } from "@/data/supabaseBrowser";
+import { signOutStaff } from "@/data/staffSignIn";
 import { Button } from "@/components/Button";
 
 export function SignOutButton() {
@@ -13,8 +13,7 @@ export function SignOutButton() {
 
   async function signOut() {
     setProblem("");
-    const { error } = await supabaseBrowser().auth.signOut();
-    if (error) {
+    if (!(await signOutStaff())) {
       setProblem("Could not sign out. Check your connection and try again.");
       return;
     }
diff --git a/data/staffSignIn.ts b/data/staffSignIn.ts
new file mode 100644
index 0000000..1b1bd21
--- /dev/null
+++ b/data/staffSignIn.ts
@@ -0,0 +1,30 @@
+// Staff sign-in and sign-out on this device, through Supabase's sign-in service. After signing
+// in it checks the account is marked staff; an account that is not is signed straight out again.
+
+import { isStaffAccount, type StaffClaims } from "@/lib/staffAccess";
+import { supabaseBrowser } from "./supabaseBrowser";
+
+/** How a sign-in went: signed in, wrong email or password, not a staff account, or no connection. */
+export type SignInResult = "signed_in" | "wrong" | "not_staff" | "no_connection";
+
+export async function signInStaff(email: string, password: string): Promise<SignInResult> {
+  const supabase = supabaseBrowser();
+  try {
+    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
+    if (error) return error.status && error.status < 500 ? "wrong" : "no_connection";
+    const { data } = await supabase.auth.getClaims();
+    if (!isStaffAccount((data?.claims ?? null) as StaffClaims)) {
+      await supabase.auth.signOut();
+      return "not_staff";
+    }
+    return "signed_in";
+  } catch {
+    return "no_connection";
+  }
+}
+
+/** Ends the staff sign-in on this device. False if it could not be done. */
+export async function signOutStaff(): Promise<boolean> {
+  const { error } = await supabaseBrowser().auth.signOut();
+  return !error;
+}
diff --git a/data/startHomeVisit.ts b/data/startHomeVisit.ts
new file mode 100644
index 0000000..1efc82e
--- /dev/null
+++ b/data/startHomeVisit.ts
@@ -0,0 +1,47 @@
+// Server only: asks the database to start a visit from home (start_home_visit), for the
+// /api/start-visit route. It makes the code and token here and tries again with new ones if
+// the database says they are taken. Problems go to the server log only, never to the phone.
+
+import "server-only";
+import { makeAccessToken, makeDisplayCode } from "@/lib/codes";
+import type { Site } from "@/lib/visit";
+import { supabaseServer } from "./supabaseServer";
+
+const TRIES = 3; // a new code and token each time the database says "taken"
+
+/** What the database answered; the token comes back only when the visit was saved. */
+export type StartHomeVisitResult =
+  | { result: "saved"; token: string }
+  | { result: "paused" | "busy" | "error" };
+
+export async function startHomeVisit(site: Site, language: string): Promise<StartHomeVisitResult> {
+  try {
+    const supabase = supabaseServer();
+    for (let attempt = 0; attempt < TRIES; attempt++) {
+      const token = makeAccessToken();
+      const { data, error } = await supabase.rpc("start_home_visit", {
+        p_site: site,
+        p_language: language,
+        p_code: makeDisplayCode(),
+        p_token: token,
+      });
+      if (error) {
+        // Written to the server log only (Vercel's runtime logs). Holds no token or key.
+        console.error("start-visit: database refused", { code: error.code, message: error.message });
+        break;
+      }
+      if (data === "saved") return { result: "saved", token };
+      if (data === "paused") return { result: "paused" };
+      if (data === "busy") return { result: "busy" };
+      if (data !== "taken") {
+        console.error("start-visit: unexpected answer from start_home_visit", { answer: String(data).slice(0, 40) });
+        break;
+      }
+    }
+  } catch (problem) {
+    // A missing setting or an unreachable database: the phone gets the same plain answer,
+    // and the reason goes to the server log only.
+    console.error("start-visit: could not reach the database", problem instanceof Error ? problem.message : "unknown");
+  }
+  return { result: "error" };
+}
diff --git a/data/supabaseServer.ts b/data/supabaseServer.ts
index 88871d7..a74f5da 100644
--- a/data/supabaseServer.ts
+++ b/data/supabaseServer.ts
@@ -1,6 +1,6 @@
 // The Supabase connection that uses the secret key. It runs only on the server (the first
 // line makes the build fail if a browser file ever imports it). Only the start-a-visit route
-// and the site-status route (data/siteStatusRead.ts) use it. The secret key is read from .env.local (or Vercel's settings), never from code.
+// (data/startHomeVisit.ts) and the site-status route (data/siteStatusRead.ts) use it. The secret key is read from .env.local (or Vercel's settings), never from code.
 
 import "server-only";
 import { createClient, type SupabaseClient } from "@supabase/supabase-js";
diff --git a/lib/patientCount.test.ts b/lib/patientCount.test.ts
new file mode 100644
index 0000000..ad7af99
--- /dev/null
+++ b/lib/patientCount.test.ts
@@ -0,0 +1,10 @@
+import { describe, expect, it } from "vitest";
+import { patientCount } from "./patientCount";
+
+describe("patientCount", () => {
+  it("says patient for one and patients otherwise", () => {
+    expect(patientCount(1)).toBe("1 patient");
+    expect(patientCount(0)).toBe("0 patients");
+    expect(patientCount(3)).toBe("3 patients");
+  });
+});
diff --git a/lib/patientCount.ts b/lib/patientCount.ts
new file mode 100644
index 0000000..7451e74
--- /dev/null
+++ b/lib/patientCount.ts
@@ -0,0 +1,6 @@
+// Staff wording: a number of patients in plain words ("1 patient", "3 patients").
+
+/** "1 patient", "2 patients", "0 patients". */
+export function patientCount(n: number): string {
+  return `${n} ${n === 1 ? "patient" : "patients"}`;
+}
diff --git a/lib/recallAll.ts b/lib/recallAll.ts
index c8201c0..56cb09c 100644
--- a/lib/recallAll.ts
+++ b/lib/recallAll.ts
@@ -2,6 +2,7 @@
 // 2026-11-11): for a surge or a system problem, staff recall at once every patient still
 // waiting off-site at one site. Only those shown in the confirmation are recalled.
 
+import { patientCount } from "./patientCount";
 import { activeLine } from "./queue";
 import type { Site, Visit } from "./visit";
 
@@ -18,8 +19,7 @@ export function recallAllMessage(result: RecallAllResult, site: Site): string {
   if (result.notSaved) {
     return "Not saved: the database could not be reached. No one was recalled. Try again.";
   }
-  const people = (n: number) => `${n} ${n === 1 ? "patient" : "patients"}`;
-  const recalled = `Recalled ${people(result.recalled)} at Demo Site ${site}.`;
+  const recalled = `Recalled ${patientCount(result.recalled)} at Demo Site ${site}.`;
   if (result.changed === 0) return recalled;
-  return `${recalled} ${people(result.changed)} had already changed on another screen; check the list.`;
+  return `${recalled} ${patientCount(result.changed)} had already changed on another screen; check the list.`;
 }
```
