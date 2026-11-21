-- Check for the survey (migration 20261120000000_survey.sql): submit_survey and the new
-- survey_done column of get_patient_visit.
-- Run the whole file at once (do not select and run one part): the Editor shows only the last
-- result, so the file keeps each result in a temp table and shows all rows at the end.
-- It saves nothing: everything happens inside "begin ... rollback".
-- The synthetic visits start as waiting (the step trigger refuses a new visit as arrived) and
-- then move along allowed steps, as the staff screen does.
--
-- Cases 12 and 13 (20261120010000_survey_keeps_version.sql): the score alone does not raise the
-- version, so a staff Undo right after the survey is not refused; other changes still raise it.
--
-- Cases 14 to 16: the lowest and highest score are saved, and a phone (the anon role) can save a score.
--
-- Expected result: 16 rows, each with result = ok.

begin;

insert into public.visits (code, access_token, site, source, status, triaged_at) values
  ('ZZZZ5A', 'ZZZZZZZZZZZZZZZZZZZZZZZZS0', 'A', 'desk', 'waiting', now()),  -- arrives, answers 7
  ('ZZZZ5B', 'ZZZZZZZZZZZZZZZZZZZZZZZZS1', 'A', 'desk', 'waiting', now()),  -- on the way, not closed
  ('ZZZZ5C', 'ZZZZZZZZZZZZZZZZZZZZZZZZS2', 'A', 'desk', 'waiting', now()),  -- removed (left)
  ('ZZZZ5D', 'ZZZZZZZZZZZZZZZZZZZZZZZZS3', 'A', 'desk', 'waiting', now()),  -- arrives, gives no score
  ('ZZZZ5F', 'ZZZZZZZZZZZZZZZZZZZZZZZZS5', 'A', 'desk', 'waiting', now()),  -- arrives, answers 0
  ('ZZZZ5G', 'ZZZZZZZZZZZZZZZZZZZZZZZZS6', 'A', 'desk', 'waiting', now()),  -- arrives, answers 10
  ('ZZZZ5H', 'ZZZZZZZZZZZZZZZZZZZZZZZZS7', 'A', 'desk', 'waiting', now());  -- arrives, answers 9 as anon
insert into public.visits (code, access_token, site, source, status, triaged_at, offered_at, closed_at) values
  ('ZZZZ5E', 'ZZZZZZZZZZZZZZZZZZZZZZZZS4', 'A', 'desk', 'declined', now(), now(), now());

update public.visits set status = 'arrived', arrived_at = now(), closed_at = now()
  where code in ('ZZZZ5A', 'ZZZZ5D', 'ZZZZ5F', 'ZZZZ5G', 'ZZZZ5H');
update public.visits set status = 'called', called_at = now() where code = 'ZZZZ5B';
update public.visits set status = 'on_the_way', confirmed_at = now() where code = 'ZZZZ5B';
update public.visits set status = 'removed', removed_reason = 'left', closed_at = now() where code = 'ZZZZ5C';

create temp table survey_rows (check_case text, expected text, got text);

-- The versions before the survey (case 12) and before another change (case 13).
create temp table versions_before as
  select code, version from public.visits where code in ('ZZZZ5A', 'ZZZZ5B');

insert into survey_rows select '1 on the way, not closed: refused', 'false',
  public.submit_survey('ZZZZZZZZZZZZZZZZZZZZZZZZS1', 7)::text;
insert into survey_rows select '2 removed: refused', 'false',
  public.submit_survey('ZZZZZZZZZZZZZZZZZZZZZZZZS2', 7)::text;
insert into survey_rows select '3 declined: refused', 'false',
  public.submit_survey('ZZZZZZZZZZZZZZZZZZZZZZZZS4', 7)::text;
insert into survey_rows select '4 arrived, score 11: refused', 'false',
  public.submit_survey('ZZZZZZZZZZZZZZZZZZZZZZZZS0', 11)::text;
insert into survey_rows select '5 arrived, score -1: refused', 'false',
  public.submit_survey('ZZZZZZZZZZZZZZZZZZZZZZZZS0', -1)::text;
insert into survey_rows select '6 a token that opens no visit: refused', 'false',
  public.submit_survey('ZZZZZZZZZZZZZZZZZZZZZZZZXX', 7)::text;
insert into survey_rows select '7 arrived, score 7: saved', 'true',
  public.submit_survey('ZZZZZZZZZZZZZZZZZZZZZZZZS0', 7)::text;
insert into survey_rows select '8 the second try: refused', 'false',
  public.submit_survey('ZZZZZZZZZZZZZZZZZZZZZZZZS0', 8)::text;
insert into survey_rows select '9 the score stays 7', '7',
  (select survey_score::text from public.visits where code = 'ZZZZ5A');
insert into survey_rows select '10 survey_done after the score', 'true',
  (select survey_done::text from public.get_patient_visit('ZZZZZZZZZZZZZZZZZZZZZZZZS0'));
insert into survey_rows select '11 survey_done with no score', 'false',
  (select survey_done::text from public.get_patient_visit('ZZZZZZZZZZZZZZZZZZZZZZZZS3'));
insert into survey_rows select '12 the survey keeps the version',
  (select version::text from versions_before where code = 'ZZZZ5A'),
  (select version::text from public.visits where code = 'ZZZZ5A');

update public.visits set last_still_here_at = now() where code = 'ZZZZ5B';
insert into survey_rows select '13 another change still raises the version',
  (select (version + 1)::text from versions_before where code = 'ZZZZ5B'),
  (select version::text from public.visits where code = 'ZZZZ5B');

insert into survey_rows select '14 arrived, score 0: saved', 'true',
  public.submit_survey('ZZZZZZZZZZZZZZZZZZZZZZZZS5', 0)::text;
insert into survey_rows select '15 arrived, score 10: saved', 'true',
  public.submit_survey('ZZZZZZZZZZZZZZZZZZZZZZZZS6', 10)::text;

-- Case 16: the phone calls submit_survey as anon. The anon role may not write to the temp table,
-- so the call goes alone, and the check reads the score after "reset role".
set local role anon;
select public.submit_survey('ZZZZZZZZZZZZZZZZZZZZZZZZS7', 9);
reset role;
insert into survey_rows select '16 anon saves a score', '9',
  (select survey_score::text from public.visits where code = 'ZZZZ5H');

select check_case, expected, got,
       case when got is not distinct from expected then 'ok' else 'FAIL' end as result
from survey_rows
order by split_part(check_case, ' ', 1)::integer;

rollback;
