// Checks the wait range words in all five languages, and the minutes-in-words rule the staff
// screen readers use.

import { describe, expect, it } from "vitest";
import { enDuration } from "./text/en";
import { formatDuration, formatWaitRange } from "./waitText";

describe("formatDuration (English)", () => {
  it("says minutes alone under an hour", () => {
    expect(formatDuration(45, enDuration)).toBe("45 minutes");
  });

  it("says hours and minutes, singular for 1", () => {
    expect(formatDuration(95, enDuration)).toBe("1 hour 35 minutes");
    expect(formatDuration(61, enDuration)).toBe("1 hour 1 minute");
    expect(formatDuration(140, enDuration)).toBe("2 hours 20 minutes");
  });

  it("leaves out 0 minutes for whole hours", () => {
    expect(formatDuration(60, enDuration)).toBe("1 hour");
    expect(formatDuration(120, enDuration)).toBe("2 hours");
  });

  it("counts a negative or broken number as 0", () => {
    expect(formatDuration(-5, enDuration)).toBe("0 minutes");
    expect(formatDuration(Number.NaN, enDuration)).toBe("0 minutes");
  });
});

describe("formatWaitRange", () => {
  it("gives the SPEC.md example for 40 to 60 minutes", () => {
    expect(formatWaitRange(40, 60, "en")).toBe("40 minutes to 1 hour");
  });

  it("keeps the short line when both ends are under an hour", () => {
    expect(formatWaitRange(20, 45, "en")).toBe("20 to 45 minutes");
    expect(formatWaitRange(20, 45, "fr")).toBe("20 à 45 minutes");
    expect(formatWaitRange(20, 45, "ur")).toBe("20 سے 45 منٹ");
    expect(formatWaitRange(20, 45, "zh")).toBe("20 到 45 分钟");
    expect(formatWaitRange(20, 45, "ar")).toBe("من 20 إلى 45 دقيقة");
  });

  it("Arabic short line: the minute word follows the high number (3 to 10 take دقائق)", () => {
    expect(formatWaitRange(5, 10, "ar")).toBe("من 5 إلى 10 دقائق");
    expect(formatWaitRange(10, 15, "ar")).toBe("من 10 إلى 15 دقيقة");
  });

  it("English", () => {
    expect(formatWaitRange(45, 80, "en")).toBe("45 minutes to 1 hour 20 minutes");
    expect(formatWaitRange(95, 140, "en")).toBe("1 hour 35 minutes to 2 hours 20 minutes");
    expect(formatWaitRange(60, 120, "en")).toBe("1 hour to 2 hours");
  });

  it("French", () => {
    expect(formatWaitRange(45, 80, "fr")).toBe("45 minutes à 1 heure 20 minutes");
    expect(formatWaitRange(60, 120, "fr")).toBe("1 heure à 2 heures");
  });

  it("Urdu, with گھنٹے for a whole hour before سے", () => {
    expect(formatWaitRange(45, 80, "ur")).toBe("45 منٹ سے 1 گھنٹہ 20 منٹ");
    expect(formatWaitRange(60, 120, "ur")).toBe("1 گھنٹے سے 2 گھنٹے");
    expect(formatWaitRange(95, 120, "ur")).toBe("1 گھنٹہ 35 منٹ سے 2 گھنٹے");
  });

  it("Arabic, with no digit for 1 and 2 hours", () => {
    expect(formatWaitRange(45, 80, "ar")).toBe("من 45 دقيقة إلى ساعة و20 دقيقة");
    expect(formatWaitRange(120, 180, "ar")).toBe("من ساعتين إلى 3 ساعات");
    expect(formatWaitRange(45, 65, "ar")).toBe("من 45 دقيقة إلى ساعة و5 دقائق");
    expect(formatWaitRange(600, 665, "ar")).toBe("من 10 ساعات إلى 11 ساعة و5 دقائق");
  });

  it("Mandarin", () => {
    expect(formatWaitRange(45, 80, "zh")).toBe("45 分钟 到 1 小时 20 分钟");
    expect(formatWaitRange(60, 120, "zh")).toBe("1 小时 到 2 小时");
  });

  it("gives English for a language with no words of its own", () => {
    expect(formatWaitRange(45, 80, "xx")).toBe("45 minutes to 1 hour 20 minutes");
  });
});
