// One site's dashboard numbers: the "Now" counts, the 4 key "Today" numbers, the other numbers under
// "More numbers" (closed at first) and the off-site wait bands, as tiles with a big number and a small detail line.
// A percentage or average with nothing to divide by shows only a dash, read aloud as "no data yet".

import type { SiteNumbers as Counts } from "@/lib/dashboardNumbers";
import { averageMinutes, averageScore, share } from "@/lib/dashboardShare";
import { tileValue } from "@/lib/tileValue";
import { responseCount, visitCount } from "@/lib/visitCount";
import { Row, TileText, tileGrid } from "./NumberParts";
import { WaitBands } from "./WaitBands";

type Props = {
  site: "A" | "B";
  numbers: Counts;
};

export function SiteNumbers({ site, numbers: n }: Props) {
  const offeredShare = share(n.offered, n.triaged);
  const acceptedShare = share(n.accepted, n.offered);
  const minutes = averageMinutes(n.recallToArrivalSeconds, n.arrivedAfterRecall);
  const waitMinutes = averageMinutes(n.offerToCallSeconds, n.recalled);
  const score = averageScore(n.surveyScoreSum, n.surveyResponses);
  const nineOrTenShare = share(n.survey9or10, n.surveyResponses);

  return (
    <section aria-labelledby={`site-${site}-heading`} className="clean-card space-y-3">
      <h2 id={`site-${site}-heading`} className="text-2xl font-bold">
        Demo Site {site}
      </h2>

      <h3 className="text-lg font-bold">Now</h3>
      <dl className={tileGrid}>
        <Row label="Waiting off-site">{n.waitingNow}</Row>
        <Row label="Recalled, not yet arrived">{n.recalledNow}</Row>
      </dl>

      <h3 className="text-lg font-bold">Today (since midnight, Toronto time)</h3>
      <dl className={tileGrid}>
        <Row label="Offered off-site waiting">
          <TileText value={tileValue(offeredShare, `${n.offered} of ${n.triaged} triaged`, "%")} />
        </Row>
        <Row label="Accepted">
          <TileText value={tileValue(acceptedShare, `${n.accepted} of ${n.offered} offered`, "%")} />
        </Row>
        <Row label="Average minutes from offer to recall">
          <TileText value={tileValue(waitMinutes, visitCount(n.recalled))} />
        </Row>
        <Row label="Unable to reach (nurse confirmed)">{n.unableToReach}</Row>
      </dl>

      <details className="space-y-3">
        <summary className="min-h-11 cursor-pointer py-2 font-bold">More numbers</summary>
        <dl className={tileGrid}>
          <Row label="Back for reassessment">{n.reassessmentNow}</Row>
          <Row label="Declined">{n.declined}</Row>
          <Row label="Average minutes from recall to arrival">
            <TileText value={tileValue(minutes, visitCount(n.arrivedAfterRecall))} />
          </Row>
          <Row label="No-shows">{n.noShows}</Row>
          <Row label="Left">{n.left}</Row>
          <Row label="Average score (0 to 10)">
            <TileText value={tileValue(score, responseCount(n.surveyResponses))} />
          </Row>
          <Row label="Scored 9 or 10">
            <TileText value={tileValue(nineOrTenShare, `${n.survey9or10} of ${n.surveyResponses} responses`, "%")} />
          </Row>
        </dl>
      </details>

      <WaitBands numbers={n} />
    </section>
  );
}
