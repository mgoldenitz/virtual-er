// @vitest-environment happy-dom
// Presses "Recall patient" on a staff row in a test browser (happy-dom): it saves only after "Yes",
// and focus then moves to the progress line, because the "Recall patient" button leaves the page.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callBackVisit } from "@/data/staffActions";
import { checkInAtDesk } from "@/lib/visitActions";
import { VisitRow } from "./VisitRow";

// The save is replaced, so the test controls what it returns.
vi.mock("@/data/staffActions", () => ({
  callBackVisit: vi.fn(),
  issueNewVisitLink: vi.fn(),
  markVisitArrived: vi.fn(),
  removeVisit: vi.fn(),
}));

// Tells React that this file runs its updates inside act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const now = new Date("2026-11-18T20:00:00Z");
const input = { id: "v1", code: "ABC234", access_token: "TOKEN", site: "A" as const, ctas_level: 4 as const, language: "en" };
const waiting = checkInAtDesk(input, "waiting", new Date(now.getTime() - 30 * 60_000));

let container: HTMLDivElement;
let root: Root;

const button = (words: string) => [...container.querySelectorAll("button")].find((b) => b.textContent?.startsWith(words));

async function press(words: string) {
  const target = button(words);
  if (!target) throw new Error(`No button "${words}"`);
  target.focus();
  await act(async () => target.click());
}

beforeEach(() => {
  vi.mocked(callBackVisit).mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<VisitRow visit={waiting} now={now} onShowSlip={vi.fn()} onLeftList={vi.fn()} />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("VisitRow recall", () => {
  it("saves nothing on the first tap", async () => {
    await press("Recall patient");
    expect(callBackVisit).not.toHaveBeenCalled();
  });

  it("after Yes and a save, moves focus to the progress line", async () => {
    vi.mocked(callBackVisit).mockResolvedValue("saved");
    await press("Recall patient");
    await press("Yes, recall patient");
    expect(callBackVisit).toHaveBeenCalledWith("v1");
    expect(document.activeElement).toBe(container.querySelector('[data-testid="progress"]'));
  });

  it("after Yes and a failed save, shows the not-saved note and keeps the progress line out of focus", async () => {
    vi.mocked(callBackVisit).mockResolvedValue("not_saved");
    await press("Recall patient");
    await press("Yes, recall patient");
    expect(container.textContent).toContain("Not saved");
    expect(document.activeElement).not.toBe(container.querySelector('[data-testid="progress"]'));
  });
});
