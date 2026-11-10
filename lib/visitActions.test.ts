import { describe, expect, it } from "vitest";
import {
  callBack,
  checkInAtDesk,
  confirmOnMyWay,
  markArrived,
  markRemoved,
  markSeen,
  undoClose,
} from "./visitActions";

const t0 = new Date("2026-11-09T20:00:00Z");
const later = (min: number) => new Date(t0.getTime() + min * 60_000);
const input = {
  id: "v1",
  code: "ABC234",
  access_token: "TOKEN",
  site: "A" as const,
  ctas_level: 4 as const,
  language: "en",
};

describe("desk check-in", () => {
  it("accepted: joins the line with triage and offer times", () => {
    const v = checkInAtDesk(input, "waiting", t0);
    expect(v.status).toBe("waiting");
    expect(v.source).toBe("desk");
    expect(v.triaged_at).toBe(t0.toISOString());
    expect(v.offered_at).toBe(t0.toISOString());
    expect(v.closed_at).toBeNull();
  });

  it("declined: offered, then closed", () => {
    const v = checkInAtDesk(input, "declined", t0);
    expect(v.status).toBe("declined");
    expect(v.offered_at).not.toBeNull();
    expect(v.closed_at).not.toBeNull();
  });

  it("not eligible: never offered, closed", () => {
    const v = checkInAtDesk(input, "not_eligible", t0);
    expect(v.status).toBe("not_eligible");
    expect(v.offered_at).toBeNull();
    expect(v.closed_at).not.toBeNull();
  });
});

describe("core loop", () => {
  it("waiting → called → seen → on the way → arrived", () => {
    const waiting = checkInAtDesk(input, "waiting", t0);
    const called = callBack(waiting, later(30))!;
    expect(called.status).toBe("called");
    expect(called.called_at).toBe(later(30).toISOString());

    const seen = markSeen(called, later(31))!;
    expect(seen.seen_at).toBe(later(31).toISOString());
    expect(markSeen(seen, later(32))).toBeNull(); // only once

    const onWay = confirmOnMyWay(seen, later(33))!;
    expect(onWay.status).toBe("on_the_way");
    expect(onWay.confirmed_at).toBe(later(33).toISOString());

    const arrived = markArrived(onWay, later(45))!;
    expect(arrived.status).toBe("arrived");
    expect(arrived.arrived_at).toBe(later(45).toISOString());
    expect(arrived.closed_at).toBe(later(45).toISOString());
  });

  it("refuses steps that are out of order", () => {
    const waiting = checkInAtDesk(input, "waiting", t0);
    expect(markSeen(waiting, t0)).toBeNull();
    expect(confirmOnMyWay(waiting, t0)).toBeNull();
    const called = callBack(waiting, t0)!;
    expect(callBack(called, t0)).toBeNull(); // double click
    const arrived = markArrived(called, t0)!;
    expect(markArrived(arrived, t0)).toBeNull();
    expect(confirmOnMyWay(arrived, t0)).toBeNull();
    expect(markRemoved(arrived, "left", t0)).toBeNull();
  });

  it("removal records the reason and closes the visit", () => {
    const v = markRemoved(checkInAtDesk(input, "waiting", t0), "no_show", later(5))!;
    expect(v.status).toBe("removed");
    expect(v.removed_reason).toBe("no_show");
    expect(v.closed_at).toBe(later(5).toISOString());
  });
});

describe("undo after Mark arrived, Left or No-show", () => {
  const sec = (s: number) => new Date(later(5).getTime() + s * 1000);
  const waiting = checkInAtDesk(input, "waiting", t0);
  const onTheWay = confirmOnMyWay(callBack(waiting, later(1))!, later(2))!;

  it("puts an arrived visit back to its earlier status and clears closed_at", () => {
    const arrived = markArrived(onTheWay, sec(0))!;
    const undone = undoClose(arrived, "on_the_way", sec(9))!;
    expect(undone.status).toBe("on_the_way");
    expect(undone.closed_at).toBeNull();
    expect(undone.arrived_at).toBeNull();
    expect(undone.confirmed_at).toBe(onTheWay.confirmed_at); // the rest of the history stays
  });

  it("puts a removed visit back and forgets the removal reason", () => {
    const removed = markRemoved(waiting, "no_show", sec(0))!;
    const undone = undoClose(removed, "waiting", sec(9))!;
    expect(undone.status).toBe("waiting");
    expect(undone.removed_reason).toBeNull();
    expect(undone.closed_at).toBeNull();
  });

  it("refuses once the undo time is over, for open visits, and for a closed earlier status", () => {
    const arrived = markArrived(waiting, sec(0))!;
    expect(undoClose(arrived, "waiting", sec(16))).toBeNull();
    expect(undoClose(waiting, "waiting", sec(1))).toBeNull();
    expect(undoClose(arrived, "declined", sec(1))).toBeNull();
    expect(undoClose(checkInAtDesk(input, "declined", sec(0)), "waiting", sec(1))).toBeNull();
  });
});
