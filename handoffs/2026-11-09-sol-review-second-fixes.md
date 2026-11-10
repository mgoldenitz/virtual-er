# Virtual Waiting Room: fixes after the second Phase 1 review, for a third review

Next.js 16 App Router + TypeScript + Tailwind. Phase 1 has no server: visits live in the browser's localStorage and tabs sync through the `storage` event. Demo data only; this file contains no keys, tokens, passwords or patient data.

## What the second review found, and what was done

| # | Finding | Action |
|---|---------|--------|
| 1 | 10-second Undo is a time limit with no extension; a second closure replaces the first banner | Banner removed. New "Recently closed" list (`components/staff/RecentlyClosed.tsx`, rule in `lib/recentlyClosed.ts`): the last 5 arrived/removed visits at the site, each with its own Undo, **no time limit**. Derived from the saved visits, so it survives a refresh |
| 2 | Stale Undo can reverse a newer action | `undoClose(visit, closedAt)` in `lib/visitActions.ts` refuses unless `visit.closed_at === closedAt` (the closure the button belongs to). The earlier status is read from the visit itself (`confirmed_at` → on_the_way, `called_at` → called, else waiting), since closing keeps those times. Test: undo restores exactly the pre-closure visit; an old removal's Undo is refused after a later arrival |
| 3 | Failed Undo removes the retry control; focus lost after success | The list row stays until the Undo works, with a failure note beside it, and focus stays on its button. After a working Undo, focus moves to the list heading |
| 4 | Object `ctas_level`, invalid dates accepted; damage hidden | `lib/parseVisits.ts` now checks every field (enums, CTAS 4/5/null, real dates via `Date.parse`, integer counts, survey 0–10, booleans). It returns `{ visits, damaged, unreadable }`. The store writes damaged entries back untouched, and `components/staff/StorageWarning.tsx` shows a red alert with the count |
| 5 | Failed check-in leaves the previous slip visible | `CheckInPanel` calls `onAttempt()` (hides the slip) before every check-in attempt |
| 6 | Invalid link, then refresh, reopens an older visit | `takeTokenFromLink()` returns `{ token, brokenLink }`; a damaged link also removes the saved token. Patient sees "This link did not work"; after refresh, "No visit found on this phone" |
| 7 | Repeated call-back may be silent; hidden-tab callbacks not replayed | `StatusAnnouncer` empties both live regions on every status change and fills the new text 300 ms later, only while the page is visible (waits for `visibilitychange` otherwise). Same path for the initial call-back and later ones |
| 8 | Staff "Seen" / "On the way" not announced | `lib/progressChanges.ts` (compares `seen_at` / `confirmed_at`, not status, so an Undo is not announced as news) + `components/staff/ProgressAnnouncer.tsx` polite region, current site only, no minute counters |
| — | "Seen" meaning | Row now says "Seen (screen shown, not necessarily read)" |
| — | Wait-interval label | Not changed yet; waiting for the owner's decision |

40 unit tests pass; lint and type check are clean. Checked in a real browser (two tabs): call-back → Seen announced to staff; Left → row in Recently closed after 12 s; Undo → back to called, patient call-back announced again; failed check-in hides old slip; damaged record shows the warning; broken link then refresh shows no older visit.

## Questions for you

1. Do these changes close findings 1–8, or does any leave a gap?
2. Is an untimed "last 5 closures" list a sound answer to WCAG 2.2.1, and is it safe that Undo has no time limit (it only works while the visit is still exactly as that closure left it)?
3. Is inferring the pre-closure status from `confirmed_at` / `called_at` correct for every path in this codebase?
4. Did any change introduce a new bug or change the normal core loop?
