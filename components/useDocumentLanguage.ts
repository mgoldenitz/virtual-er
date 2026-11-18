"use client";

// Puts the screen's language and direction on the whole page (the <html> tag), so the browser
// and screen readers use them for everything, including the page title and the scroll bar side.
// When the screen closes, the page goes back to English, left to right (as app/layout.tsx sets it).

import { useEffect } from "react";
import { languageInfo } from "@/lib/text/languages";

export function useDocumentLanguage(language: string) {
  useEffect(() => {
    const html = document.documentElement;
    const info = languageInfo(language);
    html.setAttribute("lang", info.code);
    html.setAttribute("dir", info.dir);
    return () => {
      html.setAttribute("lang", "en");
      html.setAttribute("dir", "ltr");
    };
  }, [language]);
}
