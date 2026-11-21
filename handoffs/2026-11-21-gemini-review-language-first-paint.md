# Gemini review: saved language before the first paint (fix e)

Model: Gemini Hydrogen 4, High, in a new chat. Branch `phase5-e2e`, commits `80a7ce4` (tests) and `9bdcd58` (fix).

## Prompt

You review a change in a Next.js 16.4 App Router app (`cacheComponents: true`, React 19). It is a concept prototype of a virtual ER waiting room with synthetic data only. Find problems; do not confirm that it works. For each problem, give the file, the line, a concrete case (inputs and what goes wrong), and how sure you are. Say "none found" for an area only after you looked.

The problem it fixes: the server does not know the language saved on the phone (browser storage key `vwr.language`), so it sends `/` and `/patient` in English, left to right. Reading a cookie in the root layout needs Suspense with `cacheComponents` and makes the pages dynamic, so that was not chosen. The owner chose "hide until ready":

1. A plain script in `<head>` (`languageScript()` in `lib/languageScript.ts`, rendered by `InlineScript`) runs before the first paint, only on `/` and paths that start with `/patient`. On `/patient` it takes the `l=` language from the address hash first (the patient page saves that language in an effect), else the saved one. If the code is known and is not `en`, it sets `lang`, `dir` and `data-lang-wait="<code>"` on `<html>`, and a 1500 ms timer removes `data-lang-wait`.
2. `app/globals.css`: `html[data-lang-wait] main { visibility: hidden; }`. The footer stays visible.
3. `useDocumentLanguage` (a layout effect that every patient screen and the start page call) removes `data-lang-wait` when `revealsPage(language, waitingFor)` is true. While hydrating, React first renders in English (the server snapshot of `useSyncExternalStore` is null), then in the saved language; only that second render may show the page.

Settled, do not report these as faults:
- `main`, and so the 911 line inside it, is hidden for up to 1.5 s. The owner accepted this (`docs/decisions.md`, 2026-11-21).
- If React takes more than 1.5 s, `main` shows English text right to left until React loads. Accepted limit (`docs/known-issues.md`).
- `catch {` with no name and `startsWith("/patient")` also matching `/patients`: same as `lib/textSize.ts`, already listed as low risk (`docs/known-issues.md`, 2026-11-18).
- `suppressHydrationWarning` on `<html>` (`app/layout.tsx` line 24) covers the changed `lang`, `dir` and the new attribute.
- A second `<main>` can be in the page: the hidden `/` page that `cacheComponents` keeps (confirmed in the last review). Hiding it too is harmless.

Questions:
1. Is there any path where `data-lang-wait` stays until the 1.5 s timer while React has already rendered the right language (the page is empty for no reason)? Think of client navigation between `/` and `/patient`, the patient page's `chooseLanguage(link.language)` effect, a saved code that `languageInfo` maps to a different code, React StrictMode double effects, and the cleanup that puts back `en`/`ltr`.
2. Is there any path where the script hides the page for language X but React never renders X?
3. Does the script string have any fault: escaping of the JSON values, the `RegExp` built from `LINK_LANGUAGE_PATTERN.source`, an exception path that leaves `data-lang-wait` without the timer?
4. Test gaps: name a behavior that changed and that no test below covers.
5. Simpler ways to get the same result, if any.

Line counts after the change: `lib/languageScript.ts` 58 (new), `lib/languageScript.test.ts` 115 (new), `lib/text/languages.ts` 59, `data/savedLanguage.ts` 42, `app/layout.tsx` 38, `app/globals.css` 82, `components/useDocumentLanguage.ts` 27, `components/useDocumentLanguage.test.tsx` 88, `e2e/languages.spec.ts` 55.

Checked (output in this session): 89 test files, 584 tests pass; lint exit 0; `npm run build` passed; `npm run e2e` two times, 37 passed each time. Manual check on the dev server, phone size, `ar` saved, script files held back 3 s: before React, `main` hidden and `<html>` `ar`/`rtl`; after 1.5 s, `main` visible with English text; after React, Arabic heading.

Not checked: real phones; Safari and Firefox; a user with JavaScript on and storage blocked (unit test only); client navigation from `/` to `/patient` in a browser.

### Helpers the changed lines call (not in the diff)

`components/InlineScript.tsx`:

```tsx
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

`lib/text/languages.ts` (unchanged parts):

```ts
export const LANGUAGES: LanguageInfo[] = [
  { code: "en", name: "English", englishName: "English", dir: "ltr", approved: true },
  { code: "fr", name: "Français", englishName: "French", dir: "ltr", approved: false },
  { code: "ur", name: "اردو", englishName: "Urdu", dir: "rtl", approved: false },
  { code: "ar", name: "العربية", englishName: "Arabic", dir: "rtl", approved: false },
  { code: "zh", name: "中文（简体）", englishName: "Mandarin", dir: "ltr", approved: false },
];
export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);
export function languageInfo(code: string | null | undefined): LanguageInfo {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}
export function patientLanguage(chosenOnPhone: string | null, visitLanguage: string | null | undefined): string {
  if (chosenOnPhone && LANGUAGE_CODES.includes(chosenOnPhone)) return chosenOnPhone;
  if (visitLanguage && LANGUAGE_CODES.includes(visitLanguage)) return visitLanguage;
  return "en";
}
```

`data/savedLanguage.ts` (unchanged parts): `read()` returns the saved value only if it is in `LANGUAGE_CODES`, else null; `chooseLanguage(code)` sets it, saves it and tells listeners; `useChosenLanguage()` is `useSyncExternalStore(subscribe, read, () => null)`.

`app/patient/page.tsx`, the parts that pick the language:

```tsx
  useEffect(() => {
    const readLink = () => {
      const link = takeTokenFromLink();
      // A desk QR link carries the visit's language: remember it, so it shows before the visit loads.
      if (link.language) chooseLanguage(link.language);
      setToken(link.token);
      setBrokenLink(link.brokenLink);
      setNotSaved(false);
    };
    // ... runs readLink once on load, and again on hashchange
  }, []);
  // ...
  const language = patientLanguage(chosenLanguage, view?.language);
  const t = textFor(language);
  useDocumentLanguage(language);
```

`takeTokenFromLink()` (`data/savedToken.ts`) returns `language: linkLanguage(window.location.hash)`, where `linkLanguage` uses `LINK_LANGUAGE_PATTERN` and returns the code only if it is in `LANGUAGE_CODES`.

`components/start/StartPageBody.tsx`: `const language = useChosenLanguage() ?? "en"; useDocumentLanguage(language);`

### New file: lib/languageScript.ts

```ts
// The language head script, and the rule for when the page it hid can show again.
// The server does not know the language saved on the phone, so it sends English, left to right.
// This script runs before the first paint: it puts the saved language and direction on <html>,
// and marks the page as waiting, so app/globals.css hides <main> until React shows that language
// (components/useDocumentLanguage.ts removes the mark). The footer stays visible.

import { LANGUAGE_KEY, LANGUAGES, LINK_LANGUAGE_PATTERN } from "./text/languages";

/** The <html> attribute that hides <main> while it holds the language the page waits for. */
export const LANGUAGE_WAIT_ATTR = "data-lang-wait";

/** The longest time <main> stays hidden, so a slow or failed load never leaves the page empty. */
const MAX_WAIT_MS = 1500;

/**
 * True when React's render can show the page: nothing waits, or React now shows the language
 * the head script waits for. While loading, React first renders in English (as the server did),
 * so that render must not show the page.
 */
export function revealsPage(language: string, waitingFor: string | null): boolean {
  return waitingFor === null || language === waitingFor;
}

/**
 * A short plain-JavaScript script for the page's <head>. It works only on the start page and the
 * patient screens (as lib/textSize.ts does). On a patient screen, the language in the desk link
 * (#...l=fr) comes first, because the patient page saves that language; else the saved one.
 * English, an unknown code or blocked storage: it does nothing. The key, the rule and the
 * directions are written in as JSON, so they are defined only in lib/text/languages.ts.
 */
export function languageScript(): string {
  const dirs = Object.fromEntries(LANGUAGES.map((l) => [l.code, l.dir]));
  return `(function () {
  var path = location.pathname;
  if (path !== "/" && !path.startsWith("/patient")) return;
  try {
    var dirs = ${JSON.stringify(dirs)};
    var known = function (c) { return !!c && Object.prototype.hasOwnProperty.call(dirs, c); };
    var code = null;
    if (path.startsWith("/patient")) {
      var match = location.hash.match(new RegExp(${JSON.stringify(LINK_LANGUAGE_PATTERN.source)}));
      if (match && known(match[1])) code = match[1];
    }
    if (!code) code = localStorage.getItem(${JSON.stringify(LANGUAGE_KEY)});
    // English is what the server sent, so there is nothing to change or hide.
    if (!known(code) || code === "en") return;
    var root = document.documentElement;
    root.setAttribute("lang", code);
    root.setAttribute("dir", dirs[code]);
    root.setAttribute(${JSON.stringify(LANGUAGE_WAIT_ATTR)}, code);
    setTimeout(function () {
      root.removeAttribute(${JSON.stringify(LANGUAGE_WAIT_ATTR)});
    }, ${MAX_WAIT_MS});
  } catch {
    // Storage blocked: the page shows in English first, as before.
  }
})();`;
}
```

### New file: lib/languageScript.test.ts

```ts
// Checks the language head script: on the start page and the patient page it puts the saved language
// and its direction on the page before the first paint, and hides the main part until React shows it.

import { afterEach, describe, expect, it, vi } from "vitest";
import { LANGUAGE_WAIT_ATTR, languageScript, revealsPage } from "./languageScript";
import { LANGUAGE_KEY } from "./text/languages";

// A fake <html> tag that keeps its attributes in a plain object.
function fakeRoot() {
  const attrs: Record<string, string> = {};
  return {
    attrs,
    setAttribute: (name: string, value: string) => {
      attrs[name] = value;
    },
    getAttribute: (name: string) => attrs[name] ?? null,
    removeAttribute: (name: string) => {
      delete attrs[name];
    },
  };
}

// Fake storage that returns the saved value only for the real key.
function storageWith(saved: string | null) {
  return { getItem: (key: string) => (key === LANGUAGE_KEY ? saved : null) };
}

// Runs the head script with a fake page: the path, the hash, the saved value, the <html> tag and the timer.
function runScript(pathname: string, storage: { getItem: (key: string) => string | null }, hash = "") {
  const root = fakeRoot();
  const timers: { run: () => void; ms: number }[] = [];
  vi.stubGlobal("location", { pathname, hash });
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("document", { documentElement: root });
  vi.stubGlobal("setTimeout", (run: () => void, ms: number) => {
    timers.push({ run, ms });
    return 0;
  });
  new Function(languageScript())();
  return { attrs: root.attrs, timers };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("languageScript", () => {
  it("sets Arabic, right to left, and hides the page on the start page", () => {
    const { attrs } = runScript("/", storageWith("ar"));
    expect(attrs.lang).toBe("ar");
    expect(attrs.dir).toBe("rtl");
    expect(attrs[LANGUAGE_WAIT_ATTR]).toBe("ar");
  });

  it("does nothing for English, nothing saved, or a value that is not a language", () => {
    for (const saved of ["en", null, "xx"]) {
      const { attrs, timers } = runScript("/", storageWith(saved));
      expect(attrs).toEqual({});
      expect(timers).toEqual([]);
    }
  });

  it("does nothing and does not throw when storage is blocked", () => {
    const blocked = {
      getItem: () => {
        throw new Error("storage blocked");
      },
    };
    expect(runScript("/patient", blocked).attrs).toEqual({});
  });

  it("does nothing on the staff and dashboard pages", () => {
    expect(runScript("/staff", storageWith("ar")).attrs).toEqual({});
    expect(runScript("/dashboard", storageWith("ar")).attrs).toEqual({});
  });

  it("on the patient page, uses the language in the link before the saved one", () => {
    const { attrs } = runScript("/patient", storageWith("ar"), "#t=abc&l=fr");
    expect(attrs.lang).toBe("fr");
    expect(attrs.dir).toBe("ltr");
    expect(attrs[LANGUAGE_WAIT_ATTR]).toBe("fr");
  });

  it("on the patient page, a link in English wins over a saved Arabic, so nothing is hidden", () => {
    // The patient page saves the link's English, so React never renders Arabic.
    expect(runScript("/patient", storageWith("ar"), "#t=abc&l=en").attrs).toEqual({});
  });

  it("on the start page, does not read a language from the link", () => {
    expect(runScript("/", storageWith("ar"), "#l=fr").attrs.lang).toBe("ar");
  });

  it("shows the page again after 1.5 seconds, so it never stays empty", () => {
    const { attrs, timers } = runScript("/", storageWith("ur"));
    expect(timers.map((t) => t.ms)).toEqual([1500]);
    timers[0].run();
    expect(attrs[LANGUAGE_WAIT_ATTR]).toBeUndefined();
    // The language and direction stay.
    expect(attrs.dir).toBe("rtl");
  });
});

describe("revealsPage", () => {
  it("shows the page when nothing waits", () => {
    expect(revealsPage("ar", null)).toBe(true);
  });

  it("shows the page when React shows the language the page waits for", () => {
    expect(revealsPage("ar", "ar")).toBe(true);
  });

  it("keeps the page hidden while React still shows English", () => {
    expect(revealsPage("en", "ar")).toBe(false);
  });
});
```

### Diff of the other files (9c4c536 to 9bdcd58)

```diff
diff --git a/app/globals.css b/app/globals.css
index d327949..9affcc2 100644
--- a/app/globals.css
+++ b/app/globals.css
@@ -18,6 +18,13 @@ body {
   font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
 }
 
+/* While the head script waits for React to show the saved language (lib/languageScript.ts),
+   the main part of the screen is hidden, so the patient never sees English first.
+   visibility keeps the layout in place, so nothing jumps when it shows. The footer stays. */
+html[data-lang-wait] main {
+  visibility: hidden;
+}
+
 /* Patient screens (clean look): a plain white box on the light-grey page. */
 .clean-card {
   background-color: var(--color-card);
diff --git a/app/layout.tsx b/app/layout.tsx
index 3cf93ff..a079cd3 100644
--- a/app/layout.tsx
+++ b/app/layout.tsx
@@ -5,6 +5,7 @@ import type { ReactNode } from "react";
 import { Footer } from "@/components/Footer";
 import { InlineScript } from "@/components/InlineScript";
 import { PrivateAnalytics } from "@/components/PrivateAnalytics";
+import { languageScript } from "@/lib/languageScript";
 import { textSizeScript } from "@/lib/textSize";
 import "./globals.css";
 
@@ -21,10 +22,11 @@ export default function RootLayout({ children }: { children: ReactNode }) {
     // ignores attribute differences on these two tags only; mismatches inside the app's own
     // screens are still reported.
     <html lang="en" className="h-full" suppressHydrationWarning>
-      {/* A plain script, not next/script: in the App Router, beforeInteractive runs the code later,
-          so the page would still flash at Normal size. */}
+      {/* Plain scripts, not next/script: in the App Router, beforeInteractive runs the code later,
+          so the page would still flash at Normal size and in English. */}
       <head>
         <InlineScript html={textSizeScript()} />
+        <InlineScript html={languageScript()} />
       </head>
       <body className="flex min-h-full flex-col bg-canvas text-ink" suppressHydrationWarning>
         <div className="flex flex-1 flex-col">{children}</div>
diff --git a/components/useDocumentLanguage.test.tsx b/components/useDocumentLanguage.test.tsx
index fe54380..163b6eb 100644
--- a/components/useDocumentLanguage.test.tsx
+++ b/components/useDocumentLanguage.test.tsx
@@ -22,6 +22,7 @@ const html = () => document.documentElement;
 beforeEach(() => {
   html().setAttribute("lang", "en");
   html().setAttribute("dir", "ltr");
+  html().removeAttribute("data-lang-wait");
   container = document.createElement("div");
   document.body.appendChild(container);
   root = createRoot(container);
@@ -60,6 +61,24 @@ describe("useDocumentLanguage", () => {
     act(() => root.unmount());
   });
 
+  it("shows the hidden page only when it renders the language the head script waits for", () => {
+    // The head script (lib/languageScript.ts) set this before React loaded.
+    html().setAttribute("data-lang-wait", "ur");
+    // While loading, React first renders in English, as the server did: the page stays hidden.
+    act(() => root.render(<Screen language="en" />));
+    expect(html().getAttribute("data-lang-wait")).toBe("ur");
+    // Then React renders with the saved language: the page shows.
+    act(() => root.render(<Screen language="ur" />));
+    expect(html().hasAttribute("data-lang-wait")).toBe(false);
+    act(() => root.unmount());
+  });
+
+  it("does not hide a page that was not hidden", () => {
+    act(() => root.render(<Screen language="ar" />));
+    expect(html().hasAttribute("data-lang-wait")).toBe(false);
+    act(() => root.unmount());
+  });
+
   it("puts back English, left to right, when the screen closes", () => {
     act(() => root.render(<Screen language="ar" />));
     act(() => root.unmount());
diff --git a/components/useDocumentLanguage.ts b/components/useDocumentLanguage.ts
index dbbdc42..26ee30d 100644
--- a/components/useDocumentLanguage.ts
+++ b/components/useDocumentLanguage.ts
@@ -4,8 +4,10 @@
 // and screen readers use them for everything, including the page title and the scroll bar side.
 // It runs before the browser paints, so an Urdu or Arabic page never shows left to right first.
 // When the screen closes, the page goes back to English, left to right (as app/layout.tsx sets it).
+// If the head script hid the page (lib/languageScript.ts), it shows the page once it renders that language.
 
 import { useLayoutEffect } from "react";
+import { LANGUAGE_WAIT_ATTR, revealsPage } from "@/lib/languageScript";
 import { languageInfo } from "@/lib/text/languages";
 
 export function useDocumentLanguage(language: string) {
@@ -14,6 +16,9 @@ export function useDocumentLanguage(language: string) {
     const info = languageInfo(language);
     html.setAttribute("lang", info.code);
     html.setAttribute("dir", info.dir);
+    if (revealsPage(info.code, html.getAttribute(LANGUAGE_WAIT_ATTR))) {
+      html.removeAttribute(LANGUAGE_WAIT_ATTR);
+    }
     return () => {
       html.setAttribute("lang", "en");
       html.setAttribute("dir", "ltr");
diff --git a/data/savedLanguage.ts b/data/savedLanguage.ts
index 768f365..30a0335 100644
--- a/data/savedLanguage.ts
+++ b/data/savedLanguage.ts
@@ -3,9 +3,8 @@
 // Nothing else about the patient is stored.
 
 import { useSyncExternalStore } from "react";
-import { LANGUAGE_CODES } from "@/lib/text/languages";
+import { LANGUAGE_CODES, LANGUAGE_KEY } from "@/lib/text/languages";
 
-const LANGUAGE_KEY = "vwr.language";
 const listeners = new Set<() => void>();
 let chosen: string | null | undefined; // undefined = not read from storage yet
 
diff --git a/e2e/languages.spec.ts b/e2e/languages.spec.ts
index 31345b8..48e24a6 100644
--- a/e2e/languages.spec.ts
+++ b/e2e/languages.spec.ts
@@ -34,6 +34,9 @@ for (const { lang, dir, text } of CASES) {
       const main = patient.locator("main");
       await expect(main).toHaveAttribute("lang", lang);
       await expect(main).toHaveAttribute("dir", dir);
+      // The head script hid the screen until it showed this language; now it shows again.
+      await expect(patient.locator("html")).not.toHaveAttribute("data-lang-wait", /.*/);
+      await expect(main).toBeVisible();
 
       // The waiting heading and the 911 line are in this language, and the English heading is not shown.
       await expect(patient.getByRole("heading", { name: text.patient.waitingHeading })).toBeVisible();
diff --git a/lib/text/languages.ts b/lib/text/languages.ts
index 0e445f0..2bbcad4 100644
--- a/lib/text/languages.ts
+++ b/lib/text/languages.ts
@@ -22,6 +22,12 @@ export const LANGUAGES: LanguageInfo[] = [
 
 export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);
 
+/** The browser storage key that remembers the language chosen on this phone. */
+export const LANGUAGE_KEY = "vwr.language";
+
+/** The "l=" part of a desk QR link. The head script (lib/languageScript.ts) uses the same rule. */
+export const LINK_LANGUAGE_PATTERN = /[#&]l=([a-z]{2,3})(?:&|$)/;
+
 /** The language's details; English for an unknown code. */
 export function languageInfo(code: string | null | undefined): LanguageInfo {
   return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
@@ -37,7 +43,7 @@ export function menuLabel(info: LanguageInfo): string {
  * the visit, so a patient who scans the slip sees their language even before the visit loads.
  */
 export function linkLanguage(hash: string): string | null {
-  const match = hash.match(/[#&]l=([a-z]{2,3})(?:&|$)/);
+  const match = hash.match(LINK_LANGUAGE_PATTERN);
   return match && LANGUAGE_CODES.includes(match[1]) ? match[1] : null;
 }
 
```
