import { describe, expect, it } from "vitest";
import { homeCheckInProblem } from "./homeCheckIn";
import { callBack, checkInHomeVisit, confirmUnableToReach, reopenUnableToReach, startFromHome } from "./visitActions";

const t0 = new Date("2026-11-09T20:00:00Z");
const at = (min: number) => new Date(t0.getTime() + min * 60_000);
const home = startFromHome({ id: "h", code: "HOME23", access_token: "tok", site: "A", language: "en" }, t0);

describe("home check-in problems", () => {
  it("has none while the visit is still expected", () => {
    expect(homeCheckInProblem(home, home, at(10))).toBeNull();
  });

  it("says when another screen already checked it in, with its status", () => {
    const done = checkInHomeVisit(home, { ctas_level: 5, language: "en" }, "declined", at(5))!;
    expect(homeCheckInProblem(home, done, at(10))).toBe(
      "Visit HOME23 was already processed on another screen. Current status: offered, declined. No additional check-in was saved.",
    );
  });

  it("says when it expired while the form was open", () => {
    expect(homeCheckInProblem(home, home, at(360))).toContain("no longer expected");
  });

  it("says when it is gone", () => {
    expect(homeCheckInProblem(home, null, at(10))).toContain("no longer on this screen");
  });

  it("has none for a reopened visit back for reassessment, however old", () => {
    const waiting = checkInHomeVisit(home, { ctas_level: 4, language: "en" }, "waiting", at(5))!;
    const lost = confirmUnableToReach(callBack(waiting, at(10))!, at(40))!;
    const reopened = reopenUnableToReach(lost)!;
    expect(homeCheckInProblem(lost, reopened, at(60 * 8))).toBeNull();
  });
});
