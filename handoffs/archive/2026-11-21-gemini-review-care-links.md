# Gemini review: start page links and two builder notes

Model: Gemini Hydrogen 4, High, in a new chat. If you have no Gemini Hydrogen 4 credits, use Gemini 3.6 Flash, High.

## Prompt to paste

You review a small change in a Next.js 16 App Router prototype (React 19, Tailwind CSS v4). It is a virtual ER waiting room with synthetic data only. Find problems. Do not confirm that the work is good. For each problem, give the file, the line, what goes wrong for a user, and the smallest fix. If you find no problem in a part, say "no problem found" for that part.

### Part 1: the change

On the start page, two links stand alone (not inside a sentence). They must be at least 44 px high, like the buttons. Before the change they were `inline-block min-h-11`, so the words sat at the top of the 44 px box. Now they are `inline-flex min-h-11 items-center`, without `inline-block`. Links inside a sentence stay `inline-block py-1` (WCAG 2.5.8, 24 by 24 px).

Line counts: `components/start/CareOptions.tsx` 65 lines, `components/start/CareOptions.test.tsx` 49 lines.

```diff
--- a/components/start/CareOptions.tsx
+++ b/components/start/CareOptions.tsx
+// The look that every link shares. py-1 gives space above and below the words.
+const baseStyle = "py-1 font-semibold text-brand underline underline-offset-2";
 // inline-block with py-1 makes each link a tap target of at least 24 by 24 pixels (WCAG 2.5.8).
-const linkStyle = "inline-block py-1 font-semibold text-brand underline underline-offset-2";
+const linkStyle = `inline-block ${baseStyle}`;
 // A link that stands alone (not inside a sentence) is at least 44 pixels high, like the buttons.
-const aloneStyle = `${linkStyle} min-h-11`;
+// inline-flex with items-center puts the words in the middle of that height, not at the top.
+const aloneStyle = `inline-flex min-h-11 items-center ${baseStyle}`;
```

The component that uses the styles (unchanged):

```tsx
function External({ href, children, newTab, alone }: { href: string; children: string; newTab: string; alone?: boolean }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={alone ? aloneStyle : linkStyle}>
      {children}
      <span className="sr-only"> {newTab}</span>
    </a>
  );
}
```

The two links that stand alone are each the only content of an `<li>` or a `<p>`. The text can be English, French, Urdu, Arabic or Chinese (Urdu and Arabic are right to left).

```diff
--- a/components/start/CareOptions.test.tsx
+++ b/components/start/CareOptions.test.tsx
     for (const classes of links) {
-      expect(classes).toContain("inline-block");
+      // A link in a sentence is inline-block; a link that stands alone is inline-flex (next test).
+      expect(classes.includes("inline-block") || classes.includes("inline-flex")).toBe(true);
       expect(classes).toContain("py-1");
     }
   });
 
+  it("puts the words of the 2 links that stand alone in the middle of their 44 pixels", () => {
+    const t = textFor("en").start;
+    const html = renderToStaticMarkup(<CareOptions language="en" />);
+    for (const words of [t.virtualCare, t.waitTimesLink]) {
+      const tag = html.match(new RegExp(`<a [^>]*>${words.replace(/'/g, "&#x27;")}`))?.[0] ?? "";
+      const classes = tag.match(/class="([^"]*)"/)?.[1].split(" ") ?? [];
+      expect(classes).toContain("inline-flex");
+      expect(classes).toContain("items-center");
+      // inline-block and inline-flex both set display, so a link has only one of them.
+      expect(classes).not.toContain("inline-block");
+    }
+  });
```

Questions for part 1:
1. With `inline-flex`, the link text and the `sr-only` span are flex items. Can a long link text in a narrow phone (390 px) now fail to wrap, or wrap in a bad way, where `inline-block` wrapped well?
2. Does the `sr-only` span (absolute position) change the layout or the name a screen reader reads, inside `inline-flex`?
3. Does the underline still show under each line when the text wraps to two lines?
4. Is anything wrong for right-to-left text?

### Part 2: two notes I did not fix

A worker wrote two notes. I think both are not real faults. Tell me if I am wrong.

Note A: "the wait text can read '35 to 1 hour'". The code:

```ts
export function formatWaitRange(low: number, high: number, language: string | null | undefined): string {
  const t = textFor(language).patient;
  const words = (language && WORDS[language]) || enDuration;
  if (high < 60) return fill(t.waitRangeLong, { low, high: formatDuration(high, words) });
  return fill(t.waitRangeLong, { low: formatDuration(low, words, "low"), high: formatDuration(high, words, "high") });
}
```

`waitRangeLong` in English is "{low} to {high}". `formatDuration(35, words)` gives "35 minutes", and 60 gives "1 hour". A test checks that `formatWaitRange(40, 60, "en")` gives "40 minutes to 1 hour". The note probably came from an e2e regex, `/\d+\s+(?:hours?\s+|minutes?\s+)?to\s+\d+/`, which also matches "35 minutes to 1".

Note B: "`/patient` has two `main` elements after the move from `/`". In the source, `/patient` has one `<main>`, and `/` has its own `<main>`. `next.config.ts` has `cacheComponents: true`. The start page goes to `/patient` with `router.push("/patient")`. I think Next.js 16 keeps the `/` page in the DOM, hidden with `display: none` (React `Activity`), so the second `main` is not in the accessibility tree.

Questions for part 2:
5. Can `formatWaitRange` give a number with no unit before "to", for any `low` and `high`? Give the values if yes.
6. Is my reason for note B right? If a hidden `main` stays in the DOM, can it cause a problem for a screen reader, for `getByRole("main")` in tests, or for an `id` that both pages use (for example two elements with the same `id`)?

## Checked

- `npx vitest run components/start/CareOptions.test.tsx` before the fix: 1 failed, 2 passed (`d4df1d2`).
- After the fix (`4b19db4`): 88 test files, 570 tests pass; lint exit 0; build passed.

## Not checked

- The links on a real phone, in a browser, or with a screen reader.
- The full e2e run after this change.
- Note B in a browser (count of `main` elements and whether one is hidden).

## Response

Gemini Hydrogen 4, High, 2026-11-21 (pasted by the owner).

Part 1, questions 1 to 4: no problem found for wrapping at 390 px, the `sr-only` span layout, the underline on two lines, or right-to-left text. Side note on question 2: the leading space in `<span className="sr-only"> {newTab}</span>` can collapse because the span is absolutely positioned (already true with `inline-block`); the "(" in `newTab` still separates the words in speech.

Problems found in part 1:
1. `CareOptions.test.tsx`, the `for (const classes of links)` loop: it no longer checks that links inside sentences stay `inline-block`. If `aloneStyle` went on an in-sentence link (for example `hoursLink`), all tests would pass. Fix: check that each link outside `[t.virtualCare, t.waitTimesLink]` has `inline-block` and not `inline-flex`.
2. The new test does not check `min-h-11`; removing it would shrink the tap targets and the test would still pass. Also, `words` goes into `new RegExp(...)` without escaping regex characters or entities such as `&`. Fix: add `expect(classes).toContain("min-h-11")`, and escape `words` or query the DOM.

Part 2:
5. Note A: when `high < 60`, `low` is a bare number by design ("20 to 45 minutes"). Bug only for an inverted range (`high < 60 <= low`, for example 90 and 45 gives "90 to 45 minutes"). For 35 and 60 the result is "35 minutes to 1 hour", so the note likely came from the e2e regex matching "35 minutes to 1". Fix if callers do not guarantee `low <= high`: clamp `low = Math.min(low, high)`; tighten the e2e regex.
6. Note B: the reason is right. `Activity mode="hidden"` sets `display: none` on the `/` page, so only one `main` is in the accessibility tree. Problems a hidden page can still cause: (1) duplicate `id`s shared by `/` and `/patient` (labels, `aria-labelledby`, skip links, focus targets) resolve to the first element in the DOM, which can be the hidden one; fix with `useId()` or scope lookups to the visible `main`. (2) `page.locator("main")` and `querySelectorAll("main")` match both; use `getByRole("main")`. (3) Screen readers are affected only through item 1 or a portal outside `Activity`.

## Claude's check

- Part 1, item 1: accepted. New test "keeps the 2 links inside sentences inline-block" (811 and `hoursLink`: `inline-block`, not `inline-flex`). It passes at once, as a guard, because the code is already right.
- Part 1, item 2: rejected. `min-h-11` is checked by the existing test "makes the 2 links that stand alone 44 pixels high". Regex escaping: rejected; the link texts are fixed and the old test uses the same pattern.
- Side note on the `sr-only` space: not from this change; left as it is.
- Note A, inverted range: rejected. `waitRange` in `lib/queue.ts` line 66 gives `high = Math.max(low + 5, ...)`, so `high` is always more than `low`; `components/patient/PatientStatus.tsx` line 56 is the only caller. The e2e regex stays (it matches the real text).
- Note B: the reason is confirmed. Duplicate `id`s: none. Ids on `/`: `options-heading`, `start-heading`, `saved-heading`, `start-paused`, `site-paused`. Ids on `/patient`: `status-heading`, `still-here-heading`, `still-here-thanks`, `still-here-card`, `still-here`, `sound-on`, `sound-failed`, `sound-off-called`, `confirmed`. `LanguageSwitch` wraps the `select` in its `label` (no `id`). `e2e/home-start.spec.ts` line 35 already filters `main` by text.
