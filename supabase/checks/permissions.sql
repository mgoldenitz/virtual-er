-- Run after every database change (Claude runs it through the Supabase connection).
-- It lists everything patients (anon) and logged-in users (authenticated) can touch in
-- the public schema. Compare the result with the expected list below; anything extra is
-- a hole to fix before going on. Update the expected list only on purpose.
--
-- Expected after Phase 3's 24-hour clean-up (20261116100000_daily_stats_and_cleanup.sql; its
-- table daily_stats and its function delete_old_visits give anon and authenticated nothing,
-- so the list is the same as after the site pause read, 20261112010000_site_pause_read.sql;
-- the allowed steps, 20261117000000_allowed_steps.sql, add only the trigger function
-- visits_check_step, which nobody can call, so the list stays the same). The demo files
-- (20261118000000_demo_settings.sql and 20261118000100_demo_simulator.sql) give anon and
-- authenticated nothing either: their table has no rights for them, and their functions are
-- revoked from them, so the list stays the same. 20261118010000_clear_demo_data.sql gives
-- authenticated EXECUTE on clear_demo_data (staff only, the function checks is_staff), so that
-- one line is added to the list:
--   anon           table     change_signal       SELECT
--   anon           function  confirm_on_my_way   EXECUTE
--   anon           function  get_patient_visit   EXECUTE
--   anon           function  record_seen         EXECUTE
--   anon           function  record_still_here   EXECUTE
--   authenticated  table     change_signal       SELECT
--   authenticated  table     site_settings       SELECT, UPDATE
--   authenticated  table     visits              INSERT, SELECT, UPDATE
--   authenticated  function  clear_demo_data     EXECUTE
--   authenticated  function  confirm_on_my_way   EXECUTE
--   authenticated  function  get_patient_visit   EXECUTE
--   authenticated  function  is_staff            EXECUTE
--   authenticated  function  record_seen         EXECUTE
--   authenticated  function  record_still_here   EXECUTE
-- Also listed, and fine: rls_auto_enable, for both roles. Supabase made it when the project
-- was created; it turns on row-level security for each new table. It is an event trigger
-- function, which Postgres refuses to run as an ordinary call.
-- Also expected: every table listed has row-level security on (see the second query).
-- Supabase's security advisor warns that anon can run get_patient_visit, record_seen,
-- confirm_on_my_way and record_still_here. That is on purpose (SPEC hard rule 5); each needs the visit's token.

-- Table rights use has_table_privilege, not information_schema.role_table_grants: that view
-- shows only roles the current user belongs to, so through the read-only Supabase connection
-- it shows no table rights at all. has_table_privilege answers for any role and includes
-- rights that come through PUBLIC or another role. It looks at whole-table rights only, not
-- column rights; no migration here gives column rights.
select r.rolname as role, 'table' as kind, c.relname as name,
       string_agg(p.priv, ', ' order by p.priv) as rights
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
cross join pg_roles r
cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'),
                   ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) as p(priv)
where n.nspname = 'public' and c.relkind in ('r', 'v', 'm', 'p')
  and r.rolname in ('anon', 'authenticated')
  and has_table_privilege(r.oid, c.oid, p.priv)
group by r.rolname, c.relname
union all
select r.rolname, 'function', p.proname, 'EXECUTE'
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join pg_roles r
where n.nspname = 'public' and r.rolname in ('anon', 'authenticated')
  and has_function_privilege(r.oid, p.oid, 'execute')
order by 1, 2, 3;

-- Tables in public without row-level security (expected: none).
select c.relname as table_without_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
