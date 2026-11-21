// @vitest-environment happy-dom
// Taps "Start a visit" in a test browser: when a start fails and the patient then picks the other
// site, the failure message must go, because it no longer describes the site on the screen.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startVisitFromHome } from "@/data/patientVisit";
import { textFor } from "@/lib/text";
import { StartVisit } from "./StartVisit";

// The start save, the saved phone token, the site pause switch and the router are replaced, so each test controls them.
vi.mock("@/data/patientVisit", () => ({ startVisitFromHome: vi.fn(), usePatientView: () => null }));
vi.mock("@/data/savedToken", () => ({ loadSavedToken: () => null }));
vi.mock("@/data/sitePauses", () => ({ useSitePauses: () => ({ pauses: { A: false, B: false } }) }));
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
});
