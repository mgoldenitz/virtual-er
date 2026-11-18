// The three text sizes a patient can choose, and the root font size each one sets.

export const TEXT_SIZES = ["normal", "large", "extraLarge"] as const;

/** The browser storage key that remembers the chosen size on this phone. */
export const TEXT_SIZE_KEY = "vwr.textSize";

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

/**
 * A short plain-JavaScript script for the page's <head>. It sets the page font size before the first
 * paint on the start page and patient screens, so a patient who chose a larger size does not see the
 * page at Normal size first. It does nothing on other pages (staff, dashboard), and does nothing if
 * browser storage is blocked. The key and the sizes are written in as JSON, so they are defined only in this file.
 */
export function textSizeScript(): string {
  return `(function () {
  var path = location.pathname;
  if (path !== "/" && !path.startsWith("/patient")) return;
  try {
    var saved = localStorage.getItem(${JSON.stringify(TEXT_SIZE_KEY)});
    var sizes = ${JSON.stringify(ROOT_FONT_SIZES)};
    if (saved && Object.prototype.hasOwnProperty.call(sizes, saved)) {
      document.documentElement.style.fontSize = sizes[saved];
    }
  } catch {
    // Storage blocked: the page stays at Normal size.
  }
})();`;
}
