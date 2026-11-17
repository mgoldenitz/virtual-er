// Checks that check-in offers only on-site waiting while the paused switch is not read yet (null), and offers off-site waiting only once it is read as not paused.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CheckInPanel } from "./CheckInPanel";
import { READ_FAILED, STALE_READ } from "./checkInText";

function render(offsitePaused: boolean | null, pauseReadFailed = false, homeProblem: string | null = null) {
  return renderToStaticMarkup(
    <CheckInPanel
      site="A"
      onAttempt={() => {}}
      onCreated={() => {}}
      homeVisit={null}
      homeProblem={homeProblem}
      onHomeDone={() => {}}
      offsitePaused={offsitePaused}
      pauseReadFailed={pauseReadFailed}
    />,
  );
}

describe("CheckInPanel while the paused switch is not read", () => {
  it("offers no off-site waiting and says the switch is being checked", () => {
    const html = render(null);
    expect(html).not.toContain("Start off-site waiting");
    expect(html).not.toContain("Offered, declined");
    expect(html).toContain("Checking whether off-site waiting is paused");
  });

  it("says the pause switch could not be read when the read failed", () => {
    const html = render(null, true);
    expect(html).not.toContain("Start off-site waiting");
    expect(html).not.toContain("Offered, declined");
    expect(html).not.toContain("Checking whether off-site waiting is paused");
    expect(html).toContain("Could not read whether off-site waiting is paused. The patient waits on-site.");
  });

  it("offers off-site waiting once the switch is read as not paused", () => {
    const html = render(false);
    expect(html).toContain("Start off-site waiting");
  });

  it("warns that the last read failed but still offers off-site waiting", () => {
    const html = render(false, true);
    const warning = "Warning: could not check just now whether off-site waiting is paused";
    expect(html).toContain("Start off-site waiting");
    expect(html).toContain(warning);
    // The whole warning is on the page (static markup writes " as &quot;).
    expect(html.replaceAll("&quot;", '"')).toContain(STALE_READ);
    // Screen readers hear the warning when it comes, and again on the button.
    expect(html).toMatch(/<p id="stale-read-warning" role="status"[^>]*>Warning: could not check/);
    expect(html).toMatch(/<button[^>]*aria-describedby="stale-read-warning"[^>]*>Start off-site waiting<\/button>/);
    const fresh = render(false, false);
    expect(fresh).not.toContain(warning);
    expect(fresh).not.toContain("aria-describedby");
  });

  it("the warning names the fallback button that is on the screen", () => {
    const html = render(false, true);
    expect(html).toMatch(/<button[^>]*>Not eligible<\/button>/);
    expect(STALE_READ).toContain('press "Not eligible"');
    expect(STALE_READ).not.toContain('"Waits on-site"');
  });

  it("the warning says what happens while the network is still down", () => {
    expect(STALE_READ).toContain("If the network is still down, no button can save.");
  });

  it("the read-failed text says what happens while the network is still down", () => {
    expect(READ_FAILED).toContain("If the network is still down, no button can save.");
    expect(render(null, true).replaceAll("&quot;", '"')).toContain(READ_FAILED);
  });

  it("shows no warning while the home visit has a problem", () => {
    const html = render(false, true, "Visit HOME23 is no longer on this screen.");
    expect(html).toContain("Visit HOME23 is no longer on this screen.");
    expect(html).toMatch(/<p id="stale-read-warning" role="status"[^>]*><\/p>/);
    expect(html).not.toContain("aria-describedby");
    expect(html).not.toContain("Start off-site waiting");
  });
});

describe("CheckInPanel while off-site waiting is paused", () => {
  it("says it is paused and offers only on-site waiting", () => {
    const html = render(true);
    expect(html).toContain("Off-site waiting is paused at this site: the patient waits on-site.");
    expect(html).not.toContain("Start off-site waiting");
    expect(html).not.toContain("Offered, declined");
    expect(html).toContain("Waits on-site");
  });
});
