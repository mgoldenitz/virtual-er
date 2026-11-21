"use client";

// The "I'm still here" prompt, the status screen and the sound box of the patient page, with the one
// flag they share: when the prompt or the sound box leaves the page with focus inside it, the status
// screen moves focus to its heading.
// The survey box shows under the status screen once the visit has arrived and closed (SurveyBox).
// The page and the click test both use this part, so the test checks the real wiring.

import { useRef, useState } from "react";
import type { PatientView } from "@/lib/patientView";
import { PatientStatus } from "./PatientStatus";
import { SoundSwitch } from "./SoundSwitch";
import { StillHerePrompt } from "./StillHerePrompt";
import { SurveyBox } from "./SurveyBox";

type Props = {
  view: PatientView;
  /** The visit's token, for the "I'm still here" tap (null: no prompt). */
  token: string | null;
  language: string;
  onOnMyWay: () => void;
  sending: boolean;
  /** False when the phone is offline: a dashed frame then shows the status may be old. */
  online: boolean;
};

export function StatusAndSound({ view, token, language, onOnMyWay, sending, online }: Props) {
  // True when the prompt, the sound box or the survey form left the page with focus inside it; the status
  // screen then moves focus to its heading.
  const lostFocus = useRef(false);
  // True once this phone has saved the survey score, so the thank-you shows before the visit is read again.
  const [surveySaved, setSurveySaved] = useState(false);
  return (
    <>
      {token && view.status === "waiting" && (
        <StillHerePrompt view={view} token={token} language={language} lostFocus={lostFocus} />
      )}
      {/* Offline: a dashed frame shows the status may be old. The frame is always there, so the status keeps its place. */}
      <div className={online ? "" : "rounded-xl border-4 border-dashed border-slate-700 p-1"} data-testid="status-frame">
        <PatientStatus view={view} language={language} onOnMyWay={onOnMyWay} sending={sending} lostFocus={lostFocus} />
      </div>
      {token && (
        <SurveyBox
          view={view}
          token={token}
          language={language}
          saved={surveySaved}
          onSaved={() => setSurveySaved(true)}
          onFocusLost={() => {
            lostFocus.current = true;
          }}
        />
      )}
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
