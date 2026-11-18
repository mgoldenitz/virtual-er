# Gemini review: the fixes from the equity and accessibility review

Model: Gemini Hydrogen 4, High, in a new chat. Date: 2026-11-18. Branch `phase3-review-fixes`, commits `ce022bd` to `da5a6ba` (base `96e9ad0`).

## Question to ask

You did not write this code. Find problems in it. Do not confirm that it is good. For each problem, give the file and line, what a patient or screen reader user sees or hears that is wrong, and the smallest fix. Say "plausible" when you cannot prove it from the code below. Look most at:

1. `StatusAnnouncer.tsx`: can an expired visit be said twice, or not at all? Can a status change be lost when `pending` is set to null? Is it right that an expired visit is never urgent, even when it was `called`?
2. `useDocumentLanguage.ts`: the cleanup puts back `en` and `ltr`. With two screens that use it (start page, patient page) and client navigation between them, can the page end with the wrong `lang` or `dir`? Can it flash?
3. `LanguageSwitch.tsx`: is a `role="status"` region that is always on the page, with text that changes when the language changes, read out at the right times? Is the draft tag in the option text a problem for screen readers or for sorting?
4. `VisitScreen.tsx` and `app/patient/page.tsx`: `linkReplaced` comes from `deadToken`. Can a patient see "This visit link is no longer active" when the link only failed to load (network)?
5. `lib/textSize.ts`: the head script now runs on `/` and `/patient`. Can it throw, or set a size on another page?
6. The tap size of the care links (`inline-block py-1`) and the `sr-only` thank-you box: do they meet WCAG 2.5.8 and still show the thank-you to sighted users after a tap?

Do not review the wording of the translations; that was done in earlier reviews.

## Rules the code must keep (settled, do not report)

- SPEC lines stay as written: `calledHeading`, `arrivedHeading`, `fromHomeText[0]`, `returnNow.text`, the 911 line and the footer (lib/text/en.ts).
- `menuLabel` in lib/text/languages.ts does not change, because components/staff/CheckInPanel.tsx line 227 adds its own staff tag.
- Text sizes stay 100, 125 and 150% (docs/decisions.md, 2026-11-17).
- `lang` and `dir` stay on `<main>` as well as on `<html>`.

## Checked (output in this session)

- `npm test`: Test Files 63 passed (63), Tests 349 passed (349).
- `npm run lint`: 0 errors, 2 warnings, both in .playwright-mcp helper files that git does not track.
- `npm run build`: passed.
- Each new test failed before its fix and passed after.
- axe-core in a browser (WCAG 2.0, 2.1, 2.2 A and AA tags): `/` and `/patient`, widths 320, 390 and 1280, 5 languages, text at 100% and 200%. 60 runs, 0 violations, 0 elements off the screen, the 911 line on every run, `<html>` has the right `lang` and `dir` on every run.

## Not checked

- A real screen reader (VoiceOver, TalkBack, NVDA). The announcer and status region are checked only in happy-dom tests.
- Client navigation from `/` to `/patient` and back, for `lang` and `dir`.
- The replaced-link message with a real replaced token in the database.
- Text sizes 125% and 150% chosen with the switch (the browser run set 200% on `<html>` directly).

## Line count of each changed file (after the change)

- app/patient/page.tsx: 119 lines
- components/LanguageSwitch.test.tsx: 53 lines
- components/LanguageSwitch.tsx: 48 lines
- components/patient/StatusAnnouncer.test.tsx: 79 lines
- components/patient/StatusAnnouncer.tsx: 101 lines
- components/patient/StillHerePrompt.click.test.tsx: 105 lines
- components/patient/StillHerePrompt.tsx: 104 lines
- components/patient/VisitScreen.click.test.tsx: 145 lines
- components/patient/VisitScreen.tsx: 93 lines
- components/start/CareOptions.test.tsx: 23 lines
- components/start/CareOptions.tsx: 60 lines
- components/start/StartPageBody.test.tsx: 18 lines
- components/start/StartPageBody.tsx: 51 lines
- components/useDocumentLanguage.test.tsx: 48 lines
- components/useDocumentLanguage.ts: 21 lines
- lib/text/ar.ts: 170 lines
- lib/text/en.ts: 199 lines
- lib/text/fr.ts: 169 lines
- lib/text/text.test.ts: 72 lines
- lib/text/ur.ts: 171 lines
- lib/text/zh.ts: 169 lines
- lib/textSize.test.ts: 78 lines
- lib/textSize.ts: 46 lines

## The diff (code and English text; the other 4 language files change the same keys)

```diff
diff --git a/app/patient/page.tsx b/app/patient/page.tsx
index b4fb3be..b80de19 100644
--- a/app/patient/page.tsx
+++ b/app/patient/page.tsx
@@ -14,6 +14,7 @@ import { PatientShell } from "@/components/PatientShell";
 import { OfflineBanner } from "@/components/patient/OfflineBanner";
 import { TextSizeSwitch } from "@/components/patient/TextSizeSwitch";
 import { VisitScreen } from "@/components/patient/VisitScreen";
+import { useDocumentLanguage } from "@/components/useDocumentLanguage";
 import { isDeadToken } from "@/lib/deadToken";
 import { textFor } from "@/lib/text";
 import { languageInfo, patientLanguage } from "@/lib/text/languages";
@@ -56,6 +57,7 @@ export default function PatientPage() {
   // The phone's own choice first, so even "Loading…" and the 911 line are in that language.
   const language = patientLanguage(chosenLanguage, view?.language);
   const t = textFor(language);
+  useDocumentLanguage(language);
 
   // The first time the called screen is actually on screen, record seen_at
   // (shown, not necessarily read). A tab in the background waits until it is brought forward.
@@ -103,6 +105,7 @@ export default function PatientPage() {
         loading={loading}
         result={result}
         linkFailed={linkFailed}
+        linkReplaced={deadToken}
         token={token ?? null}
         language={language}
         onOnMyWay={onOnMyWay}
diff --git a/components/LanguageSwitch.test.tsx b/components/LanguageSwitch.test.tsx
index a5f9330..eefae30 100644
--- a/components/LanguageSwitch.test.tsx
+++ b/components/LanguageSwitch.test.tsx
@@ -1,7 +1,10 @@
-// Checks the language menu: it can never be wider than its box, so text at 200% does not make the page scroll sideways.
+// Checks the language menu: it stays inside the screen width at 200% text, it tags draft languages,
+// it has a status region for the draft notice, and it always shows the interpreter line.
 
 import { renderToStaticMarkup } from "react-dom/server";
 import { describe, expect, it, vi } from "vitest";
+import { textFor } from "@/lib/text";
+import { LANGUAGES, menuLabel } from "@/lib/text/languages";
 import { LanguageSwitch } from "./LanguageSwitch";
 
 // The menu saves the choice on the phone; the test does not need that.
@@ -13,6 +16,11 @@ function selectClasses(html: string): string[] {
   return (tag.match(/class="([^"]*)"/)?.[1] ?? "").split(" ");
 }
 
+// The words of one menu option in the rendered HTML.
+function optionText(html: string, code: string): string | undefined {
+  return html.match(new RegExp(`<option[^>]*value="${code}"[^>]*>([^<]*)</option>`))?.[1];
+}
+
 describe("LanguageSwitch", () => {
   it("keeps the menu inside the screen width (WCAG reflow at 200% text)", () => {
     for (const language of ["en", "fr", "ur", "ar", "zh"]) {
@@ -20,4 +28,26 @@ describe("LanguageSwitch", () => {
       expect(selectClasses(html)).toContain("max-w-full");
     }
   });
+
+  it("has the status region on the page even in English, so a screen reader hears the draft notice when it appears", () => {
+    const html = renderToStaticMarkup(<LanguageSwitch language="en" />);
+    expect(html).toMatch(/<div[^>]*role="status"/);
+  });
+
+  it("tags each draft language in the menu, in that language's own words", () => {
+    const html = renderToStaticMarkup(<LanguageSwitch language="en" />);
+    for (const info of LANGUAGES.filter((l) => !l.approved)) {
+      expect(optionText(html, info.code)).toBe(`${menuLabel(info)} (${textFor(info.code).language.draftTag})`);
+    }
+  });
+
+  it("does not tag English, which is approved", () => {
+    const html = renderToStaticMarkup(<LanguageSwitch language="en" />);
+    expect(optionText(html, "en")).toBe("English");
+  });
+
+  it("always shows the interpreter line", () => {
+    const html = renderToStaticMarkup(<LanguageSwitch language="en" />);
+    expect(html).toContain(textFor("en").language.interpreter);
+  });
 });
diff --git a/components/LanguageSwitch.tsx b/components/LanguageSwitch.tsx
index 2c62d07..a9c0f26 100644
--- a/components/LanguageSwitch.tsx
+++ b/components/LanguageSwitch.tsx
@@ -1,12 +1,19 @@
 "use client";
 
 // The language menu on patient screens, with each language written in itself so a patient
-// can find their own. Shows the draft notice for any language a fluent speaker has not
-// approved yet (SPEC). The choice is remembered on this phone (data/savedLanguage.ts).
+// can find their own. Each draft language has a tag in the menu, in its own words, and the
+// draft notice shows for any language a fluent speaker has not approved yet (SPEC). The
+// interpreter line is always shown. The choice is remembered on this phone (data/savedLanguage.ts).
 
 import { chooseLanguage } from "@/data/savedLanguage";
 import { textFor } from "@/lib/text";
-import { languageInfo, LANGUAGES, menuLabel } from "@/lib/text/languages";
+import { languageInfo, LANGUAGES, menuLabel, type LanguageInfo } from "@/lib/text/languages";
+
+/** The menu words for one language: its label, then "(draft)" in that language if it is not approved. */
+function optionLabel(info: LanguageInfo): string {
+  if (info.approved) return menuLabel(info);
+  return `${menuLabel(info)} (${textFor(info.code).language.draftTag})`;
+}
 
 export function LanguageSwitch({ language }: { language: string }) {
   const t = textFor(language);
@@ -22,16 +29,20 @@ export function LanguageSwitch({ language }: { language: string }) {
         >
           {LANGUAGES.map((l) => (
             <option key={l.code} value={l.code} lang={l.code} dir={l.dir}>
-              {menuLabel(l)}
+              {optionLabel(l)}
             </option>
           ))}
         </select>
       </label>
-      {!current.approved && (
-        <p className="rounded-lg border-2 border-amber-700 bg-amber-50 p-2 text-sm font-semibold text-amber-950" data-testid="draft-notice">
-          {t.language.draftNotice}
-        </p>
-      )}
+      {/* Always on the page, so a screen reader hears the notice when it appears after a language change. */}
+      <div role="status">
+        {!current.approved && (
+          <p className="rounded-lg border-2 border-amber-700 bg-amber-50 p-2 text-sm font-semibold text-amber-950" data-testid="draft-notice">
+            {t.language.draftNotice}
+          </p>
+        )}
+      </div>
+      <p className="text-base">{t.language.interpreter}</p>
     </div>
   );
 }
diff --git a/components/patient/StatusAnnouncer.test.tsx b/components/patient/StatusAnnouncer.test.tsx
index 0c39d4d..f04e06c 100644
--- a/components/patient/StatusAnnouncer.test.tsx
+++ b/components/patient/StatusAnnouncer.test.tsx
@@ -18,6 +18,9 @@ let container: HTMLDivElement;
 let root: Root;
 
 const show = (status: VisitStatus) => act(() => root.render(<StatusAnnouncer status={status} language="en" />));
+/** Shows the announcer with a language and the expired flag as well as the status. */
+const draw = (status: VisitStatus, language: string, expired: boolean) =>
+  act(() => root.render(<StatusAnnouncer status={status} language={language} expired={expired} />));
 const polite = () => container.querySelector('[aria-live="polite"]')?.textContent;
 
 /** Shows the first status, changes to the second, and gives back what the polite region says after the pause. */
@@ -59,4 +62,18 @@ describe("StatusAnnouncer", () => {
     await act(async () => vi.advanceTimersByTimeAsync(300));
     expect(polite()).toBe("");
   });
+
+  it("announces when the visit expires", async () => {
+    draw("pre_arrival", "en", false);
+    draw("pre_arrival", "en", true);
+    await act(async () => vi.advanceTimersByTimeAsync(300));
+    expect(polite()).toBe(a.expired);
+  });
+
+  it("does not say the last status again after a language change", async () => {
+    expect(await heardAfter("pre_arrival", "waiting")).toBe(a.waiting);
+    draw("waiting", "fr", false);
+    await act(async () => vi.advanceTimersByTimeAsync(300));
+    expect(polite()).toBe(a.waiting);
+  });
 });
diff --git a/components/patient/StatusAnnouncer.tsx b/components/patient/StatusAnnouncer.tsx
index 624f9f9..11a3a0a 100644
--- a/components/patient/StatusAnnouncer.tsx
+++ b/components/patient/StatusAnnouncer.tsx
@@ -1,7 +1,8 @@
 "use client";
 
 // Tells screen readers about status changes only (never the wait range or countdowns):
-// an assertive message for the call-back, a polite one for everything else.
+// an assertive message for the call-back, a polite one for everything else, including
+// the visit request expiring.
 
 import { useEffect, useRef, useState } from "react";
 import { textFor } from "@/lib/text";
@@ -24,11 +25,18 @@ function messageFor(status: VisitStatus, language: string): string {
   return messages[status] ?? "";
 }
 
-/** One status change waiting to be announced. `round` makes every change new, even a repeat. */
-type Pending = { round: number; status: VisitStatus };
+/**
+ * One change waiting to be announced. `round` makes every change new, even a repeat.
+ * `expired` is true when the change is the visit request expiring, not a new status.
+ */
+type Pending = { round: number; status: VisitStatus; expired: boolean };
 
-export function StatusAnnouncer({ status, language }: { status: VisitStatus; language: string }) {
+type Props = { status: VisitStatus; language: string; expired?: boolean };
+
+export function StatusAnnouncer({ status, language, expired = false }: Props) {
   const [previous, setPrevious] = useState<VisitStatus | null>(null);
+  // An expiry already on screen when the page opens is not announced; only the change is.
+  const [wasExpired, setWasExpired] = useState(expired);
   // A call-back already on screen when the page opens is announced; other opening statuses are not.
   const [pending, setPending] = useState<Pending | null>(null);
   const [polite, setPolite] = useState("");
@@ -46,7 +54,14 @@ export function StatusAnnouncer({ status, language }: { status: VisitStatus; lan
     setPolite("");
     setUrgent("");
     if (previous !== null || status === "called") {
-      setPending((p) => ({ round: (p?.round ?? 0) + 1, status }));
+      setPending((p) => ({ round: (p?.round ?? 0) + 1, status, expired: false }));
+    }
+  }
+  if (expired !== wasExpired) {
+    setWasExpired(expired);
+    if (expired) {
+      setPolite("");
+      setPending((p) => ({ round: (p?.round ?? 0) + 1, status, expired: true }));
     }
   }
 
@@ -54,14 +69,16 @@ export function StatusAnnouncer({ status, language }: { status: VisitStatus; lan
   // forward, then announces the status if it has not changed in the meantime.
   useEffect(() => {
     if (!pending) return;
-    const text = messageFor(pending.status, language);
+    const text = pending.expired ? textFor(language).announce.expired : messageFor(pending.status, language);
     if (!text) return;
     let done = false;
     const announce = () => {
       if (done || document.visibilityState !== "visible" || current.current !== pending.status) return;
       done = true;
-      if (pending.status === "called") setUrgent(text);
+      if (pending.status === "called" && !pending.expired) setUrgent(text);
       else setPolite(text);
+      // Said once: a later language change does not say it again.
+      setPending(null);
     };
     const timer = window.setTimeout(announce, 300);
     document.addEventListener("visibilitychange", announce);
diff --git a/components/patient/StillHerePrompt.click.test.tsx b/components/patient/StillHerePrompt.click.test.tsx
index 6118e1f..43abb43 100644
--- a/components/patient/StillHerePrompt.click.test.tsx
+++ b/components/patient/StillHerePrompt.click.test.tsx
@@ -90,6 +90,11 @@ describe("StillHerePrompt tap", () => {
     expect(box?.textContent).toContain(s.thanks);
   });
 
+  it("keeps the empty thank-you box out of the layout before the tap", () => {
+    show(due);
+    expect(statusBox()?.className.split(" ")).toContain("sr-only");
+  });
+
   it("leaves focus on the page after a phone tap that did not focus the button", async () => {
     show(due);
     expect(document.activeElement).toBe(document.body);
diff --git a/components/patient/StillHerePrompt.tsx b/components/patient/StillHerePrompt.tsx
index c809934..9903413 100644
--- a/components/patient/StillHerePrompt.tsx
+++ b/components/patient/StillHerePrompt.tsx
@@ -80,7 +80,7 @@ export function StillHerePrompt({ view, token, language, lostFocus }: Props) {
         </PromptCard>
       )}
       {/* Always on the page, so screen readers hear the thank-you when its text comes in. */}
-      <p role="status" className={thanking ? "clean-card font-semibold" : undefined} data-testid="still-here-thanks">
+      <p role="status" className={thanking ? "clean-card font-semibold" : "sr-only"} data-testid="still-here-thanks">
         {thanking ? `${t.stillHere.thanks} ${t.stillHere.meaning}` : ""}
       </p>
     </>
diff --git a/components/patient/VisitScreen.click.test.tsx b/components/patient/VisitScreen.click.test.tsx
index b130e90..bf4df4f 100644
--- a/components/patient/VisitScreen.click.test.tsx
+++ b/components/patient/VisitScreen.click.test.tsx
@@ -117,4 +117,29 @@ describe("VisitScreen when the whole screen changes", () => {
     expect(heading?.textContent).toBe(p.waitingHeading);
     expect(document.activeElement).toBe(heading);
   });
+
+  it("shows the replaced-link message, with focus on its heading, when staff made a new link", () => {
+    focusOnWaitingHeading();
+    act(() =>
+      root.render(
+        <VisitScreen
+          loading={false}
+          result={null}
+          linkFailed
+          linkReplaced
+          token="t"
+          language="en"
+          onOnMyWay={() => {}}
+          sending={false}
+          online
+          notSaved={false}
+        />,
+      ),
+    );
+    const heading = container.querySelector("#status-heading");
+    expect(heading?.textContent).toBe(p.replacedLinkHeading);
+    expect(container.textContent).toContain(p.replacedLinkText);
+    expect(container.textContent).not.toContain(p.brokenLinkText);
+    expect(document.activeElement).toBe(heading);
+  });
 });
diff --git a/components/patient/VisitScreen.tsx b/components/patient/VisitScreen.tsx
index 03057d3..cd02bc7 100644
--- a/components/patient/VisitScreen.tsx
+++ b/components/patient/VisitScreen.tsx
@@ -1,7 +1,7 @@
 "use client";
 
 // The part of the patient page below the 911 line: "Loading…", the "could not load" box, the
-// no-visit or broken-link box, or the visit itself (code, status, sound box and announcer).
+// no-visit, broken-link or replaced-link box, or the visit itself (code, status, sound box and announcer).
 // This part stays on the page when the screen changes, so it is the one that moves focus to the
 // new heading when the old screen left with focus inside it.
 
@@ -20,6 +20,8 @@ type Props = {
   result: PatientView | null | "unavailable" | undefined;
   /** True when the link was broken or no longer opens a visit (for example after a new link). */
   linkFailed: boolean;
+  /** True when the link once opened a visit but no longer does (for example staff made a new link). */
+  linkReplaced?: boolean;
   token: string | null;
   language: string;
   onOnMyWay: () => void;
@@ -31,7 +33,7 @@ type Props = {
 
 type Screen = "loading" | "unavailable" | "none" | "visit";
 
-export function VisitScreen({ loading, result, linkFailed, token, language, onOnMyWay, sending, online, notSaved }: Props) {
+export function VisitScreen({ loading, result, linkFailed, linkReplaced = false, token, language, onOnMyWay, sending, online, notSaved }: Props) {
   const t = textFor(language);
   const p = t.patient;
   const view = result === "unavailable" ? null : result;
@@ -61,9 +63,10 @@ export function VisitScreen({ loading, result, linkFailed, token, language, onOn
       {screen === "none" && (
         <section aria-labelledby="status-heading" className="clean-card space-y-2">
           <h2 id="status-heading" tabIndex={-1} className="text-2xl font-bold">
-            {linkFailed ? p.brokenLinkHeading : p.noVisitHeading}
+            {linkReplaced ? p.replacedLinkHeading : linkFailed ? p.brokenLinkHeading : p.noVisitHeading}
           </h2>
-          {linkFailed && <p className="text-lg">{p.brokenLinkText}</p>}
+          {linkReplaced && <p className="text-lg">{p.replacedLinkText}</p>}
+          {linkFailed && !linkReplaced && <p className="text-lg">{p.brokenLinkText}</p>}
           <p className="text-lg">{p.findVisitHelp}</p>
         </section>
       )}
@@ -82,7 +85,7 @@ export function VisitScreen({ loading, result, linkFailed, token, language, onOn
               {p.notSaved}
             </p>
           )}
-          <StatusAnnouncer key={token} status={view.status} language={language} />
+          <StatusAnnouncer key={token} status={view.status} language={language} expired={view.expired} />
         </>
       )}
     </FocusBox>
diff --git a/components/start/CareOptions.test.tsx b/components/start/CareOptions.test.tsx
new file mode 100644
index 0000000..0b2bd8a
--- /dev/null
+++ b/components/start/CareOptions.test.tsx
@@ -0,0 +1,23 @@
+// Checks that every link in the care options is a tap target of at least 24 by 24 pixels (WCAG 2.5.8):
+// inline-block with space above and below, not a thin line of text.
+
+import { renderToStaticMarkup } from "react-dom/server";
+import { describe, expect, it } from "vitest";
+import { CareOptions } from "./CareOptions";
+
+// The class list of every <a> tag in the rendered HTML.
+function linkClasses(html: string): string[][] {
+  const tags = html.match(/<a [^>]*>/g) ?? [];
+  return tags.map((tag) => (tag.match(/class="([^"]*)"/)?.[1] ?? "").split(" "));
+}
+
+describe("CareOptions", () => {
+  it("gives every link room to tap", () => {
+    const links = linkClasses(renderToStaticMarkup(<CareOptions language="en" />));
+    expect(links.length).toBeGreaterThan(0);
+    for (const classes of links) {
+      expect(classes).toContain("inline-block");
+      expect(classes).toContain("py-1");
+    }
+  });
+});
diff --git a/components/start/CareOptions.tsx b/components/start/CareOptions.tsx
index c6d67a9..f9000e6 100644
--- a/components/start/CareOptions.tsx
+++ b/components/start/CareOptions.tsx
@@ -6,7 +6,8 @@ import { textFor } from "@/lib/text";
 
 const THP_EMERGENCY_PAGE = "https://www.thp.ca/emergency/A/visit.html";
 
-const linkStyle = "font-semibold text-brand underline underline-offset-2";
+// inline-block with py-1 makes each link a tap target of at least 24 by 24 pixels (WCAG 2.5.8).
+const linkStyle = "inline-block py-1 font-semibold text-brand underline underline-offset-2";
 
 function External({ href, children, newTab }: { href: string; children: string; newTab: string }) {
   return (
diff --git a/components/start/StartPageBody.test.tsx b/components/start/StartPageBody.test.tsx
new file mode 100644
index 0000000..0da66ad
--- /dev/null
+++ b/components/start/StartPageBody.test.tsx
@@ -0,0 +1,18 @@
+// Checks that the start page has the text size choice, so a patient can make the text bigger before a visit starts.
+
+import { renderToStaticMarkup } from "react-dom/server";
+import { describe, expect, it, vi } from "vitest";
+import { StartPageBody } from "./StartPageBody";
+
+// The page reads the saved language and visit from the phone and the database; the test does not need them.
+vi.mock("@/data/savedLanguage", () => ({ useChosenLanguage: () => null, chooseLanguage: vi.fn() }));
+vi.mock("@/components/start/StartVisit", () => ({ StartVisit: () => null }));
+
+describe("StartPageBody", () => {
+  it("has the text size choice with its three sizes", () => {
+    const html = renderToStaticMarkup(<StartPageBody />);
+    expect(html).toContain("<legend");
+    expect(html).toContain("Text size");
+    expect(html.match(/<input[^>]*name="text-size"/g)).toHaveLength(3);
+  });
+});
diff --git a/components/start/StartPageBody.tsx b/components/start/StartPageBody.tsx
index e3fb4b6..1f1e6db 100644
--- a/components/start/StartPageBody.tsx
+++ b/components/start/StartPageBody.tsx
@@ -10,8 +10,10 @@ import { textFor } from "@/lib/text";
 import { languageInfo } from "@/lib/text/languages";
 import { EmergencyLine } from "@/components/EmergencyLine";
 import { LanguageSwitch } from "@/components/LanguageSwitch";
+import { TextSizeSwitch } from "@/components/patient/TextSizeSwitch";
 import { CareOptions } from "@/components/start/CareOptions";
 import { StartVisit } from "@/components/start/StartVisit";
+import { useDocumentLanguage } from "@/components/useDocumentLanguage";
 
 const linkStyle =
   "inline-block min-h-11 rounded-lg border-2 border-slate-700 px-4 py-2 font-semibold focus-visible:outline-4 focus-visible:outline-slate-950";
@@ -19,10 +21,12 @@ const linkStyle =
 export function StartPageBody() {
   const language = useChosenLanguage() ?? "en";
   const t = textFor(language);
+  useDocumentLanguage(language);
   return (
     <main lang={language} dir={languageInfo(language).dir} className="mx-auto w-full max-w-xl space-y-6 px-4 py-6">
       <h1 className="text-2xl font-bold">{t.appName}</h1>
       <LanguageSwitch language={language} />
+      <TextSizeSwitch language={language} />
       <p className="rounded-lg border-2 border-red-700 bg-red-50 p-3 text-lg font-bold text-red-900">
         {t.start.emergencyCheck}
       </p>
diff --git a/components/useDocumentLanguage.test.tsx b/components/useDocumentLanguage.test.tsx
new file mode 100644
index 0000000..59d7087
--- /dev/null
+++ b/components/useDocumentLanguage.test.tsx
@@ -0,0 +1,48 @@
+// @vitest-environment happy-dom
+// Checks that the whole page (the <html> tag) gets the chosen language and direction,
+// and goes back to English, left to right, when the screen closes.
+
+import { act } from "react";
+import { createRoot, type Root } from "react-dom/client";
+import { afterEach, beforeEach, describe, expect, it } from "vitest";
+import { useDocumentLanguage } from "./useDocumentLanguage";
+
+// Tells React that this file runs its updates inside act().
+(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
+
+function Screen({ language }: { language: string }) {
+  useDocumentLanguage(language);
+  return null;
+}
+
+let container: HTMLDivElement;
+let root: Root;
+const html = () => document.documentElement;
+
+beforeEach(() => {
+  html().setAttribute("lang", "en");
+  html().setAttribute("dir", "ltr");
+  container = document.createElement("div");
+  document.body.appendChild(container);
+  root = createRoot(container);
+});
+
+afterEach(() => {
+  container.remove();
+});
+
+describe("useDocumentLanguage", () => {
+  it("sets Urdu and right to left on the whole page", () => {
+    act(() => root.render(<Screen language="ur" />));
+    expect(html().getAttribute("lang")).toBe("ur");
+    expect(html().getAttribute("dir")).toBe("rtl");
+    act(() => root.unmount());
+  });
+
+  it("puts back English, left to right, when the screen closes", () => {
+    act(() => root.render(<Screen language="ar" />));
+    act(() => root.unmount());
+    expect(html().getAttribute("lang")).toBe("en");
+    expect(html().getAttribute("dir")).toBe("ltr");
+  });
+});
diff --git a/components/useDocumentLanguage.ts b/components/useDocumentLanguage.ts
new file mode 100644
index 0000000..40d6fcd
--- /dev/null
+++ b/components/useDocumentLanguage.ts
@@ -0,0 +1,21 @@
+"use client";
+
+// Puts the screen's language and direction on the whole page (the <html> tag), so the browser
+// and screen readers use them for everything, including the page title and the scroll bar side.
+// When the screen closes, the page goes back to English, left to right (as app/layout.tsx sets it).
+
+import { useEffect } from "react";
+import { languageInfo } from "@/lib/text/languages";
+
+export function useDocumentLanguage(language: string) {
+  useEffect(() => {
+    const html = document.documentElement;
+    const info = languageInfo(language);
+    html.setAttribute("lang", info.code);
+    html.setAttribute("dir", info.dir);
+    return () => {
+      html.setAttribute("lang", "en");
+      html.setAttribute("dir", "ltr");
+    };
+  }, [language]);
+}
diff --git a/lib/text/en.ts b/lib/text/en.ts
index 69d8410..be6baf6 100644
--- a/lib/text/en.ts
+++ b/lib/text/en.ts
@@ -66,7 +66,7 @@ export const en = {
 
   // Shown on the start page and the patient screen when a visit from home was never triaged.
   expiredText:
-    "You started this visit over 6 hours ago. It was never checked in at triage. Staff no longer expect you to arrive.",
+    "You started this visit over 6 hours ago. No nurse saw you for this visit. Staff no longer expect you to arrive.",
 
   patient: {
     loading: "Loading your visit…",
@@ -76,6 +76,9 @@ export const en = {
     noVisitHeading: "No visit found on this phone",
     brokenLinkHeading: "This link did not work",
     brokenLinkText: "The link might be wrong or cut short. No visit was opened.",
+    // Staff gave a new link or closed the visit, so this link no longer works.
+    replacedLinkHeading: "This visit link is no longer active",
+    replacedLinkText: "Please ask the emergency department desk for help.",
     findVisitHelp:
       "Scan the QR code on your slip. You can also type the link printed under it. If it still fails, ask the desk to show the QR code again.",
 
@@ -95,17 +98,17 @@ export const en = {
     onMyWay: "I'm on my way",
     sending: "Sending…",
     confirmed: "Thank you. Staff know you are on your way.",
-    notSaved: "Your answer did not save. Staff do not know you tapped it. Please try again or go to the desk.",
+    notSaved: "Your answer did not save. Staff do not know you are on your way. Please try again or go to the desk.",
 
-    fromHomeHeading: "Status: Started from home, not yet triaged",
+    fromHomeHeading: "Status: Started from home, not seen by a nurse yet",
     fromHomeText: [
       // SPEC
       "Your place in line starts when a nurse sees you at triage. The most urgent patients are always seen first.",
-      "This app does not register you or give permission to wait off-site.",
-      "If you go to the emergency department, follow its normal steps. Show this visit code to staff. Only staff can approve off-site waiting.",
+      "This app does not check you in at the hospital or let you wait away from the hospital.",
+      "When you get to the emergency department, check in at the front desk and show this visit code. Only staff can let you wait away from the hospital.",
     ],
     reassessHeading: "Please go to the triage desk",
-    reassessText: "A nurse needs to check you again. This happens before you rejoin the line.",
+    reassessText: "A nurse needs to check you again before you go back in line.",
     arrivedHeading: "Status: Ready at the desk",
     arrivedText: "Staff know you are back. Please stay in the waiting area until you are called.",
     onsiteHeading: "Status: Waiting in the emergency department",
@@ -123,7 +126,7 @@ export const en = {
 
   // Heard by screen-reader users when the status changes (never the wait range or countdowns).
   announce: {
-    called: "You have been called back. Please head back to the emergency department now.",
+    called: "It is your turn. Please come back to the emergency department now.",
     onTheWay: "Thank you. Staff know you are on your way.",
     arrived: "Staff have marked you as back at the emergency department.",
     ended: "Your off-site wait has ended.",
@@ -132,6 +135,7 @@ export const en = {
     secondAlert: "Urgent: Please return to the emergency department right now.",
     waiting: "You are now in the off-site line. This page shows your place in line.",
     onsite: "Please wait inside the emergency department. Staff will call you when they are ready.",
+    expired: "This visit request has expired. If you still need care, please go to the emergency department desk.",
   },
 
   // Desk slip (printed for the patient).
@@ -147,7 +151,7 @@ export const en = {
     thanks: "Thank you.",
     meaning: "This tells staff you are still waiting. It is not a check of your health.",
   },
-  secondAlert: "Please return to the emergency department right now. Staff may try to reach you.",
+  secondAlert: "Please come back to the emergency department right now. Staff may phone you.",
   returnNow: {
     lead: "We have not heard from you.",
     // SPEC
@@ -167,6 +171,9 @@ export const en = {
   language: {
     label: "Select language",
     draftNotice: "This translation is a draft. A fluent speaker has not checked it yet.",
+    // Shown in brackets after a draft language's name in the menu.
+    draftTag: "draft",
+    interpreter: "Need another language? Ask the emergency department desk for a free interpreter.",
   },
   survey: {
     // SPEC
diff --git a/lib/text/text.test.ts b/lib/text/text.test.ts
index 6a5d99c..ef4fae5 100644
--- a/lib/text/text.test.ts
+++ b/lib/text/text.test.ts
@@ -57,3 +57,16 @@ describe("SPEC's fixed sentences", () => {
     expect(t.survey.question).toBe("How would you rate your waiting experience?");
   });
 });
+
+// The owner's words from the equity review (docs/decisions.md, 2026-11-17).
+describe("the owner's equity lines", () => {
+  const t = textFor("en");
+
+  it("has the replaced-link message and the interpreter line exactly", () => {
+    expect(t.patient.replacedLinkHeading).toBe("This visit link is no longer active");
+    expect(t.patient.replacedLinkText).toBe("Please ask the emergency department desk for help.");
+    expect(t.language.interpreter).toBe(
+      "Need another language? Ask the emergency department desk for a free interpreter.",
+    );
+  });
+});
diff --git a/lib/textSize.test.ts b/lib/textSize.test.ts
index 5a1546c..e59c59d 100644
--- a/lib/textSize.test.ts
+++ b/lib/textSize.test.ts
@@ -55,8 +55,12 @@ describe("textSizeScript", () => {
     expect(runScript("/patient", storageWith("extraLarge"))).toBe("150%");
   });
 
+  it("sets the saved size on the start page", () => {
+    expect(runScript("/", storageWith("large"))).toBe("125%");
+  });
+
   it("does nothing on other pages", () => {
-    expect(runScript("/", storageWith("extraLarge"))).toBe("");
+    expect(runScript("/staff", storageWith("extraLarge"))).toBe("");
   });
 
   it("ignores a saved value that is not a size", () => {
diff --git a/lib/textSize.ts b/lib/textSize.ts
index 870eac7..fd7976b 100644
--- a/lib/textSize.ts
+++ b/lib/textSize.ts
@@ -25,13 +25,14 @@ export function rootFontSize(size: TextSize): string {
 
 /**
  * A short plain-JavaScript script for the page's <head>. It sets the page font size before the first
- * paint on patient screens, so a patient who chose a larger size does not see the page at Normal
- * size first. It does nothing outside /patient, and does nothing if browser storage is blocked.
- * The key and the sizes are written in as JSON, so they are defined only in this file.
+ * paint on the start page and patient screens, so a patient who chose a larger size does not see the
+ * page at Normal size first. It does nothing on other pages (staff, dashboard), and does nothing if
+ * browser storage is blocked. The key and the sizes are written in as JSON, so they are defined only in this file.
  */
 export function textSizeScript(): string {
   return `(function () {
-  if (!location.pathname.startsWith("/patient")) return;
+  var path = location.pathname;
+  if (path !== "/" && !path.startsWith("/patient")) return;
   try {
     var saved = localStorage.getItem(${JSON.stringify(TEXT_SIZE_KEY)});
     var sizes = ${JSON.stringify(ROOT_FONT_SIZES)};
```

## Whole files after the change (non-test)

### components/patient/StatusAnnouncer.tsx

```tsx
"use client";

// Tells screen readers about status changes only (never the wait range or countdowns):
// an assertive message for the call-back, a polite one for everything else, including
// the visit request expiring.

import { useEffect, useRef, useState } from "react";
import { textFor } from "@/lib/text";
import type { VisitStatus } from "@/lib/visit";

/** What is announced for each status change, in the visit's language. */
function messageFor(status: VisitStatus, language: string): string {
  const a = textFor(language).announce;
  const messages: Partial<Record<VisitStatus, string>> = {
    waiting: a.waiting,
    declined: a.onsite,
    not_eligible: a.onsite,
    called: a.called,
    on_the_way: a.onTheWay,
    arrived: a.arrived,
    removed: a.ended,
    unable_to_reach: a.ended,
    needs_reassessment: a.reassess,
  };
  return messages[status] ?? "";
}

/**
 * One change waiting to be announced. `round` makes every change new, even a repeat.
 * `expired` is true when the change is the visit request expiring, not a new status.
 */
type Pending = { round: number; status: VisitStatus; expired: boolean };

type Props = { status: VisitStatus; language: string; expired?: boolean };

export function StatusAnnouncer({ status, language, expired = false }: Props) {
  const [previous, setPrevious] = useState<VisitStatus | null>(null);
  // An expiry already on screen when the page opens is not announced; only the change is.
  const [wasExpired, setWasExpired] = useState(expired);
  // A call-back already on screen when the page opens is announced; other opening statuses are not.
  const [pending, setPending] = useState<Pending | null>(null);
  const [polite, setPolite] = useState("");
  const [urgent, setUrgent] = useState("");
  const current = useRef(status);
  useEffect(() => {
    current.current = status;
  }, [status]);

  // On every status change, empty both regions at once. The new text is put in a moment later,
  // so a screen reader hears it even when it is the same words as last time
  // (for example called, arrived, then Undo back to called).
  if (status !== previous) {
    setPrevious(status);
    setPolite("");
    setUrgent("");
    if (previous !== null || status === "called") {
      setPending((p) => ({ round: (p?.round ?? 0) + 1, status, expired: false }));
    }
  }
  if (expired !== wasExpired) {
    setWasExpired(expired);
    if (expired) {
      setPolite("");
      setPending((p) => ({ round: (p?.round ?? 0) + 1, status, expired: true }));
    }
  }

  // Put the text in only while the page is on screen; a background tab waits until it is brought
  // forward, then announces the status if it has not changed in the meantime.
  useEffect(() => {
    if (!pending) return;
    const text = pending.expired ? textFor(language).announce.expired : messageFor(pending.status, language);
    if (!text) return;
    let done = false;
    const announce = () => {
      if (done || document.visibilityState !== "visible" || current.current !== pending.status) return;
      done = true;
      if (pending.status === "called" && !pending.expired) setUrgent(text);
      else setPolite(text);
      // Said once: a later language change does not say it again.
      setPending(null);
    };
    const timer = window.setTimeout(announce, 300);
    document.addEventListener("visibilitychange", announce);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", announce);
    };
  }, [pending, language]);

  return (
    <>
      <p aria-live="polite" className="sr-only">
        {polite}
      </p>
      <p aria-live="assertive" className="sr-only">
        {urgent}
      </p>
    </>
  );
}
```

### components/LanguageSwitch.tsx

```tsx
"use client";

// The language menu on patient screens, with each language written in itself so a patient
// can find their own. Each draft language has a tag in the menu, in its own words, and the
// draft notice shows for any language a fluent speaker has not approved yet (SPEC). The
// interpreter line is always shown. The choice is remembered on this phone (data/savedLanguage.ts).

import { chooseLanguage } from "@/data/savedLanguage";
import { textFor } from "@/lib/text";
import { languageInfo, LANGUAGES, menuLabel, type LanguageInfo } from "@/lib/text/languages";

/** The menu words for one language: its label, then "(draft)" in that language if it is not approved. */
function optionLabel(info: LanguageInfo): string {
  if (info.approved) return menuLabel(info);
  return `${menuLabel(info)} (${textFor(info.code).language.draftTag})`;
}

export function LanguageSwitch({ language }: { language: string }) {
  const t = textFor(language);
  const current = languageInfo(language);
  return (
    <div className="space-y-2">
      <label className="flex flex-wrap items-center gap-3">
        <span className="font-semibold">{t.language.label}</span>
        <select
          value={current.code}
          onChange={(e) => chooseLanguage(e.target.value)}
          className="min-h-11 max-w-full rounded-lg border-2 border-control bg-card px-3"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code} lang={l.code} dir={l.dir}>
              {optionLabel(l)}
            </option>
          ))}
        </select>
      </label>
      {/* Always on the page, so a screen reader hears the notice when it appears after a language change. */}
      <div role="status">
        {!current.approved && (
          <p className="rounded-lg border-2 border-amber-700 bg-amber-50 p-2 text-sm font-semibold text-amber-950" data-testid="draft-notice">
            {t.language.draftNotice}
          </p>
        )}
      </div>
      <p className="text-base">{t.language.interpreter}</p>
    </div>
  );
}
```

### components/patient/VisitScreen.tsx

```tsx
"use client";

// The part of the patient page below the 911 line: "Loading…", the "could not load" box, the
// no-visit, broken-link or replaced-link box, or the visit itself (code, status, sound box and announcer).
// This part stays on the page when the screen changes, so it is the one that moves focus to the
// new heading when the old screen left with focus inside it.

import { useRef } from "react";
import type { PatientView } from "@/lib/patientView";
import { fill, textFor } from "@/lib/text";
import { FocusBox } from "./FocusBox";
import { StatusAndSound } from "./StatusAndSound";
import { StatusAnnouncer } from "./StatusAnnouncer";
import { useRescueFocus } from "./useFocusRescue";

type Props = {
  /** True until the link is read and the first answer for the visit comes in. */
  loading: boolean;
  /** The visit, null if the token opens no visit, or "unavailable" if it could not be read. */
  result: PatientView | null | "unavailable" | undefined;
  /** True when the link was broken or no longer opens a visit (for example after a new link). */
  linkFailed: boolean;
  /** True when the link once opened a visit but no longer does (for example staff made a new link). */
  linkReplaced?: boolean;
  token: string | null;
  language: string;
  onOnMyWay: () => void;
  sending: boolean;
  online: boolean;
  /** True when "I'm on my way" could not be saved. */
  notSaved: boolean;
};

type Screen = "loading" | "unavailable" | "none" | "visit";

export function VisitScreen({ loading, result, linkFailed, linkReplaced = false, token, language, onOnMyWay, sending, online, notSaved }: Props) {
  const t = textFor(language);
  const p = t.patient;
  const view = result === "unavailable" ? null : result;
  // True when the old screen left with focus inside it; then focus goes to the new heading.
  const lostFocus = useRef(false);
  const markLost = useRescueFocus("status-heading", lostFocus);

  // Which of the 4 screens shows. "Loading…" comes first: while loading, result can be undefined.
  const screen: Screen = loading ? "loading" : result === "unavailable" ? "unavailable" : !view ? "none" : "visit";

  // A new screen gets a new box (the key), so the old box leaves and reports if it held focus.
  return (
    <FocusBox key={screen} onFocusLost={markLost} className="space-y-5">
      {screen === "loading" && (
        <p id="status-heading" tabIndex={-1}>
          {p.loading}
        </p>
      )}
      {screen === "unavailable" && (
        <section aria-labelledby="status-heading" className="clean-card space-y-2">
          <h2 id="status-heading" tabIndex={-1} className="text-2xl font-bold">
            {p.unavailableHeading}
          </h2>
          <p className="text-lg">{p.unavailableText}</p>
        </section>
      )}
      {screen === "none" && (
        <section aria-labelledby="status-heading" className="clean-card space-y-2">
          <h2 id="status-heading" tabIndex={-1} className="text-2xl font-bold">
            {linkReplaced ? p.replacedLinkHeading : linkFailed ? p.brokenLinkHeading : p.noVisitHeading}
          </h2>
          {linkReplaced && <p className="text-lg">{p.replacedLinkText}</p>}
          {linkFailed && !linkReplaced && <p className="text-lg">{p.brokenLinkText}</p>}
          <p className="text-lg">{p.findVisitHelp}</p>
        </section>
      )}
      {screen === "visit" && view && (
        <>
          <p className="text-base">
            {t.visitCode}:{" "}
            <bdi>
              <strong className="font-mono tracking-widest">{view.code}</strong>
            </bdi>{" "}
            · <bdi>{fill(t.siteName, { site: view.site })}</bdi>
          </p>
          <StatusAndSound view={view} token={token} language={language} onOnMyWay={onOnMyWay} sending={sending} online={online} />
          {notSaved && (
            <p role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
              {p.notSaved}
            </p>
          )}
          <StatusAnnouncer key={token} status={view.status} language={language} expired={view.expired} />
        </>
      )}
    </FocusBox>
  );
}
```

### app/patient/page.tsx

```tsx
"use client";

// The patient screen on the patient's own phone: opens the visit from the link's token
// (or the one saved on this phone) and updates live.

import { useEffect, useState } from "react";
import { confirmOnMyWayByToken, recordSeen, usePatientView } from "@/data/patientVisit";
import { chooseLanguage, useChosenLanguage } from "@/data/savedLanguage";
import { forgetSavedToken, takeTokenFromLink } from "@/data/savedToken";
import { useOnline } from "@/data/useOnline";
import { EmergencyLine } from "@/components/EmergencyLine";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { PatientShell } from "@/components/PatientShell";
import { OfflineBanner } from "@/components/patient/OfflineBanner";
import { TextSizeSwitch } from "@/components/patient/TextSizeSwitch";
import { VisitScreen } from "@/components/patient/VisitScreen";
import { useDocumentLanguage } from "@/components/useDocumentLanguage";
import { isDeadToken } from "@/lib/deadToken";
import { textFor } from "@/lib/text";
import { languageInfo, patientLanguage } from "@/lib/text/languages";

export default function PatientPage() {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [notSaved, setNotSaved] = useState(false);
  const [brokenLink, setBrokenLink] = useState(false);
  const [sending, setSending] = useState(false);
  const chosenLanguage = useChosenLanguage();
  const online = useOnline();

  // Reading the link and browser storage can only happen in the browser, after the first render.
  // A new link opened on this same page (only the #t=... part changes) switches to that visit.
  useEffect(() => {
    const readLink = () => {
      const link = takeTokenFromLink();
      // A desk QR link carries the visit's language: remember it, so it shows before the visit loads.
      if (link.language) chooseLanguage(link.language);
      setToken(link.token);
      setBrokenLink(link.brokenLink);
      setNotSaved(false);
    };
    readLink();
    window.addEventListener("hashchange", readLink);
    return () => window.removeEventListener("hashchange", readLink);
  }, []);

  const result = usePatientView(token ?? null);

  // The token opens no visit any more (for example staff issued a new link for a lost phone):
  // say the link did not work, and forget the token so this phone never tries it again.
  const deadToken = isDeadToken(token, result);
  useEffect(() => {
    if (deadToken) forgetSavedToken();
  }, [deadToken]);
  const linkFailed = brokenLink || deadToken;
  const loading = token === undefined || result === undefined;
  const view = result === "unavailable" ? null : result;
  // The phone's own choice first, so even "Loading…" and the 911 line are in that language.
  const language = patientLanguage(chosenLanguage, view?.language);
  const t = textFor(language);
  useDocumentLanguage(language);

  // The first time the called screen is actually on screen, record seen_at
  // (shown, not necessarily read). A tab in the background waits until it is brought forward.
  useEffect(() => {
    if (!token || view?.status !== "called" || view.seen) return;
    let stopped = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const recordIfVisible = async () => {
      clearTimeout(retry);
      if (stopped || document.visibilityState !== "visible") return;
      const result = await recordSeen(token);
      // Could not reach the database: try again shortly, for as long as the called screen is showing.
      if (result === "not_saved" && !stopped) retry = setTimeout(recordIfVisible, 10_000);
    };
    void recordIfVisible();
    document.addEventListener("visibilitychange", recordIfVisible);
    return () => {
      stopped = true;
      clearTimeout(retry);
      document.removeEventListener("visibilitychange", recordIfVisible);
    };
  }, [token, view?.status, view?.seen]);

  async function onOnMyWay() {
    if (!token || sending) return;
    setSending(true);
    // "Seen" can only be recorded while the visit is still "called". A very quick tap could
    // otherwise confirm first and leave the seen time empty, so make sure it is recorded first.
    if (view && !view.seen) await recordSeen(token);
    const result = await confirmOnMyWayByToken(token);
    setSending(false);
    setNotSaved(result === "not_saved");
  }

  return (
    <PatientShell>
    <main lang={language} dir={languageInfo(language).dir} className="mx-auto w-full max-w-xl space-y-5 px-4 py-6">
      <h1 className="text-xl font-bold">{t.appName}</h1>
      <LanguageSwitch language={language} />
      <TextSizeSwitch language={language} />
      <EmergencyLine language={language} />
      <OfflineBanner language={language} />

      <VisitScreen
        loading={loading}
        result={result}
        linkFailed={linkFailed}
        linkReplaced={deadToken}
        token={token ?? null}
        language={language}
        onOnMyWay={onOnMyWay}
        sending={sending}
        online={online}
        notSaved={notSaved}
      />
    </main>
    </PatientShell>
  );
}
```

### lib/textSize.ts

```tsx
// The three text sizes a patient can choose, and the root font size each one sets.

export const TEXT_SIZES = ["normal", "large", "extraLarge"] as const;

/** The browser storage key that remembers the chosen size on this phone. */
export const TEXT_SIZE_KEY = "vwr.textSize";

export type TextSize = (typeof TEXT_SIZES)[number];

const ROOT_FONT_SIZES: Record<TextSize, string> = {
  normal: "100%",
  large: "125%",
  extraLarge: "150%",
};

/** True only for the three sizes the patient can choose. */
export function isTextSize(value: unknown): value is TextSize {
  return typeof value === "string" && (TEXT_SIZES as readonly string[]).includes(value);
}

/** The font size of the whole page. Tailwind sizes are in rem, so all text and spacing grow together. */
export function rootFontSize(size: TextSize): string {
  return ROOT_FONT_SIZES[size];
}

/**
 * A short plain-JavaScript script for the page's <head>. It sets the page font size before the first
 * paint on the start page and patient screens, so a patient who chose a larger size does not see the
 * page at Normal size first. It does nothing on other pages (staff, dashboard), and does nothing if
 * browser storage is blocked. The key and the sizes are written in as JSON, so they are defined only in this file.
 */
export function textSizeScript(): string {
  return `(function () {
  var path = location.pathname;
  if (path !== "/" && !path.startsWith("/patient")) return;
  try {
    var saved = localStorage.getItem(${JSON.stringify(TEXT_SIZE_KEY)});
    var sizes = ${JSON.stringify(ROOT_FONT_SIZES)};
    if (saved && Object.prototype.hasOwnProperty.call(sizes, saved)) {
      document.documentElement.style.fontSize = sizes[saved];
    }
  } catch {
    // Storage blocked: the page stays at Normal size.
  }
})();`;
}
```

## Helpers the changed lines call (not in the diff)

### lib/text/languages.ts

```tsx
// The languages the app offers, and which one a patient's screen shows.
// "approved" turns true only after a fluent speaker has checked that language (SPEC);
// until then its screens show the draft notice.

export type LanguageInfo = {
  code: string;
  /** The language's name written in that language, so a patient can find their own. */
  name: string;
  /** The English name, shown beside the own-script name (some phone screen readers cannot read the script). */
  englishName: string;
  dir: "ltr" | "rtl";
  approved: boolean;
};

export const LANGUAGES: LanguageInfo[] = [
  { code: "en", name: "English", englishName: "English", dir: "ltr", approved: true },
  { code: "fr", name: "Français", englishName: "French", dir: "ltr", approved: false },
  { code: "ur", name: "اردو", englishName: "Urdu", dir: "rtl", approved: false },
  { code: "ar", name: "العربية", englishName: "Arabic", dir: "rtl", approved: false },
  { code: "zh", name: "中文（简体）", englishName: "Mandarin", dir: "ltr", approved: false },
];

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);

/** The language's details; English for an unknown code. */
export function languageInfo(code: string | null | undefined): LanguageInfo {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

/** How a language is listed in a menu: its own name, then the English name, for example "اردو (Urdu)". */
export function menuLabel(info: LanguageInfo): string {
  return info.code === "en" ? info.name : `${info.name} (${info.englishName})`;
}

/**
 * The language carried by a desk QR link (the "l=" part after #), or null. The desk sets it from
 * the visit, so a patient who scans the slip sees their language even before the visit loads.
 */
export function linkLanguage(hash: string): string | null {
  const match = hash.match(/[#&]l=([a-z]{2,3})(?:&|$)/);
  return match && LANGUAGE_CODES.includes(match[1]) ? match[1] : null;
}

/**
 * The language a patient's screen shows: the one chosen on this phone, else the visit's own
 * language, else English. The phone's choice is known before the visit loads, so even the
 * loading screen and the 911 line are in the patient's language.
 */
export function patientLanguage(chosenOnPhone: string | null, visitLanguage: string | null | undefined): string {
  if (chosenOnPhone && LANGUAGE_CODES.includes(chosenOnPhone)) return chosenOnPhone;
  if (visitLanguage && LANGUAGE_CODES.includes(visitLanguage)) return visitLanguage;
  return "en";
}
```

### data/savedLanguage.ts

```tsx
// Remembers the language chosen on this phone in browser storage, so every patient screen
// (even the loading screen, before the visit is read) opens in that language.
// Nothing else about the patient is stored.

import { useSyncExternalStore } from "react";
import { LANGUAGE_CODES } from "@/lib/text/languages";

const LANGUAGE_KEY = "vwr.language";
const listeners = new Set<() => void>();
let chosen: string | null | undefined; // undefined = not read from storage yet

function read(): string | null {
  if (chosen !== undefined) return chosen;
  try {
    const saved = window.localStorage.getItem(LANGUAGE_KEY);
    chosen = saved && LANGUAGE_CODES.includes(saved) ? saved : null;
  } catch {
    chosen = null; // storage blocked: no remembered choice
  }
  return chosen;
}

/** Save the choice and tell every part of the screen that shows text. */
export function chooseLanguage(code: string): void {
  if (!LANGUAGE_CODES.includes(code)) return;
  chosen = code;
  try {
    window.localStorage.setItem(LANGUAGE_KEY, code);
  } catch {
    // Storage blocked: the choice still works on this page, it just won't be remembered.
  }
  listeners.forEach((tell) => tell());
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** The language chosen on this phone, or null if none (also while the page is built on the server). */
export function useChosenLanguage(): string | null {
  return useSyncExternalStore(subscribe, read, () => null);
}
```

### components/patient/TextSizeSwitch.tsx

```tsx
"use client";

// The text size choice on patient screens (Normal, Large, Extra large). The choice is remembered
// on this phone (data/savedTextSize.ts) and sets the font size of the whole page.

import { useEffect } from "react";
import { chooseTextSize, useChosenTextSize } from "@/data/savedTextSize";
import { textFor } from "@/lib/text";
import { rootFontSize, TEXT_SIZES, type TextSize } from "@/lib/textSize";

export function TextSizeSwitch({ language }: { language: string }) {
  const t = textFor(language).textSize;
  const size = useChosenTextSize();
  const words: Record<TextSize, string> = { normal: t.normal, large: t.large, extraLarge: t.extraLarge };

  // Grow the whole page. Put it back when this screen closes, so staff screens in the same tab are not affected.
  useEffect(() => {
    document.documentElement.style.fontSize = rootFontSize(size);
    return () => {
      document.documentElement.style.fontSize = "";
    };
  }, [size]);

  return (
    <fieldset className="space-y-2">
      <legend className="font-semibold">{t.label}</legend>
      <div className="flex flex-wrap gap-2">
        {TEXT_SIZES.map((option) => {
          const checked = option === size;
          return (
            <label
              key={option}
              className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border-control bg-card px-3 ${
                checked ? "border-4 font-bold" : "border-2"
              }`}
            >
              <input
                type="radio"
                name="text-size"
                value={option}
                checked={checked}
                onChange={() => chooseTextSize(option)}
                className="h-5 w-5 shrink-0"
              />
              <span>{words[option]}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
```

### lib/deadToken.ts

```ts
// Decides whether the token saved on this phone no longer opens any visit. This happens on
// the old phone after staff use "Issue a new link": the database then finds no visit for it.

import type { PatientView } from "./patientView";

/**
 * True when there is a token and the database answered "no visit" for it (null). Still
 * loading (undefined) or a failed read ("unavailable") is never dead: the visit may be fine.
 */
export function isDeadToken(
  token: string | null | undefined,
  shown: PatientView | null | "unavailable" | undefined,
): boolean {
  return typeof token === "string" && shown === null;
}
```

## Response

Gemini Hydrogen 4, High, new chat, 2026-11-18. Pasted by the owner, as given.

### 1. `StatusAnnouncer.tsx`

1. **Already-expired visit is never announced on open (`components/patient/StatusAnnouncer.tsx`, lines 39 and 59–65)**
* **What goes wrong for a patient or screen reader user:** `wasExpired` is initialized from the initial `expired` prop (`useState(expired)` on line 39). When a patient opens or refreshes `/patient` on a visit that has already expired (`expired={true}` on the first render), `expired !== wasExpired` on line 59 is `false`, so `announce.expired` is never spoken at all (unlike `status === "called"`, which line 55 explicitly queues on initial open).
* **Smallest fix:** Initialize `wasExpired` to `false` (`const [wasExpired, setWasExpired] = useState(false);`) so an opening `expired={true}` state is queued and announced once after the page becomes visible.

2. **Expiry announcement can be lost if `status` changes within 300 ms or while the tab is in the background (`components/patient/StatusAnnouncer.tsx`, lines 51–65)**
* **What goes wrong for a patient or screen reader user:** When `expired` flips `false -> true`, line 63 sets `pending` with `expired: true`. If `status` changes before the 300 ms timer fires (or while the tab is hidden in the background), line 56 runs `setPending((p) => ({ round: (p?.round ?? 0) + 1, status, expired: false }))` while `expired !== wasExpired` on line 59 is now `false`. That overwrites `expired: true` with `expired: false`, dropping the expiry message completely (or leaving `pending` stuck non-null forever if `messageFor(status, language)` returns `""` on line 73).
* **Smallest fix:** Preserve `expired` when `status` changes while `expired` is true (`expired: Boolean(p?.expired) || expired`) and clear `setPending(null)` when `!text` on line 73.

3. **Stale assertive `"It is your turn"` text stays in the DOM when a `called` visit expires, and `called` + `expired` is downgraded to `polite` (`components/patient/StatusAnnouncer.tsx`, lines 61–62 and 77–78)**
* **What goes wrong for a patient or screen reader user:** When `expired` becomes `true`, line 61 clears `setPolite("")` but never clears `setUrgent("")`. If the visit was previously `"called"`, `<p aria-live="assertive">` still holds `"It is your turn. Please come back to the emergency department now."` while `<p aria-live="polite">` receives `"This visit request has expired..."`. A screen reader user navigating in browse/reading mode hears contradictory instructions (that it is their turn right now, and that the request expired), and downgrading an active `called` recall to `polite` risks a patient missing that they should no longer expect their recalled spot (`plausible` — depends on whether `lib/patientView.ts` can ever set `expired` while `status === "called"`, which is not shown in the diff).
* **Smallest fix:** Call `setUrgent("")` alongside `setPolite("")` on line 61 when `expired` turns `true`, and treat `pending.status === "called"` as `urgent` even when `pending.expired` is `true`.

4. **Re-announcing a repeated expiry (`components/patient/StatusAnnouncer.tsx`, lines 59–65)**
* **What goes wrong for a patient or screen reader user:** Because `wasExpired` tracks the boolean `expired` directly, if `view.expired` ever flickers `true -> false -> true` across polls (for example due to clock/view recomputation, `plausible` without `lib/patientView.ts`), `announce.expired` is spoken a second time.
* **Smallest fix:** Track `const [announcedExpired, setAnnouncedExpired] = useState(false)` and only queue the expiry announcement once per visit (`if (expired && !announcedExpired) { setAnnouncedExpired(true); ... }`).

5. **Switching language after an announcement leaves stale old-language text in the live region (`components/patient/StatusAnnouncer.tsx`, lines 80–81; `components/patient/StatusAnnouncer.test.tsx`, lines 73–78)**
* **What goes wrong for a patient or screen reader user:** After `setPending(null)` runs on line 81, changing `language` (e.g. from English to French or Urdu) leaves the previous English sentence sitting inside `<p aria-live="polite">` or `<p aria-live="assertive">` (which have no `lang` attribute). If a screen reader user reads through the page in browse mode after switching to Urdu or Arabic, the screen reader attempts to read the leftover English sentence with an Urdu/Arabic voice.
* **Smallest fix:** Clear `setPolite("")` and `setUrgent("")` when `language` changes while `pending === null`.

### 2. `useDocumentLanguage.ts`

1. **Visible LTR-to-RTL layout and scrollbar flash on initial load and reload (`components/useDocumentLanguage.ts`, lines 10–20; `data/savedLanguage.ts`, lines 39–41)**
* **What goes wrong for a patient or screen reader user:** `useChosenLanguage()` returns `null` during SSR (`useSyncExternalStore(..., () => null)`), so `/` and `/patient` first render with `<html lang="en" dir="ltr">`. Because `useDocumentLanguage` uses `useEffect` (which runs *after* browser paint) and there is no `<head>` script setting `lang`/`dir` before first paint (unlike `textSizeScript()` in `lib/textSize.ts`), a patient who chose Urdu or Arabic sees the page paint left-to-right and then visibly jump to right-to-left (including the browser scrollbar and title direction) after hydration.
* **Smallest fix:** Use `useLayoutEffect` instead of `useEffect` in `components/useDocumentLanguage.ts` (and mirror `textSizeScript()` with a small `<head>` script reading `vwr.language` from `localStorage` if zero first-paint flash is needed).

2. **Cleanup resets `<html>` to `en`/`ltr` on every language change and can leave the wrong `lang`/`dir` after client navigation (`components/useDocumentLanguage.ts`, lines 16–19; `app/patient/page.tsx`, lines 32–41)**
* **What goes wrong for a patient or screen reader user:**
* Every time `language` changes (e.g., `fr` -> `ur`), the `[language]` effect cleanup temporarily sets `<html lang="en" dir="ltr">` before the new effect sets `ur`/`rtl`.
* During client navigation from `/` (in Urdu) to `/patient#t=...&l=ur` (a desk QR link when no language was saved in `localStorage` yet), `PatientPage` renders first with `language = "en"` before its `useEffect` on line 32 reads `#l=ur`, briefly flipping `<html>` to `en`/`ltr` and back to `ur`/`rtl`.
* If Next.js App Router runs an outgoing route's deferred effect cleanup after an incoming route's effect during a concurrent transition (`plausible`), the outgoing cleanup overwrites `<html lang="ur" dir="rtl">` back to `lang="en" dir="ltr"`, leaving `<main>` in RTL while `<html>` (and the scrollbar/title) stays in LTR.
* **Smallest fix:** Separate the unmount reset into a mount-only `useLayoutEffect(() => () => { html.setAttribute("lang", "en"); html.setAttribute("dir", "ltr"); }, [])` so language updates do not bounce through `"en"`/`"ltr"`, and apply `linkLanguage(window.location.hash)` synchronously in `patientLanguage` or before first paint.

### 3. `LanguageSwitch.tsx`

1. **Simultaneous `<select>` change and `role="status"` update can cut off screen reader speech (`components/LanguageSwitch.tsx`, lines 26–44)**
* **What goes wrong for a patient or screen reader user:** When a user selects a draft language in `<select>`, `onChange` synchronously updates both the `<select>` value and the `<div role="status">` text in the same tick. In mobile screen readers (iOS VoiceOver and Android TalkBack), the native picker's selection announcement collides with the `role="status"` live-region update, cutting off either the chosen language name or the draft warning (`plausible` — real screen readers are listed under "Not checked"). In addition, switching from one draft language to another (e.g., French -> Urdu) triggers the draft notice again without `aria-atomic="true"` on `<div role="status">`.
* **Smallest fix:** Add `aria-atomic="true"` to `<div role="status">` (line 38) and delay populating the draft notice text by ~300 ms after `language` changes (matching `StatusAnnouncer.tsx`) so the `<select>` selection finishes speaking first.

2. **Nested parentheses and mixed languages inside `<option lang={l.code}>` cause screen reader mispronunciation and BiDi bracket flips (`components/LanguageSwitch.tsx`, lines 12–16 and 30–34; `lib/text/languages.ts`, lines 31–33)**
* **What goes wrong for a patient or screen reader user:** `menuLabel(l)` already appends `(EnglishName)`, so `optionLabel(l)` produces double/triple parentheticals like `اردو (Urdu) (ڈرافٹ)` and `中文（简体） (Mandarin) (草稿)`. Because HTML `<option>` cannot contain `<span lang="en">` child elements, `<option lang="ur" dir="rtl">` forces an Urdu screen-reader voice to read the English word `"Urdu"` using Urdu phonetics, and native OS `<select>` pickers that ignore `<option dir="rtl">` reorder the mixed RTL/LTR parentheses (`(ڈرافٹ) (Urdu) اردو`, `plausible`). (Sorting is not broken in standard browsers because `<select>` preserves DOM array order, and prefix type-ahead still matches the leading native language name.)
* **Smallest fix:** Use a single separator instead of nested parentheses in `optionLabel` (e.g., `${menuLabel(info)} — ${textFor(info.code).language.draftTag}`) so screen readers pause cleanly rather than reading back-to-back parentheticals.

### 4. `VisitScreen.tsx` and `app/patient/page.tsx`

1. **A mistyped 26-character link shows `"This visit link is no longer active"` instead of `"This link did not work"` (`app/patient/page.tsx`, lines 48–52 and 108; `lib/deadToken.ts`, lines 10–15; `components/patient/VisitScreen.tsx`, lines 66–69)**
* **What goes wrong for a patient or screen reader user:** `isDeadToken(token, result)` returns `true` whenever `typeof token === "string" && result === null`. If a patient types their 26-character visit link from the paper slip and mistypes one valid Crockford character, `takeTokenFromLink()` accepts the format (`brokenLink` is `false`), `usePatientView` queries the database and gets `null` (no matching row), and `linkReplaced` becomes `true`. The patient sees `"This visit link is no longer active — Please ask the emergency department desk for help"` instead of `"This link did not work — The link might be wrong or cut short"`, preventing them from fixing their typo.
* **Smallest fix:** Only treat a missing row as `linkReplaced` when the token came from `localStorage` (a previously valid saved visit on this phone) rather than a newly typed/scanned `#t=` URL hash (`brokenLink` should cover any `#t=` hash that returns `null`).

2. **Network/fetch failure returning `null` would erase a valid saved token (`app/patient/page.tsx`, lines 44–51; `lib/deadToken.ts`, lines 10–15)**
* **What goes wrong for a patient or screen reader user:** When `usePatientView` returns `"unavailable"`, `isDeadToken` returns `false` and `VisitScreen` shows `"We cannot load your visit"`. However, if any network timeout or unexpected error path inside `data/patientVisit.ts` (`usePatientView`, not included in the diff) ever resolves to `null` instead of `"unavailable"`, `deadToken` becomes `true`, `forgetSavedToken()` permanently deletes the patient's saved visit token from `localStorage`, and the patient sees `"This visit link is no longer active"` (`plausible` — cannot be proven without `data/patientVisit.ts`).
* **Smallest fix:** Ensure `usePatientView` never returns `null` unless the RPC explicitly succeeded with 0 rows, and separate `linkReplaced` from `linkFailed` in `VisitScreen` props so `linkReplaced` cannot be passed without `linkFailed`.

### 5. `lib/textSize.ts`

1. **Optional `catch {` syntax throws a `SyntaxError` in pre-2019 mobile WebViews (`lib/textSize.ts`, line 42)**
* **What goes wrong for a patient or screen reader user:** Line 42 uses ES2019 parameterless `} catch {` inside an inline `<head>` `<script>`. Older mobile browsers/WebViews (e.g., iOS Safari < 12.1 or older Android WebViews) fail to parse the entire script with a `SyntaxError`, leaving low-vision patients at `100%` text size on initial paint.
* **Smallest fix:** Change `} catch {` to `} catch (e) {` on line 42 and move `var path = location.pathname;` inside the `try` block.

2. **Prefix check `!path.startsWith("/patient")` matches non-patient routes like `/patients` (`lib/textSize.ts`, line 35)**
* **What goes wrong for a patient or screen reader user:** `path.startsWith("/patient")` matches any future route beginning with `/patient` (such as `/patients` or `/patient-lookup`), applying a patient's saved `150%` root font size to a staff screen (`plausible` — no `/patients` route is shown in the diff, but the prefix match is overly broad).
* **Smallest fix:** Check `if (path !== "/" && path !== "/patient" && !path.startsWith("/patient/")) return;` on line 35.

### 6. Tap Size of Care Links and `sr-only` Thank-You Box

1. **`inline-block py-1` on `CareOptions` links leaves `811` narrow (`0px` horizontal padding) and breaks mid-sentence links onto new lines (`components/start/CareOptions.tsx`, line 9; `components/start/CareOptions.test.tsx`, lines 15–21)**
* **What goes wrong for a patient or screen reader user:**
* `py-1` gives `~32px` height at 100% text size, which meets the `24px` vertical minimum of WCAG 2.5.8, **but** there is no horizontal padding (`px-*`). The `811` (`tel:811`) link is only 3 characters wide (`~27px` at 16px bold — barely above 24px and well below the `44px` `min-h-11` used on every other interactive element on the page), and `CareOptions.test.tsx` only asserts class names rather than rendered box dimensions.
* Applying `inline-block` to links embedded inside sentences (`Health811: Call 811...` and `For hours and addresses, see THP's emergency page...`) forces multi-word links to wrap as a separate block onto the next line at large text sizes instead of flowing naturally inline.
* **Smallest fix:** Keep inline-in-sentence links `inline` (covered by WCAG 2.5.8's inline exception, with `px-1` on `811` if needed) and give standalone block links in `CareOptions.tsx` `inline-block min-h-11 py-2`.

2. **Toggling `sr-only` off in the same render that populates `role="status"` can drop the screen reader announcement (`components/patient/StillHerePrompt.tsx`, line 83; `components/patient/StillHerePrompt.click.test.tsx`, lines 90–96)**
* **What goes wrong for a patient or screen reader user:** Sighted users **do** see the thank-you card after tapping `"I'm still here"` because `thanking ? "clean-card font-semibold" : "sr-only"` removes `"sr-only"`. However, switching the `<p role="status">` element's CSS positioning/clipping from `sr-only` (`position: absolute; width: 1px; height: 1px`) to a visible block box in the **same commit** that inserts the text causes iOS VoiceOver / WebKit and some desktop screen readers to reconstruct the accessible object and skip speaking the live-region update (`plausible` — cannot be proven in happy-dom; also `StillHerePrompt.click.test.tsx` never asserts that `sr-only` is removed when `thanking` becomes `true`).
* **Smallest fix:** Keep `<div role="status" className={thanking ? undefined : "sr-only"}>` with the `<p className="clean-card font-semibold">` mounted conditionally inside it (matching `OfflineBanner.tsx` and `LanguageSwitch.tsx`), and assert in `StillHerePrompt.click.test.tsx` that `statusBox()?.className` does not contain `"sr-only"` after the tap.

## Claude's check

Checked against the code on `phase3-review-fixes` at 9710d95.

- 1.1 (an expiry already on screen at open is not announced): true, but on purpose. `components/patient/StatusAnnouncer.tsx` line 38 says so, and no other opening status is announced either. The heading and the text are on screen and get focus. Product choice for the owner.
- 1.2 (a status change within 300 ms of an expiry overwrites the expired flag): true, rare. The visible text is right; only the spoken text can be the status line in place of the expiry line. Low risk.
- 1.3 (called and expired at the same time): false. The SQL sets `expired` only when `status = 'pre_arrival' and triaged_at is null` (supabase/migrations/20261116000000_wait_gap_distinct_moments.sql lines 68-69), so a `called` visit is never expired.
- 1.4 and 1.5: plausible, low risk. Not changed.
- 2.1 (the page shows left to right for one frame before `dir="rtl"`): plausible. `useDocumentLanguage` runs in `useEffect`, after paint. `<main>` already has the right `dir` in the first render, so only the `<html>` element is late. Cheap fix: `useLayoutEffect`.
- 2.2 (the cleanup puts back `en` and `ltr` on every language change): true. The next effect sets the right value in the same commit, so nothing is seen or read. No change.
- 3.1 (`aria-atomic` on the regions): plausible. Cheap.
- 3.2 (nested parentheses in a draft option, for example "Francais (French) (draft)"): true. Wording choice for the owner.
- 4.1 (a mistyped link shows "This visit link is no longer active"): true. Patients can type the link printed under the QR code (`lib/text/en.ts` line 83). The token is 26 Crockford characters with no check digit (`lib/codes.ts` lines 40 and 72), so one wrong character still passes `isAccessToken`, reads 0 rows, and `isDeadToken` gives true. Wording or design choice for the owner.
- 4.2 (a network failure shows the replaced-link message): false. `data/patientVisit.ts` gives `"failed"` on any error and null only for 0 rows; `lib/failedRead.ts` `afterFailedRead` never gives null.
- 5.1 (`catch {` without a name in the head script): true for very old WebViews only (before 2018). Cheap fix: `catch (e)`.
- 5.2 (`startsWith("/patient")` also matches `/patients`): true, but no such route exists. Cheap fix: `path === "/patient" || path.startsWith("/patient/")`.
- 6.1 (inline care links are under 44 px): the inline exception of WCAG 2.5.8 covers the 811 link and the hours link, which sit in sentences. The wait-times link and the virtual care link stand alone, so `min-h-11` on those two is a valid small gain.
- 6.2 (the thank-you `role="status"` box changes from `sr-only` to visible in the same render as its text): plausible. Some screen readers skip text that comes in while the box moves into the layout. Fix: keep the `role="status"` element `sr-only` or always plain, and put the visible card around it, as `components/patient/OfflineBanner.tsx` line 14 does.

## Outcome

Owner's choices, 2026-11-18. Fixed with a test that failed first:

- 2.1: `components/useDocumentLanguage.ts` uses `useLayoutEffect` (6c4fc57).
- 6.2: the `role="status"` box stays `sr-only`; a visible card with `aria-hidden="true"` shows the thank-you (2be5b2e).
- 6.1: the 2 care links that stand alone have `min-h-11` (2be5b2e).
- 3.1: both announcer regions have `aria-atomic="true"` (2be5b2e).
- 3.2: draft options read "Francais (French) - brouillon" (24e754c).
- 4.1: `replacedLinkHeading` is "This visit link does not work or is no longer active" in English (24e754c). The 4 drafts go to handoffs/2026-11-18-gemini-translate-link-heading.md.

Kept as it is: 1.1 (owner). False: 1.3, 4.2. No change: 2.2. In docs/known-issues.md: 1.2, 1.4, 1.5, 5.1, 5.2, and the token check digit.

Browser check after the fixes: `/` and `/patient`, 390 px, English and Urdu, 100% and 200% text: 8 runs, all `off=0 viol=none`, Urdu `dir=rtl`.
