# Gemini review: fixes from the equity fixes review (2026-11-18)

Model: Gemini Hydrogen 4, High, in a new chat. If you have no Gemini Hydrogen 4 credits, use Gemini 3.6 Flash, High.

## Text to paste into Gemini

You review a small diff in a concept prototype of a virtual emergency department waiting room (Next.js 16 App Router, React 19, Tailwind 4, Vitest with happy-dom). Synthetic data only. Patients read the patient screens on their phone, in English, French, Urdu, Arabic or Mandarin. Your job is to find problems, not to confirm that the diff is good. For each problem, give the file and line, what goes wrong for a real user (a phone, a screen reader, a language), and how sure you are.

The diff fixes 6 points from an earlier review:

1. `components/useDocumentLanguage.ts`: `useEffect` became `useLayoutEffect`, so `<html dir="rtl">` is set before the first paint of an Urdu or Arabic screen.
2. `components/patient/StillHerePrompt.tsx`: the `role="status"` box for the thank-you is now `sr-only` all the time. A separate card with `aria-hidden="true"` shows the same words on screen.
3. `components/start/CareOptions.tsx`: the 2 links that stand alone are at least 44 px high (`min-h-11`).
4. `components/patient/StatusAnnouncer.tsx`: both live regions have `aria-atomic="true"`.
5. `components/LanguageSwitch.tsx`: a draft language in the menu reads, for example, "Francais (French) - brouillon" in place of "Francais (French) (brouillon)".
6. `lib/text/*.ts`: the heading for a visit link that opens no visit is now "This visit link does not work or is no longer active", because a replaced link and a typed link with a mistake look the same to the app. The 4 translations are drafts.

Settled decisions. Do not report these as faults:

- An expiry that is already there when the page opens is not announced, the same as every other opening status; the heading gets focus (owner, 2026-11-18).
- The draft tag format "Name (English name) - tag", with the tag in that language (owner, 2026-11-18).
- The links inside a sentence (811 in `CareOptions.tsx` line 34, and the hours link) keep `inline-block py-1` (24 px), under the inline exception of WCAG 2.5.8.
- The translations are drafts. A fluent human reviewer approves them later. The Urdu, Arabic and Mandarin lines use calmer words than the English on purpose ("no longer in use", "no longer valid for use", "can no longer be used").
- `lib/textSize.ts` (`catch {` with no name, and `startsWith("/patient")`), the 300 ms overlap in `StatusAnnouncer.tsx`, an expiry said twice after true, false, true, and the old-language sentence after a language change are known and logged for later.
- The access token has no check digit. That is for Phase 5.

Questions:

1. `useLayoutEffect` in a client component of the App Router: does it warn or fail in server rendering, and does the screen still show left to right before hydration? What would close that gap with the least code?
2. The thank-you: can a screen reader still miss it, or hear it twice? Does `aria-hidden` on a visible card break any WCAG rule (for example 1.3.1 or 4.1.2) for a sighted screen reader user?
3. `min-h-11` on an `inline-block` link: does the tap area really grow to 44 px, and does the text still line up?
4. The menu option "اردو (Urdu) - ڈرافٹ" mixes right-to-left and left-to-right text in one `<option>`. Does the order show wrongly on Android Chrome or iOS Safari?
5. Any other problem in the diff below.

### Line counts of each changed file (after the change)

- components/LanguageSwitch.test.tsx: 53
- components/LanguageSwitch.tsx: 48
- components/patient/StatusAnnouncer.test.tsx: 86
- components/patient/StatusAnnouncer.tsx: 101
- components/patient/StillHerePrompt.click.test.tsx: 115
- components/patient/StillHerePrompt.tsx: 110
- components/start/CareOptions.test.tsx: 35
- components/start/CareOptions.tsx: 62
- components/useDocumentLanguage.test.tsx: 69
- components/useDocumentLanguage.ts: 22
- lib/text/ar.ts: 170
- lib/text/en.ts: 199
- lib/text/fr.ts: 169
- lib/text/text.test.ts: 72
- lib/text/ur.ts: 171
- lib/text/zh.ts: 169

### Helpers that the changed lines call (not in the diff)

From `lib/text/languages.ts`:

```ts
export function languageInfo(code: string | null | undefined): LanguageInfo {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

/** How a language is listed in a menu: its own name, then the English name, for example "اردو (Urdu)". */
export function menuLabel(info: LanguageInfo): string {
  return info.code === "en" ? info.name : `${info.name} (${info.englishName})`;
}
```

The `draftTag` values: en "draft", fr "brouillon", ur "ڈرافٹ", ar "مسودة", zh "草稿".

From `app/globals.css`:

```css
.clean-card {
  background-color: var(--color-card);
  border: 1px solid var(--color-line);
  border-radius: 1rem;
  padding: 1.25rem;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.06);
}
```

`sr-only` and `min-h-11` are Tailwind 4 classes (`min-h-11` is 2.75rem, 44 px).

### Checked

- `npm test`: 63 files, 353 tests passed (2026-11-18, after the translations).
- `npm run lint`: 0 errors, 2 warnings, both in helper files that are not in git.
- `npm run build`: passed.
- Each new test failed before its fix and passed after.
- Browser, axe-core: `/` and `/patient` at 390 px, English and Urdu, 100% and 200% text. 8 runs, all with no off-screen content and no violations; Urdu gave `dir=rtl`.

### Not checked

- A real screen reader (VoiceOver, TalkBack, NVDA).
- A real phone. The 390 px runs used a desktop browser.
- The `<option>` order of mixed-direction text on Android or iOS.
- A paint before hydration (the browser runs used a page that was already loaded).
- The meaning of the 4 translations.

### The diff

```diff
diff --git a/components/LanguageSwitch.test.tsx b/components/LanguageSwitch.test.tsx
index eefae30..30b9d94 100644
--- a/components/LanguageSwitch.test.tsx
+++ b/components/LanguageSwitch.test.tsx
@@ -37,7 +37,7 @@ describe("LanguageSwitch", () => {
   it("tags each draft language in the menu, in that language's own words", () => {
     const html = renderToStaticMarkup(<LanguageSwitch language="en" />);
     for (const info of LANGUAGES.filter((l) => !l.approved)) {
-      expect(optionText(html, info.code)).toBe(`${menuLabel(info)} (${textFor(info.code).language.draftTag})`);
+      expect(optionText(html, info.code)).toBe(`${menuLabel(info)} - ${textFor(info.code).language.draftTag}`);
     }
   });
 
diff --git a/components/LanguageSwitch.tsx b/components/LanguageSwitch.tsx
index a9c0f26..da40db3 100644
--- a/components/LanguageSwitch.tsx
+++ b/components/LanguageSwitch.tsx
@@ -9,10 +9,10 @@ import { chooseLanguage } from "@/data/savedLanguage";
 import { textFor } from "@/lib/text";
 import { languageInfo, LANGUAGES, menuLabel, type LanguageInfo } from "@/lib/text/languages";
 
-/** The menu words for one language: its label, then "(draft)" in that language if it is not approved. */
+/** The menu words for one language: its label, then " - draft" in that language if it is not approved. */
 function optionLabel(info: LanguageInfo): string {
   if (info.approved) return menuLabel(info);
-  return `${menuLabel(info)} (${textFor(info.code).language.draftTag})`;
+  return `${menuLabel(info)} - ${textFor(info.code).language.draftTag}`;
 }
 
 export function LanguageSwitch({ language }: { language: string }) {
diff --git a/components/patient/StatusAnnouncer.test.tsx b/components/patient/StatusAnnouncer.test.tsx
index f04e06c..c2b9a55 100644
--- a/components/patient/StatusAnnouncer.test.tsx
+++ b/components/patient/StatusAnnouncer.test.tsx
@@ -63,6 +63,13 @@ describe("StatusAnnouncer", () => {
     expect(polite()).toBe("");
   });
 
+  it("makes screen readers read each region as one whole message", () => {
+    show("waiting");
+    const regions = [...container.querySelectorAll("[aria-live]")];
+    expect(regions).toHaveLength(2);
+    for (const region of regions) expect(region.getAttribute("aria-atomic")).toBe("true");
+  });
+
   it("announces when the visit expires", async () => {
     draw("pre_arrival", "en", false);
     draw("pre_arrival", "en", true);
diff --git a/components/patient/StatusAnnouncer.tsx b/components/patient/StatusAnnouncer.tsx
index 11a3a0a..d0bfe9c 100644
--- a/components/patient/StatusAnnouncer.tsx
+++ b/components/patient/StatusAnnouncer.tsx
@@ -90,10 +90,10 @@ export function StatusAnnouncer({ status, language, expired = false }: Props) {
 
   return (
     <>
-      <p aria-live="polite" className="sr-only">
+      <p aria-live="polite" aria-atomic="true" className="sr-only">
         {polite}
       </p>
-      <p aria-live="assertive" className="sr-only">
+      <p aria-live="assertive" aria-atomic="true" className="sr-only">
         {urgent}
       </p>
     </>
diff --git a/components/patient/StillHerePrompt.click.test.tsx b/components/patient/StillHerePrompt.click.test.tsx
index 43abb43..cb974aa 100644
--- a/components/patient/StillHerePrompt.click.test.tsx
+++ b/components/patient/StillHerePrompt.click.test.tsx
@@ -95,6 +95,16 @@ describe("StillHerePrompt tap", () => {
     expect(statusBox()?.className.split(" ")).toContain("sr-only");
   });
 
+  it("keeps the status box hidden after the tap and shows the thank-you in a separate card", async () => {
+    show(due);
+    await act(async () => button()?.click());
+    show(tapped);
+    expect(statusBox()?.className.split(" ")).toContain("sr-only");
+    const card = container.querySelector('[data-testid="still-here-card"]');
+    expect(card?.getAttribute("aria-hidden")).toBe("true");
+    expect(card?.textContent).toContain(s.thanks);
+  });
+
   it("leaves focus on the page after a phone tap that did not focus the button", async () => {
     show(due);
     expect(document.activeElement).toBe(document.body);
diff --git a/components/patient/StillHerePrompt.tsx b/components/patient/StillHerePrompt.tsx
index 9903413..26b32b7 100644
--- a/components/patient/StillHerePrompt.tsx
+++ b/components/patient/StillHerePrompt.tsx
@@ -79,10 +79,16 @@ export function StillHerePrompt({ view, token, language, lostFocus }: Props) {
           )}
         </PromptCard>
       )}
-      {/* Always on the page, so screen readers hear the thank-you when its text comes in. */}
-      <p role="status" className={thanking ? "clean-card font-semibold" : "sr-only"} data-testid="still-here-thanks">
+      {/* Always on the page and always hidden, so screen readers hear the thank-you when its text
+          comes in. The card below shows the same words on screen; screen readers skip it. */}
+      <p role="status" className="sr-only" data-testid="still-here-thanks">
         {thanking ? `${t.stillHere.thanks} ${t.stillHere.meaning}` : ""}
       </p>
+      {thanking && (
+        <p aria-hidden="true" className="clean-card font-semibold" data-testid="still-here-card">
+          {t.stillHere.thanks} {t.stillHere.meaning}
+        </p>
+      )}
     </>
   );
 }
diff --git a/components/start/CareOptions.test.tsx b/components/start/CareOptions.test.tsx
index 0b2bd8a..550ec84 100644
--- a/components/start/CareOptions.test.tsx
+++ b/components/start/CareOptions.test.tsx
@@ -3,6 +3,7 @@
 
 import { renderToStaticMarkup } from "react-dom/server";
 import { describe, expect, it } from "vitest";
+import { textFor } from "@/lib/text";
 import { CareOptions } from "./CareOptions";
 
 // The class list of every <a> tag in the rendered HTML.
@@ -20,4 +21,15 @@ describe("CareOptions", () => {
       expect(classes).toContain("py-1");
     }
   });
+
+  it("makes the 2 links that stand alone 44 pixels high", () => {
+    // The 811 link and the hours link sit inside sentences, so WCAG 2.5.8 lets them stay small.
+    const t = textFor("en").start;
+    const html = renderToStaticMarkup(<CareOptions language="en" />);
+    for (const words of [t.virtualCare, t.waitTimesLink]) {
+      // React writes ' as &#x27; in HTML.
+      const tag = html.match(new RegExp(`<a [^>]*>${words.replace(/'/g, "&#x27;")}`))?.[0] ?? "";
+      expect(tag.match(/class="([^"]*)"/)?.[1].split(" ")).toContain("min-h-11");
+    }
+  });
 });
diff --git a/components/start/CareOptions.tsx b/components/start/CareOptions.tsx
index f9000e6..599475e 100644
--- a/components/start/CareOptions.tsx
+++ b/components/start/CareOptions.tsx
@@ -8,10 +8,12 @@ const THP_EMERGENCY_PAGE = "https://www.thp.ca/emergency/A/visit.html";
 
 // inline-block with py-1 makes each link a tap target of at least 24 by 24 pixels (WCAG 2.5.8).
 const linkStyle = "inline-block py-1 font-semibold text-brand underline underline-offset-2";
+// A link that stands alone (not inside a sentence) is at least 44 pixels high, like the buttons.
+const aloneStyle = `${linkStyle} min-h-11`;
 
-function External({ href, children, newTab }: { href: string; children: string; newTab: string }) {
+function External({ href, children, newTab, alone }: { href: string; children: string; newTab: string; alone?: boolean }) {
   return (
-    <a href={href} target="_blank" rel="noopener noreferrer" className={linkStyle}>
+    <a href={href} target="_blank" rel="noopener noreferrer" className={alone ? aloneStyle : linkStyle}>
       {children}
       <span className="sr-only"> {newTab}</span>
     </a>
@@ -36,7 +38,7 @@ export function CareOptions({ language }: { language?: string }) {
           {s.health811After}
         </li>
         <li>
-          <External href="https://www.regional-virtual-urgent-care.ca/" newTab={t.newTab}>
+          <External href="https://www.regional-virtual-urgent-care.ca/" newTab={t.newTab} alone>
             {s.virtualCare}
           </External>
         </li>
@@ -51,7 +53,7 @@ export function CareOptions({ language }: { language?: string }) {
         .
       </p>
       <p>
-        <External href={THP_EMERGENCY_PAGE} newTab={t.newTab}>
+        <External href={THP_EMERGENCY_PAGE} newTab={t.newTab} alone>
           {s.waitTimesLink}
         </External>
       </p>
diff --git a/components/useDocumentLanguage.test.tsx b/components/useDocumentLanguage.test.tsx
index 59d7087..fe54380 100644
--- a/components/useDocumentLanguage.test.tsx
+++ b/components/useDocumentLanguage.test.tsx
@@ -2,7 +2,7 @@
 // Checks that the whole page (the <html> tag) gets the chosen language and direction,
 // and goes back to English, left to right, when the screen closes.
 
-import { act } from "react";
+import { act, useLayoutEffect } from "react";
 import { createRoot, type Root } from "react-dom/client";
 import { afterEach, beforeEach, describe, expect, it } from "vitest";
 import { useDocumentLanguage } from "./useDocumentLanguage";
@@ -39,6 +39,27 @@ describe("useDocumentLanguage", () => {
     act(() => root.unmount());
   });
 
+  it("sets right to left before the page is painted", () => {
+    // A layout effect runs before paint. A later sibling's layout effect must already see rtl.
+    let seen = "";
+    function Painter() {
+      useLayoutEffect(() => {
+        seen = html().getAttribute("dir") ?? "";
+      });
+      return null;
+    }
+    act(() =>
+      root.render(
+        <>
+          <Screen language="ur" />
+          <Painter />
+        </>,
+      ),
+    );
+    expect(seen).toBe("rtl");
+    act(() => root.unmount());
+  });
+
   it("puts back English, left to right, when the screen closes", () => {
     act(() => root.render(<Screen language="ar" />));
     act(() => root.unmount());
diff --git a/components/useDocumentLanguage.ts b/components/useDocumentLanguage.ts
index 40d6fcd..dbbdc42 100644
--- a/components/useDocumentLanguage.ts
+++ b/components/useDocumentLanguage.ts
@@ -2,13 +2,14 @@
 
 // Puts the screen's language and direction on the whole page (the <html> tag), so the browser
 // and screen readers use them for everything, including the page title and the scroll bar side.
+// It runs before the browser paints, so an Urdu or Arabic page never shows left to right first.
 // When the screen closes, the page goes back to English, left to right (as app/layout.tsx sets it).
 
-import { useEffect } from "react";
+import { useLayoutEffect } from "react";
 import { languageInfo } from "@/lib/text/languages";
 
 export function useDocumentLanguage(language: string) {
-  useEffect(() => {
+  useLayoutEffect(() => {
     const html = document.documentElement;
     const info = languageInfo(language);
     html.setAttribute("lang", info.code);
diff --git a/lib/text/ar.ts b/lib/text/ar.ts
index 1102132..fefce53 100644
--- a/lib/text/ar.ts
+++ b/lib/text/ar.ts
@@ -66,7 +66,7 @@ export const ar: PatientText = {
     noVisitHeading: "لم يتم العثور على زيارة على هذا الهاتف",
     brokenLinkHeading: "هذا الرابط لم يعمل",
     brokenLinkText: "قد يكون الرابط خاطئًا أو مقطوعًا. لم يتم فتح أي زيارة.",
-    replacedLinkHeading: "رابط الزيارة هذا لم يعد نشطًا",
+    replacedLinkHeading: "رابط الزيارة هذا لا يعمل أو لم يعد صالحًا للاستخدام",
     replacedLinkText: "يرجى طلب المساعدة من مكتب قسم الطوارئ.",
     findVisitHelp:
       "امسح رمز QR الموجود على إيصالك. يمكنك أيضًا كتابة الرابط المطبوع أسفله. إذا استمر الفشل، اطلب من المكتب إظهار رمز QR مرة أخرى.",
diff --git a/lib/text/en.ts b/lib/text/en.ts
index be6baf6..3eb7671 100644
--- a/lib/text/en.ts
+++ b/lib/text/en.ts
@@ -77,7 +77,7 @@ export const en = {
     brokenLinkHeading: "This link did not work",
     brokenLinkText: "The link might be wrong or cut short. No visit was opened.",
     // Staff gave a new link or closed the visit, so this link no longer works.
-    replacedLinkHeading: "This visit link is no longer active",
+    replacedLinkHeading: "This visit link does not work or is no longer active",
     replacedLinkText: "Please ask the emergency department desk for help.",
     findVisitHelp:
       "Scan the QR code on your slip. You can also type the link printed under it. If it still fails, ask the desk to show the QR code again.",
diff --git a/lib/text/fr.ts b/lib/text/fr.ts
index 7be7492..09ce203 100644
--- a/lib/text/fr.ts
+++ b/lib/text/fr.ts
@@ -66,7 +66,7 @@ export const fr: PatientText = {
     noVisitHeading: "Aucune visite trouvée sur ce téléphone",
     brokenLinkHeading: "Ce lien n'a pas fonctionné",
     brokenLinkText: "Le lien pourrait être erroné ou coupé court. Aucune visite n'a été ouverte.",
-    replacedLinkHeading: "Ce lien de visite n'est plus actif",
+    replacedLinkHeading: "Ce lien de visite ne fonctionne pas ou n'est plus actif",
     replacedLinkText: "Veuillez demander de l'aide au bureau du service des urgences.",
     findVisitHelp:
       "Scannez le code QR sur votre billet. Vous pouvez également taper le lien imprimé en dessous. Si cela échoue toujours, demandez au bureau de vous montrer à nouveau le code QR.",
diff --git a/lib/text/text.test.ts b/lib/text/text.test.ts
index ef4fae5..0a1bd3c 100644
--- a/lib/text/text.test.ts
+++ b/lib/text/text.test.ts
@@ -63,7 +63,7 @@ describe("the owner's equity lines", () => {
   const t = textFor("en");
 
   it("has the replaced-link message and the interpreter line exactly", () => {
-    expect(t.patient.replacedLinkHeading).toBe("This visit link is no longer active");
+    expect(t.patient.replacedLinkHeading).toBe("This visit link does not work or is no longer active");
     expect(t.patient.replacedLinkText).toBe("Please ask the emergency department desk for help.");
     expect(t.language.interpreter).toBe(
       "Need another language? Ask the emergency department desk for a free interpreter.",
diff --git a/lib/text/ur.ts b/lib/text/ur.ts
index 4392a23..cdaaef6 100644
--- a/lib/text/ur.ts
+++ b/lib/text/ur.ts
@@ -66,7 +66,7 @@ export const ur: PatientText = {
     noVisitHeading: "اس فون پر کوئی وزٹ نہیں ملا",
     brokenLinkHeading: "اس لنک نے کام نہیں کیا",
     brokenLinkText: "لنک غلط یا کٹا ہوا ہو سکتا ہے۔ کوئی وزٹ نہیں کھلا۔",
-    replacedLinkHeading: "یہ وزٹ لنک اب فعال نہیں ہے",
+    replacedLinkHeading: "یہ وزٹ لنک کام نہیں کر رہا یا اب استعمال میں نہیں ہے",
     replacedLinkText: "براہ کرم ایمرجنسی ڈیپارٹمنٹ ڈیسک سے مدد مانگیں۔",
     findVisitHelp:
       "اپنی پرچی پر موجود QR کوڈ اسکین کریں۔ آپ اس کے نیچے چھپا ہوا لنک بھی ٹائپ کر سکتے ہیں۔ اگر یہ پھر بھی ناکام رہتا ہے، تو ڈیسک سے کہیں کہ وہ دوبارہ QR کوڈ دکھائے۔",
diff --git a/lib/text/zh.ts b/lib/text/zh.ts
index 01ec7e6..505165e 100644
--- a/lib/text/zh.ts
+++ b/lib/text/zh.ts
@@ -66,7 +66,7 @@ export const zh: PatientText = {
     noVisitHeading: "在此手机上未找到就诊信息",
     brokenLinkHeading: "此链接无效",
     brokenLinkText: "链接可能错误或被截断。没有打开任何就诊。",
-    replacedLinkHeading: "此就诊链接已失效",
+    replacedLinkHeading: "这个就诊链接无法打开或已经不能用了",
     replacedLinkText: "请向急诊室前台寻求帮助。",
     findVisitHelp:
       "扫描凭条上的 QR 码。您也可以输入打印在它下方的链接。如果仍然失败，请要求前台再次出示 QR 码。",
```

## Response
