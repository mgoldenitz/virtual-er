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
 * A short plain-JavaScript script for the page's <head>. It works only on exactly "/" and "/patient",
 * because only those pages run the hook that shows the page again (a 404 such as /patient/unknown
 * does not). On the patient page, the language in the desk link
 * (#...l=fr) comes first, because the patient page saves that language; else the saved one.
 * English, an unknown code or blocked storage: it does nothing. The key, the rule and the
 * directions are written in as JSON, so they are defined only in lib/text/languages.ts.
 */
export function languageScript(): string {
  const dirs = Object.fromEntries(LANGUAGES.map((l) => [l.code, l.dir]));
  return `(function () {
  var path = location.pathname;
  if (path !== "/" && path !== "/patient") return;
  try {
    var dirs = ${JSON.stringify(dirs)};
    var known = function (c) { return !!c && Object.prototype.hasOwnProperty.call(dirs, c); };
    var code = null;
    if (path === "/patient") {
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
