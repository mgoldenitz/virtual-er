// @vitest-environment happy-dom
// Checks "Questions" on the start page: 8 questions in every language, and the answers that are
// SPEC sentences (place can change, the 911 line, the paused message) are word for word.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { textFor } from "@/lib/text";
import { StartQuestions } from "./StartQuestions";

const render = (language: string) => {
  const box = document.createElement("div");
  box.innerHTML = renderToStaticMarkup(<StartQuestions language={language} />);
  return box;
};

describe.each(["en", "fr", "ur", "ar", "zh"])("StartQuestions in %s", (language) => {
  const t = textFor(language);

  it("has its heading and 8 questions that open and close", () => {
    const box = render(language);
    expect(box.querySelector("h2")?.textContent).toBe(t.start.questionsHeading);
    expect(box.querySelectorAll("details > summary")).toHaveLength(8);
  });

  it("answers with SPEC's sentences exactly", () => {
    const answers = [...render(language).querySelectorAll("details")].map(
      (item) => item.textContent?.replace(item.querySelector("summary")?.textContent ?? "", "") ?? "",
    );
    expect(answers[1]).toBe(t.patient.placeCanChange);
    expect(answers[4]).toBe(t.emergencyLine);
    expect(answers[7]).toContain(t.start.paused);
  });
});
