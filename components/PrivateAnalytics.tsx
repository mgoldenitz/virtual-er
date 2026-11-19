"use client";
// Vercel Web Analytics, with each page address cut to the site and the path before it leaves the browser.
// A client file, because the layout is a server file and cannot pass the beforeSend function to the browser.

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { privateAddress } from "@/lib/analyticsPrivacy";

function stripPatientData(event: BeforeSendEvent): BeforeSendEvent | null {
  const url = privateAddress(event.url);
  // null drops the event: an address we cannot read must not be sent.
  return url === null ? null : { ...event, url };
}

export function PrivateAnalytics() {
  return <Analytics beforeSend={stripPatientData} />;
}
