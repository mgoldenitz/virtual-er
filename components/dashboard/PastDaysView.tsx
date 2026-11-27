"use client";

// The past 7 days part of the dashboard: a Site A / Site B switch, one site table and the CSV button.
// When no past day has a number, one line shows instead (owner decision 2026-11-21).

import { useId, useState } from "react";
import { Button } from "@/components/Button";
import { hasPastData, type TrendDay } from "@/lib/trendNumbers";
import { CsvButton } from "./CsvButton";
import { TrendTable } from "./TrendTable";

type Props = { trend: TrendDay[]; today: string; isDemo: boolean };

export function PastDaysView({ trend, today, isDemo }: Props) {
  const [site, setSite] = useState<"A" | "B">("A");
  const labelId = useId();

  if (!hasPastData(trend)) {
    return <p>No past days with visits yet.</p>;
  }

  return (
    <>
      <div role="group" aria-labelledby={labelId} className="flex flex-wrap items-center gap-2">
        <span id={labelId} className="font-semibold">
          Site
        </span>
        {(["A", "B"] as const).map((s) => (
          <Button key={s} variant={site === s ? "primary" : "secondary"} aria-pressed={site === s} onClick={() => setSite(s)}>
            {`Site ${s}`}
          </Button>
        ))}
      </div>
      <TrendTable site={site} trend={trend} />
      <CsvButton trend={trend} today={today} isDemo={isDemo} />
    </>
  );
}
