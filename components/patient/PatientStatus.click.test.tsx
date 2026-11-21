// @vitest-environment happy-dom
// Checks that focus goes to the status heading when "I'm on my way" leaves the called screen
// (after the tap is confirmed, or when staff change the status).

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PatientView } from "@/lib/patientView";
import { textFor } from "@/lib/text";
import type { VisitStatus } from "@/lib/visit";
import { PatientStatus } from "./PatientStatus";

// Tells React that this file runs its updates inside act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const p = textFor("en").patient;

const view: PatientView = {
  code: "ABC234",
  site: "A",
  language: "en",
  status: "called",
  placeInLine: null,
  waitLow: null,
  waitHigh: null,
  calledAt: "2026-11-15T18:00:00Z",
  lastStillHereAt: null,
  offeredAt: null,
  triagedAt: "2026-11-15T17:00:00Z",
  seen: true,
  closed: false,
  expired: false,
  surveyDone: false,
};

let container: HTMLDivElement;
let root: Root;

const show = (status: VisitStatus) =>
  act(() => root.render(<PatientStatus view={{ ...view, status }} language="en" onOnMyWay={() => {}} sending={false} />));
const button = (words: string) => [...container.querySelectorAll("button")].find((b) => b.textContent === words);
const heading = () => container.querySelector("#status-heading");

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("PatientStatus focus", () => {
  it("moves focus to the heading when I'm on my way is confirmed", () => {
    show("called");
    button(p.onMyWay)?.focus();
    show("on_the_way");
    expect(document.activeElement).toBe(heading());
  });

  it("moves focus to the heading when staff mark the visit arrived", () => {
    show("called");
    button(p.onMyWay)?.focus();
    show("arrived");
    expect(document.activeElement).toBe(heading());
  });

  it("moves focus to the new heading when the old heading had focus and staff mark the visit arrived", () => {
    show("called");
    button(p.onMyWay)?.focus();
    show("on_the_way");
    // Focus is now on the heading of the called screen. That heading leaves when the screen changes.
    expect(document.activeElement).toBe(heading());
    show("arrived");
    expect(heading()?.textContent).toBe(p.arrivedHeading);
    expect(document.activeElement).toBe(heading());
  });

  it("moves focus to the heading when the sound box below leaves with focus inside", () => {
    const lost = { current: false };
    act(() =>
      root.render(<PatientStatus view={view} language="en" onOnMyWay={() => {}} sending={false} lostFocus={lost} />),
    );
    // The page sets this flag when the sound box leaves with focus inside (see SoundSwitch).
    lost.current = true;
    (document.activeElement as HTMLElement | null)?.blur();
    act(() =>
      root.render(
        <PatientStatus view={{ ...view, status: "arrived" }} language="en" onOnMyWay={() => {}} sending={false} lostFocus={lost} />,
      ),
    );
    expect(document.activeElement).toBe(heading());
  });

  it("moves focus to the heading in the same change when a part leaves with focus but the status stays", () => {
    const lost = { current: false };
    const render = (sending: boolean) =>
      act(() =>
        root.render(<PatientStatus view={view} language="en" onOnMyWay={() => {}} sending={sending} lostFocus={lost} />),
      );
    render(false);
    // A part below left with focus inside it, in a change that keeps the status at called.
    lost.current = true;
    (document.activeElement as HTMLElement | null)?.blur();
    render(true);
    // The report is used now, not kept for a later status change.
    expect(lost.current).toBe(false);
    expect(document.activeElement).toBe(heading());
  });
});
