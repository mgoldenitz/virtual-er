"use client";

// After Mark arrived, Left or No-show: says what happened and offers Undo for 10 seconds.

import { useEffect } from "react";
import { UNDO_BANNER_SECONDS } from "@/lib/visitActions";
import type { VisitStatus } from "@/lib/visit";
import { Button } from "@/components/Button";

/** A visit that just left the list, and the status it had before. */
export type Closed = { id: string; code: string; previous: VisitStatus; message: string };

type Props = { closed: Closed; onUndo: (closed: Closed) => void; onExpire: () => void };

export function UndoBanner({ closed, onUndo, onExpire }: Props) {
  useEffect(() => {
    const timer = window.setTimeout(onExpire, UNDO_BANNER_SECONDS * 1000);
    return () => window.clearTimeout(timer);
  }, [closed, onExpire]);

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-slate-800 bg-slate-100 p-3"
      data-testid="undo-banner"
    >
      <p className="font-semibold">{closed.message}</p>
      <Button variant="secondary" onClick={() => onUndo(closed)}>
        Undo<span className="sr-only"> for visit {closed.code}</span>
      </Button>
    </div>
  );
}
