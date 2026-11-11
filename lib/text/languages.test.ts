// Checks the language list and which language a patient's screen shows.

import { describe, expect, it } from "vitest";
import { languageInfo, LANGUAGES, patientLanguage } from "./languages";
import { textFor } from "./index";

describe("the language list", () => {
  it("has its own text for every language it offers (not the English fallback)", () => {
    for (const { code } of LANGUAGES.filter((l) => l.code !== "en")) {
      expect(textFor(code), code).not.toBe(textFor("en"));
    }
  });

  it("writes Urdu and Arabic right to left, the others left to right", () => {
    expect(languageInfo("ur").dir).toBe("rtl");
    expect(languageInfo("ar").dir).toBe("rtl");
    expect(languageInfo("fr").dir).toBe("ltr");
    expect(languageInfo("zh").dir).toBe("ltr");
  });

  it("treats only English as approved until a fluent speaker checks the others", () => {
    expect(LANGUAGES.filter((l) => l.approved).map((l) => l.code)).toEqual(["en"]);
  });

  it("gives English details for an unknown code", () => {
    expect(languageInfo("zz").code).toBe("en");
  });
});

describe("patientLanguage", () => {
  it("prefers the language chosen on this phone", () => {
    expect(patientLanguage("ar", "fr")).toBe("ar");
  });

  it("uses the visit's language when the phone has no choice, before or after it loads", () => {
    expect(patientLanguage(null, "zh")).toBe("zh");
    expect(patientLanguage(null, undefined)).toBe("en");
  });

  it("ignores an unknown code from either place", () => {
    expect(patientLanguage("zz", "ur")).toBe("ur");
    expect(patientLanguage(null, "zz")).toBe("en");
  });
});
