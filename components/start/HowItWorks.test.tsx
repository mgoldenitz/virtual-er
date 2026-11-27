// @vitest-environment happy-dom
// Checks "How it works" on the start page: 6 numbered steps in every language, and step 2 is
// SPEC's triage sentence word for word (it is reused, never copied).

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { textFor } from "@/lib/text";
import { HowItWorks } from "./HowItWorks";

const render = (language: string) => {
  const box = document.createElement("div");
  box.innerHTML = renderToStaticMarkup(<HowItWorks language={language} />);
  return box;
};

describe.each(["en", "fr", "ur", "ar", "zh"])("HowItWorks in %s", (language) => {
  const t = textFor(language);

  it("has its heading and 6 numbered steps", () => {
    const box = render(language);
    expect(box.querySelector("h2")?.textContent).toBe(t.start.howHeading);
    expect(box.querySelectorAll("ol > li")).toHaveLength(6);
  });

  it("uses SPEC's triage sentence as step 2", () => {
    const steps = [...render(language).querySelectorAll("ol > li")].map((li) => li.textContent);
    expect(steps).toEqual([t.start.howSteps[0], t.patient.fromHomeText[0], ...t.start.howSteps.slice(1)]);
  });

  it("shows one decorative picture on top of each step, each a different one", () => {
    const box = render(language);
    expect(box.querySelectorAll("section img")).toHaveLength(6);
    const sources = [...box.querySelectorAll("ol > li")].map((li) => {
      const image = li.firstElementChild;
      expect(image?.tagName).toBe("IMG");
      expect(image?.getAttribute("alt")).toBe("");
      expect(image?.nextElementSibling?.textContent).toBe(li.textContent);
      return decodeURIComponent(image?.getAttribute("src") ?? "");
    });
    sources.forEach((src) => expect(src).toContain("/start/steps/"));
    expect(new Set(sources).size).toBe(6);
  });

  it("sits on the page with no card frame (decisions.md, 2026-11-22)", () => {
    expect(render(language).querySelector("section")?.classList.contains("clean-card")).toBe(false);
  });
});
