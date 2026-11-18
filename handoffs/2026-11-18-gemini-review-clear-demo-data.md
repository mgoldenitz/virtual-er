# Gemini review: "Clear demo data" (Phase 4, demo simulator step 3)

Model: Gemini Hydrogen 4, High, in a new chat. If you have no Hydrogen 4 credits, use Gemini 3.6 Flash, High.

## Paste everything below this line into Gemini

You are reviewing one small change in a concept prototype of a virtual ER waiting room (Next.js App Router, React 19, Supabase Postgres, synthetic data only). Find problems. Do not confirm that it works. For each problem, give the file, the line or code, a concrete case that goes wrong, and the smallest fix. Put each point under one of these headings: security, data loss, concurrency, accessibility, wording, tests. If you find nothing under a heading, write "nothing found". Do not report the settled decisions listed below as faults.

### What the change does

A demo simulator (`simulate_demo_tick`, run by `pg_cron` every 5 minutes) adds and moves fake visits with `is_demo = true` at sites A and B. A 24-hour clean-up (`delete_old_visits`, also on `pg_cron`) copies counts into `daily_stats` and deletes old visits. Before real testers start, staff must remove every demo visit and every demo row in `daily_stats`, and stop the simulator. This change adds:

1. A database function `public.clear_demo_data()` that only staff may call.
2. A button "Clear demo data" at the bottom of the staff screen. It asks a question first. The result words go to the staff screen's existing `role="status"` line.

The simulator takes `pg_try_advisory_xact_lock(hashtext('virtual_er'), hashtext('simulate_demo_tick'))` and returns at once if that lock is held. Then it returns if `demo_settings.running` is false. The clean-up takes `pg_try_advisory_xact_lock(hashtext('virtual_er'), hashtext('delete_old_visits'))` the same way. A statement trigger on `visits` (insert, update, delete) sends a change signal, so every open staff screen reads the list again.

### Settled decisions (do not report these)

- One function does the stop and both deletes in one transaction. It waits (`pg_advisory_xact_lock`, not the try form) on both keys. (migration lines 19 to 22)
- Errors use `42501` with the text "staff only" for a non-staff caller. (migration lines 16 to 18)
- The function returns the count of demo visits only, not the `daily_stats` rows. (migration line 25)
- The button shows to all staff at all times, also when there are no demo visits. There is no undo. (page.tsx section, ClearDemoData.tsx)
- After a failed clear, the question stays open, so staff can press Yes again. After a clear or Cancel, focus goes back to the "Clear demo data" button. (ClearDemoData.tsx `confirm` and `cancel`)
- `daily_stats` rows with `is_demo = false` and visits with `is_demo = false` must never be touched.

### Checks already done (checked)

- The owner ran the migration in the Supabase SQL Editor: "Success. No rows returned".
- The owner ran `supabase/checks/permissions.sql`. The list of rights for `anon` and `authenticated` is the expected list, with one new line, `authenticated function clear_demo_data EXECUTE`. No table is missing row-level security.
- The owner ran `supabase/checks/demo_clear.sql` (below). All 8 rows had the expected values: 00 = 0, 01 non-staff refused = 1, 02 deleted = 2, 03 demo visits left = 0, 04 real test visits left = 2, 05 demo stats left = 0, 06 real stats row left = 1, 07 simulator running = 0.
- `npm test`: 68 test files, 393 tests pass. `npm run lint`: no problems. `npm run build`: passed.

### Not checked

- The button in a real browser against the live database.
- A clear while a simulator tick or a clean-up runs at the same moment (the lock wait was not tested with two sessions).
- A screen reader reading the result words.

### Changed files and line counts

- `supabase/migrations/20261118010000_clear_demo_data.sql`: new, 32 lines
- `supabase/checks/demo_clear.sql`: new, 97 lines
- `supabase/checks/permissions.sql`: 66 lines, 3 comment lines changed or added, no query changed
- `data/demoData.ts`: new, 15 lines
- `lib/clearDemoMessage.ts`: new, 14 lines
- `lib/clearDemoMessage.test.ts`: new, 30 lines
- `components/staff/ClearDemoData.tsx`: new, 69 lines
- `components/staff/ClearDemoData.click.test.tsx`: new, 100 lines
- `app/staff/page.tsx`: 162 lines, 7 lines added

### supabase/migrations/20261118010000_clear_demo_data.sql

```sql
-- Demo mode, part 3 (SPEC "Demo mode"): the "Clear demo data" staff action.
-- It switches the demo simulator off. Then it deletes every demo visit and every demo row in
-- daily_stats. Real visits and real daily_stats rows stay.
-- The owner runs this file once in the Supabase SQL Editor. Check: supabase/checks/demo_clear.sql.

-- Staff only. It returns how many demo visits it deleted.
create function public.clear_demo_data()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  if not public.is_staff() then
    raise exception 'staff only' using errcode = '42501';
  end if;
  -- A tick or a clean-up that is running ends first, so neither adds a demo visit or a demo
  -- daily_stats row after the delete.
  perform pg_advisory_xact_lock(hashtext('virtual_er'), hashtext('simulate_demo_tick'));
  perform pg_advisory_xact_lock(hashtext('virtual_er'), hashtext('delete_old_visits'));
  update public.demo_settings set running = false where id = 1;
  delete from public.visits where is_demo = true;
  get diagnostics v_deleted = row_count;
  delete from public.daily_stats where is_demo = true;
  return v_deleted;
end;
$$;

revoke execute on function public.clear_demo_data() from public, anon, service_role;
grant execute on function public.clear_demo_data() to authenticated;
```

### supabase/checks/demo_clear.sql

```sql
-- Check for "Clear demo data" (migration 20261118010000_clear_demo_data.sql).
-- Run the whole file at once in the Supabase SQL Editor, as the owner (the default role there).
-- The file keeps the results in a temp table and shows all rows at the end.
-- It saves nothing: everything happens inside "begin ... rollback".
--
-- Expected result (8 rows):
--   00 demo visits before the check            0 (if not, run "Clear demo data" on /staff first)
--   01 non-staff refused                       1
--   02 visits deleted by the call              2 (the 2 test demo visits, plus any counted in 00)
--   03 demo visits left                        0
--   04 real test visits left                   2
--   05 demo stats rows left                    0 (all days)
--   06 real stats row left                     1 (day 2000-01-01, is_demo false)
--   07 simulator running                       0
--
-- The calls run as the "authenticated" role, the same role the app uses, with the staff or
-- patient sign-in set in the request claims. Why the year 2000: no real visit or stats row
-- can have that day.

begin;

-- The results, kept in a temp table so all rows show at the end.
create temp table demo_clear_rows (check_case text, count_value bigint);

-- The calls below run as "authenticated", so it may write to the results table.
grant all on demo_clear_rows to authenticated;

-- Setup, as the owner. Make sure neither site is paused, so the test visits can wait.
insert into demo_clear_rows
select '00 demo visits before the check', count(*) from public.visits where is_demo = true;

update public.site_settings set offsite_paused = false;

-- Two demo visits and two real visits, all waiting at site A. The ids of the two real visits
-- are saved in a temp table before the role changes, so they can be counted after the call.
create temp table demo_clear_real (id uuid);

with made as (
  insert into public.visits
    (code, access_token, site, source, ctas_level, language, status, triaged_at, offered_at, is_demo)
  values
    (public.demo_new_code(), public.demo_new_token(), 'A', 'desk', 4, 'en', 'waiting', now(), now(), true),
    (public.demo_new_code(), public.demo_new_token(), 'A', 'desk', 4, 'en', 'waiting', now(), now(), true),
    (public.demo_new_code(), public.demo_new_token(), 'A', 'desk', 4, 'en', 'waiting', now(), now(), false),
    (public.demo_new_code(), public.demo_new_token(), 'A', 'desk', 4, 'en', 'waiting', now(), now(), false)
  returning id, is_demo
)
insert into demo_clear_real select id from made where is_demo = false;

-- One demo stats row and one real stats row for a day no real visit can have.
insert into public.daily_stats (day, site, is_demo)
values ('2000-01-01', 'A', true), ('2000-01-01', 'A', false);

-- The simulator is on, so the call must switch it off.
update public.demo_settings set running = true;

-- 01: the app's patient role may not clear anything. The call must fail, and nothing is deleted.
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","app_metadata":{"role":"patient"}}', true);

do $$
begin
  perform public.clear_demo_data();
  insert into demo_clear_rows values ('01 non-staff refused', 0);
exception when insufficient_privilege then
  insert into demo_clear_rows values ('01 non-staff refused', 1);
end $$;

-- 02: staff clear the demo data. The call returns the number of demo visits it deleted.
select set_config('request.jwt.claims', '{"role":"authenticated","app_metadata":{"role":"staff"}}', true);

insert into demo_clear_rows
select '02 visits deleted by the call', public.clear_demo_data();

-- Back to the owner, to read the results.
reset role;

insert into demo_clear_rows
select '03 demo visits left', count(*) from public.visits where is_demo = true;

insert into demo_clear_rows
select '04 real test visits left', count(*) from public.visits v
where v.id in (select id from demo_clear_real);

insert into demo_clear_rows
select '05 demo stats rows left', count(*) from public.daily_stats where is_demo = true;

insert into demo_clear_rows
select '06 real stats row left', count(*) from public.daily_stats
where day = '2000-01-01' and is_demo = false;

insert into demo_clear_rows
select '07 simulator running', count(*) from public.demo_settings where running = true;

select check_case, count_value from demo_clear_rows order by check_case;

rollback;
```

### data/demoData.ts

```tsx
// Clears all demo data (SPEC "Demo mode"): asks the database function clear_demo_data, then reads the visits again.
import { supabaseBrowser } from "./supabaseBrowser";
import { loadVisits } from "./visitCache";

/** The number of demo visits deleted, or "failed" if the database could not be reached or did not answer with a number. */
export async function clearDemoData(): Promise<number | "failed"> {
  try {
    const { data, error } = await supabaseBrowser().rpc("clear_demo_data");
    if (error || typeof data !== "number") return "failed";
    void loadVisits();
    return data;
  } catch {
    return "failed";
  }
}
```

### lib/clearDemoMessage.ts

```tsx
// Staff wording after "Clear demo data": how many demo visits were deleted, or that nothing was saved.

/**
 * The words staff (and screen readers) get after "Clear demo data".
 * `result` is the number of demo visits deleted, or "failed" if the database could not be reached.
 */
export function clearDemoMessage(result: number | "failed"): string {
  if (result === "failed") {
    return "Not saved: the database could not be reached. Demo data was not cleared. Try again.";
  }
  if (result === 0) return "No demo visits to delete. The demo simulator is off.";
  const visits = result === 1 ? "visit" : "visits";
  return `${result} demo ${visits} deleted. The demo simulator is off.`;
}
```

### lib/clearDemoMessage.test.ts

```tsx
// Checks the words staff read after "Clear demo data".

import { describe, expect, it } from "vitest";
import { clearDemoMessage } from "./clearDemoMessage";

describe("clearDemoMessage", () => {
  it("says nothing was saved when the database could not be reached", () => {
    const words = clearDemoMessage("failed");
    expect(words).toMatch(/^Not saved/);
    expect(words).toContain("Try again");
  });

  it("says no demo visits were found when there were none", () => {
    expect(clearDemoMessage(0)).toContain("No demo visits");
  });

  it("uses the single word for 1 visit", () => {
    const words = clearDemoMessage(1);
    expect(words).toContain("1 demo visit");
    expect(words).not.toContain("1 demo visits");
  });

  it("uses the plural for more than 1 visit", () => {
    expect(clearDemoMessage(12)).toContain("12 demo visits");
  });

  it("says the simulator is off after every save", () => {
    for (const n of [0, 1, 12]) expect(clearDemoMessage(n)).toContain("simulator is off");
  });
});
```

### components/staff/ClearDemoData.tsx

```tsx
"use client";

// The "Clear demo data" button for staff, with a question first. Clearing deletes every demo
// visit and its dashboard numbers, and switches the demo simulator off (SPEC "Demo mode").

import { useEffect, useRef, useState } from "react";
import { clearDemoData } from "@/data/demoData";
import { clearDemoMessage } from "@/lib/clearDemoMessage";
import { Button } from "@/components/Button";

type Props = {
  /** Called with words for staff and screen readers after a clear, or after a failed one. */
  onResult: (message: string) => void;
};

export function ClearDemoData({ onResult }: Props) {
  const [asking, setAsking] = useState(false);
  const [saving, setSaving] = useState(false);
  const question = useRef<HTMLHeadingElement>(null);
  const openButton = useRef<HTMLButtonElement>(null);

  // Move focus to the question when it opens, so keyboard and screen-reader users land on it.
  useEffect(() => {
    if (asking) question.current?.focus();
  }, [asking]);

  const cancel = () => {
    setAsking(false);
    // Focus goes back to the button once it is shown again.
    window.setTimeout(() => openButton.current?.focus(), 0);
  };

  const confirm = async () => {
    if (saving) return;
    setSaving(true);
    const result = await clearDemoData();
    setSaving(false);
    if (result !== "failed") cancel();
    onResult(clearDemoMessage(result));
  };

  if (!asking) {
    return (
      <Button ref={openButton} variant="danger" onClick={() => setAsking(true)}>
        Clear demo data
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border-4 border-red-800 bg-white p-4" data-testid="clear-demo-confirm">
      <h3 ref={question} tabIndex={-1} className="text-lg font-bold text-red-900">
        Clear all demo data?
      </h3>
      <p>
        This deletes every demo visit at Demo Site A and B and their dashboard numbers, and switches the demo
        simulator off. Real visits stay. There is no undo.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="danger" aria-disabled={saving} onClick={confirm}>
          {saving ? "Saving…" : "Yes, clear demo data"}
        </Button>
        <Button variant="secondary" aria-disabled={saving} onClick={cancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
```

### components/staff/ClearDemoData.click.test.tsx

```tsx
// @vitest-environment happy-dom
// Presses the "Clear demo data" buttons in a test browser (happy-dom): one tap only asks, Cancel
// calls nothing, Yes clears once and reports the count, and a failed clear keeps the question open.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearDemoData } from "@/data/demoData";
import { ClearDemoData } from "./ClearDemoData";

// The words are the owner's; the test only checks which result they were given.
vi.mock("@/data/demoData", () => ({ clearDemoData: vi.fn() }));
vi.mock("@/lib/clearDemoMessage", () => ({
  clearDemoMessage: (result: number | "failed") => "words:" + String(result),
}));

// Tells React that this file runs its updates inside act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

function show(onResult = vi.fn()) {
  act(() => root.render(<ClearDemoData onResult={onResult} />));
  return onResult;
}

/** The button whose words start with `words`. */
const button = (words: string) => [...container.querySelectorAll("button")].find((b) => b.textContent?.startsWith(words));

const question = () => container.querySelector<HTMLElement>('[data-testid="clear-demo-confirm"]');

async function press(words: string) {
  const target = button(words);
  if (!target) throw new Error(`No button "${words}"`);
  // A real tap or Enter key puts focus on the button first; happy-dom's click() alone does not.
  target.focus();
  await act(async () => target.click());
}

/** Lets the pending save and the panel's one-tick focus wait (setTimeout 0) run. */
const nextTick = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

beforeEach(() => {
  vi.mocked(clearDemoData).mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("ClearDemoData taps", () => {
  it("asks first: one tap clears nothing and moves focus to the question", async () => {
    const onResult = show();
    await press("Clear demo data");
    await nextTick();
    expect(clearDemoData).not.toHaveBeenCalled();
    expect(onResult).not.toHaveBeenCalled();
    expect(question()?.textContent).toContain("Clear all demo data?");
    expect(button("Clear demo data")).toBeUndefined();
    expect(document.activeElement).toBe(question()?.querySelector("h3"));
  });

  it("Cancel closes the question, clears nothing, and brings focus back to Clear demo data", async () => {
    const onResult = show();
    await press("Clear demo data");
    await press("Cancel");
    await nextTick();
    expect(clearDemoData).not.toHaveBeenCalled();
    expect(onResult).not.toHaveBeenCalled();
    expect(question()).toBeNull();
    expect(document.activeElement).toBe(button("Clear demo data"));
  });

  it("Yes clears once, reports the count, and closes the question", async () => {
    vi.mocked(clearDemoData).mockResolvedValue(3);
    const onResult = show();
    await press("Clear demo data");
    await press("Yes, clear demo data");
    await nextTick();
    expect(clearDemoData).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith("words:3");
    expect(question()).toBeNull();
  });

  it("when the clear fails, reports the failure and keeps the question open", async () => {
    vi.mocked(clearDemoData).mockResolvedValue("failed");
    const onResult = show();
    await press("Clear demo data");
    await press("Yes, clear demo data");
    await nextTick();
    expect(onResult).toHaveBeenCalledWith("words:failed");
    expect(question()).not.toBeNull();
    expect(button("Yes, clear demo data")).toBeDefined();
  });
});
```

### app/staff/page.tsx (the diff)

```diff
@@ -11,6 +11,7 @@ import { homeCheckInProblem } from "@/lib/homeCheckIn";
 import { activeLine } from "@/lib/queue";
 import type { Site, Visit } from "@/lib/visit";
 import { CheckInPanel } from "@/components/staff/CheckInPanel";
+import { ClearDemoData } from "@/components/staff/ClearDemoData";
 import { ExpectedArrivals } from "@/components/staff/ExpectedArrivals";
 import { PauseSwitch } from "@/components/staff/PauseSwitch";
 import { ProgressAnnouncer } from "@/components/staff/ProgressAnnouncer";
@@ -149,6 +150,12 @@ export default function StaffPage() {
           {visits && <ProgressAnnouncer visits={visits} site={site} />}
         </section>
       </div>
+
+      <section aria-labelledby="demo-heading" className="glass-panel space-y-3">
+        <h2 id="demo-heading" className="text-xl font-bold">Demo data</h2>
+        <p>For the demo only. Run this before real testers start.</p>
+        <ClearDemoData onResult={setAnnouncement} />
+      </section>
     </main>
     </StaffShell>
   );
```

### Helpers the changed code calls (not in the diff)

`public.is_staff()` (supabase/migrations/20261110060756_tables_and_security.sql):

```sql
create function public.is_staff()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff', false);
$$;

revoke execute on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;
```

`loadVisits()` (data/visitCache.ts, lines 46 to 62):

```ts
export async function loadVisits(): Promise<void> {
  const thisLoad = ++latestLoad;
  const since = new Date(Date.now() - LIST_HOURS * 3_600_000).toISOString();
  let rows: StoredVisit[] | null = null;
  try {
    const { data, error } = await supabaseBrowser()
      .from("visits")
      .select("*")
      .or(`status.in.(${ACTIVE_STATUSES.join(",")}),created_at.gte."${since}",closed_at.gte."${since}"`);
    if (!error && Array.isArray(data)) rows = data as StoredVisit[];
  } catch {
    // Treated like any other failed read below.
  }
  if (thisLoad !== latestLoad) return; // a newer read or a saved change has happened since; it wins
  if (rows) show(rows, false);
  else show(list.visits, true); // keep what was on screen, marked as possibly out of date
}
```

## Response

(paste the Gemini answer here)
