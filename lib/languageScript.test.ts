// Checks the language head script: on the start page and the patient page it puts the saved language
// and its direction on the page before the first paint, and hides the main part until React shows it.

import { afterEach, describe, expect, it, vi } from "vitest";
import { LANGUAGE_WAIT_ATTR, languageScript, revealsPage } from "./languageScript";
import { LANGUAGE_KEY } from "./text/languages";

// A fake <html> tag that keeps its attributes in a plain object.
function fakeRoot() {
  const attrs: Record<string, string> = {};
  return {
    attrs,
    setAttribute: (name: string, value: string) => {
      attrs[name] = value;
    },
    getAttribute: (name: string) => attrs[name] ?? null,
    removeAttribute: (name: string) => {
      delete attrs[name];
    },
  };
}

// Fake storage that returns the saved value only for the real key.
function storageWith(saved: string | null) {
  return { getItem: (key: string) => (key === LANGUAGE_KEY ? saved : null) };
}

// Runs the head script with a fake page: the path, the hash, the saved value, the <html> tag and the timer.
function runScript(pathname: string, storage: { getItem: (key: string) => string | null }, hash = "") {
  const root = fakeRoot();
  const timers: { run: () => void; ms: number }[] = [];
  vi.stubGlobal("location", { pathname, hash });
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("document", { documentElement: root });
  vi.stubGlobal("setTimeout", (run: () => void, ms: number) => {
    timers.push({ run, ms });
    return 0;
  });
  new Function(languageScript())();
  return { attrs: root.attrs, timers };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("languageScript", () => {
  it("sets Arabic, right to left, and hides the page on the start page", () => {
    const { attrs } = runScript("/", storageWith("ar"));
    expect(attrs.lang).toBe("ar");
    expect(attrs.dir).toBe("rtl");
    expect(attrs[LANGUAGE_WAIT_ATTR]).toBe("ar");
  });

  it("does nothing for English, nothing saved, or a value that is not a language", () => {
    for (const saved of ["en", null, "xx"]) {
      const { attrs, timers } = runScript("/", storageWith(saved));
      expect(attrs).toEqual({});
      expect(timers).toEqual([]);
    }
  });

  it("does nothing and does not throw when storage is blocked", () => {
    const blocked = {
      getItem: () => {
        throw new Error("storage blocked");
      },
    };
    expect(runScript("/patient", blocked).attrs).toEqual({});
  });

  it("does nothing on the staff and dashboard pages", () => {
    expect(runScript("/staff", storageWith("ar")).attrs).toEqual({});
    expect(runScript("/dashboard", storageWith("ar")).attrs).toEqual({});
  });

  it("on the patient page, uses the language in the link before the saved one", () => {
    const { attrs } = runScript("/patient", storageWith("ar"), "#t=abc&l=fr");
    expect(attrs.lang).toBe("fr");
    expect(attrs.dir).toBe("ltr");
    expect(attrs[LANGUAGE_WAIT_ATTR]).toBe("fr");
  });

  it("on the start page, does not read a language from the link", () => {
    expect(runScript("/", storageWith("ar"), "#l=fr").attrs.lang).toBe("ar");
  });

  it("shows the page again after 1.5 seconds, so it never stays empty", () => {
    const { attrs, timers } = runScript("/", storageWith("ur"));
    expect(timers.map((t) => t.ms)).toEqual([1500]);
    timers[0].run();
    expect(attrs[LANGUAGE_WAIT_ATTR]).toBeUndefined();
    // The language and direction stay.
    expect(attrs.dir).toBe("rtl");
  });
});

describe("revealsPage", () => {
  it("shows the page when nothing waits", () => {
    expect(revealsPage("ar", null)).toBe(true);
  });

  it("shows the page when React shows the language the page waits for", () => {
    expect(revealsPage("ar", "ar")).toBe(true);
  });

  it("keeps the page hidden while React still shows English", () => {
    expect(revealsPage("en", "ar")).toBe(false);
  });
});
