// Checks the text size rules: which values count as a size, and the font size each one sets.

import { afterEach, describe, expect, it, vi } from "vitest";
import { isTextSize, rootFontSize, TEXT_SIZE_KEY, textSizeScript } from "./textSize";

describe("isTextSize", () => {
  it("accepts the three sizes", () => {
    expect(isTextSize("normal")).toBe(true);
    expect(isTextSize("large")).toBe(true);
    expect(isTextSize("extraLarge")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isTextSize("huge")).toBe(false);
    expect(isTextSize(null)).toBe(false);
    expect(isTextSize(3)).toBe(false);
  });
});

describe("rootFontSize", () => {
  it("returns 100% for normal", () => {
    expect(rootFontSize("normal")).toBe("100%");
  });

  it("returns 125% for large", () => {
    expect(rootFontSize("large")).toBe("125%");
  });

  it("returns 150% for extra large", () => {
    expect(rootFontSize("extraLarge")).toBe("150%");
  });
});

describe("textSizeScript", () => {
  // Runs the head script with a fake page: the path, the saved value and the root element's style.
  function runScript(pathname: string, storage: { getItem: (key: string) => string | null }) {
    const root = { style: { fontSize: "" } };
    vi.stubGlobal("location", { pathname });
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("document", { documentElement: root });
    new Function(textSizeScript())();
    return root.style.fontSize;
  }

  // Fake storage that returns the saved value only for the real key.
  function storageWith(saved: string) {
    return { getItem: (key: string) => (key === TEXT_SIZE_KEY ? saved : null) };
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sets the saved size on a patient page", () => {
    expect(runScript("/patient", storageWith("extraLarge"))).toBe("150%");
  });

  it("does nothing on other pages", () => {
    expect(runScript("/", storageWith("extraLarge"))).toBe("");
  });

  it("ignores a saved value that is not a size", () => {
    expect(runScript("/patient", storageWith("huge"))).toBe("");
  });

  it("does nothing and does not throw when storage is blocked", () => {
    const blocked = {
      getItem: () => {
        throw new Error("storage blocked");
      },
    };
    expect(runScript("/patient", blocked)).toBe("");
  });
});
