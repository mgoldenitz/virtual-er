import { describe, expect, it } from "vitest";
import {
  callBack,
  checkInAtDesk,
  confirmOnMyWay,
  issueNewLink,
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
  const called = markSeen(callBack(waiting, later(1))!, later(1))!;
  const onTheWay = confirmOnMyWay(called, later(2))!;

  it("puts each closed visit back exactly as it was before closing", () => {
    for (const before of [waiting, called, onTheWay]) {
      const arrived = markArrived(before, sec(0))!;
      expect(undoClose(arrived, arrived)).toEqual(before);
      const removed = markRemoved(before, "no_show", sec(0))!;
      expect(undoClose(removed, removed)).toEqual(before);
    }
  });

  it("has no time limit", () => {
    const arrived = markArrived(waiting, sec(0))!;
    expect(undoClose(arrived, arrived)).toEqual(waiting);
  });

  it("refuses a stale Undo: an old removal's button cannot reverse a newer arrival", () => {
    const removed = markRemoved(waiting, "left", sec(0))!;
    const reopened = undoClose(removed, removed)!;
    const arrived = markArrived(reopened, sec(30))!;
    expect(undoClose(arrived, removed)).toBeNull();
    expect(undoClose(arrived, arrived)).toEqual(waiting);
  });

  it("refuses a stale Undo even when both closures share the same millisecond", () => {
    const removed = markRemoved(waiting, "left", sec(0))!;
    const arrived = markArrived(undoClose(removed, removed)!, sec(0))!;
    expect(arrived.closed_at).toBe(removed.closed_at);
    expect(undoClose(arrived, removed)).toBeNull();
    const noShow = markRemoved(undoClose(removed, removed)!, "no_show", sec(0))!;
    expect(undoClose(noShow, removed)).toBeNull();
  });

  it("refuses open visits and visits closed at check-in", () => {
    expect(undoClose(waiting, waiting)).toBeNull();
    const declined = checkInAtDesk(input, "declined", sec(0));
    expect(undoClose(declined, declined)).toBeNull();
  });
});

describe("issue a new link", () => {
  const waiting = checkInAtDesk(input, "waiting", t0);

  it("replaces only the access token while waiting, called or on the way", () => {
    const called = callBack(waiting, later(5))!;
    const onTheWay = confirmOnMyWay(called, later(6))!;
    for (const v of [waiting, called, onTheWay]) {
      expect(issueNewLink(v, "NEWTOKEN")).toEqual({ ...v, access_token: "NEWTOKEN" });
    }
  });

  it("refuses closed visits", () => {
    const arrived = markArrived(waiting, later(5))!;
    const removed = markRemoved(waiting, "left", later(5))!;
    const unable = { ...waiting, status: "unable_to_reach" as const, closed_at: later(5).toISOString() };
    for (const v of [arrived, removed, unable]) expect(issueNewLink(v, "NEWTOKEN")).toBeNull();
  });

  it("refuses declined and not-eligible visits (they never got a slip)", () => {
    expect(issueNewLink(checkInAtDesk(input, "declined", t0), "NEWTOKEN")).toBeNull();
    expect(issueNewLink(checkInAtDesk(input, "not_eligible", t0), "NEWTOKEN")).toBeNull();
  });
});
