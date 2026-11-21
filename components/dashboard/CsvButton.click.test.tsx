// @vitest-environment happy-dom
// Presses the CSV download button in a test browser (happy-dom) and checks the file name and the text in the file.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CSV_HEADER } from "@/lib/dashboardCsv";
import { trendNumbers, type TrendDay } from "@/lib/trendNumbers";
import { CsvButton } from "./CsvButton";

// Tells React that this file runs its updates inside act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// The 7 days before 2026-11-25, with one offer on 2026-11-22 for site B (a stats row would do the same).
const empty = trendNumbers([], [], "2026-11-25", false);
const withData: TrendDay[] = empty.map((d) =>
  d.day === "2026-11-22" ? { day: d.day, numbers: { A: d.numbers.A, B: { ...d.numbers.B, offered: 2 } } } : d,
);

let container: HTMLDivElement;
let root: Root;
let blobs: Blob[];
let clickedNames: string[];

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  blobs = [];
  clickedNames = [];
  // happy-dom cannot save a file, so the test keeps the file and the name the button asks for.
  vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
    blobs.push(blob as Blob);
    return "blob:test";
  });
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    clickedNames.push(this.download);
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

const button = () => container.querySelector("button");

describe("CsvButton", () => {
  it("downloads the CSV with the mode and today's date in the file name", async () => {
    act(() => root.render(<CsvButton trend={withData} today="2026-11-25" isDemo={false} />));
    expect(button()?.textContent).toBe("Download past 7 days (CSV)");
    await act(async () => button()?.click());
    expect(clickedNames).toEqual(["virtual-er-stats-real-2026-11-25.csv"]);
    const text = await blobs[0].text();
    expect(text.startsWith(`${CSV_HEADER}\r\n`)).toBe(true);
    expect(text).toContain("2026-11-22,B,false,0,2,");
  });

  it("says demo in the file name and in the is_demo column in Demo mode", async () => {
    act(() => root.render(<CsvButton trend={withData} today="2026-11-25" isDemo={true} />));
    await act(async () => button()?.click());
    expect(clickedNames).toEqual(["virtual-er-stats-demo-2026-11-25.csv"]);
    expect(await blobs[0].text()).toContain("2026-11-22,B,true,");
  });

  // Some browsers stop the download when the file link is taken back at once (Gemini review 2026-11-21).
  it("takes the file link back only after a wait, not at the click", async () => {
    vi.useFakeTimers();
    try {
      act(() => root.render(<CsvButton trend={withData} today="2026-11-25" isDemo={false} />));
      await act(async () => button()?.click());
      expect(URL.revokeObjectURL).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(1000));
      expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test");
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows a line instead of the button when no past day has a number", () => {
    act(() => root.render(<CsvButton trend={empty} today="2026-11-25" isDemo={false} />));
    expect(button()).toBeNull();
    expect(container.textContent).toBe("No past days to download yet.");
  });
});
