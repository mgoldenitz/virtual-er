// One staff time: "1h 35min" on screen, and "1 hour 35 minutes" for screen readers, which can
// read "h" and "min" as letters. Staff screens are in English only.

import { formatMinutes } from "@/lib/duration";
import { enDuration } from "@/lib/text/en";
import { formatDuration } from "@/lib/waitText";

export function Duration({ minutes }: { minutes: number }) {
  return (
    <>
      <span aria-hidden="true">{formatMinutes(minutes)}</span>
      <span className="sr-only">{formatDuration(minutes, enDuration)}</span>
    </>
  );
}
