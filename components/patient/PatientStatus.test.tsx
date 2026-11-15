// Checks that the waiting screen shows a long wait in hours and minutes, in the patient's language.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PatientView } from "@/lib/patientView";
import { PatientStatus } from "./PatientStatus";

const view: PatientView = {
  code: "ABC234",
  site: "A",
  language: "en",
  status: "waiting",
  placeInLine: 3,
  waitLow: 95,
  waitHigh: 140,
  calledAt: null,
  lastStillHereAt: null,
  triagedAt: "2026-11-15T18:00:00Z",
  seen: false,
  closed: false,
  expired: false,
};

const render = (language: string, low = 95, high = 140) =>
  renderToStaticMarkup(
    <PatientStatus view={{ ...view, language, waitLow: low, waitHigh: high }} language={language} onOnMyWay={() => {}} sending={false} />,
  );

describe("PatientStatus wait range", () => {
  it("shows a short range in minutes only", () => {
    expect(render("en", 20, 45)).toContain("20 to 45 minutes");
  });

  it("shows a long range in hours and minutes (English)", () => {
    expect(render("en")).toContain("1 hour 35 minutes to 2 hours 20 minutes");
  });

  it("shows a long range in hours and minutes (Arabic)", () => {
    expect(render("ar")).toContain("من ساعة و35 دقيقة إلى ساعتين و20 دقيقة");
  });
});
