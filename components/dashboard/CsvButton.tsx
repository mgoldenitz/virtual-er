"use client";

// The "Download past 7 days (CSV)" button. It makes the CSV text in the browser and saves it as a file.
// When no past day has a number, a short line shows instead of the button.

import { Button } from "@/components/Button";
import { dashboardCsv } from "@/lib/dashboardCsv";
import { hasPastData, trendCsvRows, type TrendDay } from "@/lib/trendNumbers";

type Props = { trend: TrendDay[]; today: string; isDemo: boolean };

export function CsvButton({ trend, today, isDemo }: Props) {
  if (!hasPastData(trend)) {
    return <p className="text-sm">No past days to download yet.</p>;
  }

  function download() {
    const text = dashboardCsv(trendCsvRows(trend), isDemo);
    const file = new Blob([text], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(file);
    // A link that is never on the page: clicking it saves the file with this name.
    const link = document.createElement("a");
    link.href = url;
    link.download = `waitwell-stats-${isDemo ? "demo" : "real"}-${today}.csv`;
    link.click();
    // Some browsers stop the download if the link is taken back at once.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <Button variant="secondary" onClick={download}>
      Download past 7 days (CSV)
    </Button>
  );
}
