// @vitest-environment happy-dom
// Checks that screen readers hear the move into the off-site line, and the move to waiting
// inside the hospital (declined or not eligible), in the polite region.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { textFor } from "@/lib/text";
import type { VisitStatus } from "@/lib/visit";
import { StatusAnnouncer } from "./StatusAnnouncer";

// Tells React that this file runs its updates inside act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const a = textFor("en").announce;

let container: HTMLDivElement;
let root: Root;

const show = (status: VisitStatus) => act(() => root.render(<StatusAnnouncer status={status} language="en" />));
/** Shows the announcer with a language and the expired flag as well as the status. */
const draw = (status: VisitStatus, language: string, expired: boolean) =>
  act(() => root.render(<StatusAnnouncer status={status} language={language} expired={expired} />));
const polite = () => container.querySelector('[aria-live="polite"]')?.textContent;

/** Shows the first status, changes to the second, and gives back what the polite region says after the pause. */
async function heardAfter(from: VisitStatus, to: VisitStatus) {
  show(from);
  show(to);
  await act(async () => vi.advanceTimersByTimeAsync(300));
  return polite();
}

beforeEach(() => {
  vi.useFakeTimers();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

describe("StatusAnnouncer", () => {
  it("announces the move into the off-site line", async () => {
    expect(await heardAfter("pre_arrival", "waiting")).toBe(a.waiting);
  });

  it("announces waiting inside the hospital after a declined offer", async () => {
    expect(await heardAfter("pre_arrival", "declined")).toBe(a.onsite);
  });

  it("announces waiting inside the hospital when the visit is not eligible", async () => {
    expect(await heardAfter("pre_arrival", "not_eligible")).toBe(a.onsite);
  });

  it("says nothing for the status already on screen when the page opens", async () => {
    show("waiting");
    await act(async () => vi.advanceTimersByTimeAsync(300));
    expect(polite()).toBe("");
  });

  it("announces when the visit expires", async () => {
    draw("pre_arrival", "en", false);
    draw("pre_arrival", "en", true);
    await act(async () => vi.advanceTimersByTimeAsync(300));
    expect(polite()).toBe(a.expired);
  });

  it("does not say the last status again after a language change", async () => {
    expect(await heardAfter("pre_arrival", "waiting")).toBe(a.waiting);
    draw("waiting", "fr", false);
    await act(async () => vi.advanceTimersByTimeAsync(300));
    expect(polite()).toBe(a.waiting);
  });
});
