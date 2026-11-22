// @vitest-environment happy-dom
// Taps "Start a visit" in a test browser: when a start fails and the patient then picks the other
// site, the failure message must go, because it no longer describes the site on the screen.

import { StrictMode, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startVisitFromHome } from "@/data/patientVisit";
import type { PatientView } from "@/lib/patientView";
import { textFor } from "@/lib/text";
import { StartVisit } from "./StartVisit";

// The start save, the saved phone token, the site pause switch and the router are replaced, so each test controls them.
// The saved visit on this phone: null (none) unless a test sets it.
let savedNow: PatientView | null = null;
vi.mock("@/data/patientVisit", () => ({ startVisitFromHome: vi.fn(), usePatientView: () => savedNow }));
vi.mock("@/data/savedToken", () => ({ loadSavedToken: () => null }));
// The pause switch value each test sets; the mock reads it on every render.
let pausesNow: { A: boolean; B: boolean } = { A: false, B: false };
vi.mock("@/data/sitePauses", () => ({ useSitePauses: () => ({ pauses: pausesNow }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));

// Tells React that this file runs its updates inside act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const s = textFor("en").start;

let container: HTMLDivElement;
let root: Root;

const show = () => act(() => root.render(<StartVisit language="en" />));
const startButton = () => [...container.querySelectorAll("button")].find((b) => b.textContent === s.startButton);
// The site radio buttons, in order: Demo Site A, then Demo Site B.
const siteRadios = () => [...container.querySelectorAll<HTMLInputElement>('input[name="site"]')];
const alertBox = () => container.querySelector('[role="alert"]');

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  pausesNow = { A: false, B: false };
  savedNow = null;
  vi.mocked(startVisitFromHome).mockReset().mockResolvedValue("saved");
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("StartVisit start problem", () => {
  it("clears the start problem when the patient picks the other site", async () => {
    vi.mocked(startVisitFromHome).mockResolvedValueOnce("not_saved");
    show();
    await act(async () => startButton()?.click());
    expect(alertBox()?.textContent).toBe(s.notSaved);
    await act(async () => siteRadios()[1]?.click());
    expect(alertBox()).toBeNull();
  });

  it("shows the paused text one time when a refused start's site becomes paused", async () => {
    vi.mocked(startVisitFromHome).mockResolvedValueOnce("paused");
    show();
    await act(async () => startButton()?.click());
    expect(alertBox()?.textContent).toBe(s.paused);
    // The pause store now says site A is paused; the screen re-renders with that value.
    pausesNow = { A: true, B: false };
    show();
    const pausedTexts = [...container.querySelectorAll("*")].filter((el) => el.textContent === s.paused);
    expect(pausedTexts).toHaveLength(1);
  });

  it("locks the site radios while a start is saving", async () => {
    let finishStart: (result: "not_saved") => void = () => {};
    vi.mocked(startVisitFromHome).mockReturnValueOnce(
      new Promise((resolve) => {
        finishStart = resolve;
      }),
    );
    show();
    act(() => startButton()?.click());
    // A radio is locked when it is disabled itself or sits in a disabled fieldset.
    const locked = (radio: HTMLInputElement) => radio.disabled || radio.closest("fieldset")?.disabled === true;
    expect(siteRadios().every(locked)).toBe(true);
    await act(async () => finishStart("not_saved"));
    expect(siteRadios().some(locked)).toBe(false);
  });
});

describe("StartVisit focus after 'Start a new demo visit'", () => {
  it("moves focus to the start heading when the new visit form opens (StrictMode)", () => {
    // A closed visit is saved on this phone, so the page first offers "Start a new demo visit".
    savedNow = {
      code: "ABC234",
      site: "A",
      language: "en",
      status: "called",
      placeInLine: null,
      waitLow: null,
      waitHigh: null,
      calledAt: "2026-11-16T11:58:00Z",
      lastStillHereAt: null,
      triagedAt: "2026-11-16T11:50:00Z",
      offeredAt: null,
      seen: true,
      closed: true,
      expired: false,
      surveyDone: false,
    };
    act(() => root.render(<StrictMode><StartVisit language="en" /></StrictMode>));
    const newVisit = [...container.querySelectorAll("button")].find((b) => b.textContent === s.startNew);
    if (!newVisit) throw new Error(`No button "${s.startNew}"`);
    act(() => newVisit.click());
    expect(document.activeElement).toBe(container.querySelector("#start-heading"));
  });

  it("moves focus to the start heading when both sites are paused (StrictMode)", () => {
    // A closed visit is saved, and both sites are paused, so the new visit opens the paused text.
    savedNow = {
      code: "ABC234",
      site: "A",
      language: "en",
      status: "called",
      placeInLine: null,
      waitLow: null,
      waitHigh: null,
      calledAt: "2026-11-16T11:58:00Z",
      lastStillHereAt: null,
      triagedAt: "2026-11-16T11:50:00Z",
      offeredAt: null,
      seen: true,
      closed: true,
      expired: false,
      surveyDone: false,
    };
    pausesNow = { A: true, B: true };
    act(() => root.render(<StrictMode><StartVisit language="en" /></StrictMode>));
    const newVisit = [...container.querySelectorAll("button")].find((b) => b.textContent === s.startNew);
    if (!newVisit) throw new Error(`No button "${s.startNew}"`);
    act(() => newVisit.click());
    expect(container.querySelector('[data-testid="start-paused"]')).not.toBeNull();
    expect(document.activeElement).toBe(container.querySelector("#start-heading"));
  });
});
