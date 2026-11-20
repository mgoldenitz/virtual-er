// The one connection to Claude (the Anthropic API). It runs only on the server (the first line
// makes the build fail if a browser file imports it). The key is read from ANTHROPIC_API_KEY in
// .env.local (or Vercel's Environment Variables page), never from code.

import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/** The model every Claude feature in this app uses. */
export const CLAUDE_MODEL = "claude-opus-5-5";

let client: Anthropic | undefined;

/** True when the key is set, so a route can switch its feature off without an error. */
export function claudeIsSetUp(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function claudeClient(): Anthropic {
  // Stop after 20 seconds and try once more at most, so a slow answer cannot keep a function open.
  if (!client) client = new Anthropic({ timeout: 20_000, maxRetries: 1 });
  return client;
}
