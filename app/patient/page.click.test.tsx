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
const { KNOWN_TOKEN, views, NOW } = vi.hoisted(() => {
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
  // Two more visits, both recalled and already seen, for the "I'm on my way" tests.
  const called: PatientView = { ...view, status: "called", placeInLine: null, calledAt: "2026-11-16T11:58:00Z", seen: true };
  const views: Record<string, PatientView> = {
    [token]: view,
    "1123456789ABCDEFGHJKMNPQRS": called,
    "2123456789ABCDEFGHJKMNPQRS": { ...called, code: "XYZ567" },
  };
  return { KNOWN_TOKEN: token, views, NOW: new Date("2026-11-16T12:00:00Z") };
});
const CALLED_A = "1123456789ABCDEFGHJKMNPQRS";
const CALLED_B = "2123456789ABCDEFGHJKMNPQRS";

vi.mock("@/data/patientVisit", () => ({
  usePatientView: (token: string | null) => (token ? (views[token] ?? null) : null),
  recordSeen: vi.fn().mockResolvedValue("saved"),
  confirmOnMyWayByToken: vi.fn().mockResolvedValue("saved"),
  recordStillHere: vi.fn().mockResolvedValue("saved"),
}));
// The clock is replaced so the "I'm still here" prompt does not depend on the real time.
vi.mock("@/components/useNow", () => ({ useNow: () => NOW }));
// The recall sound is replaced: the test browser has no sound player.
vi.mock("@/components/patient/alertSound", () => ({
  unlockSound: vi.fn().mockResolvedValue(true),
  playAlert: vi.fn().mockReturnValue(new Promise(() => {})),
  stopVibration: vi.fn(),
}));

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

describe("patient page I'm on my way reply", () => {
  const onMyWayButton = () => [...container.querySelectorAll("button")].find((b) => b.textContent === en.onMyWay);
  const notSavedAlert = () =>
    [...container.querySelectorAll('[role="alert"]')].find((a) => a.textContent === en.notSaved);

  it("shows the did-not-save alert when the save fails on the same link", async () => {
    const { confirmOnMyWayByToken } = await import("@/data/patientVisit");
    vi.mocked(confirmOnMyWayByToken).mockResolvedValueOnce("not_saved");
    openAt(`#t=${CALLED_A}`);
    await act(async () => onMyWayButton()?.click());
    expect(notSavedAlert()).toBeDefined();
  });

  // Gemini review of the Phase 5 fixes, point 3b (2026-11-21): a new link opens while the old
  // link's save is on its way. The old link's failed reply must not show on the new visit.
  it("shows no did-not-save alert on a new link when the old link's save fails later", async () => {
    const { confirmOnMyWayByToken } = await import("@/data/patientVisit");
    let reply: (result: "saved" | "not_saved") => void = () => {};
    const held = new Promise<"saved" | "not_saved">((resolve) => (reply = resolve));
    vi.mocked(confirmOnMyWayByToken).mockReturnValueOnce(held);
    vi.mocked(confirmOnMyWayByToken).mockClear();
    openAt(`#t=${CALLED_A}`);
    expect(onMyWayButton()).toBeDefined();
    act(() => onMyWayButton()?.click());
    // Proves the tap's save really started, so a pass below means the old reply was ignored.
    expect(confirmOnMyWayByToken).toHaveBeenCalledWith(CALLED_A);
    changeHashTo(`#t=${CALLED_B}`);
    expect(container.textContent).toContain("XYZ567");
    // The test browser can fire a late hashchange for the address change. Let it come first, so the
    // reply below is the last thing that happens, as on a real phone.
    await act(async () => new Promise((done) => setTimeout(done, 0)));
    await act(async () => reply("not_saved"));
    expect(notSavedAlert()).toBeUndefined();
  });
});
