"use client";
// Vercel Web Analytics, with each page address cut to the site and the path before it leaves the browser.
// A client file, because the layout is a server file and cannot pass the beforeSend function to the browser.

import { Analytics } from "@vercel/analytics/next";
import { privateEvent } from "@/lib/analyticsPrivacy";

export function PrivateAnalytics() {
  return <Analytics beforeSend={privateEvent} />;
}
