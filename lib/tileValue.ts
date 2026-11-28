// What a dashboard tile shows: one big number and a small detail line under it.
// When there is no value, the tile shows only the "no data yet" dash, with no detail line (never "0 (-)").

export type TileValue = { big: string | null; detail: string | null };

/** The big text (the value with its unit, for example "80%") and the detail line, or two nulls when value is null. */
export function tileValue(value: number | null, detail: string, unit = ""): TileValue {
  if (value === null) return { big: null, detail: null };
  return { big: `${value}${unit}`, detail };
}
