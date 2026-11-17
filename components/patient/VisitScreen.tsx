"use client";

// The part of the patient page below the 911 line: "Loading…", the "could not load" box, the
// no-visit or broken-link box, or the visit itself (code, status, sound box and announcer).

import type { PatientView } from "@/lib/patientView";
import { fill, textFor } from "@/lib/text";
import { StatusAndSound } from "./StatusAndSound";
import { StatusAnnouncer } from "./StatusAnnouncer";

type Props = {
  /** True until the link is read and the first answer for the visit comes in. */
  loading: boolean;
  /** The visit, null if the token opens no visit, or "unavailable" if it could not be read. */
  result: PatientView | null | "unavailable" | undefined;
  /** True when the link was broken or no longer opens a visit (for example after a new link). */
  linkFailed: boolean;
  token: string | null;
  language: string;
  onOnMyWay: () => void;
  sending: boolean;
  online: boolean;
  /** True when "I'm on my way" could not be saved. */
  notSaved: boolean;
};

export function VisitScreen({ loading, result, linkFailed, token, language, onOnMyWay, sending, online, notSaved }: Props) {
  const t = textFor(language);
  const p = t.patient;
  const view = result === "unavailable" ? null : result;

  if (loading) return <p>{p.loading}</p>;

  if (result === "unavailable") {
    return (
      <section aria-labelledby="unavailable-heading" className="clean-card space-y-2">
        <h2 id="unavailable-heading" className="text-2xl font-bold">
          {p.unavailableHeading}
        </h2>
        <p className="text-lg">{p.unavailableText}</p>
      </section>
    );
  }

  if (!view) {
    return (
      <section aria-labelledby="none-heading" className="clean-card space-y-2">
        <h2 id="none-heading" className="text-2xl font-bold">
          {linkFailed ? p.brokenLinkHeading : p.noVisitHeading}
        </h2>
        {linkFailed && <p className="text-lg">{p.brokenLinkText}</p>}
        <p className="text-lg">{p.findVisitHelp}</p>
      </section>
    );
  }

  return (
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
      <StatusAnnouncer key={token} status={view.status} language={language} />
    </>
  );
}
