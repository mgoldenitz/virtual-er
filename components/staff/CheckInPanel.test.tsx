// Checks that check-in offers only on-site waiting while the paused switch is not read yet (null), and offers off-site waiting only once it is read as not paused.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CheckInPanel } from "./CheckInPanel";

function render(offsitePaused: boolean | null, pauseReadFailed = false) {
  return renderToStaticMarkup(
    <CheckInPanel
      site="A"
      onAttempt={() => {}}
      onCreated={() => {}}
      homeVisit={null}
      homeProblem={null}
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
