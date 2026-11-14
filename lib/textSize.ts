// The three text sizes a patient can choose, and the root font size each one sets.

export const TEXT_SIZES = ["normal", "large", "extraLarge"] as const;

export type TextSize = (typeof TEXT_SIZES)[number];

const ROOT_FONT_SIZES: Record<TextSize, string> = {
  normal: "100%",
  large: "125%",
  extraLarge: "150%",
};

/** True only for the three sizes the patient can choose. */
export function isTextSize(value: unknown): value is TextSize {
  return typeof value === "string" && (TEXT_SIZES as readonly string[]).includes(value);
}

/** The font size of the whole page. Tailwind sizes are in rem, so all text and spacing grow together. */
export function rootFontSize(size: TextSize): string {
  return ROOT_FONT_SIZES[size];
}
