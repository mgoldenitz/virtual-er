// @vitest-environment happy-dom
// Checks "Questions" on the start page: 8 questions in every language, and the answers that are
// SPEC sentences (place can change, the 911 line, the paused message) are word for word.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { fill, textFor } from "@/lib/text";
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
    const q = t.start.questions;
    const answers = [...render(language).querySelectorAll("details > p")].map((p) => p.textContent ?? "");
    expect(q.holdPlace.a).toContain("{triage}");
    expect(q.paused.a).toContain("{message}");
    expect(answers).toEqual([
      fill(q.holdPlace.a, { triage: t.patient.fromHomeText[0] }),
      t.patient.placeCanChange,
      q.stillHere.a,
      q.noReply.a,
      t.emergencyLine,
      q.saves.a,
      q.reopen.a,
      fill(q.paused.a, { message: t.start.paused }),
    ]);
  });
});
