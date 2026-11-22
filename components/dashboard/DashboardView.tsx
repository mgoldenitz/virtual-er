"use client";

// The dashboard's body: the Real or Demo switch, the day's numbers for both sites, today's steps,
// the past 7 days and the CSV download, the AI summary and chat, and the words for loading and out-of-date reads.
// Real visits show unless staff choose Demo; the choice is not saved.

import { useState } from "react";
import { useDashboard } from "@/data/useDashboard";
import { dashboardNumbers } from "@/lib/dashboardNumbers";
import { trendNumbers } from "@/lib/trendNumbers";
import { ChatPanel } from "@/components/dashboard/ChatPanel";
import { FunnelView } from "@/components/dashboard/FunnelView";
import { ModeSwitch } from "@/components/dashboard/ModeSwitch";
import { PastDaysView } from "@/components/dashboard/PastDaysView";
import { SiteNumbers } from "@/components/dashboard/SiteNumbers";
import { SummaryPanel } from "@/components/dashboard/SummaryPanel";

export function DashboardView() {
  const [isDemo, setIsDemo] = useState(false);
  const { visits, stats, today, outOfDate } = useDashboard(isDemo);
  const counts = visits ? dashboardNumbers(visits, stats, today, isDemo) : null;
  const trend = visits ? trendNumbers(visits, stats, today, isDemo) : [];

  return (
    <>
      <ModeSwitch isDemo={isDemo} onChange={setIsDemo} />
      <p className="font-semibold">{isDemo ? "Showing demo visits only." : "Showing real visits only."}</p>

      {outOfDate && (
        <div role="alert" className="rounded-lg border-2 border-red-800 bg-card p-3">
          <p className="font-semibold text-red-900">
            {visits
              ? "This list may be out of date: the visits could not be read just now. Check your connection."
              : "The visits could not be loaded. Check your connection, or sign out and sign in again."}
          </p>
        </div>
      )}

      {counts ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <SiteNumbers site="A" numbers={counts.A} />
            <SiteNumbers site="B" numbers={counts.B} />
          </div>
          <FunnelView numbers={counts} />
          <PastDaysView trend={trend} today={today} isDemo={isDemo} />
          <SummaryPanel isDemo={isDemo} />
          <ChatPanel isDemo={isDemo} />
        </>
      ) : outOfDate ? (
        <p>No numbers to show yet.</p>
      ) : (
        <p role="status">Loading the numbers...</p>
      )}
    </>
  );
}
