import { describe, expect, it } from "vitest";
import { isAllowedMove } from "./allowedSteps";
import { placeInLine } from "./queue";
import { stillHereState } from "./stillHere";
import {
  SWITCH_TO_OFFSITE_HOURS,
  canSwitchToOffsite,
  canUndoSwitch,
  placeIfSwitched,
  switchToOffsite,
  switchedAt,
  undoSwitch,
  waitingOnSite,
} from "./switchToOffsite";
import { callBack, checkInAtDesk, checkInHomeVisit, startFromHome } from "./visitActions";

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

  it("keeps the triage time, CTAS level and language, and moves the offer time to the switch", () => {
    const declined = desk("d", "declined");
    const switched = switchToOffsite(declined, at(40))!;
    expect(switched.triaged_at).toBe(declined.triaged_at);
    expect(switched.ctas_level).toBe(5);
    expect(switched.language).toBe("fr");
    expect(switched.offered_at).toBe(at(40).toISOString());
  });

  it("saves the language chosen at the switch", () => {
    expect(switchToOffsite(desk("d", "declined"), at(40), "ur")?.language).toBe("ur");
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

  it("sorts by the moment, not the time text", () => {
    const a = { ...desk("a", "declined"), triaged_at: "2026-11-09T20:00:00.82+00:00" };
    const b = { ...desk("b", "declined"), triaged_at: "2026-11-09T20:00:00.82226+00:00" };
    expect(waitingOnSite([b, a], "A", at(30)).map((v) => v.id)).toEqual(["a", "b"]);
  });
});

describe("place in line after a switch", () => {
  it("gives the place the patient would get, counting only patients waiting at the site", () => {
    const declined = desk("d", "declined", 5);
    const visits = [desk("w1", "waiting", 0), desk("w2", "waiting", 10), desk("x", "waiting", 1, "B"), declined];
    expect(placeIfSwitched(visits, declined, at(30))).toBe(2);
  });

  it("is null when the visit cannot switch", () => {
    const old = desk("d", "declined");
    expect(placeIfSwitched([old], old, at(SWITCH_TO_OFFSITE_HOURS * 60))).toBeNull();
  });
});

describe("switched label and undo", () => {
  it("tells a switch from a tap", () => {
    const switched = switchToOffsite(desk("d", "declined"), at(40))!;
    expect(switchedAt(switched)).toBe(at(40).toISOString());
    expect(switchedAt({ ...switched, last_still_here_at: at(50).toISOString() })).toBeNull();
  });

  it("never calls a normal check-in a switch", () => {
    const waiting = desk("w", "waiting");
    expect(switchedAt(waiting)).toBeNull();
    expect(switchedAt({ ...waiting, last_still_here_at: waiting.offered_at })).toBeNull();
    expect(canUndoSwitch(waiting)).toBe(false);
  });

  it("undoes a switch back to declined until the patient is recalled", () => {
    const switched = switchToOffsite(desk("d", "declined"), at(40))!;
    const undone = undoSwitch(switched, at(41))!;
    expect(undone.status).toBe("declined");
    expect(undone.closed_at).toBe(at(41).toISOString());
    expect(isAllowedMove(switched.status, undone.status)).toBe(true);
    expect(undoSwitch(callBack(switched, at(42))!, at(43))).toBeNull();
  });
});
