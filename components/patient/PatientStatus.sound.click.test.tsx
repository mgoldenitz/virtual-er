// @vitest-environment happy-dom
// Checks the status screen and the sound box together, as app/patient/page.tsx puts them:
// one shared flag, so focus goes to the status heading when the sound box leaves with focus inside.

import { act, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PatientView } from "@/lib/patientView";
import { textFor } from "@/lib/text";
import type { VisitStatus } from "@/lib/visit";
import { playAlert, stopVibration, unlockSound } from "./alertSound";
import { PatientStatus } from "./PatientStatus";
import { SoundSwitch } from "./SoundSwitch";

// Replace the real sound player, so no real sound plays in the test.
vi.mock("./alertSound", () => ({ unlockSound: vi.fn(), playAlert: vi.fn(), stopVibration: vi.fn() }));

// Tells React that this file runs its updates inside act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const t = textFor("en");

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
  triagedAt: "2026-11-15T17:00:00Z",
  seen: true,
  closed: false,
  expired: false,
};

/** The same parts and the same shared flag as the patient page. */
function Page({ status }: { status: VisitStatus }) {
  const lostFocus = useRef(false);
  return (
    <>
      <PatientStatus view={{ ...view, status }} language="en" onOnMyWay={() => {}} sending={false} lostFocus={lostFocus} />
      {(status === "waiting" || status === "called") && (
        <SoundSwitch
          status={status}
          language="en"
          onFocusLost={() => {
            lostFocus.current = true;
          }}
        />
      )}
    </>
  );
}

let container: HTMLDivElement;
let root: Root;

const button = (words: string) => [...container.querySelectorAll("button")].find((b) => b.textContent === words);

beforeEach(() => {
  vi.mocked(unlockSound).mockReset().mockResolvedValue(true);
  // A beep that never ends, so no failed beep changes the box during the test.
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

describe("PatientStatus with the sound box", () => {
  it("moves focus to the heading when staff mark the visit arrived while focus is on Sound is on", async () => {
    act(() => root.render(<Page status="called" />));
    const turnOn = button(t.sound.turnOn);
    turnOn?.focus();
    await act(async () => turnOn?.click());
    const soundOn = container.querySelector('[data-testid="sound-on"]');
    expect(document.activeElement).toBe(soundOn);
    act(() => root.render(<Page status="arrived" />));
    const heading = container.querySelector("#status-heading");
    expect(heading?.textContent).toBe(t.patient.arrivedHeading);
    expect(document.activeElement).toBe(heading);
  });
});
