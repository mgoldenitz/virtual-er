// @vitest-environment happy-dom
// Checks that the whole page (the <html> tag) gets the chosen language and direction,
// and goes back to English, left to right, when the screen closes.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useDocumentLanguage } from "./useDocumentLanguage";

// Tells React that this file runs its updates inside act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Screen({ language }: { language: string }) {
  useDocumentLanguage(language);
  return null;
}

let container: HTMLDivElement;
let root: Root;
const html = () => document.documentElement;

beforeEach(() => {
  html().setAttribute("lang", "en");
  html().setAttribute("dir", "ltr");
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  container.remove();
});

describe("useDocumentLanguage", () => {
  it("sets Urdu and right to left on the whole page", () => {
    act(() => root.render(<Screen language="ur" />));
    expect(html().getAttribute("lang")).toBe("ur");
    expect(html().getAttribute("dir")).toBe("rtl");
    act(() => root.unmount());
  });

  it("puts back English, left to right, when the screen closes", () => {
    act(() => root.render(<Screen language="ar" />));
    act(() => root.unmount());
    expect(html().getAttribute("lang")).toBe("en");
    expect(html().getAttribute("dir")).toBe("ltr");
  });
});
