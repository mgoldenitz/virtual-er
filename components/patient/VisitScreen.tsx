"use client";

// The part of the patient page below the 911 line: "Loading…", the "could not load" box, the
// no-visit, broken-link or replaced-link box, or the visit itself (code, status, sound box and announcer).
// This part stays on the page when the screen changes, so it is the one that moves focus to the
// new heading when the old screen left with focus inside it.

import { useRef } from "react";
import type { PatientView } from "@/lib/patientView";
import { fill, textFor } from "@/lib/text";
import { FocusBox } from "./FocusBox";
import { StatusAndSound } from "./StatusAndSound";
import { StatusAnnouncer } from "./StatusAnnouncer";
import { useRescueFocus } from "./useFocusRescue";

type Props = {
  /** True until the link is read and the first answer for the visit comes in. */
  loading: boolean;
  /** The visit, null if the token opens no visit, or "unavailable" if it could not be read. */
  result: PatientView | null | "unavailable" | undefined;
  /** True when the link was broken or no longer opens a visit (for example after a new link). */
  linkFailed: boolean;
  /** True when the link once opened a visit but no longer does (for example staff made a new link). */
  linkReplaced?: boolean;
  token: string | null;
  language: string;
  onOnMyWay: () => void;
  sending: boolean;
  online: boolean;
  /** True when "I'm on my way" could not be saved. */
  notSaved: boolean;
};

type Screen = "loading" | "unavailable" | "none" | "visit";

export function VisitScreen({ loading, result, linkFailed, linkReplaced = false, token, language, onOnMyWay, sending, online, notSaved }: Props) {
  const t = textFor(language);
  const p = t.patient;
  const view = result === "unavailable" ? null : result;
  // True when the old screen left with focus inside it; then focus goes to the new heading.
  const lostFocus = useRef(false);
  const markLost = useRescueFocus("status-heading", lostFocus);

  // Which of the 4 screens shows. "Loading…" comes first: while loading, result can be undefined.
  const screen: Screen = loading ? "loading" : result === "unavailable" ? "unavailable" : !view ? "none" : "visit";

  // A new screen gets a new box (the key), so the old box leaves and reports if it held focus.
  return (
    <FocusBox key={screen} onFocusLost={markLost} className="space-y-5">
      {screen === "loading" && (
        <p id="status-heading" tabIndex={-1}>
          {p.loading}
        </p>
      )}
      {screen === "unavailable" && (
        <section aria-labelledby="status-heading" className="clean-card space-y-2">
          <h2 id="status-heading" tabIndex={-1} className="text-2xl font-bold">
            {p.unavailableHeading}
          </h2>
          <p className="text-lg">{p.unavailableText}</p>
        </section>
      )}
      {screen === "none" && (
        <section aria-labelledby="status-heading" className="clean-card space-y-2">
          <h2 id="status-heading" tabIndex={-1} className="text-2xl font-bold">
            {linkReplaced ? p.replacedLinkHeading : linkFailed ? p.brokenLinkHeading : p.noVisitHeading}
          </h2>
          {linkReplaced && <p className="text-lg">{p.replacedLinkText}</p>}
          {linkFailed && !linkReplaced && <p className="text-lg">{p.brokenLinkText}</p>}
          <p className="text-lg">{p.findVisitHelp}</p>
        </section>
      )}
      {screen === "visit" && view && (
        <>
          <p className="text-base">
            {t.visitCode}:{" "}
            <bdi>
              <strong className="font-mono tracking-widest">{view.code}</strong>
            </bdi>{" "}
            · <bdi>{fill(t.siteName, { site: view.site })}</bdi>
          </p>
          <StatusAndSound view={view} token={token} language={language} onOnMyWay={onOnMyWay} sending={sending} online={online} />
          {notSaved && (
            <p role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
              {p.notSaved}
            </p>
          )}
          <StatusAnnouncer key={token} status={view.status} language={language} expired={view.expired} />
        </>
      )}
    </FocusBox>
  );
}
