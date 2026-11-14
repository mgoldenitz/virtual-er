// Checks that the offline banner's live region is always on the page, and that the offline words appear only while offline.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { useOnline } from "@/data/useOnline";
import { textFor } from "@/lib/text";
import { OfflineBanner } from "./OfflineBanner";

// Replace the real hook, so each test can choose online or offline.
vi.mock("@/data/useOnline", () => ({ useOnline: vi.fn() }));

const offlineEn = textFor("en").offline;
const offlineAr = textFor("ar").offline;

describe("OfflineBanner", () => {
  it("keeps the live region on the page but shows no offline text while online", () => {
    vi.mocked(useOnline).mockReturnValue(true);
    const html = renderToStaticMarkup(<OfflineBanner language="en" />);
    expect(html).toContain('role="status"');
    expect(html).not.toContain(offlineEn);
  });

  it("shows the English offline text inside the live region while offline", () => {
    vi.mocked(useOnline).mockReturnValue(false);
    const html = renderToStaticMarkup(<OfflineBanner language="en" />);
    // The words must sit inside the always-present live region, not carry the role themselves.
    expect(html).toMatch(/^<div role="status"><p[^>]*>/);
    expect(html).toContain(offlineEn);
  });

  it("shows the Arabic offline text while offline in Arabic", () => {
    vi.mocked(useOnline).mockReturnValue(false);
    const html = renderToStaticMarkup(<OfflineBanner language="ar" />);
    expect(html).toContain(offlineAr);
  });
});
