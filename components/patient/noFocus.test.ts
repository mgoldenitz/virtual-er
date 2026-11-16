// @vitest-environment happy-dom
// Checks the "focus is on nobody" answer, also for a browser that gives the <html> element.

import { afterEach, describe, expect, it } from "vitest";
import { focusIsOnNobody } from "./noFocus";

/** Makes document.activeElement give this element, as some browsers do after a focused part leaves. */
function fakeFocus(element: Element | null) {
  Object.defineProperty(document, "activeElement", { configurable: true, get: () => element });
}

afterEach(() => {
  delete (document as { activeElement?: Element | null }).activeElement;
  document.body.replaceChildren();
});

describe("focusIsOnNobody", () => {
  it("says yes for no element, the page body and the <html> element", () => {
    for (const element of [null, document.body, document.documentElement]) {
      fakeFocus(element);
      expect(focusIsOnNobody()).toBe(true);
    }
  });

  it("says no when a button has focus", () => {
    const button = document.createElement("button");
    document.body.appendChild(button);
    button.focus();
    expect(focusIsOnNobody()).toBe(false);
  });
});
