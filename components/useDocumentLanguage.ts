"use client";

// Puts the screen's language and direction on the whole page (the <html> tag), so the browser
// and screen readers use them for everything, including the page title and the scroll bar side.
// It runs before the browser paints, so an Urdu or Arabic page never shows left to right first.
// When the screen closes, the page goes back to English, left to right (as app/layout.tsx sets it).
// If the head script hid the page (lib/languageScript.ts), it shows the page once it renders that language.

import { useLayoutEffect } from "react";
import { LANGUAGE_WAIT_ATTR, revealsPage } from "@/lib/languageScript";
import { languageInfo } from "@/lib/text/languages";

export function useDocumentLanguage(language: string) {
  useLayoutEffect(() => {
    const html = document.documentElement;
    const info = languageInfo(language);
    html.setAttribute("lang", info.code);
    html.setAttribute("dir", info.dir);
    if (revealsPage(info.code, html.getAttribute(LANGUAGE_WAIT_ATTR))) {
      html.removeAttribute(LANGUAGE_WAIT_ATTR);
    }
    return () => {
      html.setAttribute("lang", "en");
      html.setAttribute("dir", "ltr");
    };
  }, [language]);
}
