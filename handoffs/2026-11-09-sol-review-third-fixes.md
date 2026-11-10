# Virtual Waiting Room: fixes after the third Phase 1 review, for a short check

Next.js 16 App Router + TypeScript + Tailwind. Phase 1 has no server: visits live in the browser's localStorage. Demo data only; this file contains no keys, tokens, passwords or patient data.

## What the third review found, and what was done

| # | Finding | Action |
|---|---------|--------|
| 1 | Saving replaces an unreadable roster | `writeVisits` in `data/visitStore.ts` refuses every save (`not_saved`) while the saved text is unreadable. New `resetUnreadableStorage()` copies the unreadable text to `vwr.visits.v1.unreadable-backup.<time>` first and clears the list only if that copy was stored. `components/staff/StorageWarning.tsx` says saving has stopped and offers "Start a new list…" with a second confirmation ("Yes, keep a backup and start a new list") |
| 2 | "Last five" hides older closures | `recentlyClosed()` now returns every closure at the site; `components/staff/RecentlyClosed.tsx` shows 5, then "Show older closures (N more)" adds 5 at a time until all are shown |
| 3 | Timestamp is not a unique closure ID | `undoClose(visit, closure)` now matches status, removed_reason, arrived_at and closed_at together. Two closures of different kinds in the same millisecond are told apart (tested). Two of the same kind in the same millisecond leave an identical visit, so undoing either gives the same result; no new data field was added (SPEC asks for none unless a phase needs it) |

Noted for later, not changed now:
- Re-check `statusBeforeClose` when reassessment or other transitions that reset times arrive (Phase 3).
- Decide how reopening affects survey answers and daily_stats before they exist (Phase 4).
- Test with a real screen reader (Phase 3 WCAG check).

42 unit tests pass; lint and type check are clean. Checked in a real browser: 7 closures show 5, then all 7 after "Show older closures"; with unreadable saved text, check-in is refused and the text is untouched; after confirming, a backup holds the old text and check-in works again.

## Questions for you

1. Do these three changes close the findings?
2. Is refusing all saves while the list is unreadable (until staff confirm a reset with backup) the right behaviour for patient-side actions too?
