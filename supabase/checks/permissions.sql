-- Run after every database change (Claude runs it through the Supabase connection).
-- It lists everything patients (anon) and logged-in users (authenticated) can touch in
-- the public schema. Compare the result with the expected list below; anything extra is
-- a hole to fix before going on. Update the expected list only on purpose.
--
-- Expected after Phase 2:
--   anon           table     change_signal       SELECT
--   anon           function  confirm_on_my_way   EXECUTE
--   anon           function  get_patient_visit   EXECUTE
--   anon           function  record_seen         EXECUTE
--   authenticated  table     change_signal       SELECT
--   authenticated  table     site_settings       SELECT, UPDATE
--   authenticated  table     visits              INSERT, SELECT, UPDATE
--   authenticated  function  confirm_on_my_way   EXECUTE
--   authenticated  function  get_patient_visit   EXECUTE
--   authenticated  function  is_staff            EXECUTE
--   authenticated  function  record_seen         EXECUTE
-- Also expected: every table listed has row-level security on (see the second query).

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
