// Checks that the language picker falls back to English and that SPEC's fixed sentences
// are word for word in the English text.

import { describe, expect, it } from "vitest";
import { fill, textFor } from "./index";

describe("textFor", () => {
  it("gives English for English, an unknown language, or none", () => {
    expect(textFor("en").emergencyLine).toBe(textFor(undefined).emergencyLine);
    expect(textFor("zz")).toBe(textFor("en"));
    expect(textFor(null)).toBe(textFor("en"));
  });
});

describe("fill", () => {
  it("puts each value into its braces and leaves unknown braces alone", () => {
    expect(fill("Demo Site {site}", { site: "B" })).toBe("Demo Site B");
    expect(fill("{low} to {high}", { low: 5 })).toBe("5 to {high}");
  });
});

describe("SPEC's fixed sentences", () => {
  const t = textFor("en");

  it("has the 911 line and the footer exactly", () => {
    expect(t.emergencyLine).toBe(
      "If your symptoms get worse, call 911 or come back to the emergency department now.",
    );
    expect(t.footer).toBe(
      "Concept prototype. Not affiliated with or endorsed by Trillium Health Partners. Demo data only.",
    );
  });

  it("has the start page's emergency check and pause message exactly", () => {
    expect(t.start.emergencyCheck).toBe(
      "Chest pain, trouble breathing, signs of stroke, heavy bleeding or another emergency? Call 911 now.",
    );
    expect(t.start.paused).toBe(
      "Off-site waiting is paused right now. Please come to the emergency department and wait there.",
    );
  });

  it("keeps the triage sentence wherever a visit from home is explained", () => {
    const triage =
      "Your place in line starts when a nurse sees you at triage. The most urgent patients are always seen first.";
    expect(t.patient.fromHomeText[0]).toBe(triage);
    expect(t.start.startIntro).toContain(triage);
  });

  it("has the waiting screen's fixed lines and the survey question exactly", () => {
    expect(t.patient.placeCanChange).toBe(
      "Your place can change if more urgent patients arrive. The most urgent patients are always seen first.",
    );
    expect(t.patient.waitLabel).toBe("Estimated time until you're called back:");
    expect(fill(t.patient.waitRangeLong, { low: "40", high: "60 minutes" })).toBe("40 to 60 minutes");
    expect(t.returnNow.text).toBe("Please return now. Staff will review your visit if you do not respond.");
    expect(t.survey.question).toBe("How would you rate your waiting experience?");
  });
});

// The owner's words from the equity review (docs/decisions.md, 2026-11-17).
describe("the owner's equity lines", () => {
  const t = textFor("en");

  it("has the replaced-link message and the interpreter line exactly", () => {
    expect(t.patient.replacedLinkHeading).toBe("This visit link is no longer active");
    expect(t.patient.replacedLinkText).toBe("Please ask the emergency department desk for help.");
    expect(t.language.interpreter).toBe(
      "Need another language? Ask the emergency department desk for a free interpreter.",
    );
  });
});
