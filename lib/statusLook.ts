// The colour and icon of each patient status card. The colours are tokens in app/globals.css,
// and lib/contrast.test.ts checks each pair. Class names are written out in full so Tailwind finds them.

import type { PatientView } from "@/lib/patientView";

export type StatusIconName = "check" | "home" | "alert" | "building" | "flag" | "clock" | "x" | "phone";

export type StatusLook = {
  /** Classes for the card (section). */
  card: string;
  /** Classes for the h2. */
  heading: string;
  /** Classes for the small white tile that holds the icon. */
  tile: string;
  icon: StatusIconName;
};

const GREEN = {
  card: "space-y-3 rounded-xl border-4 border-green-800 bg-green-50 p-4",
  heading: "text-2xl font-bold text-green-950",
  tile: "icon-tile bg-card text-green-800",
};
const BLUE = {
  card: "space-y-3 rounded-xl border-4 border-brand bg-band p-4",
  heading: "text-2xl font-bold text-brand-strong",
  tile: "icon-tile bg-card text-brand",
};
const AMBER = {
  card: "space-y-3 rounded-xl border-4 border-wait-edge bg-wait-tint p-4",
  heading: "text-2xl font-bold text-wait-ink",
  tile: "icon-tile bg-card text-wait-edge",
};
const VIOLET = {
  card: "space-y-3 rounded-xl border-4 border-onsite-edge bg-onsite-tint p-4",
  heading: "text-2xl font-bold text-onsite-ink",
  tile: "icon-tile bg-card text-onsite-edge",
};
const GREY = {
  card: "space-y-3 rounded-xl border-4 border-control bg-end-tint p-4",
  heading: "text-2xl font-bold text-ink",
  tile: "icon-tile bg-card text-control",
};
const ROSE = {
  card: "space-y-3 rounded-xl border-4 border-gone-edge bg-gone-tint p-4",
  heading: "text-2xl font-bold text-gone-ink",
  tile: "icon-tile bg-card text-gone-edge",
};

/** The look of a card that is not the waiting or call-back screen. An expired visit wins over its status. */
export function statusLook(status: PatientView["status"], expired: boolean): StatusLook {
  if (expired) return { ...GREY, icon: "clock" };
  switch (status) {
    case "arrived":
      return { ...GREEN, icon: "check" };
    case "pre_arrival":
      return { ...BLUE, icon: "home" };
    case "needs_reassessment":
      return { ...AMBER, icon: "alert" };
    case "declined":
    case "not_eligible":
      return { ...VIOLET, icon: "building" };
    case "unable_to_reach":
      return { ...ROSE, icon: "phone" };
    case "removed":
      return { ...ROSE, icon: "x" };
    default:
      return { ...GREY, icon: "flag" };
  }
}
