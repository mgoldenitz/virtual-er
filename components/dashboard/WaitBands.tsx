// The 4 off-site wait bands for one site today: how many recalled visits waited each length of time.

import type { SiteNumbers } from "@/lib/dashboardNumbers";
import { Row, tileGrid } from "./NumberParts";

export function WaitBands({ numbers: n }: { numbers: SiteNumbers }) {
  return (
    <>
      <h3 className="text-lg font-bold">Off-site wait, from offer to recall (recalled today)</h3>
      <dl className={tileGrid}>
        <Row label="Under 30 minutes">{n.waitUnder30}</Row>
        <Row label="30 to 59 minutes">{n.wait30to59}</Row>
        <Row label="60 to 119 minutes">{n.wait60to119}</Row>
        <Row label="120 minutes or more">{n.wait120plus}</Row>
      </dl>
    </>
  );
}
