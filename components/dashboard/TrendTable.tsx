// One site's past 7 days as a table, one row per day. The table scrolls sideways in its own box on a narrow
// screen; the heading stays outside the box. The score column shows only when the site has a survey response.

import { useId, type ReactNode } from "react";
import type { SiteNumbers } from "@/lib/dashboardNumbers";
import { averageMinutes, averageScore, share } from "@/lib/dashboardShare";
import { trendHasScores } from "@/lib/trendHasScores";
import type { TrendDay } from "@/lib/trendNumbers";
import { responseCount, visitCount } from "@/lib/visitCount";
import { WAIT_START_DAY } from "@/lib/waitStart";
import { NoData, NumberOrDash, Percent } from "./NumberParts";

const HEADERS = ["Triaged", "Offered", "Accepted", "Recall to arrival (min)", "Offer to recall (min)"];
const SCORE_HEADER = "Score (0 to 10)";

// Below sm (640 px) the cells are tighter and may wrap, so all columns fit in the card on a 390 px phone.
const pad = "px-0.5 py-2 first:pl-0 last:pr-0 sm:px-2 sm:first:pl-2 sm:last:pr-2";
const cell = `border-b border-line text-right sm:whitespace-nowrap ${pad}`;

/** The small, light count after a number, such as "(3 visits)". On a phone it goes on its own line. */
function Count({ children }: { children: ReactNode }) {
  return <span className="block text-xs font-normal text-muted sm:inline"> ({children})</span>;
}

/** A share or average cell: only the dash when the bottom number is 0, else the value and its count. */
function ValueCell({ bottom, children, count }: { bottom: number; children: ReactNode; count: ReactNode }) {
  return (
    <td className={cell}>
      {bottom === 0 ? (
        <NoData />
      ) : (
        <>
          {children}
          <Count>{count}</Count>
        </>
      )}
    </td>
  );
}

function DayCells({ n, hasWait, showScore }: { n: SiteNumbers; hasWait: boolean; showScore: boolean }) {
  return (
    <>
      <td className={cell}>{n.triaged}</td>
      <ValueCell bottom={n.triaged} count={`${n.offered} of ${n.triaged}`}>
        <Percent value={share(n.offered, n.triaged)} />
      </ValueCell>
      <ValueCell bottom={n.offered} count={`${n.accepted} of ${n.offered}`}>
        <Percent value={share(n.accepted, n.offered)} />
      </ValueCell>
      <ValueCell bottom={n.arrivedAfterRecall} count={visitCount(n.arrivedAfterRecall)}>
        <NumberOrDash value={averageMinutes(n.recallToArrivalSeconds, n.arrivedAfterRecall)} />
      </ValueCell>
      <ValueCell bottom={hasWait ? n.recalled : 0} count={visitCount(n.recalled)}>
        <NumberOrDash value={averageMinutes(n.offerToCallSeconds, n.recalled)} />
      </ValueCell>
      {showScore && (
        <ValueCell bottom={n.surveyResponses} count={responseCount(n.surveyResponses)}>
          <NumberOrDash value={averageScore(n.surveyScoreSum, n.surveyResponses)} />
        </ValueCell>
      )}
    </>
  );
}

export function TrendTable({ trend, site }: { trend: TrendDay[]; site: "A" | "B" }) {
  const headingId = useId();
  const someBeforeStart = trend.some((d) => d.day < WAIT_START_DAY);
  const showScore = trendHasScores(trend, site);
  const headers = showScore ? [...HEADERS, SCORE_HEADER] : HEADERS;

  return (
    <section className="clean-card space-y-2">
      <h2 id={headingId} className="text-lg font-bold">
        {`Demo Site ${site}, past 7 days`}
      </h2>
      {/* "relative" keeps the sr-only text inside this scroll box, so it does not widen the page. */}
      <div className="relative overflow-x-auto" role="region" aria-labelledby={headingId} tabIndex={0}>
        <table className="w-full border-collapse text-xs sm:text-sm">
          <thead>
            <tr>
              <th scope="col" className={`border-b-2 border-control text-left ${pad}`}>
                Day
              </th>
              {headers.map((h) => (
                <th key={h} scope="col" className={`border-b-2 border-control text-right sm:whitespace-nowrap ${pad}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trend.map((d) => (
              <tr key={d.day}>
                <th scope="row" className={`border-b border-line text-left font-normal sm:whitespace-nowrap ${pad}`}>
                  {d.day}
                </th>
                <DayCells n={d.numbers[site]} hasWait={d.day >= WAIT_START_DAY} showScore={showScore} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm">
        Each number counts on the date of its own event.
        {someBeforeStart && ` Wait numbers start on ${WAIT_START_DAY}.`}
      </p>
    </section>
  );
}
