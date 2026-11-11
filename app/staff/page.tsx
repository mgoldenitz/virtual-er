"use client";

// The staff screen: check patients in (new at the desk, or expected from home), see who is
// waiting off-site, and call them back.

import { useEffect, useRef, useState } from "react";
import { reloadVisits } from "@/data/staffActions";
import { useVisits } from "@/data/useVisits";
import { homeCheckInProblem } from "@/lib/homeCheckIn";
import { activeLine } from "@/lib/queue";
import type { Site, Visit } from "@/lib/visit";
import { CheckInPanel } from "@/components/staff/CheckInPanel";
import { ExpectedArrivals } from "@/components/staff/ExpectedArrivals";
import { ProgressAnnouncer } from "@/components/staff/ProgressAnnouncer";
import { RecentlyClosed } from "@/components/staff/RecentlyClosed";
import { SignOutButton } from "@/components/staff/SignOutButton";
import { VisitRow } from "@/components/staff/VisitRow";
import { VisitSlip } from "@/components/staff/VisitSlip";
import { StaffShell } from "@/components/staff/StaffShell";
import { Button } from "@/components/Button";
import { useNow } from "@/components/useNow";

export default function StaffPage() {
  const { visits, outOfDate } = useVisits();
  const now = useNow();
  const [site, setSite] = useState<Site>("A");
  const [slip, setSlip] = useState<Visit | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [homeVisit, setHomeVisit] = useState<Visit | null>(null);

  // Staff chose an expected arrival: hide any old slip and move focus to the check-in form.
  const chooseHomeVisit = (visit: Visit) => {
    setSlip(null);
    setHomeVisit(visit);
  };
  useEffect(() => {
    if (homeVisit) document.getElementById("checkin-heading")?.focus();
  }, [homeVisit]);
  const listHeading = useRef<HTMLHeadingElement>(null);

  // A patient just left the list: say so, and move keyboard focus from the vanished row
  // to the list heading, so it is never lost.
  const onLeftList = (message: string) => {
    setAnnouncement(message);
    listHeading.current?.focus();
  };
  // After a working Undo its row (and the focused button) vanishes, so focus moves to the
  // list heading too; after a failed one, focus stays on the Undo button so staff can try again.
  const onUndoResult = (message: string, undone: boolean) => {
    setAnnouncement(message);
    if (undone) listHeading.current?.focus();
  };

  const line = visits ? activeLine(visits, site) : [];
  // The chosen home visit may have been checked in on another screen, or expired, since staff opened it.
  const homeProblem =
    homeVisit && visits && now
      ? homeCheckInProblem(homeVisit, visits.find((v) => v.id === homeVisit.id) ?? null, now)
      : null;
  // Show a slip only for a visit that is waiting off-site; declined and not-eligible get none.
  const showSlip = (visit: Visit) => setSlip(visit.status === "waiting" || visit.called_at ? visit : null);

  return (
    <StaffShell>
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <header className="glass-panel flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Staff: Virtual Waiting Room</h1>
        <label className="flex items-center gap-2">
          <span className="font-semibold">Site</span>
          <select
            value={site}
            onChange={(e) => {
              setSite(e.target.value as Site);
              setSlip(null);
              setHomeVisit(null);
            }}
            className="min-h-11 rounded-lg border-2 border-control px-3"
          >
            <option value="A">Demo Site A</option>
            <option value="B">Demo Site B</option>
          </select>
        </label>
        <SignOutButton />
      </header>
      {outOfDate && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border-2 border-red-800 bg-white p-3">
          <p className="font-semibold text-red-900">
            {visits
              ? "This list may be out of date: the visits could not be read just now. Check your connection."
              : "The visits could not be loaded. Check your connection, or sign out and sign in again."}
          </p>
          <Button variant="secondary" onClick={() => void reloadVisits()}>
            Try again
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          {visits && now && (
            <ExpectedArrivals visits={visits} site={site} now={now} onChoose={chooseHomeVisit} />
          )}
          <CheckInPanel
            key={site}
            site={site}
            onAttempt={() => setSlip(null)}
            onCreated={showSlip}
            homeVisit={homeVisit}
            homeProblem={homeProblem}
            onHomeDone={() => setHomeVisit(null)}
          />
          {slip && <VisitSlip code={slip.code} token={slip.access_token} language={slip.language} onClose={() => setSlip(null)} />}
        </div>

        <section aria-labelledby="list-heading" className="glass-panel space-y-3">
          <h2 id="list-heading" ref={listHeading} tabIndex={-1} className="text-xl font-bold">
            Off-site: waiting or called back ({line.length})
          </h2>
          <p role="status" className="min-h-6 font-semibold">
            {announcement}
          </p>
          {visits === null || now === null ? (
            <p>{outOfDate ? "No list to show yet." : "Loading…"}</p>
          ) : line.length === 0 ? (
            <p>No one is waiting off-site at this site.</p>
          ) : (
            <ol className="space-y-3">
              {line.map((visit) => (
                <VisitRow
                  key={visit.id}
                  visit={visit}
                  now={now}
                  onShowSlip={setSlip}
                  onLeftList={onLeftList}
                />
              ))}
            </ol>
          )}
          {visits && <RecentlyClosed key={site} visits={visits} site={site} onUndoResult={onUndoResult} />}
          {visits && <ProgressAnnouncer visits={visits} site={site} />}
        </section>
      </div>
    </main>
    </StaffShell>
  );
}
