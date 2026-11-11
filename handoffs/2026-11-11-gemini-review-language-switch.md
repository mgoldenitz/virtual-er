# Handoff: review the language switch (Phase 3)

For: Gemini 3.1 Pro, High, in a new chat. No keys, tokens, passwords or patient data are in this file.

## Context

A Next.js (App Router, TypeScript) concept prototype of a virtual emergency department waiting room. Patients use their own phone with no login. SPEC: English plus French, Urdu, Arabic and Mandarin (Simplified Chinese); all text comes from one translation file per language; every patient screen in every state and language shows the 911 line; WCAG 2.2 AA (labelled controls, text that works at 200%, no sideways scrolling on a small phone). Translations are drafts until a fluent speaker approves them; the owner chose to show them live with a draft notice.

What was built:
- `lib/text/languages.ts`: the five languages (own-script name, direction, approved flag; only English approved) and `patientLanguage` (the phone's choice, else the visit's language, else English).
- `data/savedLanguage.ts`: the phone remembers the choice in browser storage (a shared store so every part of the screen updates at once).
- `components/LanguageSwitch.tsx`: the menu and the draft notice.
- The start page body moved into a client component that follows the chosen language; the "Start a visit" box lost its own language menu and the visit now takes the chosen language. The patient screen puts `lang` and `dir` on its `<main>`, so Urdu and Arabic are right to left. The staff check-in offers all five. The start route accepts all five codes.

Checked: 116 unit tests, type check, lint; at 390 x 844 every language has the right direction, no sideways scroll, the 911 line and the draft notice (except English); axe-core WCAG 2.2 AA rules: no failures on the start page in all five and the patient screen in Urdu and Arabic.

## Find problems (do not just confirm)

1. Is there any way a patient screen shows no 911 line, the wrong language, or a mix of languages in a way that could mislead (for example a safety message in a language the patient did not choose)?
2. Right to left: anything likely to break or read wrongly in Urdu or Arabic (numbers and visit codes inside right-to-left text, the "·" separator, buttons, the 811 link sentence, the footer staying English and left to right)?
3. Accessibility: the menu's label and options (each option in its own script with `lang` and `dir`), the `lang` on `<main>` while `<html lang="en">` stays English, the draft notice, screen-reader announcements in the chosen language.
4. The phone's choice versus the visit's language: is "phone's choice first" the right rule? Any case where staff set one language at check-in and the patient sees another without meaning to?
5. Anything in the diff that breaks existing behaviour (starting a visit, the start route's checks, the staff check-in form, server rendering and hydration of the start page).

Answer with a numbered list: file, line or area, the problem, how it fails, and a suggested fix. Say "nothing found" for a question with no problem.

## The change (git diff, translation files left out)

```diff
diff --git a/app/page.tsx b/app/page.tsx
index 9caa482..47d64ea 100644
--- a/app/page.tsx
+++ b/app/page.tsx
@@ -1,42 +1,13 @@
-// The start page, on the patient's own phone at home or in the waiting room (no login):
-// the emergency check first, other care options, THP's wait-time link, then "Start a visit".
+// The start page, on the patient's own phone at home or in the waiting room (no login).
+// Its contents are in components/start/StartPageBody.tsx, which follows the phone's language.
 
-import Link from "next/link";
-import { EmergencyLine } from "@/components/EmergencyLine";
 import { PatientShell } from "@/components/PatientShell";
-import { CareOptions } from "@/components/start/CareOptions";
-import { StartVisit } from "@/components/start/StartVisit";
-import { textFor } from "@/lib/text";
-
-const linkStyle =
-  "inline-block min-h-11 rounded-lg border-2 border-slate-700 px-4 py-2 font-semibold focus-visible:outline-4 focus-visible:outline-slate-950";
+import { StartPageBody } from "@/components/start/StartPageBody";
 
 export default function StartPage() {
-  const t = textFor("en");
   return (
     <PatientShell>
-    <main className="mx-auto w-full max-w-xl space-y-6 px-4 py-6">
-      <h1 className="text-2xl font-bold">{t.appName}</h1>
-      <p className="rounded-lg border-2 border-red-700 bg-red-50 p-3 text-lg font-bold text-red-900">
-        {t.start.emergencyCheck}
-      </p>
-      <div className="clean-card">
-        <CareOptions />
-      </div>
-      <StartVisit />
-      <EmergencyLine />
-      <nav aria-label={t.start.demoScreens} className="flex flex-wrap gap-3 border-t border-slate-300 pt-4">
-        <Link href="/staff" className={linkStyle}>
-          {t.start.staffScreen}
-        </Link>
-        <Link href="/patient" className={linkStyle}>
-          {t.start.patientScreen}
-        </Link>
-        <Link href="/dashboard" className={linkStyle}>
-          {t.start.dashboard}
-        </Link>
-      </nav>
-    </main>
+      <StartPageBody />
     </PatientShell>
   );
 }
diff --git a/app/patient/page.tsx b/app/patient/page.tsx
index 9d8ce16..6669550 100644
--- a/app/patient/page.tsx
+++ b/app/patient/page.tsx
@@ -5,19 +5,23 @@
 
 import { useEffect, useState } from "react";
 import { confirmOnMyWayByToken, recordSeen, usePatientView } from "@/data/patientVisit";
+import { useChosenLanguage } from "@/data/savedLanguage";
 import { takeTokenFromLink } from "@/data/savedToken";
 import { EmergencyLine } from "@/components/EmergencyLine";
+import { LanguageSwitch } from "@/components/LanguageSwitch";
 import { PatientShell } from "@/components/PatientShell";
 import { PatientStatus } from "@/components/patient/PatientStatus";
 import { StatusAnnouncer } from "@/components/patient/StatusAnnouncer";
 import { StillHerePrompt } from "@/components/patient/StillHerePrompt";
 import { fill, textFor } from "@/lib/text";
+import { languageInfo, patientLanguage } from "@/lib/text/languages";
 
 export default function PatientPage() {
   const [token, setToken] = useState<string | null | undefined>(undefined);
   const [notSaved, setNotSaved] = useState(false);
   const [brokenLink, setBrokenLink] = useState(false);
   const [sending, setSending] = useState(false);
+  const chosenLanguage = useChosenLanguage();
 
   // Reading the link and browser storage can only happen in the browser, after the first render.
   // A new link opened on this same page (only the #t=... part changes) switches to that visit.
@@ -37,7 +41,9 @@ export default function PatientPage() {
   const loading = token === undefined || result === undefined;
   const unavailable = result === "unavailable";
   const view = result === "unavailable" ? null : result;
-  const t = textFor(view?.language);
+  // The phone's own choice first, so even "Loading…" and the 911 line are in that language.
+  const language = patientLanguage(chosenLanguage, view?.language);
+  const t = textFor(language);
   const p = t.patient;
 
   // The first time the called screen is actually on screen, record seen_at
@@ -75,9 +81,10 @@ export default function PatientPage() {
 
   return (
     <PatientShell>
-    <main className="mx-auto w-full max-w-xl space-y-5 px-4 py-6">
+    <main lang={language} dir={languageInfo(language).dir} className="mx-auto w-full max-w-xl space-y-5 px-4 py-6">
       <h1 className="text-xl font-bold">{t.appName}</h1>
-      <EmergencyLine language={view?.language} />
+      <LanguageSwitch language={language} />
+      <EmergencyLine language={language} />
 
       {loading ? (
         <p>{p.loading}</p>
@@ -104,14 +111,14 @@ export default function PatientPage() {
             {t.visitCode}: <strong className="font-mono tracking-widest">{view.code}</strong> ·{" "}
             {fill(t.siteName, { site: view.site })}
           </p>
-          {token && view.status === "waiting" && <StillHerePrompt view={view} token={token} />}
-          <PatientStatus view={view} onOnMyWay={onOnMyWay} sending={sending} />
+          {token && view.status === "waiting" && <StillHerePrompt view={view} token={token} language={language} />}
+          <PatientStatus view={view} language={language} onOnMyWay={onOnMyWay} sending={sending} />
           {notSaved && (
             <p role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
               {p.notSaved}
             </p>
           )}
-          <StatusAnnouncer key={token} status={view.status} language={view.language} />
+          <StatusAnnouncer key={token} status={view.status} language={language} />
         </>
       )}
     </main>
diff --git a/components/LanguageSwitch.tsx b/components/LanguageSwitch.tsx
new file mode 100644
index 0000000..02dca49
--- /dev/null
+++ b/components/LanguageSwitch.tsx
@@ -0,0 +1,37 @@
+"use client";
+
+// The language menu on patient screens, with each language written in itself so a patient
+// can find their own. Shows the draft notice for any language a fluent speaker has not
+// approved yet (SPEC). The choice is remembered on this phone (data/savedLanguage.ts).
+
+import { chooseLanguage } from "@/data/savedLanguage";
+import { textFor } from "@/lib/text";
+import { languageInfo, LANGUAGES } from "@/lib/text/languages";
+
+export function LanguageSwitch({ language }: { language: string }) {
+  const t = textFor(language);
+  const current = languageInfo(language);
+  return (
+    <div className="space-y-2">
+      <label className="flex flex-wrap items-center gap-3">
+        <span className="font-semibold">{t.language.label}</span>
+        <select
+          value={current.code}
+          onChange={(e) => chooseLanguage(e.target.value)}
+          className="min-h-11 rounded-lg border-2 border-control bg-card px-3"
+        >
+          {LANGUAGES.map((l) => (
+            <option key={l.code} value={l.code} lang={l.code} dir={l.dir}>
+              {l.name}
+            </option>
+          ))}
+        </select>
+      </label>
+      {!current.approved && (
+        <p className="rounded-lg border-2 border-amber-700 bg-amber-50 p-2 text-sm font-semibold text-amber-950" data-testid="draft-notice">
+          {t.language.draftNotice}
+        </p>
+      )}
+    </div>
+  );
+}
diff --git a/components/patient/PatientStatus.tsx b/components/patient/PatientStatus.tsx
index 5eab3bf..b3002ba 100644
--- a/components/patient/PatientStatus.tsx
+++ b/components/patient/PatientStatus.tsx
@@ -8,7 +8,7 @@ import type { PatientView } from "@/lib/patientView";
 import { fill, textFor, type PatientText } from "@/lib/text";
 import { Button } from "@/components/Button";
 
-type Props = { view: PatientView; onOnMyWay: () => void; sending: boolean };
+type Props = { view: PatientView; language: string; onOnMyWay: () => void; sending: boolean };
 
 function Waiting({ view, t }: { view: PatientView; t: PatientText }) {
   const p = t.patient;
@@ -113,12 +113,12 @@ function Expired({ t }: { t: PatientText }) {
   );
 }
 
-export function PatientStatus({ view, onOnMyWay, sending }: Props) {
-  const t = textFor(view.language);
+export function PatientStatus({ view, language, onOnMyWay, sending }: Props) {
+  const t = textFor(language);
   if (view.expired) return <Expired t={t} />;
   if (view.status === "waiting") return <Waiting view={view} t={t} />;
   if (view.status === "called" || view.status === "on_the_way") {
-    return <Called view={view} onOnMyWay={onOnMyWay} sending={sending} t={t} />;
+    return <Called view={view} language={language} onOnMyWay={onOnMyWay} sending={sending} t={t} />;
   }
   return <OtherStatus view={view} t={t} />;
 }
diff --git a/components/patient/StillHerePrompt.tsx b/components/patient/StillHerePrompt.tsx
index 0e9ed17..5bca27f 100644
--- a/components/patient/StillHerePrompt.tsx
+++ b/components/patient/StillHerePrompt.tsx
@@ -15,12 +15,12 @@ import { useNow } from "@/components/useNow";
 /** How long the thank-you stays after a tap. */
 const THANKS_MS = 5 * 60_000;
 
-export function StillHerePrompt({ view, token }: { view: PatientView; token: string }) {
+export function StillHerePrompt({ view, token, language }: { view: PatientView; token: string; language: string }) {
   const now = useNow();
   const [sending, setSending] = useState(false);
   const [notSaved, setNotSaved] = useState(false);
   const [announcement, setAnnouncement] = useState("");
-  const t = textFor(view.language);
+  const t = textFor(language);
   const state = now ? stillHereState(view, now) : "not_due";
   const showing = state !== "not_due";
 
diff --git a/components/staff/CheckInPanel.tsx b/components/staff/CheckInPanel.tsx
index 5221972..181554e 100644
--- a/components/staff/CheckInPanel.tsx
+++ b/components/staff/CheckInPanel.tsx
@@ -8,8 +8,12 @@ import { useState, type FormEvent } from "react";
 import { checkInVisitFromHome, createDeskVisit } from "@/data/staffActions";
 import type { Site, Visit } from "@/lib/visit";
 import type { DeskOutcome } from "@/lib/visitActions";
+import { LANGUAGES } from "@/lib/text/languages";
 import { Button } from "@/components/Button";
 
+/** English names for the staff menu, next to each language's own name. */
+const STAFF_NAMES: Record<string, string> = { fr: "French", ur: "Urdu", ar: "Arabic", zh: "Mandarin" };
+
 const CHECKLIST = [
   { id: "phone", label: "Has a phone with them" },
   { id: "return", label: "Can return within 20 minutes" },
@@ -181,9 +185,12 @@ export function CheckInPanel({ site, onAttempt, onCreated, homeVisit, homeProble
           onChange={(e) => setLanguage(e.target.value)}
           className="mt-2 block min-h-11 rounded-lg border-2 border-control px-3"
         >
-          <option value="en">English</option>
+          {LANGUAGES.map((l) => (
+            <option key={l.code} value={l.code}>
+              {l.code === "en" ? l.name : `${l.name} (${STAFF_NAMES[l.code]}, draft until checked)`}
+            </option>
+          ))}
         </select>
-        <span className="mt-1 block text-sm text-slate-700">French, Urdu, Arabic and Mandarin are coming soon.</span>
       </label>
 
       {!homeProblem && (
diff --git a/components/start/CareOptions.tsx b/components/start/CareOptions.tsx
index a2cadbe..26ce40b 100644
--- a/components/start/CareOptions.tsx
+++ b/components/start/CareOptions.tsx
@@ -26,7 +26,7 @@ export function CareOptions({ language }: { language?: string }) {
         {s.careHeading}
       </h2>
       <p>{s.careIntro}</p>
-      <ul className="list-disc space-y-2 pl-6 text-base">
+      <ul className="list-disc space-y-2 ps-6 text-base">
         <li>
           {s.health811Before}{" "}
           <a href="tel:811" className={linkStyle}>
diff --git a/components/start/StartPageBody.tsx b/components/start/StartPageBody.tsx
new file mode 100644
index 0000000..e3fb4b6
--- /dev/null
+++ b/components/start/StartPageBody.tsx
@@ -0,0 +1,47 @@
+"use client";
+
+// Everything on the start page, in the language chosen on this phone (English until one is
+// chosen): the language menu, the emergency check first, other care options, THP's
+// wait-time link, then "Start a visit". Urdu and Arabic are laid out right to left.
+
+import Link from "next/link";
+import { useChosenLanguage } from "@/data/savedLanguage";
+import { textFor } from "@/lib/text";
+import { languageInfo } from "@/lib/text/languages";
+import { EmergencyLine } from "@/components/EmergencyLine";
+import { LanguageSwitch } from "@/components/LanguageSwitch";
+import { CareOptions } from "@/components/start/CareOptions";
+import { StartVisit } from "@/components/start/StartVisit";
+
+const linkStyle =
+  "inline-block min-h-11 rounded-lg border-2 border-slate-700 px-4 py-2 font-semibold focus-visible:outline-4 focus-visible:outline-slate-950";
+
+export function StartPageBody() {
+  const language = useChosenLanguage() ?? "en";
+  const t = textFor(language);
+  return (
+    <main lang={language} dir={languageInfo(language).dir} className="mx-auto w-full max-w-xl space-y-6 px-4 py-6">
+      <h1 className="text-2xl font-bold">{t.appName}</h1>
+      <LanguageSwitch language={language} />
+      <p className="rounded-lg border-2 border-red-700 bg-red-50 p-3 text-lg font-bold text-red-900">
+        {t.start.emergencyCheck}
+      </p>
+      <div className="clean-card">
+        <CareOptions language={language} />
+      </div>
+      <StartVisit language={language} />
+      <EmergencyLine language={language} />
+      <nav aria-label={t.start.demoScreens} className="flex flex-wrap gap-3 border-t border-slate-300 pt-4">
+        <Link href="/staff" className={linkStyle}>
+          {t.start.staffScreen}
+        </Link>
+        <Link href="/patient" className={linkStyle}>
+          {t.start.patientScreen}
+        </Link>
+        <Link href="/dashboard" className={linkStyle}>
+          {t.start.dashboard}
+        </Link>
+      </nav>
+    </main>
+  );
+}
diff --git a/components/start/StartVisit.tsx b/components/start/StartVisit.tsx
index 1f2b507..e087648 100644
--- a/components/start/StartVisit.tsx
+++ b/components/start/StartVisit.tsx
@@ -1,7 +1,7 @@
 "use client";
 
-// The start page's "Start a visit": choose a demo site and a language. The server starts the
-// visit and this phone remembers it, so the patient never types a code. If this phone already
+// The start page's "Start a visit": choose a demo site; the visit takes the language chosen on
+// this phone (the menu at the top of the page). The server starts the visit and this phone remembers it, so the patient never types a code. If this phone already
 // has a visit, it shows that one first (open, ended or expired), and never offers a new one
 // while the saved visit cannot be read.
 
@@ -21,12 +21,11 @@ const openLinkStyle =
   "inline-block min-h-11 rounded-xl bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-strong focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-slate-950";
 const boxStyle = "clean-card space-y-3";
 
-export function StartVisit() {
+export function StartVisit({ language }: { language: string }) {
   const router = useRouter();
   const savedToken = useSyncExternalStore(noSubscribe, loadSavedToken, () => null);
   const saved = usePatientView(savedToken);
   const [site, setSite] = useState<Site>("A");
-  const [language, setLanguage] = useState("en");
   const [problem, setProblem] = useState<Exclude<StartResult, "saved"> | null>(null);
   const [starting, setStarting] = useState(false);
   const [wantsNew, setWantsNew] = useState(false);
@@ -142,17 +141,6 @@ export function StartVisit() {
           ))}
         </div>
       </fieldset>
-      <label className="block">
-        <span className="font-semibold">{s.languageLabel}</span>
-        <select
-          value={language}
-          onChange={(e) => setLanguage(e.target.value)}
-          className="mt-2 block min-h-11 rounded-lg border-2 border-control px-3"
-        >
-          <option value="en">English</option>
-        </select>
-        <span className="mt-1 block text-sm text-slate-700">{s.languageNote}</span>
-      </label>
       <Button onClick={start} aria-disabled={starting} className="w-full text-lg">
         {starting ? s.starting : s.startButton}
       </Button>
diff --git a/data/savedLanguage.ts b/data/savedLanguage.ts
new file mode 100644
index 0000000..768f365
--- /dev/null
+++ b/data/savedLanguage.ts
@@ -0,0 +1,43 @@
+// Remembers the language chosen on this phone in browser storage, so every patient screen
+// (even the loading screen, before the visit is read) opens in that language.
+// Nothing else about the patient is stored.
+
+import { useSyncExternalStore } from "react";
+import { LANGUAGE_CODES } from "@/lib/text/languages";
+
+const LANGUAGE_KEY = "vwr.language";
+const listeners = new Set<() => void>();
+let chosen: string | null | undefined; // undefined = not read from storage yet
+
+function read(): string | null {
+  if (chosen !== undefined) return chosen;
+  try {
+    const saved = window.localStorage.getItem(LANGUAGE_KEY);
+    chosen = saved && LANGUAGE_CODES.includes(saved) ? saved : null;
+  } catch {
+    chosen = null; // storage blocked: no remembered choice
+  }
+  return chosen;
+}
+
+/** Save the choice and tell every part of the screen that shows text. */
+export function chooseLanguage(code: string): void {
+  if (!LANGUAGE_CODES.includes(code)) return;
+  chosen = code;
+  try {
+    window.localStorage.setItem(LANGUAGE_KEY, code);
+  } catch {
+    // Storage blocked: the choice still works on this page, it just won't be remembered.
+  }
+  listeners.forEach((tell) => tell());
+}
+
+function subscribe(onChange: () => void): () => void {
+  listeners.add(onChange);
+  return () => listeners.delete(onChange);
+}
+
+/** The language chosen on this phone, or null if none (also while the page is built on the server). */
+export function useChosenLanguage(): string | null {
+  return useSyncExternalStore(subscribe, read, () => null);
+}
diff --git a/lib/startVisitRequest.ts b/lib/startVisitRequest.ts
index 630a25d..d0e08f0 100644
--- a/lib/startVisitRequest.ts
+++ b/lib/startVisitRequest.ts
@@ -1,10 +1,11 @@
 // Checks what a phone sends when it asks to start a visit from home: only a site and a
 // language, and only values the app knows. Anything else is refused before the database is asked.
 
+import { LANGUAGE_CODES } from "./text/languages";
 import type { Site } from "./visit";
 
-/** Languages a visit can be started in. French, Urdu, Arabic and Mandarin are added in Phase 3. */
-export const START_LANGUAGES = ["en"];
+/** Languages a visit can be started in: every language the app offers. */
+export const START_LANGUAGES = LANGUAGE_CODES;
 
 export type StartVisitRequest = { site: Site; language: string };
 
diff --git a/lib/text/en.ts b/lib/text/en.ts
index 9977d30..3079672 100644
--- a/lib/text/en.ts
+++ b/lib/text/en.ts
@@ -35,8 +35,6 @@ export const en = {
     startIntro:
       "Starting here does not hold a place in line. Your place in line starts when a nurse sees you at triage. The most urgent patients are always seen first.",
     siteQuestion: "Which emergency department are you going to?",
-    languageLabel: "Language",
-    languageNote: "French, Urdu, Arabic and Mandarin are coming soon.",
     startButton: "Start a visit",
     starting: "Starting…",
     // SPEC
diff --git a/lib/text/index.ts b/lib/text/index.ts
index 0250b40..87abeca 100644
--- a/lib/text/index.ts
+++ b/lib/text/index.ts
@@ -1,12 +1,16 @@
-// Picks the patient text for a language. A language without its own text yet gets English,
+// Picks the patient text for a language. A language without its own text gets English,
 // so every screen always has every sentence (including the 911 line, SPEC rule 3).
 
+import { ar } from "./ar";
 import { en, type PatientText } from "./en";
+import { fr } from "./fr";
+import { ur } from "./ur";
+import { zh } from "./zh";
 
 export type { PatientText };
 
-/** Text for each language the app has. French, Urdu, Arabic and Mandarin are added in Phase 3. */
-const TEXT: Record<string, PatientText> = { en };
+/** Text for each language the app offers (lib/text/languages.ts lists them). */
+const TEXT: Record<string, PatientText> = { en, fr, ur, ar, zh };
 
 /** Puts values into a sentence's {braces}, for example fill("{low} to {high} minutes", { low: 40, high: 60 }). */
 export function fill(sentence: string, values: Record<string, string | number>): string {
diff --git a/lib/text/languages.test.ts b/lib/text/languages.test.ts
new file mode 100644
index 0000000..f4b0301
--- /dev/null
+++ b/lib/text/languages.test.ts
@@ -0,0 +1,44 @@
+// Checks the language list and which language a patient's screen shows.
+
+import { describe, expect, it } from "vitest";
+import { languageInfo, LANGUAGES, patientLanguage } from "./languages";
+import { textFor } from "./index";
+
+describe("the language list", () => {
+  it("has its own text for every language it offers (not the English fallback)", () => {
+    for (const { code } of LANGUAGES.filter((l) => l.code !== "en")) {
+      expect(textFor(code), code).not.toBe(textFor("en"));
+    }
+  });
+
+  it("writes Urdu and Arabic right to left, the others left to right", () => {
+    expect(languageInfo("ur").dir).toBe("rtl");
+    expect(languageInfo("ar").dir).toBe("rtl");
+    expect(languageInfo("fr").dir).toBe("ltr");
+    expect(languageInfo("zh").dir).toBe("ltr");
+  });
+
+  it("treats only English as approved until a fluent speaker checks the others", () => {
+    expect(LANGUAGES.filter((l) => l.approved).map((l) => l.code)).toEqual(["en"]);
+  });
+
+  it("gives English details for an unknown code", () => {
+    expect(languageInfo("zz").code).toBe("en");
+  });
+});
+
+describe("patientLanguage", () => {
+  it("prefers the language chosen on this phone", () => {
+    expect(patientLanguage("ar", "fr")).toBe("ar");
+  });
+
+  it("uses the visit's language when the phone has no choice, before or after it loads", () => {
+    expect(patientLanguage(null, "zh")).toBe("zh");
+    expect(patientLanguage(null, undefined)).toBe("en");
+  });
+
+  it("ignores an unknown code from either place", () => {
+    expect(patientLanguage("zz", "ur")).toBe("ur");
+    expect(patientLanguage(null, "zz")).toBe("en");
+  });
+});
diff --git a/lib/text/languages.ts b/lib/text/languages.ts
new file mode 100644
index 0000000..c26b72d
--- /dev/null
+++ b/lib/text/languages.ts
@@ -0,0 +1,37 @@
+// The languages the app offers, and which one a patient's screen shows.
+// "approved" turns true only after a fluent speaker has checked that language (SPEC);
+// until then its screens show the draft notice.
+
+export type LanguageInfo = {
+  code: string;
+  /** The language's name written in that language, so a patient can find their own. */
+  name: string;
+  dir: "ltr" | "rtl";
+  approved: boolean;
+};
+
+export const LANGUAGES: LanguageInfo[] = [
+  { code: "en", name: "English", dir: "ltr", approved: true },
+  { code: "fr", name: "Français", dir: "ltr", approved: false },
+  { code: "ur", name: "اردو", dir: "rtl", approved: false },
+  { code: "ar", name: "العربية", dir: "rtl", approved: false },
+  { code: "zh", name: "中文（简体）", dir: "ltr", approved: false },
+];
+
+export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);
+
+/** The language's details; English for an unknown code. */
+export function languageInfo(code: string | null | undefined): LanguageInfo {
+  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
+}
+
+/**
+ * The language a patient's screen shows: the one chosen on this phone, else the visit's own
+ * language, else English. The phone's choice is known before the visit loads, so even the
+ * loading screen and the 911 line are in the patient's language.
+ */
+export function patientLanguage(chosenOnPhone: string | null, visitLanguage: string | null | undefined): string {
+  if (chosenOnPhone && LANGUAGE_CODES.includes(chosenOnPhone)) return chosenOnPhone;
+  if (visitLanguage && LANGUAGE_CODES.includes(visitLanguage)) return visitLanguage;
+  return "en";
+}
```
