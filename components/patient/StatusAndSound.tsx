"use client";

// The status screen and the sound box of the patient page, with the one flag they share: when the
// sound box leaves the page with focus inside it, the status screen moves focus to its heading.
// The page and the click test both use this part, so the test checks the real wiring.

import { useRef } from "react";
import type { PatientView } from "@/lib/patientView";
import { PatientStatus } from "./PatientStatus";
import { SoundSwitch } from "./SoundSwitch";

type Props = {
  view: PatientView;
  language: string;
  onOnMyWay: () => void;
  sending: boolean;
  /** False when the phone is offline: a dashed frame then shows the status may be old. */
  online: boolean;
};

export function StatusAndSound({ view, language, onOnMyWay, sending, online }: Props) {
  // True when the sound box left the page with focus inside it; the status screen then moves focus.
  const lostFocus = useRef(false);
  return (
    <>
      {/* Offline: a dashed frame shows the status may be old. The frame is always there, so the status keeps its place. */}
      <div className={online ? "" : "rounded-xl border-4 border-dashed border-slate-700 p-1"} data-testid="status-frame">
        <PatientStatus view={view} language={language} onOnMyWay={onOnMyWay} sending={sending} lostFocus={lostFocus} />
      </div>
      {(view.status === "waiting" || view.status === "called") && (
        <SoundSwitch
          status={view.status}
          language={language}
          onFocusLost={() => {
            lostFocus.current = true;
          }}
        />
      )}
    </>
  );
}
