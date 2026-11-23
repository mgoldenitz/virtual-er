// The frame around every page: language, page title, the disclaimer footer and private analytics.

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { InlineScript } from "@/components/InlineScript";
import { PrivateAnalytics } from "@/components/PrivateAnalytics";
import { languageScript } from "@/lib/languageScript";
import { textSizeScript } from "@/lib/textSize";
import "./globals.css";

export const metadata: Metadata = {
  title: "WaitWell: A virtual waiting room (concept prototype)",
  description: "Concept prototype of an emergency department virtual waiting room. Demo data only.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: browser extensions (for example writing tools) add their own
    // attributes to <html> and <body> before React loads (Grammarly writes to <body>). This
    // ignores attribute differences on these two tags only; mismatches inside the app's own
    // screens are still reported.
    <html lang="en" className="h-full" suppressHydrationWarning>
      {/* Plain scripts, not next/script: in the App Router, beforeInteractive runs the code later,
          so the page would still flash at Normal size and in English. */}
      <head>
        <InlineScript html={textSizeScript()} />
        <InlineScript html={languageScript()} />
      </head>
      <body className="flex min-h-full flex-col bg-canvas text-ink" suppressHydrationWarning>
        <div className="flex flex-1 flex-col">{children}</div>
        <Footer />
        <PrivateAnalytics />
      </body>
    </html>
  );
}
