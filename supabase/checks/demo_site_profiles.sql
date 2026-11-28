-- Read-only check for migration 20261127000000_demo_site_profiles.sql.
-- Shows, for each site and each hour of today's Toronto date, the load the
-- demo simulator uses, the number of waiting visits it aims for, and the
-- recall gaps in minutes. Uses the same numbers as simulate_demo_tick().
with d as (
  select (now() at time zone 'America/Toronto')::date as day
),
grid as (
  select s.site, h.hour
  from unnest(array['A', 'B']) as s(site)
  cross join generate_series(0, 23) as h(hour)
),
calc as (
  select
    g.site,
    g.hour,
    (case when g.site = 'A'
       then array[0.7, 0.4, 0.8, 1.4, 1.5, 1.3, 1.0, 0.9]
       else array[0.6, 0.4, 0.6, 0.9, 1.1, 1.4, 1.6, 1.4] end
    )[1 + floor(g.hour / 3)::integer] as hour_weight,
    0.8 + 0.4 * (abs(hashtext(d.day::text || g.site)::bigint) % 1001) / 1000.0 as day_factor,
    case when g.site = 'A' then 1.05 else 0.95 end as speed
  from grid g cross join d
)
select
  site,
  hour as hour_toronto,
  hour_weight,
  round(day_factor, 3) as day_factor,
  round(hour_weight * day_factor, 3) as load,
  greatest(2, least(15, round(9 * hour_weight * day_factor)::integer)) as target_waiting,
  round(18 / (hour_weight * day_factor * speed), 1) as long_gap_minutes,
  round(12 / (hour_weight * day_factor * speed), 1) as quick_gap_minutes
from calc
order by site, hour;
