// Checks that the pause switch never shows "0 patients" before the off-site list is read, and says the count words once it is.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { patientCount } from "@/lib/patientCount";
import { PauseSwitch } from "./PauseSwitch";

describe("PauseSwitch count wording", () => {
  it("names no number while the off-site list is not read yet", () => {
    const html = renderToStaticMarkup(
      <PauseSwitch site="A" paused={true} offSiteCount={null} onResult={() => {}} />,
    );
    expect(html).not.toContain("0 patients");
    expect(html).toContain("the patients still off-site");
  });

  it("uses the count words once the list is read", () => {
    const html = renderToStaticMarkup(
      <PauseSwitch site="A" paused={true} offSiteCount={2} onResult={() => {}} />,
    );
    expect(html).toContain(patientCount(2));
    expect(html).not.toContain("the patients still off-site");
  });
});
