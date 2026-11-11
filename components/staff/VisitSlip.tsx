"use client";

// The desk slip: QR code carrying the token, the short code, and the full link written out
// for patients whose camera can't scan (SPEC /patient).

import { QRCodeSVG } from "qrcode.react";
import { groupToken } from "@/lib/codes";
import { slipOrigin } from "@/lib/slipOrigin";
import { patientLink } from "@/data/savedToken";
import { Button } from "@/components/Button";
import { textFor } from "@/lib/text";

type Props = { code: string; token: string; onClose: () => void };

export function VisitSlip({ code, token, onClose }: Props) {
  // Always the live link, except on localhost while testing (lib/slipOrigin.ts).
  const origin = slipOrigin(typeof window === "undefined" ? "" : window.location.origin);
  const scanLink = patientLink(origin, token);
  const typedLink = patientLink(origin, groupToken(token));

  return (
    <section
      aria-labelledby="slip-heading"
      className="rounded-xl border-2 border-slate-800 bg-white p-4"
    >
      <h3 id="slip-heading" className="text-lg font-bold">
        Patient slip for visit {code}
      </h3>
      <div className="mt-3 flex flex-wrap items-start gap-4">
        <QRCodeSVG
          value={scanLink}
          size={176}
          marginSize={2}
          role="img"
          aria-label={`QR code that opens visit ${code} on the patient's phone`}
        />
        <div className="min-w-0 flex-1 space-y-2">
          <p>
            {textFor("en").visitCode}: <strong className="font-mono text-2xl tracking-widest">{code}</strong>
          </p>
          <p className="text-sm">{textFor("en").slip.typeLink}</p>
          <p className="font-mono text-sm break-all" data-testid="slip-link">
            {typedLink}
          </p>
          <a
            href={scanLink}
            target="_blank"
            rel="noopener"
            className="inline-block text-blue-800 underline underline-offset-2 focus-visible:outline-4 focus-visible:outline-slate-950"
          >
            Demo: open the patient screen in a new tab
          </a>
        </div>
      </div>
      <Button variant="secondary" className="mt-4" onClick={onClose}>
        Done, hide slip
      </Button>
    </section>
  );
}
