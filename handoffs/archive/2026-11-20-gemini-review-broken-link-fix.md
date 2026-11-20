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

## Response

(Gemini Hydrogen 4, High, 2026-11-20. Pasted by the owner. Empty lines removed, text not changed.)

### 1. Sequences of reads where the new rule shows or hides the broken-link screen wrongly

* A `hashchange` that removes `#t=` (or switches to `#l=fr` / `#`) keeps the broken-link screen stuck on (`app/patient/page.tsx`: `window.addEventListener("hashchange", readLink)` and `setBrokenLink((previous) => brokenLinkAfterRead(previous, link))`; `lib/brokenLink.ts`: `if (link.token === null && !link.brokenLink) return previous;`):
* **Concrete case:** A patient loads `/patient#t=NOTAREALTOKEN`, so `takeTokenFromLink()` strips the hash via `replaceState`, calls `forgetSavedToken()`, and returns `{ token: null, brokenLink: true }`, showing `"This link did not work"`. Next, the user edits the hash to `/patient#` or `/patient#l=fr` (triggering `hashchange`), so `takeTokenFromLink()` finds no `#t=` and no saved token and returns `{ token: null, brokenLink: false }`. Because `brokenLinkAfterRead` returns `previous` (`true`), the page keeps showing `"This link did not work"` instead of switching to `"No visit found on this phone"`.
* **Smallest fix:** Use `brokenLinkAfterRead` (or a Strict-Mode guard) only for the initial mount read, and inside the `"hashchange"` handler call `setBrokenLink(link.brokenLink)` directly.
* Pressing the Back button to an earlier non-token hash wrongly keeps the broken-link screen (`app/patient/page.tsx`: `window.addEventListener("hashchange", readLink)`; `lib/brokenLink.ts`: `brokenLinkAfterRead`):
* **Concrete case:** A user visits `/patient#l=fr` (no `t=`, so `takeTokenFromLink()` does not call `replaceState` and `"No visit found on this phone"` is shown), then edits the URL in the same tab to `/patient#t=NOTAREALTOKEN` (`brokenLink` becomes `true`, and `replaceState` changes the new history entry to `/patient`). When the user presses **Back**, the URL returns to `/patient#l=fr` and fires `hashchange`; `takeTokenFromLink()` returns `{ token: null, brokenLink: false }`, and `brokenLinkAfterRead` returns `true`, leaving `"This link did not work"` on screen.
* **Smallest fix:** Call `setBrokenLink(link.brokenLink)` on `"hashchange"` instead of `brokenLinkAfterRead(previous, link)`.
* Pressing the Back button from a broken link to a prior working link never restores the working visit (`data/savedToken.ts`: `window.history.replaceState` and `forgetSavedToken()`; `app/patient/page.tsx`: `useEffect` listens only to `"hashchange"`):
* **Concrete case:** A user opens `/patient#t=GOODTOKEN` (`replaceState` changes that history entry to `/patient` and saves `GOODTOKEN`), then navigates in the same tab to `/patient#t=NOTAREALTOKEN` (`forgetSavedToken()` deletes `GOODTOKEN` and `replaceState` changes the second history entry to `/patient`). When the user presses **Back**, both history entries have the same pathname `/patient` with no hash, so `"hashchange"` does not fire at all, `GOODTOKEN` is already deleted, and `"This link did not work"` remains on screen.
* **Smallest fix:** Do not call `forgetSavedToken()` on a damaged `#t=` link unless returning to a no-hash state is desired, or listen to `"popstate"` in addition to `"hashchange"`—though while `replaceState` collapses `#t=` URLs onto `window.location.pathname` and `forgetSavedToken()` erases the prior token, browser Back cannot recover the prior visit.
* Pressing Back then Forward after a broken link hides the broken-link screen (`data/savedToken.ts`: `window.history.replaceState(null, "", window.location.pathname)`):
* **Concrete case:** From `/`, a user follows `/patient#t=NOTAREALTOKEN`, sees `"This link did not work"`, presses **Back** to `/`, and then presses **Forward**. Because `replaceState` rewrote the history entry to `/patient` without `#t=`, the fresh mount reads no hash and no saved token and shows `"No visit found on this phone"` instead of `"This link did not work"`.
* **Smallest fix:** Record a flag in `replaceState` (e.g., `window.history.replaceState({ brokenLink: true }, "", window.location.pathname)`) if `"This link did not work"` must survive Back/Forward navigation, and clear it on `"hashchange"` or a valid token.

### 2. Is keeping `previous` on `token === null && !brokenLink` correct, or is there a simpler/safer rule?

* Keeping `previous` whenever `link.token === null && !link.brokenLink` is wrong (`lib/brokenLink.ts`: line 13; `app/patient/page.tsx`: `readLink`):
* **Concrete case:** `LinkRead` (`{ token: null, brokenLink: false }`) represents three distinct situations: a Strict Mode second mount after `replaceState` stripped `#t=`, a new `hashchange` without `t=`, and a valid-format `#t=` read whose `saveToken(token)` call failed silently (e.g., blocked `localStorage` in a restricted WebView). Treating all three identically keeps `brokenLink` stuck on `hashchange` and fails to protect `token` and `language` on Strict Mode Run 2.
* **Smallest fix (simpler and safer than `brokenLinkAfterRead`):** Make the initial mount read run once per component lifecycle instead of patching `brokenLink` from return values. Using a ref inside `app/patient/page.tsx` (`const didReadInitial = useRef(false);` inside `useEffect`, since React 19 Strict Mode preserves refs across the simulated unmount/remount) lets Run 1 call `readLink()` once—preserving `token`, `brokenLink`, and `link.language` even if `localStorage` is disabled—while Run 2 skips the initial `readLink()` and only re-attaches `"hashchange"` (which passes `link.brokenLink` directly, removing `lib/brokenLink.ts` altogether). *(Note: adding a naive module-level cache inside `takeTokenFromLink()` instead would break when the user navigates from `/patient` to `/` and back to `/patient`, or across tests, unless explicitly cleared on every `hashchange` and unmount.)*

### 3. Does `setToken(link.token)` running on the second read with `null` cause a wrong screen or wrong database read?

* For a malformed token (`/patient#t=NOTAREALTOKEN`), no intermediate wrong screen or database read occurs (`app/patient/page.tsx`: `setToken(link.token)`): Run 1 sets `token` to `null`, React Strict Mode executes Run 1 cleanup and Run 2 synchronously after mount with `token` still `null`, and the database is not queried for `null`.
* For a valid-format 26-character token when `localStorage` fails to persist, `setToken(null)` on Run 2 shows the wrong screen (`app/patient/page.tsx`: `setToken(link.token)`; `data/savedToken.ts`: `replaceState`, `saveToken(token)`, `loadSavedToken()`):
* **Concrete case:** A patient opens `/patient#t=<26-char Crockford token>` (either a valid visit or a 26-character typo/replaced link that relies on `deadToken` to show `"This link did not work"`) in a browser where `localStorage` is disabled or throws inside `saveToken`. Run 1 strips `#t=` from the URL via `replaceState`, fails to save to `localStorage`, and queues `setToken("26CHARS...")` with `brokenLink = false`. Strict Mode Run 2 sees no `#t=`, receives `null` from `loadSavedToken()`, and calls `setToken(null)`—overwriting the queued token with `null` before the commit re-renders. As a result, `deadToken` stays `false`, `brokenLink` is `false`, the database lookup never runs, and the patient sees `"No visit found on this phone"` with `#t=` already stripped from the URL.
* **Smallest fix:** Either guard the initial `readLink()` in `app/patient/page.tsx` with a ref so `takeTokenFromLink()` only runs once on mount, or make `setToken((previous) => ...)` refuse to overwrite a token read in the same mount when `link.token === null` and storage failed.

### 4. Important cases missed by the tests

* No `<StrictMode>` component test wiring `app/patient/page.tsx` to `takeTokenFromLink()` (`lib/brokenLink.test.ts`: lines 1–29):
* **Concrete case that passes with a bug:** The 5 tests only call the pure helper `brokenLinkAfterRead` with synthetic objects, while `npm run e2e` runs against a build that executes `useEffect` once. If `app/patient/page.tsx` called `setBrokenLink(link.brokenLink)` instead of `brokenLinkAfterRead`, or dropped `link.language` on Run 2, all 5 unit tests and the e2e test would still pass.
* **Smallest fix:** Add a Vitest test that renders the patient page inside React `<StrictMode>` at `/patient#t=NOTAREALTOKEN` (and with `&l=fr`) and asserts `"This link did not work"` renders.
* No test for `hashchange` removing `#t=` / navigating to `#l=fr` or `#` after a broken link (`lib/brokenLink.test.ts`: test 5; `app/patient/page.tsx`: `"hashchange"` listener):
* **Concrete case that passes with a bug:** Test 5 explicitly expects `brokenLinkAfterRead(true, { token: null, brokenLink: false })` to stay `true`, so no test catches `"This link did not work"` remaining stuck on screen when a real `hashchange` removes `#t=` or changes to `#l=fr` (or when pressing Back to an earlier non-token hash).
* **Smallest fix:** Add a component test dispatching `hashchange` to `#l=fr` after a broken link and asserting the screen resets to `"No visit found on this phone"`.
* No test for `hashchange` from an active visit to a damaged link (`app/patient/page.tsx`: `readLink` on `"hashchange"`):
* **Concrete case that passes with a bug:** `lib/brokenLink.test.ts` never checks that a `hashchange` to `#t=NOTAREALTOKEN` while a visit is already loaded clears `token` to `null`, forgets the saved token, and switches to `"This link did not work"`.
* **Smallest fix:** Add a component test starting with a saved token and firing `hashchange` with `#t=NOTAREALTOKEN`, asserting `"This link did not work"` is shown and `loadSavedToken()` is `null`.
* No Strict Mode test for a 26-character valid-format token when `localStorage` fails (`app/patient/page.tsx`: `setToken(link.token)` and `isDeadToken(token, result)`):
* **Concrete case that passes with a bug:** Both `lib/brokenLink.test.ts` and `desk-checkin.spec.ts` (`NOTAREALTOKEN`, 13 characters) only exercise invalid-format tokens where `brokenLink` becomes `true`, missing the `deadToken` path and the Run 2 `setToken(null)` overwrite when `saveToken` cannot persist.
* **Smallest fix:** Add a Strict Mode test with a 26-character Crockford token (`result = null`) and a throwing/no-op `localStorage` stub, asserting `"This link did not work"` renders.
* No e2e check for Back / Forward navigation after a broken link (`## Not checked` in `2026-11-20-gemini-review-broken-link-fix.md`):
* **Concrete case that passes with a bug:** Navigating `/` → `/patient#t=NOTAREALTOKEN` → Back → Forward leaves the user on `"No visit found on this phone"` instead of `"This link did not work"`, while `desk-checkin.spec.ts` stays green.
* **Smallest fix:** Add a Back/Forward navigation assertion to `e2e/desk-checkin.spec.ts` after visiting `/patient#t=NOTAREALTOKEN`.

## Claude's check

- 1, `hashchange` with no `t=` after a broken link (also Back to `#l=fr`): accepted. The page uses the same rule for every read, so this read keeps the broken-link screen. The correct screen is "No visit found on this phone". The case is rare (the patient changes the address by hand or goes Back), but the rule is wrong for it.
- 1, Back from a broken link to a good link, and Back then Forward: rejected for this fix. `takeTokenFromLink` forgets the saved token on a damaged link and removes the token from the address on purpose (comment in `data/savedToken.ts`: "so neither now nor after a refresh does the phone quietly show an older visit"). Both "No visit found" and "This link did not work" link to the start page (docs/decisions.md, 2026-11-18), so the patient gets the same help.
- 2, a ref so that the first read runs one time: accepted as the better fix. Checked in the code: the double read happens because the first read changes the address and the storage, so a second read cannot give the same answer. A ref guard stops the second read, so `token`, `brokenLink` and `language` all keep the first answer, and the `hashchange` handler can use `link.brokenLink` directly. It needs a decision from the owner, because it makes `lib/brokenLink.ts` and its 5 tests unused.
- 3, `setToken(null)` on the second read when storage is blocked: accepted. Run 1 saves nothing, run 2 finds no saved token, so a good 26-character link shows "No visit found on this phone". This is in the dev server only, but the fix in point 2 also fixes it.
- 4, "npm run e2e runs against a build that executes useEffect once": rejected. `playwright.config.ts` line 29 starts `node scripts/dev.mjs`, the dev server, which runs the effect two times. That is why the e2e test failed before the fix.
- 4, a page test in React `<StrictMode>`: accepted. Cases: a damaged link (with and without `&l=fr`), a `hashchange` to `#l=fr` after a broken link, a `hashchange` from a visit to a damaged link, and a good 26-character link with blocked storage.
- 4, Back and Forward in e2e: rejected, see point 1.

## Result

- Done 2026-11-20. Owner chose the ref guard. Page test in `<StrictMode>` with the 5 accepted cases (`3ffaf50`: 2 failed, 3 passed first), then the guard in `app/patient/page.tsx` (`b5cf5b2`: 5 passed). `lib/brokenLink.ts` and its test deleted.
- Checks: 86 test files, 525 tests pass; lint passed; build passed; full e2e 35 passed, 2 failed (the survey, not built yet).
