// One button style for the whole app: large touch target, visible keyboard focus.

import type { ComponentPropsWithRef } from "react";

type Variant = "primary" | "secondary" | "danger";

// Colours come from the tokens in app/globals.css (lib/contrast.test.ts checks them).
// Hover and press colours start with "not-disabled:not-aria-disabled:", so a grayed-out
// button does not change colour (Button.test.tsx checks this).
const styles: Record<Variant, string> = {
  primary:
    "bg-brand text-white not-disabled:not-aria-disabled:hover:bg-brand-strong not-disabled:not-aria-disabled:active:bg-brand-strong",
  secondary:
    "border-2 border-control bg-card text-ink not-disabled:not-aria-disabled:hover:bg-line not-disabled:not-aria-disabled:active:bg-line",
  danger:
    "bg-red-800 text-white not-disabled:not-aria-disabled:hover:bg-red-900 not-disabled:not-aria-disabled:active:bg-red-900",
};

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ComponentPropsWithRef<"button"> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={`min-h-11 rounded-xl px-4 py-2 text-base font-semibold focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
