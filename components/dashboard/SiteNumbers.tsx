// One site's dashboard numbers: the "Now" counts and the "Today" counts, as label and value pairs.
// A percentage or average with nothing to divide by shows a dash, read aloud as "no data yet".

import type { ReactNode } from "react";
import type { SiteNumbers as Counts } from "@/lib/dashboardNumbers";
import { averageMinutes, averageScore, share } from "@/lib/dashboardShare";
import { visitCount } from "@/lib/visitCount";

type Props = {
  site: "A" | "B";
  numbers: Counts;
};

/** The dash shown when a share or average has no data: seen as "-", read aloud as "no data yet". */
function NoData() {
  return (
    <>
      <span aria-hidden="true">-</span>
      <span className="sr-only">no data yet</span>
    </>
  );
}

/** A whole percent such as "80%", or the NoData dash (with no "%") when there is no data. */
function Percent({ value }: { value: number | null }) {
  return value === null ? <NoData /> : <>{value}%</>;
}

/** One label and value pair in the list. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-3 border-b border-slate-200 py-2">
      <dt className="font-semibold">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function SiteNumbers({ site, numbers: n }: Props) {
  const offeredShare = share(n.offered, n.triaged);
  const acceptedShare = share(n.accepted, n.offered);
  const minutes = averageMinutes(n.recallToArrivalSeconds, n.arrivedAfterRecall);
  const score = averageScore(n.surveyScoreSum, n.surveyResponses);
  const nineOrTenShare = share(n.survey9or10, n.surveyResponses);

  return (
    <section aria-labelledby={`site-${site}-heading`} className="glass-panel space-y-3">
      <h2 id={`site-${site}-heading`} className="text-xl font-bold">
        Demo Site {site}
      </h2>

      <h3 className="text-lg font-bold">Now</h3>
      <dl>
        <Row label="Waiting off-site">{n.waitingNow}</Row>
        <Row label="Recalled, not yet arrived">{n.recalledNow}</Row>
        <Row label="Back for reassessment">{n.reassessmentNow}</Row>
      </dl>

      <h3 className="text-lg font-bold">Today (since midnight, Toronto time)</h3>
      <dl>
        <Row label="Offered off-site waiting">
          {n.offered} of {n.triaged} triaged ({<Percent value={offeredShare} />})
        </Row>
        <Row label="Accepted">
          {n.accepted} of {n.offered} offered ({<Percent value={acceptedShare} />})
        </Row>
        <Row label="Declined">{n.declined}</Row>
        <Row label="Average minutes from recall to arrival">
          {minutes === null ? <NoData /> : minutes} ({visitCount(n.arrivedAfterRecall)})
        </Row>
        <Row label="No-shows">{n.noShows}</Row>
        <Row label="Unable to reach (nurse confirmed)">{n.unableToReach}</Row>
        <Row label="Left">{n.left}</Row>
        <Row label="Started from home">{n.startedFromHome}</Row>
        <Row label="Reached triage">{n.homeReachedTriage}</Row>
        <Row label="Survey responses">{n.surveyResponses}</Row>
        <Row label="Average score (0 to 10)">{score === null ? <NoData /> : score}</Row>
        <Row label="Scored 9 or 10">
          {n.survey9or10} ({<Percent value={nineOrTenShare} />})
        </Row>
      </dl>
    </section>
  );
}
