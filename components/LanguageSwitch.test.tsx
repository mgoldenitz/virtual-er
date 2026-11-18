// Checks the language menu: it can never be wider than its box, so text at 200% does not make the page scroll sideways.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LanguageSwitch } from "./LanguageSwitch";

// The menu saves the choice on the phone; the test does not need that.
vi.mock("@/data/savedLanguage", () => ({ chooseLanguage: vi.fn() }));

// The class list of the <select> tag in the rendered HTML.
function selectClasses(html: string): string[] {
  const tag = html.match(/<select[^>]*>/)?.[0] ?? "";
  return (tag.match(/class="([^"]*)"/)?.[1] ?? "").split(" ");
}

describe("LanguageSwitch", () => {
  it("keeps the menu inside the screen width (WCAG reflow at 200% text)", () => {
    for (const language of ["en", "fr", "ur", "ar", "zh"]) {
      const html = renderToStaticMarkup(<LanguageSwitch language={language} />);
      expect(selectClasses(html)).toContain("max-w-full");
    }
  });
});
