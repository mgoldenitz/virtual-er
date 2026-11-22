// The demo's timing settings in one place. They are placeholders, not clinical deadlines:
// a hospital's clinical lead would set the real ones. Shorten them here when testing.

/** How often the "I'm still here" prompt appears while a patient waits off-site. */
export const STILL_HERE_EVERY_MINUTES = 30;

/** How long the patient has to tap before staff see a flag. */
export const STILL_HERE_ANSWER_WITHIN_MINUTES = 10;

// No-response steps after "Recall patient" (SPEC /staff). Minutes are counted from called_at.

/** Second alert on the patient's phone; staff see "Phone the patient now". */
export const CALL_SECOND_ALERT_MINUTES = 10;

/** Staff see "Phone the patient again" ("now" if no call was recorded yet); the patient's phone shows "Please return now". */
export const CALL_PHONE_AGAIN_MINUTES = 20;

/** With no answered call, staff see "Review: unable to reach" (a nurse must confirm). */
export const CALL_REVIEW_MINUTES = 30;

/** After "Phoned, answered", the staff flags wait this long before the steps continue. */
export const ANSWERED_PAUSE_MINUTES = 10;

/** After "I'm on my way", staff see "On the way, not arrived" once this much time has passed. */
export const ON_WAY_NOT_ARRIVED_MINUTES = 30;

// Wait range (SPEC rule 8: simulated, never a hospital's real numbers).

/** Simulated minutes per place in line, used until a site has 2 call-backs in its history. */
export const DEFAULT_GAP_MINUTES = 15;
