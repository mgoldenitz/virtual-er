// The frame around every page: language, page title and the disclaimer footer.

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { InlineScript } from "@/components/InlineScript";
import { textSizeScript } from "@/lib/textSize";
import "./globals.css";

export const metadata: Metadata = {
  title: "Virtual Waiting Room (concept prototype)",
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
      {/* A plain script, not next/script: in the App Router, beforeInteractive runs the code later,
          so the page would still flash at Normal size. */}
      <head>
        <InlineScript html={textSizeScript()} />
      </head>
      <body className="flex min-h-full flex-col bg-white text-slate-900" suppressHydrationWarning>
        <div className="flex flex-1 flex-col">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
