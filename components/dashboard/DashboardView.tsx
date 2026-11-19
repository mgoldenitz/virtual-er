"use client";

// The dashboard's body: the Real or Demo switch, the day's numbers for both sites, and the words
// for loading and out-of-date reads. Real visits show unless staff choose Demo; the choice is not saved.

import { useState } from "react";
import { useDashboard } from "@/data/useDashboard";
import { dashboardNumbers } from "@/lib/dashboardNumbers";
import { ModeSwitch } from "@/components/dashboard/ModeSwitch";
import { SiteNumbers } from "@/components/dashboard/SiteNumbers";

export function DashboardView() {
  const [isDemo, setIsDemo] = useState(false);
  const { visits, stats, today, outOfDate } = useDashboard(isDemo);
  const counts = visits ? dashboardNumbers(visits, stats, today, isDemo) : null;

  return (
    <>
      <ModeSwitch isDemo={isDemo} onChange={setIsDemo} />
      <p className="font-semibold">{isDemo ? "Showing demo visits only." : "Showing real visits only."}</p>

      {outOfDate && (
        <div role="alert" className="rounded-lg border-2 border-red-800 bg-white p-3">
          <p className="font-semibold text-red-900">
            {visits
              ? "This list may be out of date: the visits could not be read just now. Check your connection."
              : "The visits could not be loaded. Check your connection, or sign out and sign in again."}
          </p>
        </div>
      )}

      {counts ? (
        <div className="grid gap-4 md:grid-cols-2">
          <SiteNumbers site="A" numbers={counts.A} />
          <SiteNumbers site="B" numbers={counts.B} />
        </div>
      ) : outOfDate ? (
        <p>No numbers to show yet.</p>
      ) : (
        <p role="status">Loading the numbers...</p>
      )}
    </>
  );
}
