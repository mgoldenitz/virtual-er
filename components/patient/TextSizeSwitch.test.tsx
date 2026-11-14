// Checks the text size menu: the words in the chosen language, the checked choice, and that it is three radio buttons.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { useChosenTextSize } from "@/data/savedTextSize";
import { textFor } from "@/lib/text";
import { TextSizeSwitch } from "./TextSizeSwitch";

// Replace the real hook, so each test can choose the saved size.
vi.mock("@/data/savedTextSize", () => ({ useChosenTextSize: vi.fn(), chooseTextSize: vi.fn() }));

// Every <input> tag in the rendered HTML.
function inputs(html: string): string[] {
  return html.match(/<input[^>]*>/g) ?? [];
}

describe("TextSizeSwitch", () => {
  it("shows the English legend and words, and checks only the saved choice", () => {
    vi.mocked(useChosenTextSize).mockReturnValue("large");
    const html = renderToStaticMarkup(<TextSizeSwitch language="en" />);
    expect(html).toContain("Text size");
    expect(html).toContain("Normal");
    expect(html).toContain("Large");
    expect(html).toContain("Extra large");

    const checked = inputs(html).filter((tag) => tag.includes("checked"));
    expect(checked).toHaveLength(1);
    expect(checked[0]).toContain('value="large"');
  });

  it("shows the French legend in French", () => {
    vi.mocked(useChosenTextSize).mockReturnValue("normal");
    const html = renderToStaticMarkup(<TextSizeSwitch language="fr" />);
    expect(html).toContain(textFor("fr").textSize.label);
  });

  it("renders three radio inputs that share one name", () => {
    vi.mocked(useChosenTextSize).mockReturnValue("normal");
    const html = renderToStaticMarkup(<TextSizeSwitch language="en" />);
    const radios = inputs(html);
    expect(radios).toHaveLength(3);
    for (const tag of radios) {
      expect(tag).toContain('type="radio"');
      expect(tag).toContain('name="text-size"');
    }
  });
});
