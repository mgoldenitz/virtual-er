# Handoff: review the move of all patient text into one file (Phase 3)

For: Gemini 3.1 Pro, High (or Gemini 3.6 Flash, High). No keys, tokens, passwords or patient data are in this file.

## Context

A Next.js (App Router, TypeScript) concept prototype of a virtual emergency department waiting room. Patients follow their visit on their own phone; staff use a separate screen. SPEC requires: all patient text comes from one translation file so a fluent speaker can check it; every patient screen in every state and language shows "If your symptoms get worse, call 911 or come back to the emergency department now."

This change moved every patient-facing sentence into `lib/text/en.ts`, added `textFor(language)` in `lib/text/index.ts` (falls back to English for a language without its own text), applied the owner-approved wording, and made the screens read from it. "Unable to reach" and "removed" now show separate messages. Text for features not built yet is already in the file so it can be translated in one batch. 85 unit tests, the type check and lint pass.

## Questions

1. Is any patient-facing sentence still written directly in a screen instead of coming from `lib/text/en.ts`?
2. Can any screen show a patient no 911 line, or English when the visit has another language (once other languages exist)? The footer and the start page are English on purpose until the language switch is built.
3. Is the shape of `en.ts` (nested objects, a few functions like `waitRange`) a good base for two more languages, or would a different shape make translation or checking safer?
4. Any bug or change in behaviour introduced by the diff (for example in `StatusAnnouncer`, the patient page's "not saved" message, or the start page's problem messages)?

Answer with a numbered list: file, line or area, the problem, and a suggested fix. Say "nothing found" for a question with no problem.

## The change (git diff)

```diff
diff --git a/app/page.tsx b/app/page.tsx
index 7164714..9caa482 100644
--- a/app/page.tsx
+++ b/app/page.tsx
@@ -6,33 +6,34 @@ import { EmergencyLine } from "@/components/EmergencyLine";
 import { PatientShell } from "@/components/PatientShell";
 import { CareOptions } from "@/components/start/CareOptions";
 import { StartVisit } from "@/components/start/StartVisit";
+import { textFor } from "@/lib/text";
 
 const linkStyle =
   "inline-block min-h-11 rounded-lg border-2 border-slate-700 px-4 py-2 font-semibold focus-visible:outline-4 focus-visible:outline-slate-950";
 
 export default function StartPage() {
+  const t = textFor("en");
   return (
     <PatientShell>
     <main className="mx-auto w-full max-w-xl space-y-6 px-4 py-6">
-      <h1 className="text-2xl font-bold">Virtual Waiting Room</h1>
+      <h1 className="text-2xl font-bold">{t.appName}</h1>
       <p className="rounded-lg border-2 border-red-700 bg-red-50 p-3 text-lg font-bold text-red-900">
-        Chest pain, trouble breathing, signs of stroke, heavy bleeding or another emergency? Call
-        911 now.
+        {t.start.emergencyCheck}
       </p>
       <div className="clean-card">
         <CareOptions />
       </div>
       <StartVisit />
       <EmergencyLine />
-      <nav aria-label="Demo screens" className="flex flex-wrap gap-3 border-t border-slate-300 pt-4">
+      <nav aria-label={t.start.demoScreens} className="flex flex-wrap gap-3 border-t border-slate-300 pt-4">
         <Link href="/staff" className={linkStyle}>
-          Staff screen
+          {t.start.staffScreen}
         </Link>
         <Link href="/patient" className={linkStyle}>
-          Patient screen
+          {t.start.patientScreen}
         </Link>
         <Link href="/dashboard" className={linkStyle}>
-          Dashboard
+          {t.start.dashboard}
         </Link>
       </nav>
     </main>
diff --git a/app/patient/page.tsx b/app/patient/page.tsx
index bbe8ed9..85fa7fb 100644
--- a/app/patient/page.tsx
+++ b/app/patient/page.tsx
@@ -10,10 +10,11 @@ import { EmergencyLine } from "@/components/EmergencyLine";
 import { PatientShell } from "@/components/PatientShell";
 import { PatientStatus } from "@/components/patient/PatientStatus";
 import { StatusAnnouncer } from "@/components/patient/StatusAnnouncer";
+import { textFor } from "@/lib/text";
 
 export default function PatientPage() {
   const [token, setToken] = useState<string | null | undefined>(undefined);
-  const [problem, setProblem] = useState("");
+  const [notSaved, setNotSaved] = useState(false);
   const [brokenLink, setBrokenLink] = useState(false);
   const [sending, setSending] = useState(false);
 
@@ -24,7 +25,7 @@ export default function PatientPage() {
       const link = takeTokenFromLink();
       setToken(link.token);
       setBrokenLink(link.brokenLink);
-      setProblem("");
+      setNotSaved(false);
     };
     readLink();
     window.addEventListener("hashchange", readLink);
@@ -35,6 +36,8 @@ export default function PatientPage() {
   const loading = token === undefined || result === undefined;
   const unavailable = result === "unavailable";
   const view = result === "unavailable" ? null : result;
+  const t = textFor(view?.language);
+  const p = t.patient;
 
   // The first time the called screen is actually on screen, record seen_at
   // (shown, not necessarily read). A tab in the background waits until it is brought forward.
@@ -66,57 +69,47 @@ export default function PatientPage() {
     if (view && !view.seen) await recordSeen(token);
     const result = await confirmOnMyWayByToken(token);
     setSending(false);
-    setProblem(
-      result === "not_saved"
-        ? "Your answer was not saved, so staff have not been told. Please try again, or come back to the desk."
-        : "",
-    );
+    setNotSaved(result === "not_saved");
   }
 
   return (
     <PatientShell>
     <main className="mx-auto w-full max-w-xl space-y-5 px-4 py-6">
-      <h1 className="text-xl font-bold">Virtual Waiting Room</h1>
-      <EmergencyLine />
+      <h1 className="text-xl font-bold">{t.appName}</h1>
+      <EmergencyLine language={view?.language} />
 
       {loading ? (
-        <p>Loading your visit…</p>
+        <p>{p.loading}</p>
       ) : unavailable ? (
         <section aria-labelledby="unavailable-heading" className="clean-card space-y-2">
           <h2 id="unavailable-heading" className="text-2xl font-bold">
-            We cannot load your visit right now
+            {p.unavailableHeading}
           </h2>
-          <p className="text-lg">
-            Nothing you do on this page can be saved at the moment, so staff may not see it. Please
-            contact the emergency department desk.
-          </p>
+          <p className="text-lg">{p.unavailableText}</p>
         </section>
       ) : !view ? (
         <section aria-labelledby="none-heading" className="clean-card space-y-2">
           <h2 id="none-heading" className="text-2xl font-bold">
-            {brokenLink ? "This link did not work" : "No visit found on this phone"}
+            {brokenLink ? p.brokenLinkHeading : p.noVisitHeading}
           </h2>
           {brokenLink && (
-            <p className="text-lg">The link may have been cut short or mistyped, so no visit was opened.</p>
+            <p className="text-lg">{p.brokenLinkText}</p>
           )}
-          <p className="text-lg">
-            Scan the QR code on your desk slip with your phone&apos;s camera, or type the link
-            printed under it. If that doesn&apos;t work, ask the desk to show the QR code again.
-          </p>
+          <p className="text-lg">{p.findVisitHelp}</p>
         </section>
       ) : (
         <>
           <p className="text-base">
-            Visit code: <strong className="font-mono tracking-widest">{view.code}</strong> · Demo
-            Site {view.site}
+            {t.visitCode}: <strong className="font-mono tracking-widest">{view.code}</strong> ·{" "}
+            {t.siteName(view.site)}
           </p>
           <PatientStatus view={view} onOnMyWay={onOnMyWay} sending={sending} />
-          {problem && (
+          {notSaved && (
             <p role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
-              {problem}
+              {p.notSaved}
             </p>
           )}
-          <StatusAnnouncer key={token} status={view.status} />
+          <StatusAnnouncer key={token} status={view.status} language={view.language} />
         </>
       )}
     </main>
diff --git a/components/EmergencyLine.tsx b/components/EmergencyLine.tsx
index d077fd8..9ef38ee 100644
--- a/components/EmergencyLine.tsx
+++ b/components/EmergencyLine.tsx
@@ -1,9 +1,11 @@
-// The 911 safety line from SPEC rule 3, shown on every patient screen in every state.
+// The 911 safety line from SPEC rule 3, shown on every patient screen in every state and language.
 
-export function EmergencyLine() {
+import { textFor } from "@/lib/text";
+
+export function EmergencyLine({ language }: { language?: string }) {
   return (
     <p className="rounded-lg border-2 border-red-700 bg-red-50 p-3 text-base font-semibold text-red-900">
-      If your symptoms get worse, call 911 or come back to the emergency department now.
+      {textFor(language).emergencyLine}
     </p>
   );
 }
diff --git a/components/Footer.tsx b/components/Footer.tsx
index 3e8e10f..629cee1 100644
--- a/components/Footer.tsx
+++ b/components/Footer.tsx
@@ -1,9 +1,12 @@
 // The disclaimer footer that SPEC.md requires on every page.
+// English until the patient's chosen language is remembered on the phone (Phase 3 language switch).
+
+import { textFor } from "@/lib/text";
 
 export function Footer() {
   return (
     <footer className="mt-auto border-t border-slate-300 bg-slate-100 px-4 py-4 text-center text-sm text-slate-700">
-      Concept prototype. Not affiliated with or endorsed by Trillium Health Partners. Demo data only.
+      {textFor("en").footer}
     </footer>
   );
 }
diff --git a/components/patient/PatientStatus.tsx b/components/patient/PatientStatus.tsx
index 17f6ca3..c879122 100644
--- a/components/patient/PatientStatus.tsx
+++ b/components/patient/PatientStatus.tsx
@@ -5,34 +5,33 @@
 
 import Link from "next/link";
 import type { PatientView } from "@/lib/patientView";
+import { textFor, type PatientText } from "@/lib/text";
 import { Button } from "@/components/Button";
 
 type Props = { view: PatientView; onOnMyWay: () => void; sending: boolean };
 
-function Waiting({ view }: { view: PatientView }) {
+function Waiting({ view, t }: { view: PatientView; t: PatientText }) {
+  const p = t.patient;
   return (
     <section aria-labelledby="status-heading" className="clean-card space-y-3">
       <h2 id="status-heading" className="text-2xl font-bold">
-        Status: Waiting
+        {p.waitingHeading}
       </h2>
       <p className="text-lg">
-        Your place in line: <strong className="text-3xl">{view.placeInLine}</strong>
-      </p>
-      <p className="text-base">
-        Your place can change if more urgent patients arrive. The most urgent patients are always seen first.
+        {p.placeInLine} <strong className="text-3xl">{view.placeInLine}</strong>
       </p>
+      <p className="text-base">{p.placeCanChange}</p>
       <p className="text-lg">
-        Estimated time until you&apos;re called back:{" "}
-        <strong>
-          {view.waitLow} to {view.waitHigh} minutes
-        </strong>
+        {p.waitLabel}{" "}
+        <strong>{view.waitLow !== null && view.waitHigh !== null && p.waitRange(view.waitLow, view.waitHigh)}</strong>
       </p>
-      <p className="text-sm text-slate-700">This estimate is simulated for the demo.</p>
+      <p className="text-sm text-slate-700">{p.simulated}</p>
     </section>
   );
 }
 
-function Called({ view, onOnMyWay, sending }: Props) {
+function Called({ view, onOnMyWay, sending, t }: Props & { t: PatientText }) {
+  const p = t.patient;
   const confirmed = view.status === "on_the_way";
   return (
     <section
@@ -40,67 +39,53 @@ function Called({ view, onOnMyWay, sending }: Props) {
       className="space-y-3 rounded-xl border-4 border-green-800 bg-green-50 p-4"
     >
       <h2 id="status-heading" className="text-2xl font-bold text-green-950">
-        Please head back now
+        {p.calledHeading}
       </h2>
-      <p className="text-lg">Please return to the emergency department and go to the desk.</p>
+      <p className="text-lg">{p.calledText}</p>
       {confirmed ? (
         <p className="text-lg font-semibold" data-testid="confirmed">
-          Thank you. Staff know you are on your way.
+          {p.confirmed}
         </p>
       ) : (
         <Button onClick={onOnMyWay} aria-disabled={sending} className="w-full text-lg">
-          {sending ? <>Sending…</> : <>I&apos;m on my way</>}
+          {sending ? p.sending : p.onMyWay}
         </Button>
       )}
-      <p className="text-sm text-slate-800">
-        Demo limits: alerts on this page only work while it is open and your phone is unlocked.
-      </p>
+      <p className="text-sm text-slate-800">{p.alertLimits}</p>
     </section>
   );
 }
 
-// Heading and message for every status that has no place-in-line or call-back screen.
-// Placeholder wording until the Phase 3 wording review.
-const OTHER: Record<string, { heading: string; text: string | string[] }> = {
-  pre_arrival: {
-    heading: "Status: Checked in from home, not yet triaged",
-    text: [
-      "Your place in line starts when a nurse sees you at triage. The most urgent patients are always seen first.",
-      "Starting this demo visit does not register you with a hospital, reserve a place, or give permission to wait off-site.",
-      "If you go to the emergency department, follow its normal arrival, triage and registration steps. Show this visit code when staff ask. Only staff can approve waiting off-site.",
-    ],
-  },
-  needs_reassessment: {
-    heading: "Please go to the triage desk",
-    text: "A nurse will check you again before you rejoin the line.",
-  },
-  arrived: {
-    heading: "Status: Ready at the desk",
-    text: "Staff have marked you as back. Please stay in the waiting area until staff call you.",
-  },
-  declined: {
-    heading: "Status: Waiting in the emergency department",
-    text: "You are waiting on-site as usual. Staff will call you in the waiting area.",
-  },
-  not_eligible: {
-    heading: "Status: Waiting in the emergency department",
-    text: "You are waiting on-site as usual. Staff will call you in the waiting area.",
-  },
-};
-
-const ENDED = {
-  heading: "Your off-site wait has ended",
-  text: "Please check with the emergency department desk.",
-};
+/** Heading and paragraphs for every status that has no place-in-line or call-back screen. */
+function otherStatus(status: PatientView["status"], t: PatientText): { heading: string; text: string[] } {
+  const p = t.patient;
+  switch (status) {
+    case "pre_arrival":
+      return { heading: p.fromHomeHeading, text: p.fromHomeText };
+    case "needs_reassessment":
+      return { heading: p.reassessHeading, text: [p.reassessText] };
+    case "arrived":
+      return { heading: p.arrivedHeading, text: [p.arrivedText] };
+    case "declined":
+    case "not_eligible":
+      return { heading: p.onsiteHeading, text: [p.onsiteText] };
+    case "unable_to_reach":
+      return { heading: p.endedHeading, text: [p.unableText] };
+    case "removed":
+      return { heading: p.endedHeading, text: [p.removedText] };
+    default:
+      return { heading: p.endedHeading, text: [p.endedText] };
+  }
+}
 
-function OtherStatus({ view }: { view: PatientView }) {
-  const { heading, text } = OTHER[view.status] ?? ENDED;
+function OtherStatus({ view, t }: { view: PatientView; t: PatientText }) {
+  const { heading, text } = otherStatus(view.status, t);
   return (
     <section aria-labelledby="status-heading" className="clean-card space-y-3">
       <h2 id="status-heading" className="text-2xl font-bold">
         {heading}
       </h2>
-      {(Array.isArray(text) ? text : [text]).map((paragraph) => (
+      {text.map((paragraph) => (
         <p key={paragraph} className="text-lg">
           {paragraph}
         </p>
@@ -110,32 +95,30 @@ function OtherStatus({ view }: { view: PatientView }) {
 }
 
 // A visit started from home that was never triaged within 6 hours: staff no longer expect it.
-function Expired() {
+function Expired({ t }: { t: PatientText }) {
+  const p = t.patient;
   return (
     <section aria-labelledby="status-heading" className="clean-card space-y-3">
       <h2 id="status-heading" className="text-2xl font-bold">
-        This visit request has expired
+        {p.expiredHeading}
       </h2>
+      <p className="text-lg">{t.expiredText}</p>
+      <p className="text-lg">{p.expiredHelp}</p>
       <p className="text-lg">
-        It was started more than 6 hours ago and was never checked in at triage, so staff no longer expect it.
-      </p>
-      <p className="text-lg">
-        If you still need care, go to the emergency department and follow its normal arrival and triage steps.
-        You can also{" "}
         <Link href="/" className="font-semibold text-blue-900 underline underline-offset-2">
-          start a new demo visit on the start page
+          {p.expiredNewVisit}
         </Link>
-        .
       </p>
     </section>
   );
 }
 
 export function PatientStatus({ view, onOnMyWay, sending }: Props) {
-  if (view.expired) return <Expired />;
-  if (view.status === "waiting") return <Waiting view={view} />;
+  const t = textFor(view.language);
+  if (view.expired) return <Expired t={t} />;
+  if (view.status === "waiting") return <Waiting view={view} t={t} />;
   if (view.status === "called" || view.status === "on_the_way") {
-    return <Called view={view} onOnMyWay={onOnMyWay} sending={sending} />;
+    return <Called view={view} onOnMyWay={onOnMyWay} sending={sending} t={t} />;
   }
-  return <OtherStatus view={view} />;
+  return <OtherStatus view={view} t={t} />;
 }
diff --git a/components/patient/StatusAnnouncer.tsx b/components/patient/StatusAnnouncer.tsx
index 289d15b..a92aa5d 100644
--- a/components/patient/StatusAnnouncer.tsx
+++ b/components/patient/StatusAnnouncer.tsx
@@ -4,23 +4,27 @@
 // an assertive message for the call-back, a polite one for everything else.
 
 import { useEffect, useRef, useState } from "react";
+import { textFor } from "@/lib/text";
 import type { VisitStatus } from "@/lib/visit";
 
-const CALLED = "You have been called back. Please head back to the emergency department now.";
-
-const MESSAGES: Partial<Record<VisitStatus, string>> = {
-  called: CALLED,
-  on_the_way: "Thank you. Staff know you are on your way.",
-  arrived: "Staff have marked you as back at the emergency department.",
-  removed: "Your off-site wait has ended.",
-  unable_to_reach: "Your off-site wait has ended.",
-  needs_reassessment: "Please go to the triage desk.",
-};
+/** What is announced for each status change, in the visit's language. */
+function messageFor(status: VisitStatus, language: string): string {
+  const a = textFor(language).announce;
+  const messages: Partial<Record<VisitStatus, string>> = {
+    called: a.called,
+    on_the_way: a.onTheWay,
+    arrived: a.arrived,
+    removed: a.ended,
+    unable_to_reach: a.ended,
+    needs_reassessment: a.reassess,
+  };
+  return messages[status] ?? "";
+}
 
 /** One status change waiting to be announced. `round` makes every change new, even a repeat. */
 type Pending = { round: number; status: VisitStatus };
 
-export function StatusAnnouncer({ status }: { status: VisitStatus }) {
+export function StatusAnnouncer({ status, language }: { status: VisitStatus; language: string }) {
   const [previous, setPrevious] = useState<VisitStatus | null>(null);
   // A call-back already on screen when the page opens is announced; other opening statuses are not.
   const [pending, setPending] = useState<Pending | null>(null);
@@ -47,7 +51,7 @@ export function StatusAnnouncer({ status }: { status: VisitStatus }) {
   // forward, then announces the status if it has not changed in the meantime.
   useEffect(() => {
     if (!pending) return;
-    const text = MESSAGES[pending.status] ?? "";
+    const text = messageFor(pending.status, language);
     if (!text) return;
     let done = false;
     const announce = () => {
@@ -62,7 +66,7 @@ export function StatusAnnouncer({ status }: { status: VisitStatus }) {
       window.clearTimeout(timer);
       document.removeEventListener("visibilitychange", announce);
     };
-  }, [pending]);
+  }, [pending, language]);
 
   return (
     <>
diff --git a/components/staff/VisitSlip.tsx b/components/staff/VisitSlip.tsx
index e73d541..9623183 100644
--- a/components/staff/VisitSlip.tsx
+++ b/components/staff/VisitSlip.tsx
@@ -8,6 +8,7 @@ import { groupToken } from "@/lib/codes";
 import { slipOrigin } from "@/lib/slipOrigin";
 import { patientLink } from "@/data/savedToken";
 import { Button } from "@/components/Button";
+import { textFor } from "@/lib/text";
 
 type Props = { code: string; token: string; onClose: () => void };
 
@@ -37,7 +38,7 @@ export function VisitSlip({ code, token, onClose }: Props) {
           <p>
             Visit code: <strong className="font-mono text-2xl tracking-widest">{code}</strong>
           </p>
-          <p className="text-sm">Or type this link into your phone&apos;s browser:</p>
+          <p className="text-sm">{textFor("en").slip.typeLink}</p>
           <p className="font-mono text-sm break-all" data-testid="slip-link">
             {typedLink}
           </p>
diff --git a/components/start/CareOptions.tsx b/components/start/CareOptions.tsx
index 817e69a..a2cadbe 100644
--- a/components/start/CareOptions.tsx
+++ b/components/start/CareOptions.tsx
@@ -2,51 +2,57 @@
 // Only names and links: nothing is copied from THP's site (SPEC rule 8), and hours change,
 // so patients are sent to THP's page for them.
 
+import { textFor } from "@/lib/text";
+
 const THP_EMERGENCY_PAGE = "https://www.thp.ca/emergency/A/visit.html";
 
 const linkStyle = "font-semibold text-blue-900 underline underline-offset-2";
 
-function External({ href, children }: { href: string; children: string }) {
+function External({ href, children, newTab }: { href: string; children: string; newTab: string }) {
   return (
     <a href={href} target="_blank" rel="noopener noreferrer" className={linkStyle}>
       {children}
-      <span className="sr-only"> (opens in a new tab)</span>
+      <span className="sr-only"> {newTab}</span>
     </a>
   );
 }
 
-export function CareOptions() {
+export function CareOptions({ language }: { language?: string }) {
+  const t = textFor(language);
+  const s = t.start;
   return (
     <section aria-labelledby="options-heading" className="space-y-3">
       <h2 id="options-heading" className="text-xl font-bold">
-        Official information about care options
+        {s.careHeading}
       </h2>
-      <p>
-        This demo cannot tell which service is right for you. Check eligibility, availability and hours on
-        each linked site before you go.
-      </p>
+      <p>{s.careIntro}</p>
       <ul className="list-disc space-y-2 pl-6 text-base">
         <li>
-          Health811: call{" "}
+          {s.health811Before}{" "}
           <a href="tel:811" className={linkStyle}>
             811
           </a>{" "}
-          for a free nurse line.
-        </li>
-        <li>
-          <External href="https://www.regional-virtual-urgent-care.ca/">Regional virtual urgent care</External>
+          {s.health811After}
         </li>
-        <li>Urgent Care Centre at Queensway Health Centre in Etobicoke.</li>
         <li>
-          A pharmacist can assess you at three Shoppers Drug Mart stores in Mississauga. This is a pilot, so
-          check that it is still running before you go.
+          <External href="https://www.regional-virtual-urgent-care.ca/" newTab={t.newTab}>
+            {s.virtualCare}
+          </External>
         </li>
+        <li>{s.urgentCare}</li>
+        <li>{s.pharmacist}</li>
       </ul>
       <p>
-        For hours and addresses, see <External href={THP_EMERGENCY_PAGE}>THP&apos;s emergency page</External>.
+        {s.hoursBefore}{" "}
+        <External href={THP_EMERGENCY_PAGE} newTab={t.newTab}>
+          {s.hoursLink}
+        </External>
+        .
       </p>
       <p>
-        <External href={THP_EMERGENCY_PAGE}>See current wait times on THP&apos;s website</External>
+        <External href={THP_EMERGENCY_PAGE} newTab={t.newTab}>
+          {s.waitTimesLink}
+        </External>
       </p>
     </section>
   );
diff --git a/components/start/StartVisit.tsx b/components/start/StartVisit.tsx
index e9b64dc..37ecdc8 100644
--- a/components/start/StartVisit.tsx
+++ b/components/start/StartVisit.tsx
@@ -11,6 +11,7 @@ import { useState, useSyncExternalStore } from "react";
 import { startVisitFromHome, usePatientView, type StartResult } from "@/data/patientVisit";
 import { loadSavedToken } from "@/data/savedToken";
 import { startPageState } from "@/lib/startPage";
+import { textFor } from "@/lib/text";
 import type { Site } from "@/lib/visit";
 import { Button } from "@/components/Button";
 
@@ -20,50 +21,38 @@ const openLinkStyle =
   "inline-block min-h-11 rounded-xl bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-strong focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-slate-950";
 const boxStyle = "clean-card space-y-3";
 
-// What the start page says about a visit already saved on this phone, before any new one.
-const SAVED_NOTE = {
-  closed: {
-    heading: "Your last visit on this phone",
-    text: "Off-site waiting has ended for this visit. You may still be waiting in the emergency department: open your visit to see its status.",
-  },
-  expired: {
-    heading: "Your visit request on this phone has expired",
-    text: "It was started more than 6 hours ago and was never checked in at triage, so staff no longer expect it.",
-  },
-};
-
-// What the patient is told when a visit could not be started.
-const START_PROBLEM: Record<Exclude<StartResult, "saved">, string> = {
-  paused: "Off-site waiting is paused right now. Please come to the emergency department and wait there.",
-  busy: "Too many visits have been started just now. Please wait a few minutes and try again, or go to the emergency department.",
-  not_saved: "Your visit was not saved. Please try again, or go to the emergency department desk.",
-};
-
 export function StartVisit() {
   const router = useRouter();
   const savedToken = useSyncExternalStore(noSubscribe, loadSavedToken, () => null);
   const saved = usePatientView(savedToken);
   const [site, setSite] = useState<Site>("A");
   const [language, setLanguage] = useState("en");
-  const [problem, setProblem] = useState("");
+  const [problem, setProblem] = useState<Exclude<StartResult, "saved"> | null>(null);
   const [starting, setStarting] = useState(false);
   const [wantsNew, setWantsNew] = useState(false);
   const state = startPageState(saved);
+  const t = textFor(language);
+  const s = t.start;
+
+  // What the patient is told when a visit could not be started.
+  const problemText = { paused: s.paused, busy: s.busy, not_saved: s.notSaved };
+  // What the start page says about a visit already saved on this phone, before any new one.
+  const savedNote = {
+    closed: { heading: s.closedHeading, text: s.closedText },
+    expired: { heading: s.expiredHeading, text: t.expiredText },
+  };
 
   if (state === "loading") {
-    return <p>Checking this phone for a saved visit…</p>;
+    return <p>{s.checkingSaved}</p>;
   }
 
   if (state === "unavailable") {
     return (
       <section aria-labelledby="start-heading" className={boxStyle}>
         <h2 id="start-heading" className="text-xl font-bold">
-          We cannot read the visit saved on this phone
+          {s.unavailableHeading}
         </h2>
-        <p>
-          The visit saved on this phone cannot be loaded right now, so a new visit is not offered. If you
-          need care, go to the emergency department and follow its normal arrival and triage steps.
-        </p>
+        <p>{s.unavailableText}</p>
       </section>
     );
   }
@@ -72,43 +61,43 @@ export function StartVisit() {
     return (
       <section aria-labelledby="start-heading" className={boxStyle}>
         <h2 id="start-heading" className="text-xl font-bold">
-          You have a visit on this phone
+          {s.openHeading}
         </h2>
         <p>
-          Visit code <strong className="font-mono tracking-widest">{saved.code}</strong> · Demo Site{" "}
-          {saved.site}
+          {t.visitCode} <strong className="font-mono tracking-widest">{saved.code}</strong> ·{" "}
+          {t.siteName(saved.site)}
         </p>
         <Link href="/patient" className={openLinkStyle}>
-          Open your visit
+          {s.openVisit}
         </Link>
       </section>
     );
   }
 
   // An ended or expired visit is shown first; starting another demo visit is a separate choice.
-  const savedNote =
+  const savedBox =
     saved && typeof saved === "object" && (state === "closed" || state === "expired") ? (
       <section aria-labelledby="saved-heading" className={boxStyle}>
         <h2 id="saved-heading" className="text-xl font-bold">
-          {SAVED_NOTE[state].heading}
+          {savedNote[state].heading}
         </h2>
         <p>
-          Visit code <strong className="font-mono tracking-widest">{saved.code}</strong> · Demo Site{" "}
-          {saved.site}
+          {t.visitCode} <strong className="font-mono tracking-widest">{saved.code}</strong> ·{" "}
+          {t.siteName(saved.site)}
         </p>
-        <p>{SAVED_NOTE[state].text}</p>
+        <p>{savedNote[state].text}</p>
         <Link href="/patient" className={openLinkStyle}>
-          Open your visit
+          {s.openVisit}
         </Link>
       </section>
     ) : null;
 
-  if (savedNote && !wantsNew) {
+  if (savedBox && !wantsNew) {
     return (
       <div className="space-y-4">
-        {savedNote}
+        {savedBox}
         <Button variant="secondary" onClick={() => setWantsNew(true)}>
-          Start a new demo visit instead
+          {s.startNew}
         </Button>
       </div>
     );
@@ -117,47 +106,44 @@ export function StartVisit() {
   const start = async () => {
     if (starting) return; // a second tap while the first is on its way must not start two visits
     setStarting(true);
-    setProblem("");
+    setProblem(null);
     const result = await startVisitFromHome(site, language);
     if (result === "saved") {
       router.push("/patient");
       return; // stays "Starting…" until the patient screen opens
     }
     setStarting(false);
-    setProblem(START_PROBLEM[result]);
+    setProblem(result);
   };
 
   return (
     <section aria-labelledby="start-heading" className="clean-card space-y-4">
       <h2 id="start-heading" className="text-xl font-bold">
-        Start a visit
+        {s.startHeading}
       </h2>
-      <p>
-        Starting a visit here does not hold a place in line. Your place in line starts when a nurse sees you
-        at triage. The most urgent patients are always seen first.
-      </p>
+      <p>{s.startIntro}</p>
       <fieldset>
-        <legend className="font-semibold">Which emergency department are you going to?</legend>
+        <legend className="font-semibold">{s.siteQuestion}</legend>
         <div className="mt-2 flex flex-wrap gap-3">
-          {(["A", "B"] as const).map((s) => (
+          {(["A", "B"] as const).map((option) => (
             <label
-              key={s}
+              key={option}
               className="flex min-h-11 items-center gap-2 rounded-lg border-2 border-control px-4"
             >
               <input
                 type="radio"
                 name="site"
                 className="size-5"
-                checked={site === s}
-                onChange={() => setSite(s)}
+                checked={site === option}
+                onChange={() => setSite(option)}
               />
-              Demo Site {s}
+              {t.siteName(option)}
             </label>
           ))}
         </div>
       </fieldset>
       <label className="block">
-        <span className="font-semibold">Language</span>
+        <span className="font-semibold">{s.languageLabel}</span>
         <select
           value={language}
           onChange={(e) => setLanguage(e.target.value)}
@@ -165,14 +151,14 @@ export function StartVisit() {
         >
           <option value="en">English</option>
         </select>
-        <span className="mt-1 block text-sm text-slate-700">Two more languages come in Phase 3.</span>
+        <span className="mt-1 block text-sm text-slate-700">{s.languageNote}</span>
       </label>
       <Button onClick={start} aria-disabled={starting} className="w-full text-lg">
-        {starting ? "Starting…" : "Start a visit"}
+        {starting ? s.starting : s.startButton}
       </Button>
       {problem && (
         <p role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
-          {problem}
+          {problemText[problem]}
         </p>
       )}
     </section>
diff --git a/lib/text/en.ts b/lib/text/en.ts
new file mode 100644
index 0000000..0f400fe
--- /dev/null
+++ b/lib/text/en.ts
@@ -0,0 +1,175 @@
+// Every sentence a patient sees, in English. Other languages copy this shape (lib/text/index.ts).
+// Wording approved by the owner on 2026-11-10 (handoffs/2026-11-10-gemini-patient-wording-phase3-response.md).
+// Sentences marked "SPEC" are fixed by SPEC.md: change them only if the owner changes SPEC.
+
+export const en = {
+  // SPEC rule 3: on every patient screen, in every state and every language.
+  emergencyLine: "If your symptoms get worse, call 911 or come back to the emergency department now.",
+  // SPEC: on every page.
+  footer: "Concept prototype. Not affiliated with or endorsed by Trillium Health Partners. Demo data only.",
+  appName: "Virtual Waiting Room",
+  visitCode: "Visit code",
+  siteName: (site: string) => `Demo Site ${site}`,
+  newTab: "(opens in a new tab)",
+
+  start: {
+    // SPEC
+    emergencyCheck:
+      "Chest pain, trouble breathing, signs of stroke, heavy bleeding or another emergency? Call 911 now.",
+    careHeading: "Learn about your care options",
+    careIntro: "This demo cannot choose a service for you. Check the rules and hours on each site before you go.",
+    health811Before: "Health811: Call",
+    health811After: "to speak with a nurse for free.",
+    virtualCare: "Virtual urgent care",
+    // SPEC (the next five)
+    urgentCare: "Urgent Care Centre at Queensway Health Centre in Etobicoke.",
+    pharmacist:
+      "A pharmacist can assess you at three Shoppers Drug Mart stores in Mississauga. This is a pilot, so check that it is still running before you go.",
+    hoursBefore: "For hours and addresses, see",
+    hoursLink: "THP's emergency page",
+    waitTimesLink: "See current wait times on THP's website",
+
+    startHeading: "Start a visit",
+    // Ends with SPEC's sentence about triage.
+    startIntro:
+      "Starting here does not hold a place in line. Your place in line starts when a nurse sees you at triage. The most urgent patients are always seen first.",
+    siteQuestion: "Which emergency department are you going to?",
+    languageLabel: "Language",
+    languageNote: "Two more languages come in Phase 3.",
+    startButton: "Start a visit",
+    starting: "Starting…",
+    // SPEC
+    paused: "Off-site waiting is paused right now. Please come to the emergency department and wait there.",
+    busy: "The app is too busy right now. Please wait a few minutes and try again. You can also go straight to the emergency department.",
+    notSaved: "Your visit did not save. Please try again. Or, go to the emergency department desk.",
+
+    checkingSaved: "Checking this phone for a saved visit…",
+    unavailableHeading: "We cannot open the saved visit on this phone",
+    unavailableText:
+      "Your saved visit will not load right now. You cannot start a new one here. If you need care, please go to the emergency department desk.",
+    openHeading: "You have an open visit on this phone",
+    openVisit: "Open your visit",
+    closedHeading: "Your past visit on this phone",
+    closedText:
+      "Off-site waiting is over for this visit. You might still be waiting at the hospital. Open your visit to check.",
+    expiredHeading: "Your visit request has expired",
+    startNew: "Start a new demo visit",
+
+    demoScreens: "Demo screens",
+    staffScreen: "Staff screen",
+    patientScreen: "Patient screen",
+    dashboard: "Dashboard",
+  },
+
+  // Shown on the start page and the patient screen when a visit from home was never triaged.
+  expiredText:
+    "You started this visit over 6 hours ago. It was never checked in at triage. Staff no longer expect you to arrive.",
+
+  patient: {
+    loading: "Loading your visit…",
+    unavailableHeading: "We cannot load your visit",
+    unavailableText:
+      "Your actions on this page are not saving. Staff may not see them. Please go to the emergency department desk.",
+    noVisitHeading: "No visit found on this phone",
+    brokenLinkHeading: "This link did not work",
+    brokenLinkText: "The link might be wrong or cut short. No visit was opened.",
+    findVisitHelp:
+      "Scan the QR code on your slip. You can also type the link printed under it. If it still fails, ask the desk to show the QR code again.",
+
+    waitingHeading: "Status: Waiting",
+    placeInLine: "Your place in line:",
+    // SPEC
+    placeCanChange: "Your place can change if more urgent patients arrive. The most urgent patients are always seen first.",
+    // SPEC
+    waitLabel: "Estimated time until you're called back:",
+    waitRange: (low: number, high: number) => `${low} to ${high} minutes`,
+    simulated: "This estimate is simulated for the demo.",
+
+    calledHeading: "Please head back now",
+    calledText: "Please go back to the emergency department desk.",
+    onMyWay: "I'm on my way",
+    sending: "Sending…",
+    confirmed: "Thank you. Staff know you are on your way.",
+    alertLimits: "Demo limits: alerts on this page only work while it is open and your phone is unlocked.",
+    notSaved: "Your answer did not save. Staff do not know you tapped it. Please try again or go to the desk.",
+
+    fromHomeHeading: "Status: Started from home, not yet triaged",
+    fromHomeText: [
+      // SPEC
+      "Your place in line starts when a nurse sees you at triage. The most urgent patients are always seen first.",
+      "This app does not register you or give permission to wait off-site.",
+      "If you go to the emergency department, follow its normal steps. Show this visit code to staff. Only staff can approve off-site waiting.",
+    ],
+    reassessHeading: "Please go to the triage desk",
+    reassessText: "A nurse needs to check you again. This happens before you rejoin the line.",
+    arrivedHeading: "Status: Ready at the desk",
+    arrivedText: "Staff know you are back. Please stay in the waiting area until you are called.",
+    onsiteHeading: "Status: Waiting in the emergency department",
+    onsiteText: "You are waiting inside the hospital. Staff will call you when they are ready.",
+    endedHeading: "Your off-site wait has ended",
+    endedText: "Please go to the emergency department desk.",
+    unableText:
+      "Staff could not reach you, so this visit has left the off-site line. If you still need care, please come to the emergency department desk.",
+    removedText:
+      "Staff have ended off-site waiting for this visit. If you still need care, please come to the emergency department desk.",
+    expiredHeading: "This visit request has expired",
+    expiredHelp: "If you still need care, please go to the emergency department desk.",
+    expiredNewVisit: "Or start a new demo visit on the start page.",
+  },
+
+  // Heard by screen-reader users when the status changes (never the wait range or countdowns).
+  announce: {
+    called: "You have been called back. Please head back to the emergency department now.",
+    onTheWay: "Thank you. Staff know you are on your way.",
+    arrived: "Staff have marked you as back at the emergency department.",
+    ended: "Your off-site wait has ended.",
+    reassess: "Please go to the triage desk.",
+    stillHere: "Please tap the button to confirm you are still here.",
+    secondAlert: "Urgent: Please return to the emergency department right now.",
+  },
+
+  // Desk slip (printed for the patient).
+  slip: {
+    // SPEC
+    typeLink: "Or type this link into your phone's browser:",
+  },
+
+  // Phase 3 features still being built. Written now so all text is translated in one batch.
+  stillHere: {
+    heading: "Are you still following your visit?",
+    button: "I'm still here",
+    thanks: "Thank you.",
+    meaning: "This tells staff you are still waiting. It is not a check of your health.",
+  },
+  secondAlert: "Please return to the emergency department right now. Staff may try to reach you.",
+  returnNow: {
+    lead: "We have not heard from you.",
+    // SPEC
+    text: "Please return now. Staff will review your visit if you do not respond.",
+  },
+  sound: {
+    notice:
+      "This demo plays a sound and vibrates when you are called. This only works while this page is open and your phone is unlocked.",
+    turnOn: "Turn on sound",
+    on: "Sound is on",
+  },
+  pausedHeading: "Off-site waiting is paused",
+  textSize: { label: "Text size", normal: "Normal", large: "Large", extraLarge: "Extra large" },
+  language: {
+    label: "Select language",
+    draftNotice: "This translation is a draft. A fluent speaker has not checked it yet.",
+  },
+  survey: {
+    // SPEC
+    question: "How would you rate your waiting experience?",
+    low: "0 = Very poor",
+    high: "10 = Excellent",
+    submit: "Submit",
+    thanks: "Thank you for your feedback.",
+    note: "Answering is optional. Your name is not stored.",
+  },
+  offline: "You are offline. Reconnect to the internet to see your status.",
+};
+
+/** The shape every language's text must have. */
+export type PatientText = typeof en;
diff --git a/lib/text/index.ts b/lib/text/index.ts
new file mode 100644
index 0000000..34dfd6b
--- /dev/null
+++ b/lib/text/index.ts
@@ -0,0 +1,13 @@
+// Picks the patient text for a language. A language without its own text yet gets English,
+// so every screen always has every sentence (including the 911 line, SPEC rule 3).
+
+import { en, type PatientText } from "./en";
+
+export type { PatientText };
+
+/** Text for each language the app has. Two more languages are added in Phase 3. */
+const TEXT: Record<string, PatientText> = { en };
+
+export function textFor(language: string | null | undefined): PatientText {
+  return (language && TEXT[language]) || en;
+}
diff --git a/lib/text/text.test.ts b/lib/text/text.test.ts
new file mode 100644
index 0000000..039a395
--- /dev/null
+++ b/lib/text/text.test.ts
@@ -0,0 +1,52 @@
+// Checks that the language picker falls back to English and that SPEC's fixed sentences
+// are word for word in the English text.
+
+import { describe, expect, it } from "vitest";
+import { textFor } from "./index";
+
+describe("textFor", () => {
+  it("gives English for English, an unknown language, or none", () => {
+    expect(textFor("en").emergencyLine).toBe(textFor(undefined).emergencyLine);
+    expect(textFor("zz")).toBe(textFor("en"));
+    expect(textFor(null)).toBe(textFor("en"));
+  });
+});
+
+describe("SPEC's fixed sentences", () => {
+  const t = textFor("en");
+
+  it("has the 911 line and the footer exactly", () => {
+    expect(t.emergencyLine).toBe(
+      "If your symptoms get worse, call 911 or come back to the emergency department now.",
+    );
+    expect(t.footer).toBe(
+      "Concept prototype. Not affiliated with or endorsed by Trillium Health Partners. Demo data only.",
+    );
+  });
+
+  it("has the start page's emergency check and pause message exactly", () => {
+    expect(t.start.emergencyCheck).toBe(
+      "Chest pain, trouble breathing, signs of stroke, heavy bleeding or another emergency? Call 911 now.",
+    );
+    expect(t.start.paused).toBe(
+      "Off-site waiting is paused right now. Please come to the emergency department and wait there.",
+    );
+  });
+
+  it("keeps the triage sentence wherever a visit from home is explained", () => {
+    const triage =
+      "Your place in line starts when a nurse sees you at triage. The most urgent patients are always seen first.";
+    expect(t.patient.fromHomeText[0]).toBe(triage);
+    expect(t.start.startIntro).toContain(triage);
+  });
+
+  it("has the waiting screen's fixed lines and the survey question exactly", () => {
+    expect(t.patient.placeCanChange).toBe(
+      "Your place can change if more urgent patients arrive. The most urgent patients are always seen first.",
+    );
+    expect(t.patient.waitLabel).toBe("Estimated time until you're called back:");
+    expect(t.patient.waitRange(40, 60)).toBe("40 to 60 minutes");
+    expect(t.returnNow.text).toBe("Please return now. Staff will review your visit if you do not respond.");
+    expect(t.survey.question).toBe("How would you rate your waiting experience?");
+  });
+});
diff --git a/lib/visitActions.ts b/lib/visitActions.ts
index 1baa302..7dd327e 100644
--- a/lib/visitActions.ts
+++ b/lib/visitActions.ts
@@ -71,7 +71,7 @@ export function checkInAtDesk(input: DeskCheckIn, outcome: DeskOutcome, now: Dat
 }
 
 /**
- * A patient starts a visit from home on the start page: "Checked in from home, not yet triaged".
+ * A patient starts a visit from home on the start page: "Started from home, not yet triaged".
  * This never gives a place in line (SPEC rule 7); that starts at triage.
  * In the app the database function start_home_visit does this; this copy is used by the tests.
  */
```

## Response

From Gemini (pasted by the owner, 2026-11-10):

1. `components/staff/VisitSlip.tsx`, line 39: the label "Visit code:" is still written in the JSX. Fix: use `{textFor("en").visitCode}:`.
2. `app/patient/page.tsx`, the `view` and `t` lines and `<EmergencyLine>`: while loading, or when the link is broken or the visit unavailable, `view` is empty, so `textFor` gets nothing and shows English. A patient sees an English 911 line and loading text until the visit loads. Fix: keep the chosen language in browser storage or in the link's hash next to the token, so it is known on the first render.
3. `lib/text/en.ts`, `siteName` and `waitRange`: code inside the translation file does not suit translation tools, and non-developer translators cannot safely edit it. Fix: plain sentences with placeholders (`"{{low}} to {{high}} minutes"`) and a fill-in helper in `lib/text/index.ts`.
4. Nothing found. Storing a problem code or true/false instead of a finished English sentence means the message is looked up at render time and follows a language change. (Gemini also said tapping "I'm on my way" now clears the old error at once.)

## Claude's check (2026-11-10)

1. Correct. Fixed: the slip's label comes from the text file.
2. Correct, and expected: the phone cannot know the visit's language before the visit loads. Fixed in the language-switch step (the phone remembers the chosen language), not now. Logged in docs/progress.md.
3. Fair: the fluent reviewer should not have to read code. Fixed: `siteName` is "Demo Site {site}" and `waitRange` is "{low} to {high} minutes" (single braces), filled by `fill()` in `lib/text/index.ts`, with a test. The text file is now plain data.
4. Agreed, no change. One small correction: tapping "I'm on my way" does not clear the old error at once; it is replaced when the new answer comes back, as before.

86 unit tests, type check and lint pass after the fixes. Review closed; file archived.
