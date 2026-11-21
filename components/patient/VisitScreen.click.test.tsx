// @vitest-environment happy-dom
// Checks VisitScreen when the whole screen changes: the visit goes away (a new link was issued, or
// the visit could not be read) while focus is on its heading. Focus must go to the new heading.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PatientView } from "@/lib/patientView";
import { textFor } from "@/lib/text";
import { playAlert, stopVibration, unlockSound } from "./alertSound";
import { VisitScreen } from "./VisitScreen";

// The tap's save, the clock and the sound player are replaced, so each test controls them.
vi.mock("@/data/patientVisit", () => ({ recordStillHere: vi.fn().mockResolvedValue("saved") }));
const NOW = new Date("2026-11-16T12:00:00Z");
vi.mock("@/components/useNow", () => ({ useNow: () => NOW }));
vi.mock("./alertSound", () => ({ unlockSound: vi.fn(), playAlert: vi.fn(), stopVibration: vi.fn() }));

// Tells React that this file runs its updates inside act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const p = textFor("en").patient;

// Triaged 10 minutes ago, so the "I'm still here" prompt is not due yet.
const waiting: PatientView = {
  code: "ABC234",
  site: "A",
  language: "en",
  status: "waiting",
  placeInLine: 2,
  waitLow: 20,
  waitHigh: 40,
  calledAt: null,
  lastStillHereAt: null,
  triagedAt: "2026-11-16T11:50:00Z",
  seen: false,
  closed: false,
  expired: false,
  surveyDone: false,
};

let container: HTMLDivElement;
let root: Root;

const show = (result: PatientView | null | "unavailable" | undefined, linkFailed = false, loading = false) =>
  act(() =>
    root.render(
      <VisitScreen
        loading={loading}
        result={result}
        linkFailed={linkFailed}
        token="t"
        language="en"
        onOnMyWay={() => {}}
        sending={false}
        online
        notSaved={false}
      />,
    ),
  );

/** Shows the waiting visit and puts focus on its heading. */
function focusOnWaitingHeading() {
  show(waiting);
  const heading = container.querySelector<HTMLElement>("#status-heading");
  expect(heading?.textContent).toBe(p.waitingHeading);
  heading?.focus();
  expect(document.activeElement).toBe(heading);
}

beforeEach(() => {
  vi.mocked(unlockSound).mockReset().mockResolvedValue(true);
  vi.mocked(playAlert).mockReset().mockReturnValue(new Promise(() => {}));
  vi.mocked(stopVibration).mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("VisitScreen when the whole screen changes", () => {
  it("moves focus to the broken-link heading when the link stops working", () => {
    focusOnWaitingHeading();
    show(null, true);
    const heading = container.querySelector("#status-heading");
    expect(heading?.textContent).toBe(p.brokenLinkHeading);
    expect(document.activeElement).toBe(heading);
  });

  it("moves focus to the could-not-load heading when the visit can no longer be read", () => {
    focusOnWaitingHeading();
    show("unavailable");
    const heading = container.querySelector("#status-heading");
    expect(heading?.textContent).toBe(p.unavailableHeading);
    expect(document.activeElement).toBe(heading);
  });

  it("moves focus to the broken-link heading when focus was on I'm on my way", () => {
    show({ ...waiting, status: "called", placeInLine: null, calledAt: "2026-11-16T12:00:00Z" });
    const onMyWay = [...container.querySelectorAll("button")].find((b) => b.textContent === p.onMyWay);
    expect(onMyWay).toBeDefined();
    onMyWay?.focus();
    show(null, true);
    const heading = container.querySelector("#status-heading");
    expect(heading?.textContent).toBe(p.brokenLinkHeading);
    expect(document.activeElement).toBe(heading);
  });

  it("ends with focus on the visit heading after a new link in the same tab (visit, loading, visit)", () => {
    focusOnWaitingHeading();
    show(undefined, false, true);
    show(waiting);
    const heading = container.querySelector("#status-heading");
    expect(heading?.textContent).toBe(p.waitingHeading);
    expect(document.activeElement).toBe(heading);
  });

  it("shows the replaced-link message, with focus on its heading, when staff made a new link", () => {
    focusOnWaitingHeading();
    act(() =>
      root.render(
        <VisitScreen
          loading={false}
          result={null}
          linkFailed
          linkReplaced
          token="t"
          language="en"
          onOnMyWay={() => {}}
          sending={false}
          online
          notSaved={false}
        />,
      ),
    );
    const heading = container.querySelector("#status-heading");
    expect(heading?.textContent).toBe(p.replacedLinkHeading);
    expect(container.textContent).toContain(p.replacedLinkText);
    expect(container.textContent).not.toContain(p.brokenLinkText);
    expect(document.activeElement).toBe(heading);
  });
});

describe("VisitScreen help on the no-visit, broken-link and replaced-link screens", () => {
  /** Shows a screen with no visit. */
  const showNone = (linkFailed: boolean, linkReplaced: boolean) =>
    act(() =>
      root.render(
        <VisitScreen
          loading={false}
          result={null}
          linkFailed={linkFailed}
          linkReplaced={linkReplaced}
          token="t"
          language="en"
          onOnMyWay={() => {}}
          sending={false}
          online
          notSaved={false}
        />,
      ),
    );
  const startLink = () => container.querySelector<HTMLAnchorElement>('a[href="/"]');

  it("has no slip help and no start-page link when the link was replaced", () => {
    showNone(true, true);
    expect(container.textContent).not.toContain(p.findVisitHelp);
    expect(startLink()).toBeNull();
  });

  it("links to the start page when there is no visit", () => {
    showNone(false, false);
    expect(container.textContent).toContain(p.findVisitHelp);
    expect(startLink()?.textContent).toBe(p.expiredNewVisit);
  });

  it("links to the start page when the link is broken", () => {
    showNone(true, false);
    expect(container.textContent).toContain(p.findVisitHelp);
    expect(startLink()?.textContent).toBe(p.expiredNewVisit);
  });
});
