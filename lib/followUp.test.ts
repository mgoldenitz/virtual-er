// Checks the no-response steps after "Recall patient": staff flags, patient messages, phone calls,
// confirming "unable to reach", and reopening.

import { describe, expect, it } from "vitest";
import { patientCallStep, staffFollowUp } from "./followUp";
import {
  callBack,
  checkInAtDesk,
  checkInHomeVisit,
  confirmOnMyWay,
  confirmUnableToReach,
  recordPhoneCall,
  reopenUnableToReach,
} from "./visitActions";
import type { Visit } from "./visit";

const t0 = new Date("2026-11-11T20:00:00Z");
const at = (min: number) => new Date(t0.getTime() + min * 60_000);
const input = { id: "v1", code: "ABC234", access_token: "TOKEN", site: "A" as const, ctas_level: 4 as const, language: "en" };

/** A visit called back at t0. */
const called = (): Visit => callBack(checkInAtDesk(input, "waiting", at(-60)), t0)!;
const kind = (visit: Visit, min: number) => staffFollowUp(visit, at(min)).kind;
/** Apply a phone call, failing the test if the step was refused. */
const phoned = (visit: Visit, result: "answered" | "no_answer", min: number): Visit => {
  const after = recordPhoneCall(visit, result, at(min));
  if (!after) throw new Error("phone call refused");
  return after;
};

describe("staff flags with no answer", () => {
  it("follows 10, 20 and 30 minutes after the call-back", () => {
    const v = called();
    expect(kind(v, 9)).toBe("none");
    expect(kind(v, 10)).toBe("phone");
    expect(kind(v, 20)).toBe("phone_again");
    expect(kind(v, 30)).toBe("review");
  });

  it("clears each phone flag once that many calls are recorded", () => {
    const once = phoned(called(), "no_answer", 11);
    expect(kind(once, 12)).toBe("none");
    expect(kind(once, 20)).toBe("phone_again");
    const twice = phoned(once, "no_answer", 21);
    expect(kind(twice, 22)).toBe("none");
    expect(kind(twice, 30)).toBe("review");
  });

  it("shows nothing for a visit that is not called", () => {
    const waiting = checkInAtDesk(input, "waiting", t0);
    expect(kind(waiting, 60)).toBe("none");
  });
});

describe("an answered call", () => {
  it("pauses the flags, then continues from the call-back time without restarting", () => {
    const v = phoned(called(), "answered", 12);
    expect(staffFollowUp(v, at(15))).toEqual({ kind: "paused", until: at(22).toISOString() });
    expect(kind(v, 22)).toBe("phone_again");
  });

  it("is never flagged unable to reach, even after a later unanswered call", () => {
    const answered = phoned(called(), "answered", 12);
    expect(kind(answered, 31)).toBe("contacted_not_arrived");
    const thenNoAnswer = phoned(answered, "no_answer", 25);
    expect(thenNoAnswer.last_phone_result).toBe("no_answer");
    expect(kind(thenNoAnswer, 40)).toBe("contacted_not_arrived");
  });

  it("answered inside the review step: paused, then contacted, not unable to reach", () => {
    const v = phoned(called(), "answered", 32);
    expect(kind(v, 35)).toBe("paused");
    expect(kind(v, 42)).toBe("contacted_not_arrived");
  });
});

describe("recordPhoneCall", () => {
  it("counts attempts and keeps the latest result", () => {
    const v = phoned(phoned(called(), "no_answer", 10), "no_answer", 21);
    expect(v.phone_attempts).toBe(2);
    expect(v.last_phone_result).toBe("no_answer");
    expect(v.followup_paused_until).toBeNull();
  });

  it("is refused before the phone step and when the patient is not called", () => {
    expect(recordPhoneCall(called(), "answered", at(9))).toBeNull();
    const onTheWay = confirmOnMyWay(called(), at(5))!;
    expect(recordPhoneCall(onTheWay, "answered", at(15))).toBeNull();
  });
});

describe("on the way, not arrived", () => {
  it("is flagged 30 minutes after the patient confirmed", () => {
    const v = confirmOnMyWay(called(), at(5))!;
    expect(kind(v, 34)).toBe("none");
    expect(kind(v, 35)).toBe("on_way_not_arrived");
  });
});

describe("confirm unable to reach and reopen", () => {
  it("is allowed only while the review flag shows, and closes the visit", () => {
    expect(confirmUnableToReach(called(), at(29))).toBeNull();
    const v = confirmUnableToReach(called(), at(30))!;
    expect(v.status).toBe("unable_to_reach");
    expect(v.closed_at).toBe(at(30).toISOString());
    expect(v.removed_reason).toBeNull();
  });

  it("is refused for a visit with an answered call", () => {
    expect(confirmUnableToReach(phoned(called(), "answered", 12), at(40))).toBeNull();
  });

  it("reopening clears closed_at and sends the visit back to triage", () => {
    const closed = confirmUnableToReach(called(), at(30))!;
    const reopened = reopenUnableToReach(closed)!;
    expect(reopened.status).toBe("needs_reassessment");
    expect(reopened.closed_at).toBeNull();
    expect(reopenUnableToReach(called())).toBeNull();
  });

  it("triage again starts a fresh wait with no call-back or phone history", () => {
    const answeredThenLost = { ...phoned(called(), "no_answer", 11), status: "unable_to_reach" as const };
    const reopened = reopenUnableToReach(answeredThenLost)!;
    const again = checkInHomeVisit(reopened, { ctas_level: 5, language: "fr" }, "waiting", at(90))!;
    expect(again.status).toBe("waiting");
    expect(again.triaged_at).toBe(at(90).toISOString());
    expect(again.called_at).toBeNull();
    expect(again.phone_attempts).toBe(0);
    expect(again.last_phone_result).toBeNull();
    expect(again.followup_paused_until).toBeNull();
  });
});

describe("patientCallStep", () => {
  it("adds the second alert at 10 minutes and 'Please return now' at 20", () => {
    const calledAt = t0.toISOString();
    expect(patientCallStep("called", calledAt, at(9))).toBe("first");
    expect(patientCallStep("called", calledAt, at(10))).toBe("second_alert");
    expect(patientCallStep("called", calledAt, at(20))).toBe("return_now");
  });

  it("stops once the patient confirms", () => {
    expect(patientCallStep("on_the_way", t0.toISOString(), at(25))).toBe("first");
  });
});
