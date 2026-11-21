// The past 7 days part of the dashboard: the 2 site tables and the CSV button.
// When no past day has a number, one line shows instead (owner decision 2026-11-21).

import { hasPastData, type TrendDay } from "@/lib/trendNumbers";
import { CsvButton } from "./CsvButton";
import { TrendTable } from "./TrendTable";

type Props = { trend: TrendDay[]; today: string; isDemo: boolean };

export function PastDaysView({ trend, today, isDemo }: Props) {
  if (!hasPastData(trend)) {
    return <p>No past days with visits yet.</p>;
  }
  return (
    <>
      <TrendTable site="A" trend={trend} />
      <TrendTable site="B" trend={trend} />
      <CsvButton trend={trend} today={today} isDemo={isDemo} />
    </>
  );
}
