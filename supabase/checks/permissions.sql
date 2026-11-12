-- Run after every database change (Claude runs it through the Supabase connection).
-- It lists everything patients (anon) and logged-in users (authenticated) can touch in
-- the public schema. Compare the result with the expected list below; anything extra is
-- a hole to fix before going on. Update the expected list only on purpose.
--
-- Expected after Phase 3's pause safety limit (20261111200000_pause_safety_limit.sql; its
-- trigger function visits_limit_pause is callable by nobody, so the list is unchanged):
--   anon           table     change_signal       SELECT
--   anon           function  confirm_on_my_way   EXECUTE
--   anon           function  get_patient_visit   EXECUTE
--   anon           function  record_seen         EXECUTE
--   anon           function  record_still_here   EXECUTE
--   authenticated  table     change_signal       SELECT
--   authenticated  table     site_settings       SELECT, UPDATE
--   authenticated  table     visits              INSERT, SELECT, UPDATE
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

select grantee as role, 'table' as kind, table_name as name,
       string_agg(privilege_type, ', ' order by privilege_type) as rights
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated')
group by grantee, table_name
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
