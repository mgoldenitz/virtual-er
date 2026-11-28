// Decides if the past-7-days table shows the score column for one site: only when that site has a survey response.

import type { TrendDay } from "./trendNumbers";

export function trendHasScores(trend: TrendDay[], site: "A" | "B"): boolean {
  return trend.some((d) => d.numbers[site].surveyResponses > 0);
}
