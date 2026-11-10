import { describe, expect, it } from "vitest";
import { progressChanges } from "./progressChanges";
import { callBack, checkInAtDesk, confirmOnMyWay, markSeen, undoClose, markArrived } from "./visitActions";

const t0 = new Date("2026-11-09T20:00:00Z");
const at = (min: number) => new Date(t0.getTime() + min * 60_000);
const waiting = checkInAtDesk({ id: "v1", code: "ABC234", access_token: "T", site: "A", ctas_level: 4, language: "en" }, "waiting", t0);
const called = callBack(waiting, at(1))!;
const seen = markSeen(called, at(2))!;
const onTheWay = confirmOnMyWay(seen, at(3))!;

describe("staff progress announcements", () => {
  it("announces Seen and On the way once each", () => {
    expect(progressChanges([called], [seen])).toEqual(["Visit ABC234: called screen was shown on the patient's phone."]);
    expect(progressChanges([seen], [onTheWay])).toEqual(["Visit ABC234: patient is on the way."]);
    expect(progressChanges([onTheWay], [onTheWay])).toEqual([]);
  });

  it("says nothing for new visits, call-backs, or an Undo back to on the way", () => {
    expect(progressChanges([], [waiting])).toEqual([]);
    expect(progressChanges([waiting], [called])).toEqual([]);
    const arrived = markArrived(onTheWay, at(4))!;
    expect(progressChanges([arrived], [undoClose(arrived, arrived.closed_at!)!])).toEqual([]);
  });
});
