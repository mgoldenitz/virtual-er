import { describe, expect, it } from "vitest";
import { startProblemShows, type StartProblem } from "./startProblem";

describe("startProblemShows", () => {
  it("shows nothing when there is no problem", () => {
    expect(startProblemShows(null, false)).toBe(false);
    expect(startProblemShows(null, true)).toBe(false);
  });

  it("hides a paused refusal when the chosen site is paused, because the paused box already says it", () => {
    expect(startProblemShows("paused", true)).toBe(false);
  });

  it("shows a paused refusal when the chosen site is not paused in the pause store", () => {
    expect(startProblemShows("paused", false)).toBe(true);
  });

  it("shows busy and not-saved problems even when the chosen site is paused", () => {
    const others: StartProblem[] = ["busy", "not_saved"];
    for (const problem of others) {
      expect(startProblemShows(problem, true)).toBe(true);
    }
  });

  it("shows busy and not-saved problems when the site is not paused", () => {
    expect(startProblemShows("busy", false)).toBe(true);
    expect(startProblemShows("not_saved", false)).toBe(true);
  });
});
