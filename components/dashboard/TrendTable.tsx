// One site's past 7 days as a table: one row per day, with each share and average next to its counts.
// On a phone the table scrolls sideways inside its own box, so the page itself does not.

import type { SiteNumbers } from "@/lib/dashboardNumbers";
import { averageMinutes, averageScore, share } from "@/lib/dashboardShare";
import type { TrendDay } from "@/lib/trendNumbers";
import { responseCount, visitCount } from "@/lib/visitCount";
import { WAIT_START_DAY } from "@/lib/waitStart";
import { NoData, NumberOrDash, Percent } from "./NumberParts";

type Props = { site: "A" | "B"; trend: TrendDay[] };

const HEADERS = [
  "Triaged CTAS 4 or 5",
  "Offered",
  "Accepted",
  "Average minutes from recall to arrival",
  "Average minutes from offer to recall",
  "Average score (0 to 10)",
];

/** The 6 number cells for one day. Before the wait start date, the wait cell is only a dash. */
function DayCells({ n, hasWait }: { n: SiteNumbers; hasWait: boolean }) {
  const cell = "border-b border-slate-200 px-2 py-2 text-right";
  return (
    <>
      <td className={cell}>{n.triaged}</td>
      <td className={cell}>
        {n.offered} of {n.triaged} (<Percent value={share(n.offered, n.triaged)} />)
      </td>
      <td className={cell}>
        {n.accepted} of {n.offered} (<Percent value={share(n.accepted, n.offered)} />)
      </td>
      <td className={cell}>
        <NumberOrDash value={averageMinutes(n.recallToArrivalSeconds, n.arrivedAfterRecall)} /> (
        {visitCount(n.arrivedAfterRecall)})
      </td>
      <td className={cell}>
        {hasWait ? (
          <>
            <NumberOrDash value={averageMinutes(n.offerToCallSeconds, n.recalled)} /> ({visitCount(n.recalled)})
          </>
        ) : (
          <NoData />
        )}
      </td>
      <td className={cell}>
        <NumberOrDash value={averageScore(n.surveyScoreSum, n.surveyResponses)} /> ({responseCount(n.surveyResponses)})
      </td>
    </>
  );
}

export function TrendTable({ site, trend }: Props) {
  // The dates are "YYYY-MM-DD", so comparing the text compares the dates.
  const someBeforeStart = trend.some((d) => d.day < WAIT_START_DAY);
  const caption = `Demo Site ${site}, past 7 days`;

  return (
    <section className="glass-panel space-y-2">
      {/* "relative" keeps the absolute sr-only words inside this box, or the phone page scrolls sideways. */}
      <div className="relative overflow-x-auto" role="region" aria-label={caption} tabIndex={0}>
        <table className="w-full border-collapse text-sm">
          <caption className="mb-2 text-left text-lg font-bold">{caption}</caption>
          <thead>
            <tr>
              <th scope="col" className="border-b-2 border-slate-300 px-2 py-2 text-left">
                Day
              </th>
              {HEADERS.map((h) => (
                <th key={h} scope="col" className="border-b-2 border-slate-300 px-2 py-2 text-right">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trend.map((d) => (
              <tr key={d.day}>
                <th scope="row" className="whitespace-nowrap border-b border-slate-200 px-2 py-2 text-left">
                  {d.day}
                </th>
                <DayCells n={d.numbers[site]} hasWait={d.day >= WAIT_START_DAY} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm">Each number counts on the date of its own event.</p>
      {someBeforeStart && <p className="text-sm">Wait numbers start on {WAIT_START_DAY}.</p>}
    </section>
  );
}
