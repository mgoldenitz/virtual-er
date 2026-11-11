# Review request: new visual style (clean for patients, glass for staff)

Project: Next.js 16 (App Router) + Tailwind CSS 4 prototype of an emergency department virtual waiting
room. Demo data only. Hard rule: WCAG 2.2 AA (keyboard access, visible focus, 24x24 px touch targets,
enough colour contrast, text works at 200%, reflows on a small phone, never colour alone).

## What changed

- Patient screens (start page, patient status page): "clean" look. Light-grey page (#f8fafc) with
  white cards (1px #e2e8f0 edge, 16px radius). System font. The two 911 lines stay solid red-bordered
  boxes, unchanged.
- Staff screens (login, staff, dashboard): "glass" look. Pale colour-wash background, panels that are
  82% white with a 16px backdrop blur, Plus Jakarta Sans font (via next/font), brand blue #1856ff.
- Panels turn solid white when the user asks for less transparency or more contrast, or the browser
  cannot blur.
- Input and select borders went from #94a3b8 (2.6:1, failed WCAG 1.4.11) to #64748b (4.8:1).
- Colours are now tokens in app/globals.css; the staff screens override --color-brand in a
  .theme-staff scope.

## Key CSS (app/globals.css)

```css
@theme {
  --color-brand: #1e40af;        /* white text on it 8.7:1 */
  --color-brand-strong: #1e3a8a;
  --color-ink: #111827;
  --color-muted: #374151;
  --color-canvas: #f8fafc;
  --color-card: #ffffff;
  --color-line: #e2e8f0;
  --color-control: #64748b;      /* 4.8:1 */
}
.theme-staff { --color-brand: #1856ff; --color-brand-strong: #0f3fd1; --color-ink: #141414; }
.staff-backdrop {
  background-color: #eef2fb;
  background-image:
    radial-gradient(at 10% 0%, rgb(24 86 255 / 0.22) 0, transparent 50%),
    radial-gradient(at 95% 15%, rgb(58 52 78 / 0.14) 0, transparent 45%),
    radial-gradient(at 50% 100%, rgb(7 202 107 / 0.12) 0, transparent 50%);
}
.glass-panel {
  background-color: rgb(255 255 255 / 0.82);
  border: 1px solid rgb(255 255 255 / 0.9);
  border-radius: 1.25rem; padding: 1.25rem;
  box-shadow: 0 8px 32px rgb(20 20 40 / 0.08), inset 0 1px 0 rgb(255 255 255 / 0.7);
  backdrop-filter: blur(16px) saturate(150%);
}
@media (prefers-reduced-transparency: reduce), (prefers-contrast: more) {
  .glass-panel { background-color: #fff; border-color: var(--color-control); backdrop-filter: none; }
}
@supports not (backdrop-filter: blur(1px)) { .glass-panel { background-color: #fff; } }
```

## Checks already done

Type check, lint and 67 unit tests pass. Every screen loads. Screenshots checked at 390px (phone,
start page) and 1280px (laptop, login). The staff and dashboard screens need a signed-in account and
were not screenshotted.

## Questions

1. Any colour pair here that could fail WCAG 2.2 AA (text 4.5:1, controls and focus 3:1)? Note that
   some text (page headings and intro paragraphs) sits directly on the colour-wash background, not on a
   panel.
2. Is the glass fallback (reduced transparency, more contrast, no blur support) enough?
3. Anything in this approach (tokens in @theme, a scoped override for staff, two "shell" wrapper
   components) that will cause trouble later?
