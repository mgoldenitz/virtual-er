// Checks when the patient screen's "not saved" alert shows (lib/notSavedAlert.ts).

import { describe, expect, it } from "vitest";
import { notSavedAlertShows } from "./notSavedAlert";

describe("notSavedAlertShows", () => {
  it("shows while the visit is still in the status where the save failed", () => {
    expect(notSavedAlertShows("called", "called")).toBe(true);
  });

  it("hides once the visit has moved on to another status", () => {
    expect(notSavedAlertShows("waiting", "called")).toBe(false);
  });

  it("stays hidden once the visit has left that status, also if it comes back to it", () => {
    expect(notSavedAlertShows("gone", "called")).toBe(false);
  });

  it("hides when no save failed", () => {
    expect(notSavedAlertShows(null, "waiting")).toBe(false);
  });

  it("hides when there is no visit to show", () => {
    expect(notSavedAlertShows("waiting", undefined)).toBe(false);
  });
});
