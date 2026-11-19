// Tests the staff dashboard's read. Vitest has no database, so supabaseBrowser is a stand-in
// that records each query and answers with the result chosen for its table. The clock is fixed.

import { beforeEach, describe, expect, it, vi } from "vitest";

const fake = vi.hoisted(() => {
  type Result = { data: unknown; error: unknown };
  type Call = { table: string; select: string; filters: [string, unknown][] };
  const state = {
    results: {} as Record<string, Result>,
    calls: [] as Call[],
  };
  function from(table: string) {
    const call: Call = { table, select: "", filters: [] };
    state.calls.push(call);
    const query = {
      select(columns: string) {
        call.select = columns;
        return query;
      },
      eq(column: string, value: unknown) {
        call.filters.push([column, value]);
        return query;
      },
      then(resolve: (r: Result) => unknown, reject: (e: unknown) => unknown) {
        return Promise.resolve(state.results[table]).then(resolve, reject);
      },
    };
    return query;
  }
  return { state, from };
});

vi.mock("./supabaseBrowser", () => ({
  supabaseBrowser: () => ({ from: fake.from }),
}));
vi.mock("./serverClock", () => ({
  serverNow: () => new Date("2026-11-18T15:00:00.000Z"), // 10:00 on 2026-11-18 in Toronto
}));

const visit = (id: string, isDemo: boolean) => ({ id, site: "A", status: "waiting", is_demo: isDemo });
const stat = { day: "2026-11-18", site: "A", is_demo: false, offered: 2 };
const good = (visits: unknown[]) => ({
  visits: { data: visits, error: null },
  daily_stats: { data: [stat], error: null },
});

let loadDashboard: (isDemo: boolean) => Promise<void>;
let readDashboard: (isDemo: boolean) => { visits: unknown; stats: unknown; today: string; outOfDate: boolean };

beforeEach(async () => {
  // A fresh copy of the module for each test, so one test's stored numbers do not leak into the next.
  vi.resetModules();
  ({ loadDashboard, readDashboard } = await import("./dashboardRead"));
  fake.state.calls.length = 0;
  fake.state.results = good([visit("v1", false)]);
});

describe("loadDashboard", () => {
  it("fills visits and stats, with today's Toronto date, and is not out of date", async () => {
    await loadDashboard(false);
    const now = readDashboard(false);
    expect(now.visits).toEqual([visit("v1", false)]);
    expect(now.stats).toEqual([stat]);
    expect(now.today).toBe("2026-11-18");
    expect(now.outOfDate).toBe(false);
  });

  it("never selects access_token or code from visits", async () => {
    await loadDashboard(false);
    const visits = fake.state.calls.find((c) => c.table === "visits");
    expect(visits?.select).not.toContain("access_token");
    expect(visits?.select).not.toMatch(/\bcode\b/);
  });

  it("filters both queries by the given mode", async () => {
    await loadDashboard(true);
    const visits = fake.state.calls.find((c) => c.table === "visits");
    const stats = fake.state.calls.find((c) => c.table === "daily_stats");
    expect(visits?.filters).toContainEqual(["is_demo", true]);
    expect(stats?.filters).toContainEqual(["is_demo", true]);
    expect(stats?.filters).toContainEqual(["day", "2026-11-18"]);
  });

  it("keeps the old visits and marks out of date when daily_stats fails", async () => {
    await loadDashboard(false);
    fake.state.results = {
      visits: { data: [visit("v2", false)], error: null },
      daily_stats: { data: null, error: { message: "down" } },
    };
    await loadDashboard(false);
    const now = readDashboard(false);
    expect(now.visits).toEqual([visit("v1", false)]);
    expect(now.outOfDate).toBe(true);
  });

  it("keeps demo and real numbers apart", async () => {
    fake.state.results = good([visit("demo-1", true)]);
    await loadDashboard(true);
    fake.state.results = good([visit("real-1", false)]);
    await loadDashboard(false);
    expect(readDashboard(true).visits).toEqual([visit("demo-1", true)]);
    expect(readDashboard(false).visits).toEqual([visit("real-1", false)]);
  });
});
