// Checks that the lost-phone panel starts with "Issue a new link" only, and not the confirm button.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { NewLinkPanel } from "./NewLinkPanel";

describe("NewLinkPanel", () => {
  it("shows the issue button and not the confirm button before staff tap it", () => {
    const html = renderToStaticMarkup(<NewLinkPanel code="ABC123" saving={false} onConfirm={vi.fn()} />);
    expect(html).toContain("Issue a new link");
    expect(html).not.toContain("Yes, issue a new link");
  });
});
