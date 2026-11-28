// Turns the dashboard's raw counts into the numbers people read: a whole percentage or a whole
// average. When the bottom number is 0 there is nothing to divide, so it gives null, and the
// screen shows "-" (with the screen-reader text "no data yet").

/** Whole minutes on average, for example 840 seconds over 1 visit gives 14. Null when count is 0. */
export function averageMinutes(totalSeconds: number, count: number): number | null {
  if (count === 0) return null;
  return Math.round(totalSeconds / count / 60);
}

/** The average survey score, rounded to one decimal place (for example 8.5). Null when count is 0. */
export function averageScore(scoreSum: number, count: number): number | null {
  if (count === 0) return null;
  return Math.round((scoreSum / count) * 10) / 10;
}

/** Whole percent of top in bottom, for example 8 of 10 gives 80. Null when bottom is 0. */
export function share(top: number, bottom: number): number | null {
  if (bottom === 0) return null;
  if (top === 0) return 0;
  if (top === bottom) return 100;
  return Math.round((top/bottom)*100);
}

/** True when a share or average has something to divide by. A cell or tile with a 0 bottom shows only "-". */
export function hasBottom(bottom: number): boolean {
  return bottom > 0;
}
