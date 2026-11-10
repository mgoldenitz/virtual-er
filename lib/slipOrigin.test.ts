import { describe, expect, it } from "vitest";
import { PUBLIC_SITE, slipOrigin } from "./slipOrigin";

describe("slipOrigin", () => {
  it("uses the live link on the live site", () => {
    expect(slipOrigin("https://virtual-er-izpf.vercel.app")).toBe(PUBLIC_SITE);
  });

  it("uses the live link on Vercel's other addresses (previews, the long team address)", () => {
    expect(slipOrigin("https://virtual-er-izpf-2omrrwqmu-michael-e6bb.vercel.app")).toBe(PUBLIC_SITE);
    expect(slipOrigin("https://virtual-er-izpf-michael-e6bb.vercel.app")).toBe(PUBLIC_SITE);
  });

  it("keeps localhost, with its port, for testing", () => {
    expect(slipOrigin("http://localhost:3000")).toBe("http://localhost:3000");
    expect(slipOrigin("http://127.0.0.1:3100")).toBe("http://127.0.0.1:3100");
    expect(slipOrigin("http://[::1]:3000")).toBe("http://[::1]:3000");
  });

  it("uses the live link when the address cannot be read", () => {
    expect(slipOrigin("")).toBe(PUBLIC_SITE);
    expect(slipOrigin("not an address")).toBe(PUBLIC_SITE);
  });

  it("does not treat an address that only starts with 'localhost' as local", () => {
    expect(slipOrigin("https://localhost.example.com")).toBe(PUBLIC_SITE);
  });
});
