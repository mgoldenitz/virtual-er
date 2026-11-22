import { describe, expect, it } from "vitest";
import { makeAccessToken, groupToken } from "./codes";
import {
  CHAT_LIMITS, hasAccessToken, hasLongNumber, hasPatientDetail, hasVisitCode, parseChatBody, requestHasPatientDetail, type ChatRequest,
} from "./chatRequest";

const base = { isDemo: true, question: "How many are waiting?", history: [] };

describe("parseChatBody", () => {
  it("accepts a plain question with no history", () => {
    expect(parseChatBody(base)).toEqual({ isDemo: true, question: "How many are waiting?", history: [] });
  });

  it("trims the question and the history text", () => {
    const body = { isDemo: false, question: "  hi  ", history: [{ role: "user", text: " a " }, { role: "assistant", text: " b " }] };
    expect(parseChatBody(body)).toEqual({
      isDemo: false,
      question: "hi",
      history: [{ role: "user", text: "a" }, { role: "assistant", text: "b" }],
    });
  });

  it("refuses a body that is not a plain object", () => {
    expect(parseChatBody(null)).toBeNull();
    expect(parseChatBody("question")).toBeNull();
    expect(parseChatBody([base])).toBeNull();
  });

  it("needs isDemo to be a boolean", () => {
    expect(parseChatBody({ ...base, isDemo: undefined })).toBeNull();
    expect(parseChatBody({ ...base, isDemo: "true" })).toBeNull();
  });

  it("needs a question that is a string of 1 to 300 characters after trimming", () => {
    expect(parseChatBody({ ...base, question: 5 })).toBeNull();
    expect(parseChatBody({ ...base, question: "   " })).toBeNull();
    expect(parseChatBody({ ...base, question: "a".repeat(300) })).not.toBeNull();
    expect(parseChatBody({ ...base, question: "a".repeat(301) })).toBeNull();
  });

  it("needs history to be an array, which may be empty", () => {
    expect(parseChatBody({ ...base, history: undefined })).toBeNull();
    expect(parseChatBody({ ...base, history: "none" })).toBeNull();
    expect(parseChatBody({ ...base, history: [] })).not.toBeNull();
  });

  it("refuses more than 4 history items", () => {
    const five = [
      { role: "user", text: "1" }, { role: "assistant", text: "2" },
      { role: "user", text: "3" }, { role: "assistant", text: "4" },
      { role: "user", text: "5" },
    ];
    expect(parseChatBody({ ...base, history: five })).toBeNull();
    expect(parseChatBody({ ...base, history: five.slice(0, 4) })).not.toBeNull();
  });

  it("refuses a history item that is not a plain object", () => {
    expect(parseChatBody({ ...base, history: ["hello"] })).toBeNull();
    expect(parseChatBody({ ...base, history: [null, null] })).toBeNull();
    expect(parseChatBody({ ...base, history: [["user", "x"]] })).toBeNull();
  });

  it("refuses a role other than user or assistant", () => {
    expect(parseChatBody({ ...base, history: [{ role: "system", text: "x" }, { role: "assistant", text: "y" }] })).toBeNull();
  });

  it("refuses history text that is empty after trimming", () => {
    expect(parseChatBody({ ...base, history: [{ role: "user", text: "   " }, { role: "assistant", text: "y" }] })).toBeNull();
    expect(parseChatBody({ ...base, history: [{ role: "user", text: 4 }, { role: "assistant", text: "y" }] })).toBeNull();
  });

  it("limits a user turn to 300 characters and an assistant turn to 1200", () => {
    const user301 = [{ role: "user", text: "a".repeat(301) }, { role: "assistant", text: "b" }];
    const user300 = [{ role: "user", text: "a".repeat(300) }, { role: "assistant", text: "b" }];
    expect(parseChatBody({ ...base, history: user301 })).toBeNull();
    expect(parseChatBody({ ...base, history: user300 })).not.toBeNull();
    const answer1201 = [{ role: "user", text: "a" }, { role: "assistant", text: "b".repeat(1201) }];
    const answer1200 = [{ role: "user", text: "a" }, { role: "assistant", text: "b".repeat(1200) }];
    expect(parseChatBody({ ...base, history: answer1201 })).toBeNull();
    expect(parseChatBody({ ...base, history: answer1200 })).not.toBeNull();
  });

  it("refuses history where the roles do not alternate", () => {
    const twoUsers = [{ role: "user", text: "a" }, { role: "user", text: "b" }];
    expect(parseChatBody({ ...base, history: twoUsers })).toBeNull();
  });

  it("refuses history that ends with a user turn", () => {
    expect(parseChatBody({ ...base, history: [{ role: "user", text: "a" }] })).toBeNull();
    const three = [{ role: "user", text: "a" }, { role: "assistant", text: "b" }, { role: "user", text: "c" }];
    expect(parseChatBody({ ...base, history: three })).toBeNull();
  });

  it("refuses history that starts with an assistant turn", () => {
    const starts = [{ role: "assistant", text: "a" }, { role: "user", text: "b" }];
    expect(parseChatBody({ ...base, history: starts })).toBeNull();
  });

  it("drops extra fields at the top level and on each turn", () => {
    const body = {
      ...base,
      token: "secret",
      history: [{ role: "user", text: "a", id: 7 }, { role: "assistant", text: "b", extra: true }],
    };
    const parsed = parseChatBody(body);
    expect(parsed).toEqual({
      isDemo: true,
      question: "How many are waiting?",
      history: [{ role: "user", text: "a" }, { role: "assistant", text: "b" }],
    });
    expect(parsed).not.toHaveProperty("token");
    expect(parsed?.history[0]).not.toHaveProperty("id");
  });
});

describe("hasVisitCode", () => {
  it("finds a code inside a sentence", () => {
    expect(hasVisitCode("Where is ABC234?")).toBe(true);
  });

  it("finds a lower-case code", () => {
    expect(hasVisitCode("abc234")).toBe(true);
  });

  it("joins a code split by a hyphen", () => {
    expect(hasVisitCode("ABC-234")).toBe(true);
  });

  it("joins a code split by a space", () => {
    expect(hasVisitCode("Where is ABC 234?")).toBe(true);
  });

  it("finds a code after a word that is not a code", () => {
    expect(hasVisitCode("THE ABC 234")).toBe(true);
  });

  it("does not join 4 and 2 characters into a code", () => {
    expect(hasVisitCode("WERE 23")).toBe(false);
  });

  it("does not join a site letter and a number", () => {
    expect(hasVisitCode("site B 234")).toBe(false);
  });

  it("does not count 'BEDS12' as a code, because 1 is not in CODE_ALPHABET", () => {
    // The brief's example said true, but its own rule (every character in CODE_ALPHABET) gives false.
    expect(hasVisitCode("BEDS12")).toBe(false);
  });

  it("needs a digit", () => {
    expect(hasVisitCode("TRIAGE")).toBe(false);
  });

  it("needs a letter", () => {
    expect(hasVisitCode("123456")).toBe(false);
  });

  it("needs exactly 6 characters", () => {
    expect(hasVisitCode("ABCDEFG2")).toBe(false);
  });

  it("refuses 0, which is not in CODE_ALPHABET", () => {
    expect(hasVisitCode("AB0234")).toBe(false);
  });
});

describe("hasAccessToken", () => {
  // A fixed set of bytes, so the token is the same on every run.
  const fixed = (length: number) => new Uint8Array(length).fill(7);
  const token = makeAccessToken(fixed);

  it("finds a plain token from makeAccessToken", () => {
    expect(hasAccessToken(token)).toBe(true);
  });

  it("finds the same token through groupToken", () => {
    expect(hasAccessToken(groupToken(token))).toBe(true);
  });

  it("finds a grouped token typed in lower case", () => {
    expect(hasAccessToken(groupToken(token).toLowerCase())).toBe(true);
  });

  it("finds a #t= link", () => {
    expect(hasAccessToken("see #t=abc")).toBe(true);
  });

  it("needs a digit in 26 letters", () => {
    expect(hasAccessToken("ABCDEFGHJKMNPQRSTVWXYZABCD")).toBe(false);
  });

  it("is false for an ordinary question", () => {
    expect(hasAccessToken("How many waited today?")).toBe(false);
  });
});

describe("hasLongNumber", () => {
  it("finds a phone number with hyphens", () => {
    expect(hasLongNumber("416-555-0199")).toBe(true);
  });

  it("finds 7 digits in a row", () => {
    expect(hasLongNumber("1234567")).toBe(true);
  });

  it("finds a phone number with spaces", () => {
    expect(hasLongNumber("416 555 0199")).toBe(true);
  });

  it("needs 7 digits, not 6", () => {
    expect(hasLongNumber("123456")).toBe(false);
  });

  it("does not join numbers split by words", () => {
    expect(hasLongNumber("between 30 and 59")).toBe(false);
    expect(hasLongNumber("30 and 59")).toBe(false);
  });
});

describe("hasPatientDetail", () => {
  it("is true for a visit code", () => {
    expect(hasPatientDetail("Where is ABC234?")).toBe(true);
  });

  it("is true for a token", () => {
    expect(hasPatientDetail(makeAccessToken((n) => new Uint8Array(n).fill(7)))).toBe(true);
  });

  it("is true for a phone number", () => {
    expect(hasPatientDetail("Call 416-555-0199")).toBe(true);
  });

  it("is false for a question about the site", () => {
    expect(hasPatientDetail("How many waiting at site B?")).toBe(false);
  });
});

describe("requestHasPatientDetail", () => {
  const request = (question: string, history: ChatRequest["history"]): ChatRequest => ({ isDemo: true, question, history });

  it("finds a code in the question", () => {
    expect(requestHasPatientDetail(request("Where is ABC234?", []))).toBe(true);
  });

  it("finds a code in a staff (user) turn of the history", () => {
    const history = [{ role: "user" as const, text: "Check ABC234" }, { role: "assistant" as const, text: "Noted." }];
    expect(requestHasPatientDetail(request("How many waiting?", history))).toBe(true);
  });

  it("finds a code in an assistant turn", () => {
    const history = [{ role: "user" as const, text: "How many waiting?" }, { role: "assistant" as const, text: "ABC234 is fine" }];
    expect(requestHasPatientDetail(request("How many recalled?", history))).toBe(true);
  });

  it("finds a phone number in a user turn", () => {
    const history = [{ role: "user" as const, text: "Call 416-555-0199" }, { role: "assistant" as const, text: "Noted." }];
    expect(requestHasPatientDetail(request("How many recalled?", history))).toBe(true);
  });

  it("is false when there is no code anywhere", () => {
    expect(requestHasPatientDetail(request("How many waiting?", []))).toBe(false);
  });
});

describe("chat limits", () => {
  it("keeps the numbers from the brief", () => {
    expect(CHAT_LIMITS).toEqual({ questionCharacters: 300, answerCharacters: 1200, historyMessages: 4, bodyCharacters: 6000 });
  });
});
