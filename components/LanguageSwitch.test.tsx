// Checks the language menu: it stays inside the screen width at 200% text, it tags draft languages,
// it has a status region for the draft notice, and it always shows the interpreter line.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { textFor } from "@/lib/text";
import { LANGUAGES, menuLabel } from "@/lib/text/languages";
import { LanguageSwitch } from "./LanguageSwitch";

// The menu saves the choice on the phone; the test does not need that.
vi.mock("@/data/savedLanguage", () => ({ chooseLanguage: vi.fn() }));

// The class list of the <select> tag in the rendered HTML.
function selectClasses(html: string): string[] {
  const tag = html.match(/<select[^>]*>/)?.[0] ?? "";
  return (tag.match(/class="([^"]*)"/)?.[1] ?? "").split(" ");
}

// The words of one menu option in the rendered HTML.
function optionText(html: string, code: string): string | undefined {
  return html.match(new RegExp(`<option[^>]*value="${code}"[^>]*>([^<]*)</option>`))?.[1];
}

describe("LanguageSwitch", () => {
  it("keeps the menu inside the screen width (WCAG reflow at 200% text)", () => {
    for (const language of ["en", "fr", "ur", "ar", "zh"]) {
      const html = renderToStaticMarkup(<LanguageSwitch language={language} />);
      expect(selectClasses(html)).toContain("max-w-full");
    }
  });

  it("has the status region on the page even in English, so a screen reader hears the draft notice when it appears", () => {
    const html = renderToStaticMarkup(<LanguageSwitch language="en" />);
    expect(html).toMatch(/<div[^>]*role="status"/);
  });

  it("tags each draft language in the menu, in that language's own words", () => {
    const html = renderToStaticMarkup(<LanguageSwitch language="en" />);
    for (const info of LANGUAGES.filter((l) => !l.approved)) {
      expect(optionText(html, info.code)).toBe(`${menuLabel(info)} - ${textFor(info.code).language.draftTag}`);
    }
  });

  it("does not tag English, which is approved", () => {
    const html = renderToStaticMarkup(<LanguageSwitch language="en" />);
    expect(optionText(html, "en")).toBe("English");
  });

  it("always shows the interpreter line", () => {
    const html = renderToStaticMarkup(<LanguageSwitch language="en" />);
    expect(html).toContain(textFor("en").language.interpreter);
  });
});
