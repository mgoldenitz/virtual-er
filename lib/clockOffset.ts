// Works out how far this device's clock is from the server's, so timed steps (follow-up flags,
// the patient's reminders, "I'm still here") use the same time as the database, even on a
// phone or laptop whose clock is wrong.

/** A reading taken over a slower connection than this is not trusted. */
export const MAX_ROUND_TRIP_MS = 5_000;

/**
 * Milliseconds to add to this device's clock to get the server's time, or null if the reading
 * cannot be trusted. `sentAt` and `receivedAt` are this device's clock just before the request
 * and just after the answer; the server's time is taken to be from the middle of that trip.
 */
export function clockOffset(sentAt: number, serverNow: number, receivedAt: number): number | null {
  const roundTrip = receivedAt - sentAt;
  if (!Number.isFinite(serverNow) || roundTrip < 0 || roundTrip > MAX_ROUND_TRIP_MS) return null;
  return Math.round(serverNow - (sentAt + receivedAt) / 2);
}
