import { describe, expect, it } from "vitest";
import { isAllowedMove } from "./allowedSteps";
import { placeInLine } from "./queue";
import { stillHereState } from "./stillHere";
import { SWITCH_TO_OFFSITE_HOURS, canSwitchToOffsite, switchToOffsite, waitingOnSite } from "./switchToOffsite";
import { checkInAtDesk, checkInHomeVisit, startFromHome } from "./visitActions";

const t0 = new Date("2026-11-09T20:00:00Z");
const at = (min: number) => new Date(t0.getTime() + min * 60_000);
const desk = (id: string, outcome: "waiting" | "declined" | "not_eligible", min = 0, site: "A" | "B" = "A") =>
  checkInAtDesk({ id, code: id, access_token: id, site, ctas_level: 5, language: "fr" }, outcome, at(min));

describe("switch a declined patient to off-site waiting", () => {
  it("moves a declined visit to waiting and reopens it", () => {
    const declined = desk("d", "declined");
    const switched = switchToOffsite(declined, at(40))!;
    expect(switched.status).toBe("waiting");
    expect(switched.closed_at).toBeNull();
    expect(isAllowedMove(declined.status, switched.status)).toBe(true);
  });

  it("keeps the triage time, CTAS level, language and offer time", () => {
    const declined = desk("d", "declined");
    const switched = switchToOffsite(declined, at(40))!;
    expect(switched.triaged_at).toBe(declined.triaged_at);
    expect(switched.ctas_level).toBe(5);
    expect(switched.language).toBe("fr");
    expect(switched.offered_at).toBe(declined.offered_at);
  });

  it("keeps the place in line from the original triage time", () => {
    const declined = desk("d", "declined", 0);
    const later = desk("w", "waiting", 10);
    const switched = switchToOffsite(declined, at(40))!;
    expect(placeInLine([later, switched], switched)).toBe(1);
    expect(placeInLine([later, switched], later)).toBe(2);
  });

  it("starts the I'm still here clock at the switch, so the prompt is not already missed", () => {
    const declined = desk("d", "declined");
    const switched = switchToOffsite(declined, at(90))!;
    expect(switched.last_still_here_at).toBe(at(90).toISOString());
    expect(stillHereState({ status: switched.status, triagedAt: switched.triaged_at, lastStillHereAt: switched.last_still_here_at }, at(91))).toBe("not_due");
  });

  it("works for a visit started from home that was declined at triage", () => {
    const home = startFromHome({ id: "h", code: "h", access_token: "h", site: "A", language: "en" }, t0);
    const declined = checkInHomeVisit(home, { ctas_level: 4, language: "en" }, "declined", at(5))!;
    expect(switchToOffsite(declined, at(20))?.status).toBe("waiting");
  });

  it("refuses every other status", () => {
    expect(switchToOffsite(desk("n", "not_eligible"), at(1))).toBeNull();
    expect(switchToOffsite(desk("w", "waiting"), at(1))).toBeNull();
    const home = startFromHome({ id: "h", code: "h", access_token: "h", site: "A", language: "en" }, t0);
    expect(switchToOffsite(home, at(1))).toBeNull();
  });

  it(`refuses a visit declined ${SWITCH_TO_OFFSITE_HOURS} hours ago or more`, () => {
    const declined = desk("d", "declined");
    expect(canSwitchToOffsite(declined, at(SWITCH_TO_OFFSITE_HOURS * 60 - 1))).toBe(true);
    expect(canSwitchToOffsite(declined, at(SWITCH_TO_OFFSITE_HOURS * 60))).toBe(false);
    expect(switchToOffsite(declined, at(SWITCH_TO_OFFSITE_HOURS * 60))).toBeNull();
  });
});

describe("waiting on-site list", () => {
  it("lists declined visits at the site that can still switch, oldest triage first", () => {
    const visits = [
      desk("b", "declined", 20),
      desk("a", "declined", 5),
      desk("other-site", "declined", 1, "B"),
      desk("n", "not_eligible", 2),
      desk("w", "waiting", 3),
      desk("old", "declined", -SWITCH_TO_OFFSITE_HOURS * 60),
    ];
    expect(waitingOnSite(visits, "A", at(30)).map((v) => v.id)).toEqual(["a", "b"]);
  });
});
