// @vitest-environment happy-dom
// Draws the staff page in a test browser (happy-dom): when another staff screen takes a patient off
// the list while a button in that row has focus, focus goes to the list heading, so it is not lost.

import { StrictMode, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { checkInAtDesk } from "@/lib/visitActions";
import type { Visit } from "@/lib/visit";
import StaffPage from "./page";

const now = new Date("2026-11-18T20:00:00Z");
/** The list the page reads; the test changes it, as a realtime update does. */
let visits: Visit[] = [];

vi.mock("@/data/useVisits", () => ({ useVisits: () => ({ visits, outOfDate: false }) }));
vi.mock("@/components/useNow", () => ({ useNow: () => now }));
vi.mock("@/data/sitePauses", () => ({ useSitePauses: () => ({ pauses: { A: false, B: false }, failed: false }) }));
vi.mock("@/data/staffActions", () => ({
  callBackVisit: vi.fn(),
  issueNewVisitLink: vi.fn(),
  markVisitArrived: vi.fn(),
  removeVisit: vi.fn(),
  reloadVisits: vi.fn(),
  switchVisitToOffsite: vi.fn(),
  undoSwitchVisit: vi.fn(),
  confirmUnableToReachFor: vi.fn(),
  recordPhoneCallFor: vi.fn(),
}));
// The other parts of the page are not part of this test, and some of them read the database.
vi.mock("@/components/staff/StaffShell", () => ({ StaffShell: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/components/staff/CheckInPanel", () => ({ CheckInPanel: () => null }));
vi.mock("@/components/staff/ClearDemoData", () => ({ ClearDemoData: () => null }));
vi.mock("@/components/staff/ExpectedArrivals", () => ({ ExpectedArrivals: () => null }));
vi.mock("@/components/staff/PauseSwitch", () => ({ PauseSwitch: () => null }));
vi.mock("@/components/staff/ProgressAnnouncer", () => ({ ProgressAnnouncer: () => null }));
// A stand-in button that sends one status message, so a test can make the status line show text.
vi.mock("@/components/staff/RecallAllPanel", () => ({
  RecallAllPanel: ({ onResult }: { onResult: (message: string, closed: boolean) => void }) => (
    <button type="button" onClick={() => onResult("Test message", false)}>
      Send test message
    </button>
  ),
}));
vi.mock("@/components/staff/RecentlyClosed", () => ({ RecentlyClosed: () => null }));
vi.mock("@/components/staff/SignOutButton", () => ({ SignOutButton: () => null }));
vi.mock("@/components/staff/VisitSlip", () => ({ VisitSlip: () => null }));
vi.mock("@/components/staff/WaitingOnSite", () => ({ WaitingOnSite: () => null }));

// Tells React that this file runs its updates inside act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const visit = (id: string, code: string, minutesAgo: number) =>
  checkInAtDesk({ id, code, access_token: `T${id}`, site: "A", ctas_level: 4, language: "en" }, "waiting", new Date(now.getTime() - minutesAgo * 60_000));
const first = visit("v1", "ABC234", 40);
const second = visit("v2", "DEF567", 30);

let container: HTMLDivElement;
let root: Root;

/** Draws the page with this list, in StrictMode, which runs each effect twice, as the dev server does. */
const draw = (list: Visit[]) => {
  visits = list;
  act(() => root.render(<StrictMode><StaffPage /></StrictMode>));
};

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  draw([first, second]);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

it("when another screen takes a patient off the list with focus in that row, focus goes to the list heading", () => {
  const row = [...container.querySelectorAll("li")].find((li) => li.textContent?.includes("ABC234"));
  const markArrived = [...(row?.querySelectorAll("button") ?? [])].find((b) => b.textContent?.startsWith("Mark arrived"));
  if (!markArrived) throw new Error('No "Mark arrived" button in the first row');
  markArrived.focus();
  draw([second]);
  expect(document.activeElement).toBe(document.getElementById("list-heading"));
});

/** The live status line in the same row as the list heading. */
const statusLine = () => document.getElementById("list-heading")?.parentElement?.querySelector('[role="status"]');

it("puts the empty status line beside the list heading, with no child and no class that hides it", () => {
  const status = statusLine();
  expect(status).toBeTruthy();
  expect(status?.childElementCount).toBe(0);
  expect(status?.classList.contains("sr-only")).toBe(false);
});

it("shows a message in the same status line, and the line keeps its class (screen readers hear the change)", () => {
  const status = statusLine();
  const classBefore = status?.className;
  const send = [...container.querySelectorAll("button")].find((b) => b.textContent === "Send test message");
  if (!send) throw new Error('No "Send test message" button');
  act(() => send.click());
  expect(statusLine()).toBe(status);
  expect(statusLine()?.className).toBe(classBefore);
  expect(statusLine()?.querySelector("p")?.textContent).toBe("Test message");
});
