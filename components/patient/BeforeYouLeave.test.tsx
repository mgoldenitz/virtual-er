// @vitest-environment happy-dom
// Checks "Before you leave" on the patient screen: its heading and 4 items in every language.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { textFor } from "@/lib/text";
import { BeforeYouLeave } from "./BeforeYouLeave";

describe.each(["en", "fr", "ur", "ar", "zh"])("BeforeYouLeave in %s", (language) => {
  it("has its heading and the 4 items", () => {
    const t = textFor(language);
    const box = document.createElement("div");
    box.innerHTML = renderToStaticMarkup(<BeforeYouLeave language={language} />);
    expect(box.querySelector("h2")?.textContent).toBe(t.patient.beforeHeading);
    const items = [...box.querySelectorAll("ul > li")].map((item) => item.textContent);
    expect(items).toEqual(t.patient.beforeItems);
  });
});
