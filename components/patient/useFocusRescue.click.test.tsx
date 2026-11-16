// @vitest-environment happy-dom
// Checks that focus goes to the heading when a focused part leaves the page, and that focus
// somewhere else (another button, or the page body after a phone tap) does not move.

import { act, useRef, type RefObject } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useReportFocusOnLeave, useRescueFocus } from "./useFocusRescue";

// Tells React that this file runs its updates inside act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Part({ lostRef }: { lostRef: RefObject<boolean> }) {
  const ref = useRef<HTMLDivElement>(null);
  useReportFocusOnLeave(ref, () => {
    lostRef.current = true;
  });
  return (
    <div ref={ref}>
      <button>Leaves</button>
    </div>
  );
}

function Screen({ show, lost }: { show: boolean; lost: RefObject<boolean> }) {
  useRescueFocus("status-heading", lost);
  return (
    <>
      <h2 id="status-heading" tabIndex={-1}>
        Heading
      </h2>
      <button>Stays</button>
      {show && <Part lostRef={lost} />}
    </>
  );
}

let container: HTMLDivElement;
let root: Root;
const lost = { current: false };

const show = (visible: boolean) => act(() => root.render(<Screen show={visible} lost={lost} />));
const button = (words: string) => [...container.querySelectorAll("button")].find((b) => b.textContent === words);
const heading = () => container.querySelector("#status-heading");

beforeEach(() => {
  lost.current = false;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("focus rescue", () => {
  it("moves focus to the heading when the focused part leaves the page", () => {
    show(true);
    button("Leaves")?.focus();
    show(false);
    expect(document.activeElement).toBe(heading());
  });

  it("leaves focus on another button when a part without focus leaves the page", () => {
    show(true);
    button("Stays")?.focus();
    show(false);
    expect(document.activeElement).toBe(button("Stays"));
  });

  it("leaves focus on the page body after a phone tap, so the page does not scroll", () => {
    show(true);
    (document.activeElement as HTMLElement | null)?.blur();
    show(false);
    expect(document.activeElement).toBe(document.body);
  });
});
