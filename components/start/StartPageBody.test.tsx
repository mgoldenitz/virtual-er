// Checks that the start page has the text size choice, so a patient can make the text bigger before a visit starts.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { StartPageBody } from "./StartPageBody";

// The page reads the saved language and visit from the phone and the database; the test does not need them.
vi.mock("@/data/savedLanguage", () => ({ useChosenLanguage: () => null, chooseLanguage: vi.fn() }));
vi.mock("@/components/start/StartVisit", () => ({ StartVisit: () => null }));

describe("StartPageBody", () => {
  it("has the text size choice with its three sizes", () => {
    const html = renderToStaticMarkup(<StartPageBody />);
    expect(html).toContain("<legend");
    expect(html).toContain("Text size");
    expect(html.match(/<input[^>]*name="text-size"/g)).toHaveLength(3);
  });
});
