// @vitest-environment happy-dom
// Checks the patient page when the link changes while the page is open (a new #t=... or #l=... part),
// and when the phone cannot save the link's token. StrictMode runs the page's effects twice, as the dev server does.

import { StrictMode, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chooseLanguage } from "@/data/savedLanguage";
import { loadSavedToken, saveToken } from "@/data/savedToken";
import type { PatientView } from "@/lib/patientView";
import { textFor } from "@/lib/text";
import PatientPage from "./page";

// The known token and its waiting visit exist only here: the database read is replaced, so each test controls it.
const { KNOWN_TOKEN, waiting, NOW } = vi.hoisted(() => {
  const token = "0123456789ABCDEFGHJKMNPQRS";
  const view: PatientView = {
    code: "ABC234",
    site: "A",
    language: "en",
    status: "waiting",
    placeInLine: 2,
    waitLow: 20,
    waitHigh: 40,
    calledAt: null,
    lastStillHereAt: null,
    offeredAt: null,
    triagedAt: "2026-11-16T11:50:00Z",
    seen: false,
    closed: false,
    expired: false,
    surveyDone: false,
  };
  return { KNOWN_TOKEN: token, waiting: view, NOW: new Date("2026-11-16T12:00:00Z") };
});

vi.mock("@/data/patientVisit", () => ({
  usePatientView: (token: string | null) => (token === KNOWN_TOKEN ? waiting : null),
  recordSeen: vi.fn().mockResolvedValue("saved"),
  confirmOnMyWayByToken: vi.fn().mockResolvedValue("saved"),
  recordStillHere: vi.fn().mockResolvedValue("saved"),
}));
// The clock is replaced so the "I'm still here" prompt does not depend on the real time.
vi.mock("@/components/useNow", () => ({ useNow: () => NOW }));

// Tells React that this file runs its updates inside act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const en = textFor("en").patient;
const fr = textFor("fr").patient;

let container: HTMLDivElement;
let root: Root;

/** Opens the page with this address-bar part (for example "#t=..."). StrictMode runs each effect twice, as the dev server does. */
function openAt(hash: string) {
  window.history.replaceState(null, "", `/patient${hash}`);
  act(() => root.render(<StrictMode><PatientPage /></StrictMode>));
}

/** Changes only the address-bar part on the open page, then fires hashchange as the browser does. */
function changeHashTo(hash: string) {
  window.history.replaceState(null, "", `/patient${hash}`);
  act(() => {
    window.dispatchEvent(new Event("hashchange"));
  });
}

/** The text of the screen's main heading (id status-heading), or null if there is none. */
function headingText(): string | null | undefined {
  return container.querySelector("#status-heading")?.textContent;
}

beforeEach(() => {
  window.localStorage.clear();
  // The language module keeps the phone's choice in memory after its first read, so clearing storage
  // alone would not reset it. Starting each test from English here keeps one test's French from leaking.
  chooseLanguage("en");
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("patient page when the link changes", () => {
  it("shows the English broken-link heading for a link that is not a real token", () => {
    openAt("#t=NOTAREALTOKEN");
    expect(headingText()).toBe(en.brokenLinkHeading);
  });

  it("shows the French broken-link heading for a broken link that carries l=fr", () => {
    openAt("#t=NOTAREALTOKEN&l=fr");
    expect(headingText()).toBe(fr.brokenLinkHeading);
  });

  it("shows the French no-visit heading when a broken link is followed by a language-only link", () => {
    openAt("#t=NOTAREALTOKEN");
    expect(headingText()).toBe(en.brokenLinkHeading);
    changeHashTo("#l=fr");
    expect(headingText()).toBe(fr.noVisitHeading);
    expect(headingText()).not.toBe(fr.brokenLinkHeading);
  });

  it("shows the English broken-link heading and forgets the saved token when a broken link replaces a visit", () => {
    saveToken(KNOWN_TOKEN);
    openAt("");
    expect(headingText()).toBe(en.waitingHeading);
    changeHashTo("#t=NOTAREALTOKEN");
    expect(headingText()).toBe(en.brokenLinkHeading);
    expect(loadSavedToken()).toBeNull();
  });

  it("shows the visit when the phone cannot save the link's token", () => {
    const blocked = vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });
    try {
      openAt(`#t=${KNOWN_TOKEN}`);
      // Proves the block really ran, so a pass below means the app coped with it.
      expect(blocked).toHaveBeenCalled();
      expect(headingText()).toBe(en.waitingHeading);
      expect(headingText()).not.toBe(en.noVisitHeading);
    } finally {
      blocked.mockRestore();
    }
  });
});
