import { describe, expect, it } from "vitest";
import { PUSHOVER_MAX_MESSAGE, PUSHOVER_TITLE, pushoverBody } from "./pushover";

const APP = "app-token-for-test";
const USER = "user-key-for-test";

describe("pushoverBody", () => {
  it("gives the fields Pushover needs", () => {
    expect(pushoverBody(APP, USER, "Visit ABC234 is called back to Demo Site A.")).toEqual({
      token: APP,
      user: USER,
      message: "Visit ABC234 is called back to Demo Site A.",
      title: PUSHOVER_TITLE,
      priority: "1",
    });
  });

  it("keeps a message at the limit as it is", () => {
    const text = "x".repeat(PUSHOVER_MAX_MESSAGE);
    expect(pushoverBody(APP, USER, text).message).toBe(text);
  });

  it("cuts a long message to the limit and ends it with ...", () => {
    const message = pushoverBody(APP, USER, "x".repeat(1100)).message;
    expect(message).toHaveLength(PUSHOVER_MAX_MESSAGE);
    expect(message.endsWith("...")).toBe(true);
  });

  it("never puts the app token or the user key in the message or the title", () => {
    const body = pushoverBody(APP, USER, "Visit ABC234 is called back to Demo Site A.");
    expect(body.message).not.toContain(APP);
    expect(body.message).not.toContain(USER);
    expect(body.title).not.toContain(APP);
    expect(body.title).not.toContain(USER);
  });
});
