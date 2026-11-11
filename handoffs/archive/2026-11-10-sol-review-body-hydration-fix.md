# Review request: hydration warning fix in the root layout

Project: Next.js 16 (App Router) prototype of an emergency department virtual waiting room. Demo data only.

## The problem

In development, the browser console showed a React hydration mismatch on `<body>`. The only differences were two attributes that the Grammarly browser extension adds before React loads:

- `data-new-gr-c-s-check-loaded="14.1346.0"`
- `data-gr-ext-installed=""`

`<html>` already had `suppressHydrationWarning` for the same reason.

## The change (app/layout.tsx)

```tsx
// suppressHydrationWarning: browser extensions (for example writing tools) add their own
// attributes to <html> and <body> before React loads (Grammarly writes to <body>). This
// ignores attribute differences on these two tags only; mismatches inside the app's own
// screens are still reported.
<html lang="en" className="h-full" suppressHydrationWarning>
  <body className="flex min-h-full flex-col bg-white text-slate-900" suppressHydrationWarning>
    <div className="flex flex-1 flex-col">{children}</div>
    <Footer />
  </body>
</html>
```

## Question

Is putting `suppressHydrationWarning` on `<body>` safe and the usual fix here? Could it hide real hydration bugs in the app's own screens or components? Is there a better approach?
