// The small pieces the dashboard uses to show a number: the "no data yet" dash, a percent, and a label and value row.

import type { ReactNode } from "react";

/** The dash shown when a share or average has no data: seen as "-", read aloud as "no data yet". */
export function NoData() {
  return (
    <>
      <span aria-hidden="true">-</span>
      <span className="sr-only">no data yet</span>
    </>
  );
}

/** A whole percent such as "80%", or the NoData dash (with no "%") when there is no data. */
export function Percent({ value }: { value: number | null }) {
  return value === null ? <NoData /> : <>{value}%</>;
}

/** A number, or the NoData dash when it is null. */
export function NumberOrDash({ value }: { value: number | null }) {
  return value === null ? <NoData /> : <>{value}</>;
}

/** The classes for a <dl> of Row tiles: one column on a narrow phone, then two, then three. */
export const tileGrid = "grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 lg:grid-cols-3";

/** One label and value pair (inside a <dl>), shown as a tile: a big number with a small label under it. */
export function Row({ label, children }: { label: string; children: ReactNode }) {
  // The label stays first in the page so a screen reader reads it first; flex-col-reverse shows the number on top.
  return (
    <div className="flex flex-col-reverse justify-end gap-1 rounded-xl border border-line bg-band p-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="break-words text-2xl font-bold text-ink">{children}</dd>
    </div>
  );
}
