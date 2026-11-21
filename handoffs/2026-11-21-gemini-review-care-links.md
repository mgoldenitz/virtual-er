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
