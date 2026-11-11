// Checks the language list and which language a patient's screen shows.

import { describe, expect, it } from "vitest";
import { languageInfo, LANGUAGES, linkLanguage, menuLabel, patientLanguage } from "./languages";
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

describe("menuLabel", () => {
  it("shows the own-script name with the English name beside it", () => {
    expect(menuLabel(languageInfo("ur"))).toBe("اردو (Urdu)");
    expect(menuLabel(languageInfo("en"))).toBe("English");
  });
});

describe("linkLanguage", () => {
  it("reads the language from a desk QR link", () => {
    expect(linkLanguage("#t=abc&l=ar")).toBe("ar");
    expect(linkLanguage("#l=fr&t=abc")).toBe("fr");
  });

  it("ignores a missing or unknown language", () => {
    expect(linkLanguage("#t=abc")).toBeNull();
    expect(linkLanguage("#t=abc&l=zz")).toBeNull();
    expect(linkLanguage("#t=abc&l=ar<script>")).toBeNull();
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
