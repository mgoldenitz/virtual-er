# Gemini review: the broken-link screen fix

Model: Gemini Hydrogen 4, High, in a new chat. If you have no Gemini Hydrogen 4 credits, use Gemini 3.6 Flash, High.

## Text to paste into Gemini

You review a small fix in a Next.js 16 (App Router, React 19) prototype of a virtual ER waiting room. Synthetic data only. Find problems; do not confirm that the fix is good. For each problem, give the line, a concrete case that goes wrong, and the smallest fix.

### The fault

The patient page `/patient#t=<token>` reads the token from the address once the page loads. With a damaged token (for example `/patient#t=NOTAREALTOKEN`) it must show the heading "This link did not work". In the dev server it showed "No visit found on this phone".

Cause: in the dev server, React strict mode runs the effect two times. Run 1 calls `takeTokenFromLink()`, which removes `#t=...` from the address bar, forgets any saved token and gives `{ token: null, brokenLink: true }`. Run 2 finds no `#t=` and no saved token, so it gives `{ token: null, brokenLink: false }`, and the old code `setBrokenLink(link.brokenLink)` hid the broken-link screen. A production build runs the effect once, but the page must not depend on that.

### The fix

New file `lib/brokenLink.ts` (15 lines):

```ts
// Decides whether the patient screen shows "This link did not work" after the page reads the link.

/** What one read of the link gave (see takeTokenFromLink in data/savedToken.ts). */
export type LinkRead = { token: string | null; brokenLink: boolean };

/**
 * The broken-link state after one more read of the link. `previous` is the state before it.
 * A read with no link and no saved token tells nothing new, so it keeps `previous`. This
 * matters because the first read removes the link from the address bar: in the dev server
 * React reads a second time and finds nothing. Every other read gives its own answer.
 */
export function brokenLinkAfterRead(previous: boolean, link: LinkRead): boolean {
  if (link.token === null && !link.brokenLink) return previous;
  return link.brokenLink;
}
```

`app/patient/page.tsx` (120 lines; 1 line added, 1 line changed). The effect after the change:

```ts
useEffect(() => {
  const readLink = () => {
    const link = takeTokenFromLink();
    if (link.language) chooseLanguage(link.language);
    setToken(link.token);
    setBrokenLink((previous) => brokenLinkAfterRead(previous, link));
    setNotSaved(false);
  };
  readLink();
  window.addEventListener("hashchange", readLink);
  return () => window.removeEventListener("hashchange", readLink);
}, []);

// later in the same component:
const deadToken = isDeadToken(token, result); // token is a string and the database found no visit
const linkFailed = brokenLink || deadToken;   // linkFailed shows "This link did not work"
```

The helper it calls, `data/savedToken.ts` (not changed):

```ts
export function takeTokenFromLink(): LinkResult {
  const language = linkLanguage(window.location.hash);
  const match = window.location.hash.match(/[#&]t=([^&]*)/);
  if (!match) return { token: loadSavedToken(), brokenLink: false, language };
  window.history.replaceState(null, "", window.location.pathname);
  const decoded = decodeLinkPart(match[1]);
  const token = decoded === null ? null : normalizeToken(decoded);
  if (token === null || !isAccessToken(token)) {
    forgetSavedToken();
    return { token: null, brokenLink: true, language };
  }
  saveToken(token);
  return { token, brokenLink: false, language };
}
```

New test file `lib/brokenLink.test.ts` (29 lines), 5 tests: a damaged link gives true; a good link after a damaged one gives false; a saved visit with no link gives false; a first read with nothing saved gives false; a second read with nothing after a damaged link stays true (this test failed before the fix).

### Questions

1. Is there a sequence of reads (first load, a `hashchange` to a new link, a `hashchange` that removes the hash, the back button) where the new rule shows the broken-link screen when it must not, or hides it when it must show it?
2. Is it correct to keep `previous` only when `token === null && !brokenLink`? Is there a simpler or safer rule, for example to make `takeTokenFromLink` itself safe to call two times?
3. `setToken(link.token)` still runs on the second read with `null`. Can that cause a wrong screen or a wrong database read in between?
4. Does any test miss an important case?

## Checked

- `npx vitest run lib/brokenLink.test.ts` before the fix: 1 failed, 4 passed (commit `8635ecf`). After the fix: 5 passed (commit `2d8c4be`).
- `npm test`: 86 test files, 525 tests pass. `npm run lint` passed. `npm run build` passed.
- Full `npm run e2e`: 34 passed, 3 failed. `desk-checkin.spec.ts` "a link with a wrong token shows the broken-link screen" passes on the phone and the laptop. The 3 failures: the survey (`recall-arrive.spec.ts:11`, a known gap) on both, and `remove-undo.spec.ts:37` on the phone (the staff page stayed on "Loading…" for 60 s); that file passed when run again on the phone.

## Not checked

- The fix in a production build in a real phone browser.
- The back button after a broken link.

## What to bring back

Paste Gemini's full answer here under "Response".
