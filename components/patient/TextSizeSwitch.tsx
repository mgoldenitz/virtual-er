"use client";

// The text size choice on patient screens (Normal, Large, Extra large). The choice is remembered
// on this phone (data/savedTextSize.ts) and sets the font size of the whole page.

import { useEffect } from "react";
import { chooseTextSize, useChosenTextSize } from "@/data/savedTextSize";
import { textFor } from "@/lib/text";
import { rootFontSize, TEXT_SIZES, type TextSize } from "@/lib/textSize";

export function TextSizeSwitch({ language }: { language: string }) {
  const t = textFor(language).textSize;
  const size = useChosenTextSize();
  const words: Record<TextSize, string> = { normal: t.normal, large: t.large, extraLarge: t.extraLarge };

  // Grow the whole page. Put it back when this screen closes, so staff screens in the same tab are not affected.
  useEffect(() => {
    document.documentElement.style.fontSize = rootFontSize(size);
    return () => {
      document.documentElement.style.fontSize = "";
    };
  }, [size]);

  return (
    <fieldset className="space-y-2">
      <legend className="font-semibold">{t.label}</legend>
      <div className="flex flex-wrap gap-2">
        {TEXT_SIZES.map((option) => {
          const checked = option === size;
          return (
            <label
              key={option}
              className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border-control bg-card px-3 ${
                checked ? "border-4 font-bold" : "border-2"
              }`}
            >
              <input
                type="radio"
                name="text-size"
                value={option}
                checked={checked}
                onChange={() => chooseTextSize(option)}
                className="h-5 w-5 shrink-0"
              />
              <span>{words[option]}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
