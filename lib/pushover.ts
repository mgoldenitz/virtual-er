// Builds the request for the Pushover recall alert to the owner's phone (Phase 4).
// The route in app/api/recall-alert sends it; this file only decides the fields.

export const PUSHOVER_URL = "https://api.pushover.net/1/messages.json";

/** Pushover refuses a message longer than this. */
export const PUSHOVER_MAX_MESSAGE = 1024;

export const PUSHOVER_TITLE = "WaitWell demo";

/** The form fields Pushover needs. Priority "1" is high: it makes a sound, also in quiet hours. */
export function pushoverBody(appToken: string, userKey: string, text: string): Record<string, string> {
  const message =
    text.length > PUSHOVER_MAX_MESSAGE ? `${text.slice(0, PUSHOVER_MAX_MESSAGE - 3)}...` : text;
  return { token: appToken, user: userKey, message, title: PUSHOVER_TITLE, priority: "1" };
}
