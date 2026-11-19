# Gemini review: Vercel Web Analytics with private page addresses

Model: Gemini Hydrogen 4, High, in a new chat. (If no Hydrogen 4 credits: Gemini 3.6 Flash, High.)

## Prompt to paste

You review a privacy change in a Next.js 16 App Router prototype (a virtual ER waiting room, synthetic data only). Find problems. Do not confirm that it works; list each way it can fail, with a concrete case.

Hard rule: no personal or health information leaves the app, and only an access token opens a patient's visit. The token must never reach a third party.

The patient link is `https://<site>/patient#t=<access_token>&l=<language code>`. The `#` part is never sent to our server. When the patient page opens, `takeTokenFromLink()` reads the token from `window.location.hash`, saves it in the browser, and calls `window.history.replaceState(null, "", window.location.pathname)` to remove it from the address bar. The staff sign-in page is `/login?next=<staff path>`. No address holds a visit code.

The change adds Vercel Web Analytics (`@vercel/analytics` 2.0.1, `Analytics` from `@vercel/analytics/next`). Its `beforeSend` gets each event `{ type: "pageview" | "event", url: string }` and returns a changed event, or `null` to drop it.

lib/analyticsPrivacy.ts (20 lines, new):

```ts
// Decides which part of a page address may go to Vercel Web Analytics (the site and the path only), and drops an event it cannot read.
// The patient link holds the access token after "#" (/patient#t=...), and the token opens the visit (SPEC rule 1).

/** The site and the path of `url` (for example "https://site/patient"), or null if `url` is not a full address. */
export function privateAddress(url: string): string | null {
  try {
    // URL splits the address into parts, so the "?" and "#" parts are simply left out.
    const address = new URL(url);
    return `${address.origin}${address.pathname}`;
  } catch {
    // Not a full address: drop the event. A lost page view is safer than a leaked token.
    return null;
  }
}

/** The analytics event with only the site and the path in `url`, or null to drop the event. */
export function privateEvent<T extends { url: string }>(event: T): T | null {
  const url = privateAddress(event.url);
  return url === null ? null : { ...event, url };
}
```

components/PrivateAnalytics.tsx (10 lines, new):

```tsx
"use client";
// Vercel Web Analytics, with each page address cut to the site and the path before it leaves the browser.
// A client file, because the layout is a server file and cannot pass the beforeSend function to the browser.

import { Analytics } from "@vercel/analytics/next";
import { privateEvent } from "@/lib/analyticsPrivacy";

export function PrivateAnalytics() {
  return <Analytics beforeSend={privateEvent} />;
}
```

app/layout.tsx (36 lines, 3 added, 1 changed): imports `PrivateAnalytics` and renders `<PrivateAnalytics />` as the last child of `<body>`, after `<Footer />`. The layout is a server component.

lib/analyticsPrivacy.test.ts (58 lines, new) checks: `/patient#t=ABC123SECRET&l=fr` gives `/patient`; `/login?next=/staff` gives `/login`; `?` and `#` together are both removed; `/` and `/dashboard` stay the same; `"not an address #t=..."` and `""` give `null`; for 4 inputs the token text is never in the result; `privateEvent` keeps `type` and cuts `url`, and gives `null` for an address it cannot read.

What the Next.js wrapper sends besides `url` (read in node_modules/@vercel/analytics/dist/next/index.mjs): `path` from `usePathname()` (line 226, no query or hash) and `route` from `computeRoute()` (lines 50 to 77 and 231, which puts in only the names of query keys, as `/[key]`, never their values). The production script is served by Vercel from `/_vercel/insights/script.js` (line 94) and is not in node_modules.

Questions:
1. Can the token or the `#` or `?` part reach Vercel through any field other than `url` (for example a referrer, the `path` or `route` that the Next.js wrapper adds, or a page title)?
2. Is there a timing case where an event is sent before `beforeSend` is set?
3. Can a path itself ever hold patient data in this app, so that keeping the path is not safe?
4. Is there a simpler or safer way (for example `type: "event"` handling, or turning analytics off on `/patient`)?
5. Anything else that is wrong.

## Checked (output in this session)

- `npm test`: 72 test files, 417 tests pass. `npm run lint`: passed. `npm run build`: passed.
- The 7 `privateAddress` tests failed before the rule was written (5 failed, 2 passed), then all 7 pass. The 2 `privateEvent` tests were added after a reviewer worker found that the event drop had no test.
- Browser check on localhost `/patient#t=TESTTOKEN123&l=fr`: the dev-mode analytics log shows the view as `{o: http://localhost:3000/patient, dp: /patient}`, with no token.

## Not checked

- The live site (analytics is not on in the Vercel dashboard yet, and the change is not on `main`).
- What the Vercel script sends in production mode, outside the dev-mode log.
- Custom events: none are used in the app (no `track(` call).
- The browser check ran before `privateEvent` moved to `lib/`; tests cover the moved code, the browser check was not repeated.
- Whether the production `url` is always a full address. If it is not, every event is dropped (no leak, but no analytics).

## Bring back

Paste Gemini's full answer here under "Response".
