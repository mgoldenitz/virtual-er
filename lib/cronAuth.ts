// Decides whether a request to the keep-alive route really comes from Vercel's daily job.
// Vercel sends "Authorization: Bearer <CRON_SECRET>" with every scheduled call. With no
// secret set, nothing is accepted, so the route is never open to anyone.

import { timingSafeEqual } from "node:crypto";

export function isCronRequest(authorization: string | null, secret: string | undefined): boolean {
  if (!secret || !authorization) return false;
  const given = Buffer.from(authorization);
  const wanted = Buffer.from(`Bearer ${secret}`);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}
