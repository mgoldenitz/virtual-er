# Gemini review: fixes from the patient-extras review, hours on staff screens, teal palette, louder beep, sound box

Status: ready to send.

Model: Gemini Hydrogen 4, High, in a new chat. (No Hydrogen 4 credits: Gemini 3.6 Flash, High.)
Give it everything below the line "Paste from here". Bring back its whole answer.

Branch `phase3-review-fixes` (not pushed), 20 commits from `b648d08` to `ce50733`. The diff below leaves out handoffs/, docs/ and screenshots/. No keys, tokens or patient data are in it.

Checked in this session (after `ce50733`): `npx tsc --noEmit` clean; `npm test` 37 files, 210 tests passed; `npm run lint` clean; `npm run build` passed.

Not checked: the sound box in Playwright (a `waiting` visit needs a staff sign-in, which Playwright cannot do); focus movement after "Turn off sound" with a screen reader; the 1 s resume wait and vibration on a real phone; the staff screens in the new colours (owner check on localhost).

---

Paste from here

You are reviewing a branch of a concept prototype of a virtual ER waiting room. It is a Next.js 16 app (App Router, React 19, Tailwind v4, Supabase), tested with vitest. Low-acuity patients wait off-site after triage and follow their place in line on their own phone. When staff recall them, the screen changes to "Please head back now". Synthetic data only. Accessibility target: WCAG 2.2 AA. Every alert must also show as words on screen, never sound or colour alone. No hospital logos, names or official colours. Five languages: English, French, Urdu, Arabic and Mandarin (Urdu and Arabic are right to left). The translations are drafts and wait for a fluent human reviewer.

The branch has these changes:
1. Fixes from an earlier review: an old phone forgets a token that opens no visit; the online check also runs when the page comes back on screen; small screen fixes; staff confirm before "Issue a new link"; a dashed frame on the patient status while offline; the chosen text size is set before the first paint; pause switch fixes (a save shows at once, no 0 count before the list loads, focus on the visible button, check-in waits on-site while the switch state is unknown).
2. An own teal colour palette in the colour tokens (`app/globals.css`); links use the brand colour.
3. Staff screens show times of 60 minutes or more as "1h 35min" (`lib/duration.ts`).
4. A louder beep (start volume 0.5, was 0.3; 880 Hz; 0.4 s), with the numbers in `lib/calledAlert.ts`.
5. The sound box on the patient screen: a "failed" state with words when sound cannot start, a "Turn off sound" button, a "Sound is off" line while the patient is called, a guard against a double tap, and vibration even when the beep cannot play.

Find problems. Do not confirm that it is fine. For each problem give the file, what goes wrong, a way to see it happen, and the smallest fix. Check in particular:
a. Bugs and state errors in `components/patient/SoundSwitch.tsx` and `components/patient/alertSound.ts`: race conditions between the tap, the repeat timer and the status change; what happens on iOS Safari and Android Chrome when the AudioContext is suspended or closed.
b. Accessibility: focus after "Turn off sound", the "Sound is off" and "failed" lines (they are not live regions; is that right?), colour contrast of the palette, and the hours format for screen readers.
c. `formatMinutes` edge cases and the regex in `components/staff/FollowUpPanel.tsx` that removes "Confirmed ... ago." for screen readers.
d. Anything a test claims but does not really prove.
If you find nothing for a point, say "nothing found" for that point.

```diff
diff --git a/app/dashboard/page.tsx b/app/dashboard/page.tsx
index 8b5af75..27fa1df 100644
--- a/app/dashboard/page.tsx
+++ b/app/dashboard/page.tsx
@@ -35,7 +35,7 @@ export default function DashboardPage() {
           ))}
         </ul>
       </section>
-      <Link href="/staff" className="inline-block min-h-11 py-2 font-semibold text-blue-900 underline underline-offset-2 focus-visible:outline-4 focus-visible:outline-slate-950">
+      <Link href="/staff" className="inline-block min-h-11 py-2 font-semibold text-brand underline underline-offset-2 focus-visible:outline-4 focus-visible:outline-slate-950">
         Back to the staff screen
       </Link>
     </main>
diff --git a/app/globals.css b/app/globals.css
index 7c3f7c7..58910d0 100644
--- a/app/globals.css
+++ b/app/globals.css
@@ -3,14 +3,14 @@
 /* Colour tokens. Every pair used for text passes WCAG 2.2 AA (4.5:1) on white.
    Patient screens use these as they are; the staff screens swap in the glass blue below. */
 @theme {
-  --color-brand: #1e40af;        /* buttons and links; white text on it is 8.7:1 */
-  --color-brand-strong: #1e3a8a; /* hover */
-  --color-ink: #111827;          /* main text, 17:1 */
-  --color-muted: #374151;        /* secondary text, 10:1 */
-  --color-canvas: #f8fafc;       /* page background behind cards */
+  --color-brand: #0f5e66;        /* deep teal: buttons and links; white text on it is 7.5:1 */
+  --color-brand-strong: #0b474d; /* hover, 10.4:1 */
+  --color-ink: #13212b;          /* main text, 16.4:1 */
+  --color-muted: #3d4f5c;        /* secondary text, 8.5:1 (7.9:1 on the canvas) */
+  --color-canvas: #f3f7f7;       /* page background behind cards; brand on it is 6.9:1 */
   --color-card: #ffffff;
-  --color-line: #e2e8f0;         /* card edges (decoration only) */
-  --color-control: #64748b;      /* input and select borders, 4.8:1 (WCAG needs 3:1) */
+  --color-line: #dbe7e8;         /* card edges (decoration only) */
+  --color-control: #5f7a80;      /* input and select borders, 4.6:1 (WCAG needs 3:1) */
 }
 
 body {
@@ -27,21 +27,21 @@ body {
   box-shadow: 0 1px 2px rgb(15 23 42 / 0.06);
 }
 
-/* Staff screens (glass look). White text on #1856ff is 5.5:1. */
+/* Staff screens (glass look). White text on #0e6f78 is 5.9:1. */
 .theme-staff {
-  --color-brand: #1856ff;
-  --color-brand-strong: #0f3fd1;
-  --color-ink: #141414;
+  --color-brand: #0e6f78;
+  --color-brand-strong: #0b474d;
+  --color-ink: #13212b;
 }
 
 /* A soft, pale colour wash behind the glass panels. It stays light so text on the panels
    keeps its contrast even where the panel is see-through. */
 .staff-backdrop {
-  background-color: #eef2fb;
+  background-color: #edf5f5;
   background-image:
-    radial-gradient(at 10% 0%, rgb(24 86 255 / 0.22) 0, transparent 50%),
-    radial-gradient(at 95% 15%, rgb(58 52 78 / 0.14) 0, transparent 45%),
-    radial-gradient(at 50% 100%, rgb(7 202 107 / 0.12) 0, transparent 50%);
+    radial-gradient(at 10% 0%, rgb(14 111 120 / 0.2) 0, transparent 50%),
+    radial-gradient(at 95% 15%, rgb(61 79 92 / 0.12) 0, transparent 45%),
+    radial-gradient(at 50% 100%, rgb(94 170 160 / 0.14) 0, transparent 50%);
 }
 
 /* A frosted panel: mostly white (82%), so text stays dark-on-light. */
diff --git a/app/layout.tsx b/app/layout.tsx
index bd64a7b..51cbbe4 100644
--- a/app/layout.tsx
+++ b/app/layout.tsx
@@ -3,6 +3,8 @@
 import type { Metadata } from "next";
 import type { ReactNode } from "react";
 import { Footer } from "@/components/Footer";
+import { InlineScript } from "@/components/InlineScript";
+import { textSizeScript } from "@/lib/textSize";
 import "./globals.css";
 
 export const metadata: Metadata = {
@@ -18,6 +20,11 @@ export default function RootLayout({ children }: { children: ReactNode }) {
     // ignores attribute differences on these two tags only; mismatches inside the app's own
     // screens are still reported.
     <html lang="en" className="h-full" suppressHydrationWarning>
+      {/* A plain script, not next/script: in the App Router, beforeInteractive runs the code later,
+          so the page would still flash at Normal size. */}
+      <head>
+        <InlineScript html={textSizeScript()} />
+      </head>
       <body className="flex min-h-full flex-col bg-white text-slate-900" suppressHydrationWarning>
         <div className="flex flex-1 flex-col">{children}</div>
         <Footer />
diff --git a/app/patient/page.tsx b/app/patient/page.tsx
index 7aba91d..c8b57da 100644
--- a/app/patient/page.tsx
+++ b/app/patient/page.tsx
@@ -6,7 +6,8 @@
 import { useEffect, useState } from "react";
 import { confirmOnMyWayByToken, recordSeen, usePatientView } from "@/data/patientVisit";
 import { chooseLanguage, useChosenLanguage } from "@/data/savedLanguage";
-import { takeTokenFromLink } from "@/data/savedToken";
+import { forgetSavedToken, takeTokenFromLink } from "@/data/savedToken";
+import { useOnline } from "@/data/useOnline";
 import { EmergencyLine } from "@/components/EmergencyLine";
 import { LanguageSwitch } from "@/components/LanguageSwitch";
 import { PatientShell } from "@/components/PatientShell";
@@ -16,6 +17,7 @@ import { SoundSwitch } from "@/components/patient/SoundSwitch";
 import { StatusAnnouncer } from "@/components/patient/StatusAnnouncer";
 import { StillHerePrompt } from "@/components/patient/StillHerePrompt";
 import { TextSizeSwitch } from "@/components/patient/TextSizeSwitch";
+import { isDeadToken } from "@/lib/deadToken";
 import { fill, textFor } from "@/lib/text";
 import { languageInfo, patientLanguage } from "@/lib/text/languages";
 
@@ -25,6 +27,7 @@ export default function PatientPage() {
   const [brokenLink, setBrokenLink] = useState(false);
   const [sending, setSending] = useState(false);
   const chosenLanguage = useChosenLanguage();
+  const online = useOnline();
 
   // Reading the link and browser storage can only happen in the browser, after the first render.
   // A new link opened on this same page (only the #t=... part changes) switches to that visit.
@@ -43,6 +46,14 @@ export default function PatientPage() {
   }, []);
 
   const result = usePatientView(token ?? null);
+
+  // The token opens no visit any more (for example staff issued a new link for a lost phone):
+  // say the link did not work, and forget the token so this phone never tries it again.
+  const deadToken = isDeadToken(token, result);
+  useEffect(() => {
+    if (deadToken) forgetSavedToken();
+  }, [deadToken]);
+  const linkFailed = brokenLink || deadToken;
   const loading = token === undefined || result === undefined;
   const unavailable = result === "unavailable";
   const view = result === "unavailable" ? null : result;
@@ -105,9 +116,9 @@ export default function PatientPage() {
       ) : !view ? (
         <section aria-labelledby="none-heading" className="clean-card space-y-2">
           <h2 id="none-heading" className="text-2xl font-bold">
-            {brokenLink ? p.brokenLinkHeading : p.noVisitHeading}
+            {linkFailed ? p.brokenLinkHeading : p.noVisitHeading}
           </h2>
-          {brokenLink && (
+          {linkFailed && (
             <p className="text-lg">{p.brokenLinkText}</p>
           )}
           <p className="text-lg">{p.findVisitHelp}</p>
@@ -122,7 +133,10 @@ export default function PatientPage() {
             · <bdi>{fill(t.siteName, { site: view.site })}</bdi>
           </p>
           {token && view.status === "waiting" && <StillHerePrompt view={view} token={token} language={language} />}
-          <PatientStatus view={view} language={language} onOnMyWay={onOnMyWay} sending={sending} />
+          {/* Offline: a dashed frame shows the status may be old. The frame is always there, so the status keeps its place. */}
+          <div className={online ? "" : "rounded-xl border-4 border-dashed border-slate-700 p-1"} data-testid="status-frame">
+            <PatientStatus view={view} language={language} onOnMyWay={onOnMyWay} sending={sending} />
+          </div>
           {(view.status === "waiting" || view.status === "called") && <SoundSwitch status={view.status} language={language} />}
           {notSaved && (
             <p role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
diff --git a/app/staff/page.tsx b/app/staff/page.tsx
index faf7db1..5b63b26 100644
--- a/app/staff/page.tsx
+++ b/app/staff/page.tsx
@@ -112,7 +112,7 @@ export default function StaffPage() {
             onCreated={showSlip}
             homeVisit={homeVisit}
             homeProblem={homeProblem}
-            offsitePaused={paused === true}
+            offsitePaused={paused}
             onHomeDone={() => setHomeVisit(null)}
           />
           {slip && <VisitSlip code={slip.code} token={slip.access_token} language={slip.language} onClose={() => setSlip(null)} />}
@@ -125,7 +125,7 @@ export default function StaffPage() {
           <p role="status" className="min-h-6 font-semibold">
             {announcement}
           </p>
-          <PauseSwitch key={`pause-${site}`} site={site} paused={paused} offSiteCount={line.length} onResult={setAnnouncement} />
+          <PauseSwitch key={`pause-${site}`} site={site} paused={paused} offSiteCount={visits ? line.length : null} onResult={setAnnouncement} />
           {visits && <RecallAllPanel key={`recall-${site}`} visits={visits} site={site} onResult={(message, closed) => (closed ? onLeftList(message) : setAnnouncement(message))} />}
           {visits === null || now === null ? (
             <p>{outOfDate ? "No list to show yet." : "Loading…"}</p>
diff --git a/components/InlineScript.tsx b/components/InlineScript.tsx
new file mode 100644
index 0000000..093d52f
--- /dev/null
+++ b/components/InlineScript.tsx
@@ -0,0 +1,14 @@
+// A script in the page's <head> that runs while the browser reads the HTML, before the first paint.
+// The server sends it as JavaScript; in the browser React sees "text/plain", so it does not warn
+// that the script will not run again (it already ran). Pattern from the Next.js guide
+// "Preventing flash before hydration". suppressHydrationWarning covers the different type.
+
+export function InlineScript({ html }: { html: string }) {
+  return (
+    <script
+      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
+      suppressHydrationWarning
+      dangerouslySetInnerHTML={{ __html: html }}
+    />
+  );
+}
diff --git a/components/patient/PatientStatus.tsx b/components/patient/PatientStatus.tsx
index 0fb623c..42a0025 100644
--- a/components/patient/PatientStatus.tsx
+++ b/components/patient/PatientStatus.tsx
@@ -53,7 +53,6 @@ function Called({ view, onOnMyWay, sending, t }: Props & { t: PatientText }) {
           {sending ? p.sending : p.onMyWay}
         </Button>
       )}
-      <p className="text-sm text-slate-800">{p.alertLimits}</p>
     </section>
   );
 }
@@ -107,7 +106,7 @@ function Expired({ t }: { t: PatientText }) {
       <p className="text-lg">{t.expiredText}</p>
       <p className="text-lg">{p.expiredHelp}</p>
       <p className="text-lg">
-        <Link href="/" className="font-semibold text-blue-900 underline underline-offset-2">
+        <Link href="/" className="font-semibold text-brand underline underline-offset-2">
           {p.expiredNewVisit}
         </Link>
       </p>
diff --git a/components/patient/SoundSwitch.test.tsx b/components/patient/SoundSwitch.test.tsx
index 8d9a4d3..8e3cd77 100644
--- a/components/patient/SoundSwitch.test.tsx
+++ b/components/patient/SoundSwitch.test.tsx
@@ -7,7 +7,17 @@ import { textFor } from "@/lib/text";
 import { SoundSwitch } from "./SoundSwitch";
 
 // Replace the real sound player, so the tests never touch the browser's audio.
-vi.mock("./alertSound", () => ({ unlockSound: vi.fn(), playAlert: vi.fn() }));
+vi.mock("./alertSound", () => ({ unlockSound: vi.fn(), playAlert: vi.fn(), stopVibration: vi.fn() }));
+
+// React writes quote marks as &quot; in the HTML, so the expected words are escaped the same way.
+function htmlText(words: string): string {
+  return words
+    .replace(/&/g, "&amp;")
+    .replace(/"/g, "&quot;")
+    .replace(/'/g, "&#x27;")
+    .replace(/</g, "&lt;")
+    .replace(/>/g, "&gt;");
+}
 
 describe("SoundSwitch", () => {
   it("shows the English notice and a Turn on sound button", () => {
@@ -34,4 +44,24 @@ describe("SoundSwitch", () => {
     const html = renderToStaticMarkup(<SoundSwitch status="called" language="en" />);
     expect(html).not.toContain("Sound is on");
   });
+
+  it("shows the offWhileCalled line when the visit is called and the sound is off", () => {
+    const html = renderToStaticMarkup(<SoundSwitch status="called" language="en" />);
+    expect(html).toContain(htmlText(textFor("en").sound.offWhileCalled));
+  });
+
+  it("does not show the offWhileCalled line while waiting", () => {
+    const html = renderToStaticMarkup(<SoundSwitch status="waiting" language="en" />);
+    expect(html).not.toContain(htmlText(textFor("en").sound.offWhileCalled));
+  });
+
+  it("does not show the failed line on first render", () => {
+    const html = renderToStaticMarkup(<SoundSwitch status="called" language="en" />);
+    expect(html).not.toContain('data-testid="sound-failed"');
+  });
+
+  it("shows the Arabic offWhileCalled line for ar when called", () => {
+    const html = renderToStaticMarkup(<SoundSwitch status="called" language="ar" />);
+    expect(html).toContain(htmlText(textFor("ar").sound.offWhileCalled));
+  });
 });
diff --git a/components/patient/SoundSwitch.tsx b/components/patient/SoundSwitch.tsx
index 520bc0c..bac0291 100644
--- a/components/patient/SoundSwitch.tsx
+++ b/components/patient/SoundSwitch.tsx
@@ -5,22 +5,44 @@
 
 import { useEffect, useRef, useState } from "react";
 import { Button } from "@/components/Button";
-import { ALERT_REPEAT_MS, shouldAlert } from "@/lib/calledAlert";
+import { ALERT_REPEAT_MS, type SoundState, shouldAlert, soundNote } from "@/lib/calledAlert";
 import { textFor } from "@/lib/text";
 import type { VisitStatus } from "@/lib/visit";
-import { playAlert, unlockSound } from "./alertSound";
+import { playAlert, stopVibration, unlockSound } from "./alertSound";
 
 export function SoundSwitch({ status, language }: { status: VisitStatus; language: string }) {
   const t = textFor(language).sound;
-  const [soundOn, setSoundOn] = useState(false);
+  const [state, setState] = useState<SoundState>("off");
+  const soundOn = state === "on";
   const onWords = useRef<HTMLParagraphElement>(null);
+  const turnOnButton = useRef<HTMLButtonElement>(null);
+  // True while a tap on "Turn on sound" is still being handled. Stops a double tap from running twice.
+  const busy = useRef(false);
+  // True after "Turn off sound" is tapped, so focus can move to "Turn on sound" once it is back on screen.
+  const focusTurnOn = useRef(false);
 
   async function turnOn() {
-    const ok = await unlockSound();
-    if (!ok) return;
-    setSoundOn(true);
-    // When the visit is already called, the effect below plays the alert, so no test beep is needed.
-    if (status !== "called") playAlert();
+    if (busy.current) return;
+    busy.current = true;
+    try {
+      const ok = await unlockSound();
+      if (!ok) {
+        setState("failed");
+        return;
+      }
+      setState("on");
+      // When the visit is already called, the effect below plays the alert, so no test beep is needed.
+      // If the test beep cannot play, say so now, not only when the patient is called.
+      if (status !== "called" && !(await playAlert())) setState("failed");
+    } finally {
+      busy.current = false;
+    }
+  }
+
+  function turnOff() {
+    focusTurnOn.current = true;
+    setState("off");
+    stopVibration();
   }
 
   // The button goes away after the tap, so move keyboard and screen-reader focus to the words
@@ -29,10 +51,22 @@ export function SoundSwitch({ status, language }: { status: VisitStatus; languag
     if (soundOn) onWords.current?.focus();
   }, [soundOn]);
 
+  // After "Turn off sound", the "Turn on sound" button is back: move focus to it, so focus is not lost.
+  useEffect(() => {
+    if (state === "off" && focusTurnOn.current) {
+      focusTurnOn.current = false;
+      turnOnButton.current?.focus();
+    }
+  }, [state]);
+
   // Play now if the rule allows it, then again every ALERT_REPEAT_MS, and when the page comes back on screen.
+  // If the phone will not play the beep, the box goes back to "off" so the page can say so.
   useEffect(() => {
     const tick = () => {
-      if (shouldAlert(status, soundOn, document.visibilityState === "visible")) playAlert();
+      if (!shouldAlert(status, soundOn, document.visibilityState === "visible")) return;
+      void playAlert().then((ok) => {
+        if (!ok) setState("off");
+      });
     };
     tick();
     const timer = window.setInterval(tick, ALERT_REPEAT_MS);
@@ -43,18 +77,31 @@ export function SoundSwitch({ status, language }: { status: VisitStatus; languag
     };
   }, [status, soundOn]);
 
+  const note = soundNote(status, state);
+
   return (
-    <section className="clean-card space-y-2">
+    <div className="clean-card space-y-2">
       <p className="text-base">{t.notice}</p>
       {soundOn ? (
-        <p ref={onWords} tabIndex={-1} className="font-semibold" data-testid="sound-on">
-          {t.on}
-        </p>
+        <>
+          <p ref={onWords} tabIndex={-1} className="font-semibold" data-testid="sound-on">
+            {t.on}
+          </p>
+          <Button variant="secondary" onClick={turnOff} className="w-full">
+            {t.turnOff}
+          </Button>
+        </>
       ) : (
-        <Button variant="secondary" onClick={turnOn} className="w-full">
+        <Button ref={turnOnButton} variant="secondary" onClick={turnOn} className="w-full">
           {t.turnOn}
         </Button>
       )}
-    </section>
+      {note === "failed" && <p data-testid="sound-failed">{t.failed}</p>}
+      {note === "offWhileCalled" && (
+        <p data-testid="sound-off-called" className="font-semibold">
+          {t.offWhileCalled}
+        </p>
+      )}
+    </div>
   );
 }
diff --git a/components/patient/TextSizeSwitch.tsx b/components/patient/TextSizeSwitch.tsx
index 567efb5..39915db 100644
--- a/components/patient/TextSizeSwitch.tsx
+++ b/components/patient/TextSizeSwitch.tsx
@@ -40,7 +40,7 @@ export function TextSizeSwitch({ language }: { language: string }) {
                 value={option}
                 checked={checked}
                 onChange={() => chooseTextSize(option)}
-                className="h-5 w-5"
+                className="h-5 w-5 shrink-0"
               />
               <span>{words[option]}</span>
             </label>
diff --git a/components/patient/alertSound.ts b/components/patient/alertSound.ts
index 10e67a5..07fae61 100644
--- a/components/patient/alertSound.ts
+++ b/components/patient/alertSound.ts
@@ -1,14 +1,29 @@
 // Plays the demo beep and vibration on the patient screen. iPhone Safari has no vibration for web pages, so only the beep plays there.
 
+import { BEEP_HZ, BEEP_SECONDS, BEEP_VOLUME } from "@/lib/calledAlert";
+
 /** The one shared sound player. It is made by unlockSound() after a tap, then reused. */
 let context: AudioContext | null = null;
 
+/** The longest time playAlert() waits for the player to start again, in milliseconds. */
+const RESUME_WAIT_MS = 1000;
+
 /** The browser's audio player class (Safari older versions use the webkit name). */
 function audioContextClass(): typeof AudioContext | undefined {
   const webkitWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
   return window.AudioContext ?? webkitWindow.webkitAudioContext;
 }
 
+/** True when the player is running and can make sound. */
+function isRunning(ctx: AudioContext): boolean {
+  return ctx.state === "running";
+}
+
+/** Waits this many milliseconds, then finishes. */
+function waitAtMost(ms: number): Promise<void> {
+  return new Promise((resolve) => setTimeout(resolve, ms));
+}
+
 /**
  * Call this inside a button's click. Browsers allow sound only after a tap.
  * Gives true only when the sound player really started, false when the browser has no Web Audio or refused.
@@ -28,30 +43,54 @@ export async function unlockSound(): Promise<boolean> {
   }
 }
 
-/** Plays one short beep (880 Hz, 0.4 seconds) and a vibration where the phone allows it. */
-export function playAlert(): void {
+/**
+ * Plays one short beep (BEEP_HZ, BEEP_SECONDS long, at BEEP_VOLUME; see lib/calledAlert.ts) and a vibration where the phone allows it.
+ * Gives true when the beep played. Gives false when it did not play (no player, or the player would not start).
+ */
+export async function playAlert(): Promise<boolean> {
   try {
-    if (context) {
-      const ctx = context;
-      // iPhone can pause the player while the page is hidden; start it again before each beep.
-      if (ctx.state !== "running") void ctx.resume().catch(() => undefined);
-      const oscillator = ctx.createOscillator();
-      const gain = ctx.createGain();
-      const now = ctx.currentTime;
-      oscillator.type = "sine";
-      oscillator.frequency.value = 880;
-      // Start at 0.3 and fade to almost silence at the end, so the beep does not click.
-      gain.gain.setValueAtTime(0.3, now);
-      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
-      oscillator.connect(gain);
-      gain.connect(ctx.destination);
-      oscillator.start(now);
-      oscillator.stop(now + 0.4);
-    }
-    if (typeof navigator.vibrate === "function") {
-      navigator.vibrate([200, 100, 200]);
+    // Vibrate first, so the phone still vibrates when the beep cannot play.
+    vibrate();
+    if (!context) return false;
+    const ctx = context;
+    // iPhone can pause the player while the page is hidden; start it again before each beep.
+    if (!isRunning(ctx)) {
+      await Promise.race([ctx.resume(), waitAtMost(RESUME_WAIT_MS)]);
+      if (!isRunning(ctx)) return false;
     }
+    const oscillator = ctx.createOscillator();
+    const gain = ctx.createGain();
+    const now = ctx.currentTime;
+    oscillator.type = "sine";
+    oscillator.frequency.value = BEEP_HZ;
+    // Start at BEEP_VOLUME and fade to almost silence at the end, so the beep does not click.
+    gain.gain.setValueAtTime(BEEP_VOLUME, now);
+    gain.gain.exponentialRampToValueAtTime(0.0001, now + BEEP_SECONDS);
+    oscillator.connect(gain);
+    gain.connect(ctx.destination);
+    oscillator.start(now);
+    oscillator.stop(now + BEEP_SECONDS);
+    return true;
   } catch {
     // Ignore sound and vibration errors. The on-screen words remain the real alert.
+    return false;
+  }
+}
+
+/** One vibration pattern (200 ms on, 100 ms off, 200 ms on) where the phone allows it. */
+function vibrate(): void {
+  try {
+    if (typeof navigator.vibrate === "function") navigator.vibrate([200, 100, 200]);
+  } catch {
+    // Ignore: the on-screen words remain the real alert.
+  }
+}
+
+/** Stops a vibration that is running. Phones with no vibration are ignored. */
+export function stopVibration(): void {
+  try {
+    navigator.vibrate?.(0);
+  } catch {
+    // Ignore: the on-screen words remain the real alert.
   }
 }
diff --git a/components/staff/CheckInPanel.test.tsx b/components/staff/CheckInPanel.test.tsx
new file mode 100644
index 0000000..e75a1db
--- /dev/null
+++ b/components/staff/CheckInPanel.test.tsx
@@ -0,0 +1,33 @@
+// Checks that check-in offers only on-site waiting while the paused switch is not read yet (null), and offers off-site waiting only once it is read as not paused.
+
+import { renderToStaticMarkup } from "react-dom/server";
+import { describe, expect, it } from "vitest";
+import { CheckInPanel } from "./CheckInPanel";
+
+function render(offsitePaused: boolean | null) {
+  return renderToStaticMarkup(
+    <CheckInPanel
+      site="A"
+      onAttempt={() => {}}
+      onCreated={() => {}}
+      homeVisit={null}
+      homeProblem={null}
+      onHomeDone={() => {}}
+      offsitePaused={offsitePaused}
+    />,
+  );
+}
+
+describe("CheckInPanel while the paused switch is not read", () => {
+  it("offers no off-site waiting and says the switch is being checked", () => {
+    const html = render(null);
+    expect(html).not.toContain("Start off-site waiting");
+    expect(html).not.toContain("Offered, declined");
+    expect(html).toContain("Checking whether off-site waiting is paused");
+  });
+
+  it("offers off-site waiting once the switch is read as not paused", () => {
+    const html = render(false);
+    expect(html).toContain("Start off-site waiting");
+  });
+});
diff --git a/components/staff/CheckInPanel.tsx b/components/staff/CheckInPanel.tsx
index f7409db..2e2b916 100644
--- a/components/staff/CheckInPanel.tsx
+++ b/components/staff/CheckInPanel.tsx
@@ -28,11 +28,14 @@ type Props = {
   homeProblem: string | null;
   /** Leave the home visit: after it is checked in, or when staff cancel. */
   onHomeDone: () => void;
-  /** Off-site waiting is paused at this site: check-in offers on-site waiting only. */
-  offsitePaused: boolean;
+  /** true: paused; null: not read yet. Both mean check-in offers on-site waiting only. */
+  offsitePaused: boolean | null;
 };
 
 export function CheckInPanel({ site, onAttempt, onCreated, homeVisit, homeProblem, onHomeDone, offsitePaused }: Props) {
+  // Only a read that says "not paused" lets staff offer off-site waiting.
+  const onSiteOnly = offsitePaused !== false;
+
   const [ctas, setCtas] = useState<4 | 5 | null>(null);
   const [ticked, setTicked] = useState<Record<string, boolean>>({});
   const [language, setLanguage] = useState("en");
@@ -96,8 +99,12 @@ export function CheckInPanel({ site, onAttempt, onCreated, homeVisit, homeProble
       setMessage("Choose CTAS 4 or 5 first.");
       return;
     }
-    if (outcome === "waiting" && offsitePaused) {
-      setMessage("Off-site waiting is paused at this site. Press “Waits on-site” instead.");
+    if (outcome === "waiting" && onSiteOnly) {
+      setMessage(
+        offsitePaused === null
+          ? "Checking whether off-site waiting is paused. Press “Waits on-site” instead."
+          : "Off-site waiting is paused at this site. Press “Waits on-site” instead.",
+      );
       return;
     }
     if (outcome === "waiting" && !CHECKLIST.every((item) => ticked[item.id])) {
@@ -114,7 +121,7 @@ export function CheckInPanel({ site, onAttempt, onCreated, homeVisit, homeProble
     setMessage(
       outcome === "waiting"
         ? `Visit ${code} is now waiting off-site.`
-        : `Visit ${code} recorded as ${outcome === "declined" ? "offered, declined" : offsitePaused ? "waiting on-site (off-site waiting paused)" : "not eligible"}. The patient waits on-site as usual.`,
+        : `Visit ${code} recorded as ${outcome === "declined" ? "offered, declined" : offsitePaused === true ? "waiting on-site (off-site waiting paused)" : offsitePaused === null ? "waiting on-site" : "not eligible"}. The patient waits on-site as usual.`,
     );
   }
 
@@ -202,9 +209,11 @@ export function CheckInPanel({ site, onAttempt, onCreated, homeVisit, homeProble
 
       {!homeProblem && (
         <div className="flex flex-wrap gap-3">
-          {offsitePaused ? (
+          {onSiteOnly ? (
             <p className="w-full rounded-lg border-2 border-red-800 bg-red-50 p-3 font-semibold text-red-900">
-              Off-site waiting is paused at this site: the patient waits on-site.
+              {offsitePaused
+                ? "Off-site waiting is paused at this site: the patient waits on-site."
+                : "Checking whether off-site waiting is paused. The patient can wait on-site."}
             </p>
           ) : (
             <Button type="submit" aria-disabled={saving}>
@@ -214,13 +223,13 @@ export function CheckInPanel({ site, onAttempt, onCreated, homeVisit, homeProble
           {/* While paused nobody can be offered off-site waiting, so "Offered, declined" would count
               a patient as offered by mistake. "Waits on-site" records not_eligible, which leaves the
               patient out of the dashboard's "offered" percentage, as it should. */}
-          {!offsitePaused && (
+          {!onSiteOnly && (
             <Button variant="secondary" aria-disabled={saving} onClick={() => finish("declined")}>
               Offered, declined
             </Button>
           )}
           <Button variant="secondary" aria-disabled={saving} onClick={() => finish("not_eligible")}>
-            {offsitePaused ? "Waits on-site (off-site waiting paused)" : "Not eligible"}
+            {offsitePaused === true ? "Waits on-site (off-site waiting paused)" : offsitePaused === null ? "Waits on-site" : "Not eligible"}
           </Button>
         </div>
       )}
diff --git a/components/staff/ExpectedArrivals.tsx b/components/staff/ExpectedArrivals.tsx
index 3f12f08..a151e05 100644
--- a/components/staff/ExpectedArrivals.tsx
+++ b/components/staff/ExpectedArrivals.tsx
@@ -8,6 +8,7 @@
 import { useState, type FormEvent } from "react";
 import { findVisitByCode } from "@/data/staffActions";
 import { backForReassessment, expectedArrivals, isExpected } from "@/lib/expectedArrivals";
+import { formatMinutes } from "@/lib/duration";
 import { minutesBetween } from "@/lib/queue";
 import type { Site, Visit } from "@/lib/visit";
 import { Button } from "@/components/Button";
@@ -106,7 +107,7 @@ export function ExpectedArrivals({ visits, site, now, onChoose }: Props) {
             >
               <p>
                 <span className="font-mono text-lg font-bold tracking-widest">{visit.code}</span> · started{" "}
-                {minutesBetween(visit.created_at, now)} min ago
+                {formatMinutes(minutesBetween(visit.created_at, now))} ago
               </p>
               <Button variant="secondary" onClick={() => onChoose(visit)}>
                 Check in<span className="sr-only"> visit {visit.code}</span>
diff --git a/components/staff/FollowUpPanel.tsx b/components/staff/FollowUpPanel.tsx
index c150c94..5e94ec7 100644
--- a/components/staff/FollowUpPanel.tsx
+++ b/components/staff/FollowUpPanel.tsx
@@ -7,6 +7,7 @@
 import { confirmUnableToReachFor, recordPhoneCallFor } from "@/data/staffActions";
 import { CALL_PHONE_AGAIN_MINUTES, CALL_REVIEW_MINUTES, CALL_SECOND_ALERT_MINUTES } from "@/lib/demoTimes";
 import { canRecordPhoneCall, staffFollowUp, type StaffFollowUp } from "@/lib/followUp";
+import { formatMinutes } from "@/lib/duration";
 import { minutesBetween } from "@/lib/queue";
 import type { ChangeResult, Visit } from "@/lib/visit";
 import { Button } from "@/components/Button";
@@ -48,7 +49,7 @@ function flagFor(followUp: StaffFollowUp, visit: Visit, now: Date): { text: stri
       };
     case "on_way_not_arrived": {
       const since = visit.confirmed_at ? minutesBetween(visit.confirmed_at, now) : 0;
-      return { text: `On the way, not arrived. Confirmed ${since} min ago.`, tone: AMBER };
+      return { text: `On the way, not arrived. Confirmed ${formatMinutes(since)} ago.`, tone: AMBER };
     }
     default:
       return null;
@@ -61,7 +62,7 @@ export function FollowUpPanel({ visit, now, saving, act }: Props) {
   const canPhone = canRecordPhoneCall(visit, now);
   // Screen readers hear each new flag once (politely). The minute counts are left out so the
   // words do not change, and so are not read again, every minute.
-  const spoken = flag ? `Visit ${visit.code}: ${flag.text.replace(/ Confirmed \d+ min ago\./, "")}` : "";
+  const spoken = flag ? `Visit ${visit.code}: ${flag.text.replace(/ Confirmed [^.]+ ago\./, "")}` : "";
   const announcer = (
     <p role="status" className="sr-only">
       {spoken}
diff --git a/components/staff/NewLinkPanel.test.tsx b/components/staff/NewLinkPanel.test.tsx
new file mode 100644
index 0000000..51fd2e3
--- /dev/null
+++ b/components/staff/NewLinkPanel.test.tsx
@@ -0,0 +1,13 @@
+// Checks that the lost-phone panel starts with "Issue a new link" only, and not the confirm button.
+
+import { renderToStaticMarkup } from "react-dom/server";
+import { describe, expect, it, vi } from "vitest";
+import { NewLinkPanel } from "./NewLinkPanel";
+
+describe("NewLinkPanel", () => {
+  it("shows the issue button and not the confirm button before staff tap it", () => {
+    const html = renderToStaticMarkup(<NewLinkPanel code="ABC123" saving={false} onConfirm={vi.fn()} />);
+    expect(html).toContain("Issue a new link");
+    expect(html).not.toContain("Yes, issue a new link");
+  });
+});
diff --git a/components/staff/NewLinkPanel.tsx b/components/staff/NewLinkPanel.tsx
new file mode 100644
index 0000000..e8ce702
--- /dev/null
+++ b/components/staff/NewLinkPanel.tsx
@@ -0,0 +1,70 @@
+"use client";
+
+// The "Lost or stolen phone" panel for one visit. Staff must confirm before a new link is issued,
+// because the old phone stops working at once. This file only asks; the parent saves the change.
+
+import { useEffect, useRef, useState } from "react";
+import { Button } from "@/components/Button";
+
+type Props = {
+  /** The visit code, read out with the button so staff know which patient it is for. */
+  code: string;
+  /** True while a change is on its way. "Yes" does nothing then. */
+  saving: boolean;
+  /** Called once staff confirm. */
+  onConfirm: () => void;
+};
+
+type Mode = "idle" | "confirm";
+
+export function NewLinkPanel({ code, saving, onConfirm }: Props) {
+  const [mode, setMode] = useState<Mode>("idle");
+  const issueButton = useRef<HTMLButtonElement>(null);
+  const yesButton = useRef<HTMLButtonElement>(null);
+
+  // When the confirm question opens, focus moves to "Yes" for keyboard and screen-reader users.
+  useEffect(() => {
+    if (mode === "confirm") yesButton.current?.focus();
+  }, [mode]);
+
+  // Back to the first state. The "Issue a new link" button is drawn again, so focus waits one tick.
+  const returnToIssue = () => {
+    setMode("idle");
+    window.setTimeout(() => issueButton.current?.focus(), 0);
+  };
+
+  const confirm = () => {
+    if (saving) return;
+    onConfirm();
+    returnToIssue();
+  };
+
+  return (
+    <details className="mt-3">
+      <summary className="cursor-pointer py-2 text-slate-800 underline underline-offset-2">
+        Lost or stolen phone
+      </summary>
+      <div className="mt-2 space-y-2">
+        <p>The old link and the old slip stop working. Give the patient the new QR code.</p>
+        {mode === "idle" && (
+          <Button variant="secondary" ref={issueButton} aria-disabled={saving} onClick={() => setMode("confirm")}>
+            Issue a new link<span className="sr-only"> {code}</span>
+          </Button>
+        )}
+        {mode === "confirm" && (
+          <>
+            <p className="font-semibold">The old phone stops working at once. Issue a new link for {code}?</p>
+            <div className="flex flex-wrap gap-2">
+              <Button variant="danger" ref={yesButton} aria-disabled={saving} onClick={confirm}>
+                Yes, issue a new link
+              </Button>
+              <Button variant="secondary" onClick={returnToIssue}>
+                Cancel
+              </Button>
+            </div>
+          </>
+        )}
+      </div>
+    </details>
+  );
+}
diff --git a/components/staff/PauseSwitch.test.tsx b/components/staff/PauseSwitch.test.tsx
new file mode 100644
index 0000000..6975f36
--- /dev/null
+++ b/components/staff/PauseSwitch.test.tsx
@@ -0,0 +1,24 @@
+// Checks that the pause switch never shows "0 patients" before the off-site list is read, and says the count words once it is.
+
+import { renderToStaticMarkup } from "react-dom/server";
+import { describe, expect, it } from "vitest";
+import { patientCount } from "@/lib/patientCount";
+import { PauseSwitch } from "./PauseSwitch";
+
+describe("PauseSwitch count wording", () => {
+  it("names no number while the off-site list is not read yet", () => {
+    const html = renderToStaticMarkup(
+      <PauseSwitch site="A" paused={true} offSiteCount={null} onResult={() => {}} />,
+    );
+    expect(html).not.toContain("0 patients");
+    expect(html).toContain("the patients still off-site");
+  });
+
+  it("uses the count words once the list is read", () => {
+    const html = renderToStaticMarkup(
+      <PauseSwitch site="A" paused={true} offSiteCount={2} onResult={() => {}} />,
+    );
+    expect(html).toContain(patientCount(2));
+    expect(html).not.toContain("the patients still off-site");
+  });
+});
diff --git a/components/staff/PauseSwitch.tsx b/components/staff/PauseSwitch.tsx
index 7404de1..90e9f6a 100644
--- a/components/staff/PauseSwitch.tsx
+++ b/components/staff/PauseSwitch.tsx
@@ -15,8 +15,8 @@ type Props = {
   site: Site;
   /** The switch as last read, or null if it could not be read yet. */
   paused: boolean | null;
-  /** Patients still in the off-site line at this site (waiting or recalled). */
-  offSiteCount: number;
+  /** Patients still in the off-site line at this site (waiting or recalled), or null while the list is not read yet. */
+  offSiteCount: number | null;
   /** Called with words for staff and screen readers after each change. */
   onResult: (message: string) => void;
 };
@@ -28,8 +28,10 @@ export function PauseSwitch({ site, paused, offSiteCount, onResult }: Props) {
   const [checked, setChecked] = useState(false);
   const [saving, setSaving] = useState(false);
   const [note, setNote] = useState("");
-  const heading = useRef<HTMLHeadingElement>(null);
   const question = useRef<HTMLHeadingElement>(null);
+  // After Cancel or a save, focus lands on the one button that is still on screen.
+  const pauseButton = useRef<HTMLButtonElement>(null);
+  const resumeButton = useRef<HTMLButtonElement>(null);
 
   // Keyboard and screen-reader users land on each confirmation question when it opens.
   useEffect(() => {
@@ -40,11 +42,15 @@ export function PauseSwitch({ site, paused, offSiteCount, onResult }: Props) {
     return <p className="text-sm text-slate-700">Checking whether off-site waiting is paused at this site…</p>;
   }
 
+  // Count words only when the list has been read; otherwise the sentences name no number.
+  const stillOff = offSiteCount === null ? "the patients still off-site" : `the ${patientCount(offSiteCount)} still off-site`;
+  const alreadyOff = offSiteCount === null ? "Patients already off-site" : `The ${patientCount(offSiteCount)} already off-site`;
+
   const close = () => {
     setMode("idle");
     setChecked(false);
     setNote("");
-    window.setTimeout(() => heading.current?.focus(), 0);
+    window.setTimeout(() => (resumeButton.current ?? pauseButton.current)?.focus(), 0);
   };
 
   const save = async (pause: boolean) => {
@@ -74,7 +80,7 @@ export function PauseSwitch({ site, paused, offSiteCount, onResult }: Props) {
 
   return (
     <section aria-labelledby={`pause-heading-${site}`} className="space-y-2" data-testid="pause-switch">
-      <h3 id={`pause-heading-${site}`} ref={heading} tabIndex={-1} className="sr-only">
+      <h3 id={`pause-heading-${site}`} className="sr-only">
         Off-site waiting switch, Demo Site {site}
       </h3>
 
@@ -83,11 +89,10 @@ export function PauseSwitch({ site, paused, offSiteCount, onResult }: Props) {
           <p className="text-lg font-bold">Off-site waiting is paused at Demo Site {site}.</p>
           <p>
             No new off-site sign-ups: the start page sends patients to the emergency department, and check-in offers
-            on-site waiting only. Check every outstanding recall, and offer on-site waiting to the{" "}
-            {patientCount(offSiteCount)} still off-site.
+            on-site waiting only. Check every outstanding recall, and offer on-site waiting to {stillOff}.
           </p>
           {mode === "idle" && (
-            <Button variant="secondary" onClick={() => setMode("confirmResume")}>
+            <Button ref={resumeButton} variant="secondary" onClick={() => setMode("confirmResume")}>
               Turn off-site waiting back on…
             </Button>
           )}
@@ -95,7 +100,7 @@ export function PauseSwitch({ site, paused, offSiteCount, onResult }: Props) {
       )}
 
       {!paused && mode === "idle" && (
-        <Button variant="secondary" onClick={() => setMode("confirmPause")}>
+        <Button ref={pauseButton} variant="secondary" onClick={() => setMode("confirmPause")}>
           Pause off-site waiting at Demo Site {site}…
         </Button>
       )}
@@ -106,8 +111,8 @@ export function PauseSwitch({ site, paused, offSiteCount, onResult }: Props) {
             Pause off-site waiting at Demo Site {site}?
           </h4>
           <p>
-            Use this for downtime or a contact problem. New patients will wait on-site. The {patientCount(offSiteCount)}{" "}
-            already off-site keep their visits, and you will be asked to check each one.
+            Use this for downtime or a contact problem. New patients will wait on-site. {alreadyOff} keep their visits,
+            and you will be asked to check each one.
           </p>
           <div className="flex flex-wrap gap-2">
             <Button variant="danger" aria-disabled={saving} onClick={() => save(true)}>
diff --git a/components/staff/VisitRow.test.tsx b/components/staff/VisitRow.test.tsx
new file mode 100644
index 0000000..b8e8d3a
--- /dev/null
+++ b/components/staff/VisitRow.test.tsx
@@ -0,0 +1,31 @@
+// Checks that a staff row shows hours and minutes once a wait passes 60 minutes.
+
+import { renderToStaticMarkup } from "react-dom/server";
+import { describe, expect, it, vi } from "vitest";
+import { callBack, checkInAtDesk } from "@/lib/visitActions";
+import { VisitRow } from "./VisitRow";
+
+// The row's buttons save through Supabase; the render test never presses them.
+vi.mock("@/data/staffActions", () => ({}));
+
+const now = new Date("2026-11-15T20:00:00Z");
+const minutesAgo = (min: number) => new Date(now.getTime() - min * 60_000);
+const input = { id: "v1", code: "ABC234", access_token: "TOKEN", site: "A" as const, ctas_level: 4 as const, language: "en" };
+const render = (visit: Parameters<typeof VisitRow>[0]["visit"]) =>
+  renderToStaticMarkup(<VisitRow visit={visit} now={now} onShowSlip={vi.fn()} onLeftList={vi.fn()} />);
+
+describe("VisitRow times", () => {
+  it("shows the wait as 1h 35min after 95 minutes", () => {
+    const html = render(checkInAtDesk(input, "waiting", minutesAgo(95)));
+    expect(html).toContain("waited <strong>1h 35min</strong>");
+  });
+
+  it("shows the call-back time in hours and minutes", () => {
+    const visit = callBack(checkInAtDesk(input, "waiting", minutesAgo(200)), minutesAgo(166))!;
+    expect(render(visit)).toContain("Called 2h 46min ago");
+  });
+
+  it("keeps short times in minutes", () => {
+    expect(render(checkInAtDesk(input, "waiting", minutesAgo(45)))).toContain("waited <strong>45 min</strong>");
+  });
+});
diff --git a/components/staff/VisitRow.tsx b/components/staff/VisitRow.tsx
index e0fccdb..df232e5 100644
--- a/components/staff/VisitRow.tsx
+++ b/components/staff/VisitRow.tsx
@@ -5,12 +5,14 @@
 
 import { useState } from "react";
 import { callBackVisit, issueNewVisitLink, markVisitArrived, removeVisit } from "@/data/staffActions";
+import { formatMinutes } from "@/lib/duration";
 import { minutesBetween } from "@/lib/queue";
 import { STILL_HERE_ANSWER_WITHIN_MINUTES } from "@/lib/demoTimes";
 import { lastTapThisWait, stillHereState } from "@/lib/stillHere";
 import type { ChangeResult, Visit } from "@/lib/visit";
 import { Button } from "@/components/Button";
 import { FollowUpPanel } from "./FollowUpPanel";
+import { NewLinkPanel } from "./NewLinkPanel";
 
 type Props = {
   visit: Visit;
@@ -28,11 +30,11 @@ function progress(visit: Visit, now: Date): string {
     // "I'm still here" only shows the patient is still following the visit; never a health check.
     const lastTap = lastTapThisWait({ triagedAt: visit.triaged_at, lastStillHereAt: visit.last_still_here_at });
     return lastTap
-      ? `Waiting off-site · last "I'm still here" ${minutesBetween(lastTap, now)} min ago`
+      ? `Waiting off-site · last "I'm still here" ${formatMinutes(minutesBetween(lastTap, now))} ago`
       : "Waiting off-site";
   }
   const sinceCall = visit.called_at ? minutesBetween(visit.called_at, now) : 0;
-  const steps = [`Called ${sinceCall} min ago`];
+  const steps = [`Called ${formatMinutes(sinceCall)} ago`];
   // seen_at means the called screen was displayed on the phone, not that the patient read it.
   if (visit.seen_at) steps.push("Seen (screen shown, not necessarily read)");
   if (visit.status === "on_the_way") steps.push("On the way");
@@ -68,7 +70,7 @@ export function VisitRow({ visit, now, onShowSlip, onLeftList }: Props) {
       <div className="flex flex-wrap items-baseline justify-between gap-2">
         <p className="font-mono text-xl font-bold tracking-widest">{visit.code}</p>
         <p>
-          CTAS {visit.ctas_level} · waited <strong>{waited} min</strong>
+          CTAS {visit.ctas_level} · waited <strong>{formatMinutes(waited)}</strong>
         </p>
       </div>
       <p className="mt-1 font-semibold" data-testid="progress">
@@ -107,17 +109,7 @@ export function VisitRow({ visit, now, onShowSlip, onLeftList }: Props) {
           </Button>
         </div>
       </details>
-      <details className="mt-3">
-        <summary className="cursor-pointer py-2 text-slate-800 underline underline-offset-2">
-          Lost or stolen phone
-        </summary>
-        <div className="mt-2 space-y-2">
-          <p>The old link and the old slip stop working. Give the patient the new QR code.</p>
-          <Button variant="secondary" aria-disabled={saving} onClick={() => act(() => issueNewVisitLink(visit.id, showNewLink))}>
-            Issue a new link<span className="sr-only"> {visit.code}</span>
-          </Button>
-        </div>
-      </details>
+      <NewLinkPanel code={visit.code} saving={saving} onConfirm={() => act(() => issueNewVisitLink(visit.id, showNewLink))} />
       {(saving || note || okNote) && (
         <p role="status" className={`mt-2 font-semibold ${saving || !note ? "" : "text-red-800"}`}>
           {saving ? "Saving…" : note || okNote}
diff --git a/components/staff/VisitSlip.tsx b/components/staff/VisitSlip.tsx
index 0c4bda9..cfde607 100644
--- a/components/staff/VisitSlip.tsx
+++ b/components/staff/VisitSlip.tsx
@@ -46,7 +46,7 @@ export function VisitSlip({ code, token, language, onClose }: Props) {
             href={scanLink}
             target="_blank"
             rel="noopener"
-            className="inline-block text-blue-800 underline underline-offset-2 focus-visible:outline-4 focus-visible:outline-slate-950"
+            className="inline-block text-brand underline underline-offset-2 focus-visible:outline-4 focus-visible:outline-slate-950"
           >
             Demo: open the patient screen in a new tab
           </a>
diff --git a/components/start/CareOptions.tsx b/components/start/CareOptions.tsx
index 26ce40b..c6d67a9 100644
--- a/components/start/CareOptions.tsx
+++ b/components/start/CareOptions.tsx
@@ -6,7 +6,7 @@ import { textFor } from "@/lib/text";
 
 const THP_EMERGENCY_PAGE = "https://www.thp.ca/emergency/A/visit.html";
 
-const linkStyle = "font-semibold text-blue-900 underline underline-offset-2";
+const linkStyle = "font-semibold text-brand underline underline-offset-2";
 
 function External({ href, children, newTab }: { href: string; children: string; newTab: string }) {
   return (
diff --git a/data/savedTextSize.ts b/data/savedTextSize.ts
index 95de1bf..b08c575 100644
--- a/data/savedTextSize.ts
+++ b/data/savedTextSize.ts
@@ -2,9 +2,8 @@
 // Nothing else about the patient is stored.
 
 import { useSyncExternalStore } from "react";
-import { isTextSize, type TextSize } from "@/lib/textSize";
+import { isTextSize, TEXT_SIZE_KEY, type TextSize } from "@/lib/textSize";
 
-const TEXT_SIZE_KEY = "vwr.textSize";
 const listeners = new Set<() => void>();
 let chosen: TextSize | undefined; // undefined = not read from storage yet
 
diff --git a/data/savedToken.ts b/data/savedToken.ts
index 07c38c2..f561dc4 100644
--- a/data/savedToken.ts
+++ b/data/savedToken.ts
@@ -22,7 +22,8 @@ export function saveToken(token: string): void {
   }
 }
 
-function forgetSavedToken(): void {
+/** Remove the saved token, for a damaged link or a token that no longer opens a visit. */
+export function forgetSavedToken(): void {
   try {
     window.localStorage.removeItem(TOKEN_KEY);
   } catch {
diff --git a/data/sitePauses.test.ts b/data/sitePauses.test.ts
new file mode 100644
index 0000000..2c9dffc
--- /dev/null
+++ b/data/sitePauses.test.ts
@@ -0,0 +1,53 @@
+// Checks that a saved pause shows in the store at once, before the re-read from /api/site-status (which here still says "not paused").
+
+import { afterEach, describe, expect, it, vi } from "vitest";
+import { pauseStateNow, setSitePaused } from "./sitePauses";
+import { supabaseBrowser } from "./supabaseBrowser";
+
+// Replace the real Supabase connection: the update answers "one row changed" (saved).
+vi.mock("./supabaseBrowser", () => ({ supabaseBrowser: vi.fn() }));
+
+function mockSavedUpdate() {
+  vi.mocked(supabaseBrowser).mockReturnValue({
+    from: () => ({
+      update: () => ({
+        eq: () => ({
+          eq: () => ({ select: async () => ({ data: [{ site: "A" }], error: null }) }),
+        }),
+      }),
+    }),
+  } as unknown as ReturnType<typeof supabaseBrowser>);
+}
+
+afterEach(() => vi.unstubAllGlobals());
+
+describe("setSitePaused", () => {
+  it("shows a saved pause at once, before the re-read that still says not paused", async () => {
+    mockSavedUpdate();
+    // The store only changes after it has had a first read. setSitePaused re-reads after every
+    // save, so the first save here gives the store its first value (the first fetch answers at once).
+    let reads = 0;
+    let releaseLaterReads!: () => void;
+    const laterReadsWait = new Promise<void>((resolve) => (releaseLaterReads = resolve));
+    vi.stubGlobal(
+      "fetch",
+      vi.fn(async () => {
+        reads += 1;
+        // Later reads wait, so the test can look at the store before the re-read lands.
+        if (reads > 1) await laterReadsWait;
+        return { ok: true, json: async () => ({ A: false, B: false }) };
+      }),
+    );
+
+    await setSitePaused("A", true);
+    await vi.waitFor(() => expect(pauseStateNow().pauses).not.toBeNull());
+
+    // The second save: the store shows A paused straight away, though the server still says not paused.
+    await setSitePaused("A", true);
+    expect(pauseStateNow().pauses?.A).toBe(true);
+
+    // When the held re-read lands, it says not paused, and the store follows the server again.
+    releaseLaterReads();
+    await vi.waitFor(() => expect(pauseStateNow().pauses?.A).toBe(false));
+  });
+});
diff --git a/data/sitePauses.ts b/data/sitePauses.ts
index e766df3..0ca8030 100644
--- a/data/sitePauses.ts
+++ b/data/sitePauses.ts
@@ -34,6 +34,11 @@ async function load(): Promise<void> {
   }
 }
 
+/** The last known state; for tests and code outside React. */
+export function pauseStateNow(): PauseState {
+  return state;
+}
+
 function watch(onChange: () => void): () => void {
   listeners.add(onChange);
   if (!stopReading) stopReading = keepFresh(load, () => state.failed, REREAD_MS);
@@ -64,9 +69,11 @@ export async function setSitePaused(site: Site, paused: boolean): Promise<Change
       .eq("site", site)
       .eq("offsite_paused", !paused)
       .select("site");
+    const result: ChangeResult = error || !Array.isArray(data) ? "not_saved" : data.length === 1 ? "saved" : "refused";
+    // "saved" and "refused" both mean the database now holds `paused`, so show it at once.
+    if (result !== "not_saved" && state.pauses) show({ pauses: { ...state.pauses, [site]: paused }, failed: state.failed });
     void load();
-    if (error || !Array.isArray(data)) return "not_saved";
-    return data.length === 1 ? "saved" : "refused";
+    return result;
   } catch {
     return "not_saved";
   }
diff --git a/data/useOnline.test.ts b/data/useOnline.test.ts
new file mode 100644
index 0000000..b62b2fb
--- /dev/null
+++ b/data/useOnline.test.ts
@@ -0,0 +1,35 @@
+// Checks that the connection is asked again on "online", "offline" and when the page comes
+// back on screen, and that all three listeners are removed again. Vitest has no browser, so
+// window and document are stand-ins that only record what was added and removed.
+
+import { afterEach, describe, expect, it, vi } from "vitest";
+import { watchConnection } from "./useOnline";
+
+function standIn() {
+  return { added: [] as string[], removed: [] as string[] };
+}
+
+afterEach(() => vi.unstubAllGlobals());
+
+describe("watchConnection", () => {
+  it("listens to online, offline and visibilitychange, and stops all three", () => {
+    const win = standIn();
+    const doc = standIn();
+    vi.stubGlobal("window", {
+      addEventListener: (name: string) => win.added.push(name),
+      removeEventListener: (name: string) => win.removed.push(name),
+    });
+    vi.stubGlobal("document", {
+      addEventListener: (name: string) => doc.added.push(name),
+      removeEventListener: (name: string) => doc.removed.push(name),
+    });
+
+    const stop = watchConnection(() => {});
+    expect(win.added).toEqual(["online", "offline"]);
+    expect(doc.added).toEqual(["visibilitychange"]);
+
+    stop();
+    expect(win.removed).toEqual(["online", "offline"]);
+    expect(doc.removed).toEqual(["visibilitychange"]);
+  });
+});
diff --git a/data/useOnline.ts b/data/useOnline.ts
index ccbfdca..afc46c1 100644
--- a/data/useOnline.ts
+++ b/data/useOnline.ts
@@ -2,12 +2,18 @@
 
 import { useSyncExternalStore } from "react";
 
-function subscribe(onChange: () => void): () => void {
+/**
+ * Asks again when the connection changes, and also when the page comes back on screen: a phone
+ * that was locked or in the background can miss the "online" and "offline" events.
+ */
+export function watchConnection(onChange: () => void): () => void {
   window.addEventListener("online", onChange);
   window.addEventListener("offline", onChange);
+  document.addEventListener("visibilitychange", onChange);
   return () => {
     window.removeEventListener("online", onChange);
     window.removeEventListener("offline", onChange);
+    document.removeEventListener("visibilitychange", onChange);
   };
 }
 
@@ -22,5 +28,5 @@ function getServerSnapshot(): boolean {
 
 /** True when the browser has a connection. Re-renders when the connection drops or comes back. */
 export function useOnline(): boolean {
-  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
+  return useSyncExternalStore(watchConnection, getSnapshot, getServerSnapshot);
 }
diff --git a/lib/calledAlert.test.ts b/lib/calledAlert.test.ts
index d2ff8f9..cf9840d 100644
--- a/lib/calledAlert.test.ts
+++ b/lib/calledAlert.test.ts
@@ -2,7 +2,7 @@
 
 import { describe, expect, it } from "vitest";
 import type { VisitStatus } from "./visit";
-import { ALERT_REPEAT_MS, shouldAlert } from "./calledAlert";
+import { ALERT_REPEAT_MS, BEEP_HZ, BEEP_SECONDS, BEEP_VOLUME, shouldAlert, soundNote } from "./calledAlert";
 
 describe("shouldAlert", () => {
   it("alerts while called, with sound on and the page on screen", () => {
@@ -30,3 +30,40 @@ describe("ALERT_REPEAT_MS", () => {
     expect(ALERT_REPEAT_MS).toBe(30_000);
   });
 });
+
+describe("soundNote", () => {
+  it("shows the failed line when the phone would not start the sound", () => {
+    expect(soundNote("waiting", "failed")).toBe("failed");
+  });
+
+  it("keeps the failed line while called, because it already says to watch the screen", () => {
+    expect(soundNote("called", "failed")).toBe("failed");
+  });
+
+  it("asks to turn on sound only while called with the sound off", () => {
+    expect(soundNote("called", "off")).toBe("offWhileCalled");
+    expect(soundNote("waiting", "off")).toBeNull();
+    expect(soundNote("on_the_way", "off")).toBeNull();
+  });
+
+  it("shows no line while the sound is on", () => {
+    expect(soundNote("called", "on")).toBeNull();
+    expect(soundNote("waiting", "on")).toBeNull();
+  });
+});
+
+describe("the beep", () => {
+  it("is louder than before but never above full volume, where it would distort", () => {
+    expect(BEEP_VOLUME).toBeGreaterThan(0.3);
+    expect(BEEP_VOLUME).toBeLessThanOrEqual(1);
+  });
+
+  it("is short: well under the 3 seconds of WCAG 1.4.2", () => {
+    expect(BEEP_SECONDS).toBeLessThan(3);
+  });
+
+  it("stays in a pitch range that older ears hear well (500 to 1000 Hz)", () => {
+    expect(BEEP_HZ).toBeGreaterThanOrEqual(500);
+    expect(BEEP_HZ).toBeLessThanOrEqual(1000);
+  });
+});
diff --git a/lib/calledAlert.ts b/lib/calledAlert.ts
index cf287a3..d1ddce7 100644
--- a/lib/calledAlert.ts
+++ b/lib/calledAlert.ts
@@ -6,6 +6,21 @@ import type { VisitStatus } from "./visit";
 /** How often the alert plays again while the patient has not tapped "I'm on my way". */
 export const ALERT_REPEAT_MS = 30_000;
 
+/**
+ * The beep. 880 Hz is in the range that people with age-related hearing loss still hear well
+ * (they lose high pitches first). 0.4 seconds is far below the 3 seconds after which WCAG 2.2
+ * 1.4.2 (Audio Control) needs a way to stop sound that plays by itself.
+ */
+export const BEEP_HZ = 880;
+export const BEEP_SECONDS = 0.4;
+
+/**
+ * The start volume of the beep, from 0 to 1 of what the phone's volume setting allows.
+ * 0.5 is about 4.4 dB louder than the old 0.3. Above 1 the sound distorts; a web page can never
+ * play louder than the phone's own volume.
+ */
+export const BEEP_VOLUME = 0.5;
+
 /**
  * True when the phone should beep and vibrate now.
  * status: the visit's status. soundOn: the patient tapped "Turn on sound".
@@ -14,3 +29,17 @@ export const ALERT_REPEAT_MS = 30_000;
 export function shouldAlert(status: VisitStatus, soundOn: boolean, visible: boolean): boolean {
   return status === "called" && soundOn && visible;
 }
+
+/** What the sound box knows about the sound: not turned on, turned on, or the phone refused to start it. */
+export type SoundState = "off" | "on" | "failed";
+
+/**
+ * Which extra line the sound box shows under the button, or null for no line.
+ * "failed": the phone would not start the sound (lib/text sound.failed).
+ * "offWhileCalled": the visit is called and the sound is off (lib/text sound.offWhileCalled).
+ */
+export function soundNote(status: VisitStatus, state: SoundState): "failed" | "offWhileCalled" | null {
+  if (state === "failed") return "failed";
+  if (state === "off" && status === "called") return "offWhileCalled";
+  return null;
+}
diff --git a/lib/deadToken.test.ts b/lib/deadToken.test.ts
new file mode 100644
index 0000000..602dc70
--- /dev/null
+++ b/lib/deadToken.test.ts
@@ -0,0 +1,42 @@
+// Checks when the token on this phone no longer opens any visit (for example after staff
+// used "Issue a new link"), so the phone forgets it and says the link did not work.
+
+import { describe, expect, it } from "vitest";
+import { isDeadToken } from "./deadToken";
+import type { PatientView } from "./patientView";
+
+const view: PatientView = {
+  code: "ABC234",
+  site: "A",
+  language: "en",
+  status: "waiting",
+  placeInLine: 1,
+  waitLow: 0,
+  waitHigh: 20,
+  calledAt: null,
+  lastStillHereAt: null,
+  triagedAt: null,
+  seen: false,
+  closed: false,
+  expired: false,
+};
+
+describe("isDeadToken", () => {
+  it("is dead when there is a token and the database found no visit for it", () => {
+    expect(isDeadToken("ABCDEFGHJKMNPQRSTVWXYZ2345", null)).toBe(true);
+  });
+
+  it("is not dead while the visit is still loading or could not be read", () => {
+    expect(isDeadToken("ABCDEFGHJKMNPQRSTVWXYZ2345", undefined)).toBe(false);
+    expect(isDeadToken("ABCDEFGHJKMNPQRSTVWXYZ2345", "unavailable")).toBe(false);
+  });
+
+  it("is not dead when the visit was found", () => {
+    expect(isDeadToken("ABCDEFGHJKMNPQRSTVWXYZ2345", view)).toBe(false);
+  });
+
+  it("is not dead when the phone has no token at all", () => {
+    expect(isDeadToken(null, null)).toBe(false);
+    expect(isDeadToken(undefined, null)).toBe(false);
+  });
+});
diff --git a/lib/deadToken.ts b/lib/deadToken.ts
new file mode 100644
index 0000000..6201a88
--- /dev/null
+++ b/lib/deadToken.ts
@@ -0,0 +1,15 @@
+// Decides whether the token saved on this phone no longer opens any visit. This happens on
+// the old phone after staff use "Issue a new link": the database then finds no visit for it.
+
+import type { PatientView } from "./patientView";
+
+/**
+ * True when there is a token and the database answered "no visit" for it (null). Still
+ * loading (undefined) or a failed read ("unavailable") is never dead: the visit may be fine.
+ */
+export function isDeadToken(
+  token: string | null | undefined,
+  shown: PatientView | null | "unavailable" | undefined,
+): boolean {
+  return typeof token === "string" && shown === null;
+}
diff --git a/lib/duration.test.ts b/lib/duration.test.ts
new file mode 100644
index 0000000..d813101
--- /dev/null
+++ b/lib/duration.test.ts
@@ -0,0 +1,30 @@
+import { describe, expect, it } from "vitest";
+import { formatMinutes } from "./duration";
+
+describe("formatMinutes", () => {
+  it("keeps minutes under an hour as they are now", () => {
+    expect(formatMinutes(0)).toBe("0 min");
+    expect(formatMinutes(1)).toBe("1 min");
+    expect(formatMinutes(59)).toBe("59 min");
+  });
+
+  it("shows hours and minutes from 60", () => {
+    expect(formatMinutes(61)).toBe("1h 1min");
+    expect(formatMinutes(95)).toBe("1h 35min");
+    expect(formatMinutes(166)).toBe("2h 46min");
+  });
+
+  it("leaves out 0min for whole hours", () => {
+    expect(formatMinutes(60)).toBe("1h");
+    expect(formatMinutes(120)).toBe("2h");
+  });
+
+  it("gives 0 min for a negative or broken number", () => {
+    expect(formatMinutes(-5)).toBe("0 min");
+    expect(formatMinutes(Number.NaN)).toBe("0 min");
+  });
+
+  it("drops part minutes", () => {
+    expect(formatMinutes(95.9)).toBe("1h 35min");
+  });
+});
diff --git a/lib/duration.ts b/lib/duration.ts
new file mode 100644
index 0000000..c26444c
--- /dev/null
+++ b/lib/duration.ts
@@ -0,0 +1,13 @@
+// How the staff screens show a number of minutes: "45 min" under an hour, "1h 35min" from an
+// hour, and "2h" for whole hours. Staff text only (English); the patient wait range has its own
+// words in lib/text/.
+
+/** For example 45 gives "45 min", 95 gives "1h 35min", 120 gives "2h". A negative or broken number gives "0 min". */
+export function formatMinutes(minutes: number): string {
+  // Clean the number first: a broken or negative number counts as 0, and part minutes are dropped.
+  const whole = Number.isFinite(minutes) && minutes > 0 ? Math.floor(minutes) : 0;
+  if (whole < 60) return `${whole} min`;
+  const hours = Math.floor(whole / 60);
+  const rest = whole % 60;
+  return rest === 0 ? `${hours}h` : `${hours}h ${rest}min`;
+}
diff --git a/lib/text/ar.ts b/lib/text/ar.ts
index 19f68dc..270aa1e 100644
--- a/lib/text/ar.ts
+++ b/lib/text/ar.ts
@@ -1,6 +1,8 @@
 // Patient text in Modern Standard Arabic. DRAFT: written by Gemini 3.1 Pro on 2026-11-10/11
 // (handoffs/archive/2026-11-10-gemini-translations-phase3.md) and not yet approved by a
-// fluent speaker. Same shape as lib/text/en.ts; words in {braces} are filled in by the app.
+// fluent speaker. The sound lines are a later draft by Gemini Hydrogen 4 (2026-11-15,
+// handoffs/archive/2026-11-14-gemini-sound-text.md), also not yet approved.
+// Same shape as lib/text/en.ts; words in {braces} are filled in by the app.
 
 import type { PatientText } from "./en";
 
@@ -73,7 +75,6 @@ export const ar: PatientText = {
     onMyWay: "أنا في طريقي",
     sending: "جاري الإرسال...",
     confirmed: "شكرًا لك. الموظفون يعلمون أنك في طريقك.",
-    alertLimits: "حدود العرض التجريبي: التنبيهات على هذه الصفحة تعمل فقط عندما تكون مفتوحة وهاتفك غير مقفل.",
     notSaved: "لم يتم حفظ إجابتك. الموظفون لا يعلمون أنك نقرت عليها. يرجى المحاولة مرة أخرى أو الذهاب إلى المكتب.",
     fromHomeHeading: "الحالة: بدأت من المنزل، لم يتم الفرز بعد",
     fromHomeText: [
@@ -122,9 +123,12 @@ export const ar: PatientText = {
   },
   sound: {
     notice:
-      "يقوم هذا العرض التجريبي بتشغيل صوت والاهتزاز عند استدعائك. يعمل هذا فقط عندما تكون هذه الصفحة مفتوحة وهاتفك غير مقفل.",
+      "يمكن لهذا العرض التجريبي تشغيل صوت عند استدعائك. كما أنه يهتز إذا كان هاتفك يسمح بذلك. تعمل التنبيهات فقط عندما تكون هذه الصفحة مفتوحة وهاتفك غير مقفل. أوقف الوضع الصامت في هاتفك لتتمكن من سماع الصوت.",
     turnOn: "تشغيل الصوت",
     on: "الصوت قيد التشغيل",
+    failed: "تعذّر تشغيل الصوت على هذا الهاتف. راقب هذه الشاشة لمعرفة متى يتم استدعاؤك.",
+    turnOff: "إيقاف الصوت",
+    offWhileCalled: "الصوت متوقف. اضغط على \"تشغيل الصوت\" للحصول على تنبيهات صوتية.",
   },
   pausedHeading: "الانتظار خارج الموقع متوقف مؤقتًا",
   textSize: { label: "حجم النص", normal: "عادي", large: "كبير", extraLarge: "كبير جدًا" },
diff --git a/lib/text/en.ts b/lib/text/en.ts
index 3079672..f976ff5 100644
--- a/lib/text/en.ts
+++ b/lib/text/en.ts
@@ -89,7 +89,6 @@ export const en = {
     onMyWay: "I'm on my way",
     sending: "Sending…",
     confirmed: "Thank you. Staff know you are on your way.",
-    alertLimits: "Demo limits: alerts on this page only work while it is open and your phone is unlocked.",
     notSaved: "Your answer did not save. Staff do not know you tapped it. Please try again or go to the desk.",
 
     fromHomeHeading: "Status: Started from home, not yet triaged",
@@ -148,9 +147,12 @@ export const en = {
   },
   sound: {
     notice:
-      "This demo plays a sound and vibrates when you are called. This only works while this page is open and your phone is unlocked.",
+      "This demo can play a sound when you are called. It also vibrates if your phone allows it. Alerts work only while this page is open and your phone is unlocked. Take your phone off silent so you can hear it.",
     turnOn: "Turn on sound",
     on: "Sound is on",
+    failed: "Sound could not start on this phone. Watch this screen to see when you are called.",
+    turnOff: "Turn off sound",
+    offWhileCalled: "Sound is off. Tap \"Turn on sound\" for sound alerts.",
   },
   pausedHeading: "Off-site waiting is paused",
   textSize: { label: "Text size", normal: "Normal", large: "Large", extraLarge: "Extra large" },
diff --git a/lib/text/fr.ts b/lib/text/fr.ts
index a6ea1d7..7b41c64 100644
--- a/lib/text/fr.ts
+++ b/lib/text/fr.ts
@@ -1,6 +1,8 @@
 // Patient text in Canadian French. DRAFT: written by Gemini 3.1 Pro on 2026-11-10/11
 // (handoffs/archive/2026-11-10-gemini-translations-phase3.md) and not yet approved by a
-// fluent speaker. Same shape as lib/text/en.ts; words in {braces} are filled in by the app.
+// fluent speaker. The sound lines are a later draft by Gemini Hydrogen 4 (2026-11-15,
+// handoffs/archive/2026-11-14-gemini-sound-text.md), also not yet approved.
+// Same shape as lib/text/en.ts; words in {braces} are filled in by the app.
 
 import type { PatientText } from "./en";
 
@@ -73,7 +75,6 @@ export const fr: PatientText = {
     onMyWay: "Je suis en route",
     sending: "Envoi en cours…",
     confirmed: "Merci. Le personnel sait que vous êtes en route.",
-    alertLimits: "Limites de la démonstration : les alertes sur cette page ne fonctionnent que lorsqu'elle est ouverte et que votre téléphone est déverrouillé.",
     notSaved: "Votre réponse n'a pas été enregistrée. Le personnel ne sait pas que vous avez appuyé dessus. Veuillez réessayer ou vous rendre au bureau.",
     fromHomeHeading: "Statut : Commencée depuis la maison, pas encore triée",
     fromHomeText: [
@@ -122,9 +123,12 @@ export const fr: PatientText = {
   },
   sound: {
     notice:
-      "Cette démonstration émet un son et vibre lorsque vous êtes appelé. Cela ne fonctionne que lorsque cette page est ouverte et que votre téléphone est déverrouillé.",
+      "Cette démonstration peut émettre un son quand vous êtes appelé. Elle vibre aussi si votre téléphone le permet. Les alertes fonctionnent seulement quand cette page est ouverte et que votre téléphone est déverrouillé. Désactivez le mode silencieux de votre téléphone pour entendre le son.",
     turnOn: "Activer le son",
     on: "Le son est activé",
+    failed: "Le son n'a pas pu démarrer sur ce téléphone. Regardez cet écran pour voir quand vous êtes appelé.",
+    turnOff: "Désactiver le son",
+    offWhileCalled: "Le son est désactivé. Appuyez sur « Activer le son » pour avoir des alertes sonores.",
   },
   pausedHeading: "L'attente hors site est suspendue",
   textSize: { label: "Taille du texte", normal: "Normale", large: "Grande", extraLarge: "Très grande" },
diff --git a/lib/text/translations.test.ts b/lib/text/translations.test.ts
index 2a54c61..1723144 100644
--- a/lib/text/translations.test.ts
+++ b/lib/text/translations.test.ts
@@ -47,3 +47,10 @@ describe.each(Object.entries(LANGUAGES))("%s", (_name, text) => {
     expect(text.patient.fromHomeText).toHaveLength(3);
   });
 });
+
+// The "Sound is off" line tells the patient which button to tap, so it must use the button's exact words.
+describe.each(Object.entries({ en, ...LANGUAGES }))("%s sound lines", (_name, text) => {
+  it("names the Turn on sound button exactly", () => {
+    expect(text.sound.offWhileCalled).toContain(text.sound.turnOn);
+  });
+});
diff --git a/lib/text/ur.ts b/lib/text/ur.ts
index 39e0601..a5c709f 100644
--- a/lib/text/ur.ts
+++ b/lib/text/ur.ts
@@ -1,6 +1,8 @@
 // Patient text in Urdu. DRAFT: written by Gemini 3.1 Pro on 2026-11-10/11
 // (handoffs/archive/2026-11-10-gemini-translations-phase3.md) and not yet approved by a
-// fluent speaker. Same shape as lib/text/en.ts; words in {braces} are filled in by the app.
+// fluent speaker. The sound lines are a later draft by Gemini Hydrogen 4 (2026-11-15,
+// handoffs/archive/2026-11-14-gemini-sound-text.md), also not yet approved.
+// Same shape as lib/text/en.ts; words in {braces} are filled in by the app.
 
 import type { PatientText } from "./en";
 
@@ -73,7 +75,6 @@ export const ur: PatientText = {
     onMyWay: "میں راستے میں ہوں",
     sending: "بھیجا جا رہا ہے...",
     confirmed: "شکریہ۔ عملہ جانتا ہے کہ آپ راستے میں ہیں۔",
-    alertLimits: "ڈیمو کی حدود: اس پیج پر الرٹس صرف اس وقت کام کرتے ہیں جب یہ کھلا ہو اور آپ کا فون ان لاک ہو۔",
     notSaved: "آپ کا جواب محفوظ نہیں ہوا۔ عملہ نہیں جانتا کہ آپ نے اسے دبایا ہے۔ براہ کرم دوبارہ کوشش کریں یا ڈیسک پر جائیں۔",
     fromHomeHeading: "سٹیٹس: گھر سے شروع کیا گیا، ابھی ٹرائیج نہیں ہوا",
     fromHomeText: [
@@ -122,9 +123,12 @@ export const ur: PatientText = {
   },
   sound: {
     notice:
-      "جب آپ کو بلایا جاتا ہے تو یہ ڈیمو آواز بجاتا ہے اور وائبریٹ کرتا ہے۔ یہ صرف اس وقت کام کرتا ہے جب یہ پیج کھلا ہو اور آپ کا فون ان لاک ہو۔",
+      "جب آپ کو بلایا جاتا ہے تو یہ ڈیمو آواز بجا سکتا ہے۔ اگر آپ کا فون اجازت دے تو یہ وائبریٹ بھی کرتا ہے۔ الرٹس صرف اس وقت کام کرتے ہیں جب یہ پیج کھلا ہو اور آپ کا فون ان لاک ہو۔ آواز سننے کے لیے اپنے فون کو سائلنٹ سے ہٹا دیں۔",
     turnOn: "آواز آن کریں",
     on: "آواز آن ہے",
+    failed: "اس فون پر آواز شروع نہیں ہو سکی۔ یہ دیکھنے کے لیے اس اسکرین کو دیکھتے رہیں کہ آپ کو کب بلایا جاتا ہے۔",
+    turnOff: "آواز آف کریں",
+    offWhileCalled: "آواز آف ہے۔ آواز والے الرٹس کے لیے \"آواز آن کریں\" پر ٹیپ کریں۔",
   },
   pausedHeading: "آف سائٹ انتظار روکا ہوا ہے",
   textSize: { label: "ٹیکسٹ کا سائز", normal: "نارمل", large: "بڑا", extraLarge: "بہت بڑا" },
diff --git a/lib/text/zh.ts b/lib/text/zh.ts
index 07d42e4..56dadd4 100644
--- a/lib/text/zh.ts
+++ b/lib/text/zh.ts
@@ -1,6 +1,8 @@
 // Patient text in Mandarin (Simplified Chinese). DRAFT: written by Gemini 3.1 Pro on 2026-11-10/11
 // (handoffs/archive/2026-11-10-gemini-translations-phase3.md) and not yet approved by a
-// fluent speaker. Same shape as lib/text/en.ts; words in {braces} are filled in by the app.
+// fluent speaker. The sound lines are a later draft by Gemini Hydrogen 4 (2026-11-15,
+// handoffs/archive/2026-11-14-gemini-sound-text.md), also not yet approved.
+// Same shape as lib/text/en.ts; words in {braces} are filled in by the app.
 
 import type { PatientText } from "./en";
 
@@ -73,7 +75,6 @@ export const zh: PatientText = {
     onMyWay: "我正在路上",
     sending: "正在发送…",
     confirmed: "谢谢。工作人员知道您正在路上。",
-    alertLimits: "演示限制：此页面上的警报仅在页面打开且手机未锁定时有效。",
     notSaved: "您的回答未保存。工作人员不知道您点击了它。请重试或去前台。",
     fromHomeHeading: "状态：在家开始，尚未分诊",
     fromHomeText: [
@@ -122,9 +123,12 @@ export const zh: PatientText = {
   },
   sound: {
     notice:
-      "当您被叫到时，此演示会播放声音并振动。这仅在页面打开且手机未锁定时有效。",
+      "当您被叫到时，此演示可以播放声音。如果您的手机允许，它也会振动。警报仅在此页面打开且手机未锁定时有效。请关闭手机的静音模式，以便听到声音。",
     turnOn: "开启声音",
     on: "声音已开启",
+    failed: "此手机无法启动声音。请留意此屏幕，查看何时叫到您。",
+    turnOff: "关闭声音",
+    offWhileCalled: "声音已关闭。点击“开启声音”以接收声音警报。",
   },
   pausedHeading: "院外候诊已暂停",
   textSize: { label: "文本大小", normal: "正常", large: "大", extraLarge: "超大" },
diff --git a/lib/textSize.test.ts b/lib/textSize.test.ts
index b9b8f4c..5a1546c 100644
--- a/lib/textSize.test.ts
+++ b/lib/textSize.test.ts
@@ -1,7 +1,7 @@
 // Checks the text size rules: which values count as a size, and the font size each one sets.
 
-import { describe, expect, it } from "vitest";
-import { isTextSize, rootFontSize } from "./textSize";
+import { afterEach, describe, expect, it, vi } from "vitest";
+import { isTextSize, rootFontSize, TEXT_SIZE_KEY, textSizeScript } from "./textSize";
 
 describe("isTextSize", () => {
   it("accepts the three sizes", () => {
@@ -30,3 +30,45 @@ describe("rootFontSize", () => {
     expect(rootFontSize("extraLarge")).toBe("150%");
   });
 });
+
+describe("textSizeScript", () => {
+  // Runs the head script with a fake page: the path, the saved value and the root element's style.
+  function runScript(pathname: string, storage: { getItem: (key: string) => string | null }) {
+    const root = { style: { fontSize: "" } };
+    vi.stubGlobal("location", { pathname });
+    vi.stubGlobal("localStorage", storage);
+    vi.stubGlobal("document", { documentElement: root });
+    new Function(textSizeScript())();
+    return root.style.fontSize;
+  }
+
+  // Fake storage that returns the saved value only for the real key.
+  function storageWith(saved: string) {
+    return { getItem: (key: string) => (key === TEXT_SIZE_KEY ? saved : null) };
+  }
+
+  afterEach(() => {
+    vi.unstubAllGlobals();
+  });
+
+  it("sets the saved size on a patient page", () => {
+    expect(runScript("/patient", storageWith("extraLarge"))).toBe("150%");
+  });
+
+  it("does nothing on other pages", () => {
+    expect(runScript("/", storageWith("extraLarge"))).toBe("");
+  });
+
+  it("ignores a saved value that is not a size", () => {
+    expect(runScript("/patient", storageWith("huge"))).toBe("");
+  });
+
+  it("does nothing and does not throw when storage is blocked", () => {
+    const blocked = {
+      getItem: () => {
+        throw new Error("storage blocked");
+      },
+    };
+    expect(runScript("/patient", blocked)).toBe("");
+  });
+});
diff --git a/lib/textSize.ts b/lib/textSize.ts
index af5a3b7..870eac7 100644
--- a/lib/textSize.ts
+++ b/lib/textSize.ts
@@ -2,6 +2,9 @@
 
 export const TEXT_SIZES = ["normal", "large", "extraLarge"] as const;
 
+/** The browser storage key that remembers the chosen size on this phone. */
+export const TEXT_SIZE_KEY = "vwr.textSize";
+
 export type TextSize = (typeof TEXT_SIZES)[number];
 
 const ROOT_FONT_SIZES: Record<TextSize, string> = {
@@ -19,3 +22,24 @@ export function isTextSize(value: unknown): value is TextSize {
 export function rootFontSize(size: TextSize): string {
   return ROOT_FONT_SIZES[size];
 }
+
+/**
+ * A short plain-JavaScript script for the page's <head>. It sets the page font size before the first
+ * paint on patient screens, so a patient who chose a larger size does not see the page at Normal
+ * size first. It does nothing outside /patient, and does nothing if browser storage is blocked.
+ * The key and the sizes are written in as JSON, so they are defined only in this file.
+ */
+export function textSizeScript(): string {
+  return `(function () {
+  if (!location.pathname.startsWith("/patient")) return;
+  try {
+    var saved = localStorage.getItem(${JSON.stringify(TEXT_SIZE_KEY)});
+    var sizes = ${JSON.stringify(ROOT_FONT_SIZES)};
+    if (saved && Object.prototype.hasOwnProperty.call(sizes, saved)) {
+      document.documentElement.style.fontSize = sizes[saved];
+    }
+  } catch {
+    // Storage blocked: the page stays at Normal size.
+  }
+})();`;
+}
```

## Response

Gemini Hydrogen 4, High, 2026-11-15:

a. Bugs and state errors in components/patient/SoundSwitch.tsx and components/patient/alertSound.ts
Closed AudioContext is never recreated in unlockSound()

File: components/patient/alertSound.ts (unlockSound)

What goes wrong: unlockSound() only creates a new AudioContext when !context. On iOS Safari and Android Chrome, an AudioContext can transition to state === "closed" (for example, after OS audio session reclamation or Bluetooth/headphone route changes). Once context.state === "closed", context is still non-null, so context.resume() rejects with InvalidStateError or resolves still "closed", locking the patient in "failed" on every tap until they reload the page.

A way to see it happen: Tap "Turn on sound", close the context in DevTools (AudioContext.prototype.close or simulating an interrupted/closed audio session on mobile Safari), then tap "Turn on sound" again: it fails permanently.

Smallest fix: Recreate the context when closed: if (!context || context.state === "closed") { ... }.

Race condition between turnOn()'s await playAlert() and turnOff() or a status change

File: components/patient/SoundSwitch.tsx (turnOn, turnOff)

What goes wrong: While status === "waiting", turnOn() sets setState("on") (immediately showing "Sound is on" and "Turn off sound") before awaiting playAlert(), which can wait up to 1000 ms (RESUME_WAIT_MS). If the patient taps "Turn off sound" during that second, turnOff() sets state to "off", and when playAlert() then resolves false, turnOn() overwrites "off" with "failed". In addition, busy.current remains true after turnOff() during that second, silently ignoring an immediate re-tap on "Turn on sound", and turnOn() reads a stale status if the visit becomes "called" mid-await (playing a duplicate beep alongside the effect).

A way to see it happen: Stub playAlert() to resolve false after 500 ms, tap "Turn on sound" while waiting, and tap "Turn off sound" within 500 ms: the UI briefly switches to "Turn on sound" and then flips to "failed".

Smallest fix: Keep an incrementing attempt ref (const attempt = useRef(0)), increment it in both turnOn() and turnOff(), reset busy.current = false in turnOff(), and ignore stale async completions when attempt.current !== id.

Race condition between useEffect tick() and user toggles / overlapping ticks

File: components/patient/SoundSwitch.tsx (useEffect tick) and components/patient/alertSound.ts (playAlert)

What goes wrong: When AudioContext is suspended after returning from the background on iOS Safari, tick() calls playAlert(), which waits up to 1000 ms. If the patient taps "Turn off sound" and immediately taps "Turn on sound" within that 1000 ms, the earlier playAlert() promise resolves false and runs setState("off"), turning sound back off after the user just re-enabled it. Furthermore, if visibilitychange and the 30-second setInterval fire within the same 1000 ms, two concurrent playAlert() calls run and both trigger vibrate().

A way to see it happen: With status === "called" and soundOn === true, suspend AudioContext, trigger visibilitychange, and within 1 s toggle sound off and back on: the delayed .then((ok) => { if (!ok) setState("off"); }) turns sound back off.

Smallest fix: Gate tick()'s .then(...) on the same attempt.current generation ref and skip starting a new tick() while a resume check is already in flight.

Potential unhandled promise rejection when waitAtMost(1000) wins Promise.race

File: components/patient/alertSound.ts (playAlert)

What goes wrong: In await Promise.race([ctx.resume(), waitAtMost(RESUME_WAIT_MS)]), if waitAtMost(1000) resolves first on a stalled mobile AudioContext and ctx.resume() rejects afterward (e.g., NotAllowedError or InvalidStateError), the rejection happens after Promise.race has already settled and is never caught.

A way to see it happen: Mock ctx.resume() to reject after 1200 ms and call playAlert(): playAlert() returns false at 1000 ms, followed 200 ms later by an unhandled rejection.

Smallest fix: Attach .catch(() => undefined) directly to ctx.resume() inside Promise.race.

b. Accessibility
Focus after "Turn off sound" moves to "Turn on sound" without announcing that sound turned off

File: components/patient/SoundSwitch.tsx (turnOff, useEffect on state)

What goes wrong: Tapping "Turn off sound" unmounts "Sound is on" and moves focus straight to <Button ref="{turnOnButton}">Turn on sound</Button>. A screen reader announces "Turn on sound, button"—the opposite action—with no spoken confirmation that sound is now off, and skips reading "Sound is off..." (offWhileCalled) rendered below the button.

A way to see it happen: Turn on a screen reader (VoiceOver or NVDA), tap "Turn on sound", then tap "Turn off sound": the screen reader only announces "Turn on sound, button".

Smallest fix: Announce "Sound is off" via a persistent role="status" region (or associate the "Sound is off" status text with the button via aria-describedby) when turnOff() runs.

Missing live regions on "failed" and "offWhileCalled" lines, plus focus drop on async failure

File: components/patient/SoundSwitch.tsx (note === "failed" and note === "offWhileCalled")

What goes wrong: Neither <p data-testid="sound-failed"> nor <p data-testid="sound-off-called"> is inside a live region (role="status"). When unlockSound() fails, focus stays on "Turn on sound" and screen readers read nothing at all—making the button appear broken. Worse, if playAlert() fails asynchronously after setState("on") already focused "Sound is on", unmounting "Sound is on" drops focus to document.body while "failed" (or "offWhileCalled" during tick()) appears silently below.

A way to see it happen: Run delete window.AudioContext in DevTools with a screen reader active and press "Turn on sound": nothing is spoken when data-testid="sound-failed" appears.

Smallest fix: Render a persistent <div role="status"> inside SoundSwitch that holds note so "failed" (and "offWhileCalled" when sound drops off mid-call) is announced politely without losing focus.

Teal brand contrast on .staff-backdrop and <body> token mismatch

File: app/globals.css (.theme-staff, .staff-backdrop) and app/layout.tsx (<body>)

What goes wrong: Inside the 82%-white frosted cards, .theme-staff's --color-brand (#0e6f78) achieves 5.52:1 contrast, passing WCAG 2.2 AA (4.5:1). However, directly over the darkest radial gradient corner of .staff-backdrop (rgb(14 111 120 / 0.2) over #edf5f5), #0e6f78 drops to 4.09:1 (below 4.5:1), so any text-brand link placed outside a frosted panel fails AA. Separately, app/layout.tsx still hardcodes bg-white text-slate-900 on <body>, overriding the new --color-canvas (#f3f7f7) and --color-ink (#13212b) tokens.

A way to see it happen: Place a text-brand link directly on .staff-backdrop outside a .glass-panel (or inspect <body> computed background color on / or /patient).

Smallest fix: Use #0f5e66 for --color-brand in .theme-staff as well (5.17:1 even on the darkest corner of .staff-backdrop and 7.5:1 on white), and replace bg-white text-slate-900 on <body> in app/layout.tsx with bg-canvas text-ink.

Compact hours format ("1h 35min", "2h") is mispronounced by screen readers

File: lib/duration.ts (formatMinutes), components/staff/VisitRow.tsx, components/staff/ExpectedArrivals.tsx, components/staff/FollowUpPanel.tsx

What goes wrong: Removing the space between digits and unit letters ("1h", "35min", "2h") causes screen readers to spell "1 aitch" / "2 aitch" and pronounce "35min" as the word "min" (rhyming with "tin"), whereas < 60 outputs "45 min" with a space.

A way to see it happen: Navigate a staff VisitRow with a 95-minute or 120-minute wait using VoiceOver or NVDA.

Smallest fix: Either spell out "1 hour 35 minutes" / "2 hours" (or "1 hr 35 min" with spaces) in formatMinutes, or keep the short visual string and render an aria-label / <span className="sr-only"> with expanded words.

c. formatMinutes edge cases and the regex in components/staff/FollowUpPanel.tsx
FollowUpPanel.tsx regex is fragile against periods and string ordering

File: components/staff/FollowUpPanel.tsx (spoken line 65)

What goes wrong: .replace(/ Confirmed [^.]+ ago\./, "") strips the duration by matching [^.]+ after a leading space. If a duration format ever includes a decimal point (e.g., 1.5h) or another period, [^.]+ stops early and the regex fails to match—causing the screen reader to re-announce the flag every minute. It also breaks if "Confirmed ... ago." ever appears at the start of flag.text without a leading space, and needlessly couples FollowUpPanel to formatMinutes's exact output.

A way to see it happen: Pass a flag.text containing a decimal duration (such as "On the way, not arrived. Confirmed 1.5h ago.") into FollowUpPanel: spoken leaves "Confirmed 1.5h ago." intact.

Smallest fix: Return { text, spoken, tone } directly from flagFor (with spoken: "On the way, not arrived." for on_way_not_arrived) instead of stripping substrings with a regex.

formatMinutes spacing inconsistency and ungrouped multi-day hours

File: lib/duration.ts (formatMinutes)

What goes wrong: Values under 60 include a space ("45 min"), while values from 60 remove the space ("1h 35min"), and multi-day waits (e.g., a stale demo visit open for 1500 minutes) render as "25h" rather than rolling into days. (Numeric edge cases—0, negatives, decimals, NaN, Infinity, and exact multiples of 60—all return valid strings without throwing.)

A way to see it happen: Call formatMinutes(45) vs formatMinutes(95) vs formatMinutes(1500).

Smallest fix: Keep spacing consistent across all outputs (e.g., "45 min" and "1 hr 35 min" / "2 hr").

d. Anything a test claims but does not really prove
NewLinkPanel.test.tsx never tests the confirmation step or focus return

File: components/staff/NewLinkPanel.test.tsx

What goes wrong: The test only calls renderToStaticMarkup on the initial "idle" state. It never verifies that tapping "Issue a new link" reveals "Yes, issue a new link" and "Cancel", that focus moves to "Yes" and back to "Issue a new link", or that saving={true} blocks confirm().

A way to see it happen: Break onClick={() => setMode("confirm")} or if (saving) return; in NewLinkPanel.tsx and run npm test: NewLinkPanel.test.tsx still passes.

Smallest fix: Add a DOM interaction test (using react-dom/client + act) that clicks "Issue a new link", verifies "Yes, issue a new link" appears and receives focus, and checks "Cancel" and saving={true}.

SoundSwitch.test.tsx never tests failure states, "Turn off sound", or the double-tap guard

File: components/patient/SoundSwitch.test.tsx

What goes wrong: Every test in SoundSwitch.test.tsx uses renderToStaticMarkup on initial render. None of the new interactive behaviours—unlockSound() returning false (sound-failed), playAlert() returning false on test beep or repeat tick, busy.current blocking a double-tap, or "Turn off sound" calling stopVibration()—are exercised.

A way to see it happen: Remove setState("failed") or if (busy.current) return; in SoundSwitch.tsx and run npm test: all tests still pass.

Smallest fix: Mount SoundSwitch in a DOM test and simulate clicks with mocked unlockSound / playAlert resolving true and false.

CheckInPanel.test.tsx skips offsitePaused={true} and form submission

File: components/staff/CheckInPanel.test.tsx

What goes wrong: The file tests offsitePaused={null} and offsitePaused={false} via renderToStaticMarkup, but never renders offsitePaused={true} or submits the form (Enter -> finish("waiting")) while offsitePaused is null or true.

A way to see it happen: Change offsitePaused ? ... : ... on line 214 of CheckInPanel.tsx and run npm test: CheckInPanel.test.tsx does not catch it.

Smallest fix: Add a test case for render(true) verifying the paused banner and "Waits on-site (off-site waiting paused)" button label.

sitePauses.test.ts hides a bug when state.pauses is null by running a priming save first

File: data/sitePauses.test.ts and data/sitePauses.ts (setSitePaused line 74)

What goes wrong: setSitePaused only updates the store immediately when state.pauses is already non-null (if (result !== "not_saved" && state.pauses)). If the initial /api/site-status read failed (state.pauses === null) or hadn't finished yet, a save does not update the store immediately. sitePauses.test.ts masks this by running an extra await setSitePaused("A", true) first just to populate the module-level state.pauses before testing the second save.

A way to see it happen: Call setSitePaused("A", true) while pauseStateNow().pauses is null and fetch is held: pauseStateNow().pauses stays null until fetch resolves.

Smallest fix: In data/sitePauses.ts, initialize { A: false, B: false, [site]: paused } when state.pauses is null (or test the first save directly without a priming save).

components/patient/alertSound.ts has no unit tests at all

File: lib/calledAlert.test.ts (and missing components/patient/alertSound.test.ts)

What goes wrong: lib/calledAlert.test.ts only checks numeric constants (BEEP_VOLUME > 0.3, BEEP_SECONDS < 3, BEEP_HZ). The actual audio/vibration implementation in alertSound.ts—unlockSound(), playAlert()'s 1-second Promise.race resume timeout, vibrate() running when context is missing/suspended, and stopVibration()—is completely untested.

A way to see it happen: Break Promise.race or remove vibrate() in alertSound.ts and run npm test: all 210 tests pass.

Smallest fix: Add components/patient/alertSound.test.ts with fake timers and a stubbed AudioContext / navigator.vibrate covering unlockSound, playAlert resume timeout, and stopVibration.
</pasted_content id="d169">

### Claude's check (2026-11-15)

I read each point against the code on this branch.

Accepted:
- a1, closed player: correct. `unlockSound()` makes a player only when there is none. Fix: make a new one when `state` is `closed`.
- a2 and a3, late results: correct. A Turn off during the 1 s wait for the test beep can be undone by the late `failed` result, and a late tick can set `off`. Fix: an attempt counter in SoundSwitch; `turnOff` also clears `busy`; one tick at a time.
- a4, late rejection of `resume()`: correct. Fix: `.catch` inside the race.
- b2, the failed and sound-off lines are not read out, and focus drops when "Sound is on" goes away after a failure: correct. Fix: one `role="status"` box that is always there; focus moves to "Turn on sound" on any change from on to not on.
- b3, staff teal on the darkest backdrop corner (4.09:1) and the body colours: plausible; I did not measure it. Fix: `.theme-staff` brand #0f5e66 and body `bg-canvas text-ink`; the contrast script must show 4.5:1 or more.
- b4, "1h 35min" for screen readers: the owner chose hidden full words (screen keeps "1h 35min").
- c1, the regex in FollowUpPanel: correct. Fix: `flagFor` gives the spoken words.
- d1, d2, d3, d5, missing tests: correct. Fix: happy-dom click tests for SoundSwitch and NewLinkPanel, a paused render of CheckInPanel, and alertSound tests.

Rejected:
- d4, filling an unknown pause switch with `{ A: false, B: false }`: that would say the other site is not paused when nobody knows. Unknown stays unknown; the `load()` after each save fills it.
- c2, a day unit ("25h"): no demo visit stays open for a day. Noted in known-issues.md.
- b1, the extra announcement: covered by the status box in b2.

The plan for the fixes is C:/Users/mgold/.claude/plans/calm-soaring-hearth.md (approved 2026-11-15).

### Claude's note after the fixes (2026-11-15)

- a4 is not a bug. `unlockSound()` already races `resume()` against the 1 s wait with `Promise.race`, and the race handles a late rejection. The new test in `components/patient/alertSound.test.ts` stays as a guard. No code change for a4.
- A3 (SoundSwitch late results, one beep at a time, focus, one status box): tests `a641010` (6 failed on the old code), fix `899aca2`.
- A4 (more click and render tests): CheckInPanel paused render `1142680`, NewLinkPanel click tests `29f204e` (each fails when its guard is removed).
