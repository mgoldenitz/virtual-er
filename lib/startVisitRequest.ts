// Checks what a phone sends when it asks to start a visit from home: only a site and a
// language, and only values the app knows. Anything else is refused before the database is asked.

import type { Site } from "./visit";

/** Languages a visit can be started in. Two more are added in Phase 3. */
export const START_LANGUAGES = ["en"];

export type StartVisitRequest = { site: Site; language: string };

/** The site and language from the request body, or null if the body is not acceptable. */
export function parseStartVisitRequest(body: unknown): StartVisitRequest | null {
  if (typeof body !== "object" || body === null) return null;
  const { site, language } = body as Record<string, unknown>;
  if (site !== "A" && site !== "B") return null;
  if (typeof language !== "string" || !START_LANGUAGES.includes(language)) return null;
  // Only these two fields go on: the browser never sets the source, status, code or token.
  return { site, language };
}
