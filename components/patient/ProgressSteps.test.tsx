import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProgressSteps } from "./ProgressSteps";

describe("ProgressSteps", () => {
  it("marks the current step and shows 4 steps", () => {
    const html = renderToStaticMarkup(<ProgressSteps status="waiting" closed={false} expired={false} language="en" />);
    expect(html.match(/<li/g)).toHaveLength(4);
    expect(html).toMatch(/<li aria-current="step"[^>]*>.*?Waiting/);
    expect(html.match(/aria-current/g)).toHaveLength(1);
  });

  it("flips for Urdu", () => {
    const html = renderToStaticMarkup(<ProgressSteps status="called" closed={false} expired={false} language="ur" />);
    expect(html).toContain('dir="rtl"');
  });

  it("shows nothing once the visit has ended", () => {
    expect(renderToStaticMarkup(<ProgressSteps status="arrived" closed={true} expired={false} language="en" />)).toBe("");
  });
});
