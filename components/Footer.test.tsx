// @vitest-environment happy-dom
// Checks that the footer tag itself says its text is English and read left to right (lang and dir).

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Footer } from "./Footer";

// Tells React that this file runs its updates inside act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("Footer language", () => {
  it("marks the footer as English (lang) and left to right (dir)", () => {
    act(() => root.render(<Footer />));
    const footer = container.querySelector("footer");
    expect(footer).not.toBeNull();
    expect(footer?.getAttribute("lang")).toBe("en");
    expect(footer?.getAttribute("dir")).toBe("ltr");
  });
});
