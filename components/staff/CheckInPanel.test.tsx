// Checks that check-in offers only on-site waiting while the paused switch is not read yet (null), and offers off-site waiting only once it is read as not paused.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { startFromHome } from "@/lib/visitActions";
import type { Visit } from "@/lib/visit";
import { CheckInPanel } from "./CheckInPanel";
import { READ_FAILED, STALE_READ } from "./checkInText";

function render(offsitePaused: boolean | null, pauseReadFailed = false, homeProblem: string | null = null, homeVisit: Visit | null = null) {
  return renderToStaticMarkup(
    <CheckInPanel
      site="A"
      onAttempt={() => {}}
      onCreated={() => {}}
      homeVisit={homeVisit}
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
    // Not read yet: the fallback button has the same label as while paused.
    expect(html).toMatch(/<button[^>]*>Waits on-site<\/button>/);
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
    // In the red box, not somewhere else on the page.
    expect(render(null, true)).toContain(`text-red-900">${READ_FAILED}</p>`);
  });

  it("shows no warning while the home visit has a problem", () => {
    const html = render(false, true, "Visit HOME23 is no longer on this screen.");
    expect(html).toContain("Visit HOME23 is no longer on this screen.");
    expect(html).toMatch(/<p id="stale-read-warning" role="status"[^>]*><\/p>/);
    expect(html).not.toContain("aria-describedby");
    // No action button at all: the visit can no longer be checked in.
    expect(html).not.toContain("Start off-site waiting");
    expect(html).not.toContain("Offered, declined");
    expect(html).not.toContain("Not eligible");
    expect(html).not.toContain("Waits on-site");
  });

  it("warns on a home visit too", () => {
    const home = startFromHome({ id: "h", code: "HOME23", access_token: "tok", site: "A", language: "en" }, new Date());
    const html = render(false, true, null, home);
    expect(html).toContain("Check in visit HOME23 after triage");
    expect(html.replaceAll("&quot;", '"')).toContain(STALE_READ);
    expect(html).toMatch(/<button[^>]*aria-describedby="stale-read-warning"[^>]*>Start off-site waiting<\/button>/);
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

  it("says no button can save when the last read failed too", () => {
    expect(render(true, true)).toContain(
      "Off-site waiting is paused at this site: the patient waits on-site. If the network is still down, no button can save.",
    );
    expect(render(true, false)).not.toContain("If the network is still down");
  });

  it("labels the fallback button exactly as the messages name it", () => {
    // The red box already says it is paused, so the button label does not repeat it.
    expect(render(true)).toMatch(/<button[^>]*>Waits on-site<\/button>/);
  });
});

describe("CheckInPanel on a narrow screen", () => {
  it("keeps the language menu inside the screen width (WCAG reflow)", () => {
    // Without max-w-full the menu is as wide as its longest choice, and the staff page scrolls sideways.
    const tag = render(false).match(/<select[^>]*>/)?.[0] ?? "";
    const classes = (tag.match(/class="([^"]*)"/)?.[1] ?? "").split(" ");
    expect(classes).toContain("max-w-full");
  });
});
