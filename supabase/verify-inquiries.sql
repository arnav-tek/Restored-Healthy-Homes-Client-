-- Operator-only, rollback-only hosted database regression. No Auth users created,
-- no existing listings changed, no committed membership activation or messages.
-- SQL role/RLS checks are NOT a real A/B password/JWT acceptance test.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
select pg_advisory_xact_lock(hashtextextended('e7ca010b-de06-4e0e-856d-f4ad54d5fcaa',0));
do $$ begin
 if not exists(select 1 from rhh.accounts a join auth.users u on u.id=a.user_id
 where a.user_id='e7ca010b-de06-4e0e-856d-f4ad54d5fcaa' and a.role='member' and u.email_confirmed_at is not null)
 then raise exception 'Designated confirmed test member unavailable'; end if;
 if exists(select 1 from rhh.professionals where owner_id='e7ca010b-de06-4e0e-856d-f4ad54d5fcaa')
 then raise exception 'Test member already has a listing; preserve it and stop'; end if;
 if exists(select 1 from rhh_private.inquiry_limits) or exists(select 1 from rhh_private.inquiry_requests)
 then raise exception 'Existing abuse metadata: stop to preserve it'; end if;
 if exists(select 1 from rhh.professionals where id='30000000-0000-4000-8000-0000000000b1')
 then raise exception 'Test fixture ID already exists'; end if;
end $$;
create temporary table b1_results(test text primary key,passed boolean not null check(passed));
create temporary table b1_ids(id uuid);
grant insert on pg_temp.b1_results to anon,rhh_member_writer,rhh_admin_writer;
grant select on pg_temp.b1_ids to rhh_member_writer;
insert into rhh.professionals(id,owner_id,business_name,city,state,description,healthy_home_practices)
 values('30000000-0000-4000-8000-0000000000b1','e7ca010b-de06-4e0e-856d-f4ad54d5fcaa',
 'Staging B1 inquiry test - ROLLBACK ONLY','Raleigh','NC',
 'Rollback-only test fixture, never committed or published to other sessions.',
 'Rollback-only healthy-home practices, solely for database boundary tests.');
insert into rhh.applications(professional_id,contact_name,contact_email,approval)
 values('30000000-0000-4000-8000-0000000000b1','Rollback test','fixture@example.invalid','approved');
insert into rhh.memberships(professional_id,status) values('30000000-0000-4000-8000-0000000000b1','active');
set local role anon;
do $$ declare input jsonb; result jsonb; attempt integer; denied boolean; begin
 input:=jsonb_build_object('professionalId','30000000-0000-4000-8000-0000000000b1',
 'requestId',gen_random_uuid(),'name','Rollback-only sender','email','b1-quota@example.invalid',
 'message','Rollback-only B1 inquiry content. Never delivered or committed.');
 for attempt in 1..6 loop
  result:=public.rhh_submit_inquiry(input);
  if result<>jsonb_build_object('saved',true) then raise exception 'Unexpected public receipt'; end if;
 end loop;
 insert into pg_temp.b1_results values('anon_eligible_receipt_and_retries',true);
 denied:=false;
 begin perform public.rhh_submit_inquiry(input||jsonb_build_object('ownerId','e7ca010b-de06-4e0e-856d-f4ad54d5fcaa'));
 exception when sqlstate '22023' then denied:=true; end;
 insert into pg_temp.b1_results values('forged_recipient_fields_denied',denied);
 denied:=false;
 begin perform public.rhh_inbox(1); exception when insufficient_privilege then denied:=true; end;
 insert into pg_temp.b1_results values('anon_inbox_denied_with_saved_messages',denied);
 for attempt in 1..2 loop
  perform public.rhh_submit_inquiry(input||jsonb_build_object('requestId',gen_random_uuid()));
 end loop;
 denied:=false;
 begin perform public.rhh_submit_inquiry(input||jsonb_build_object('requestId',gen_random_uuid(),'email','B1-QUOTA@example.invalid'));
 exception when sqlstate 'PT429' then denied:=true; end;
 insert into pg_temp.b1_results values('normalized_sender_three_per_window',denied);
 for attempt in 1..17 loop
  perform public.rhh_submit_inquiry(input||jsonb_build_object('requestId',gen_random_uuid(),'email','b1-target-'||attempt||'@example.invalid'));
 end loop;
 denied:=false;
 begin perform public.rhh_submit_inquiry(input||jsonb_build_object('requestId',gen_random_uuid(),'email','b1-target-overflow@example.invalid'));
 exception when sqlstate 'PT429' then denied:=true; end;
 insert into pg_temp.b1_results values('target_twenty_per_window',denied);
 insert into pg_temp.b1_results values('public_projection_excludes_inquiry_data',
  position('b1-quota@example.invalid' in public.rhh_public_directory()::text)=0
  and position('Rollback-only B1 inquiry content' in public.rhh_public_directory()::text)=0);
end $$;
reset role;
insert into pg_temp.b1_results values('duplicates_created_one_initial_message_not_six',
 (select count(*)=3 from rhh.inquiries where professional_id='30000000-0000-4000-8000-0000000000b1' and sender_email='b1-quota@example.invalid'));
insert into pg_temp.b1_results values('twenty_messages_and_receipts_atomic',
 (select count(*)=20 from rhh.inquiries where professional_id='30000000-0000-4000-8000-0000000000b1')
 and (select count(*)=20 from rhh_private.inquiry_requests));
insert into pg_temp.b1_results values('server_bound_original_recipient_unread',
 not exists(select 1 from rhh.inquiries where professional_id='30000000-0000-4000-8000-0000000000b1'
 and (recipient_id is distinct from 'e7ca010b-de06-4e0e-856d-f4ad54d5fcaa'::uuid or read_at is not null or state_version<>1)));
insert into pg_temp.b1_ids select id from rhh.inquiries where professional_id='30000000-0000-4000-8000-0000000000b1' order by created_at,id limit 1;
-- This row was created inside this transaction; no existing counters are changed.
update rhh_private.inquiry_limits set used=100 where bucket='global';
set local role anon;
do $$ declare denied boolean:=false; begin
 begin perform public.rhh_submit_inquiry(jsonb_build_object('professionalId','30000000-0000-4000-8000-0000000000b1',
 'requestId',gen_random_uuid(),'name','Rollback test','email','b1-global@example.invalid',
 'message','Rollback-only global quota test, never delivered or committed.'));
 exception when sqlstate 'PT429' then denied:=true; end;
 insert into pg_temp.b1_results values('global_hundred_per_window',denied);
end $$;
reset role;
select set_config('request.jwt.claim.sub','e7ca010b-de06-4e0e-856d-f4ad54d5fcaa',true);
set local role rhh_member_writer;
do $$ declare inquiry_id uuid; detail jsonb; changed integer; denied boolean; begin
 select id into inquiry_id from pg_temp.b1_ids;
 detail:=rhh_private.inquiry_detail(inquiry_id);
 insert into pg_temp.b1_results values('recipient_rls_read_projection',detail is not null and detail->>'email' is not null
  and not(detail ? 'recipient_id') and not(detail ? 'secret'));
 update rhh.inquiries set read_at=clock_timestamp(),state_version=state_version+1 where id=inquiry_id;
 get diagnostics changed=row_count;
 insert into pg_temp.b1_results values('recipient_read_state_updated',changed=1 and
  exists(select 1 from rhh.inquiries where id=inquiry_id and read_at is not null and state_version=2));
 denied:=false;
 begin update rhh.inquiries set sender_email='forged@example.invalid' where id=inquiry_id;
 exception when insufficient_privilege then denied:=true; end;
 insert into pg_temp.b1_results values('sender_fields_not_editable',denied);
 denied:=false;
 begin update rhh.inquiries set recipient_id=null where id=inquiry_id;
 exception when insufficient_privilege then denied:=true; end;
 insert into pg_temp.b1_results values('recipient_not_editable',denied);
end $$;
-- Deliberately unassociated UID, not a fabricated real member B or Auth session.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000099',true);
do $$ declare inquiry_id uuid; changed integer; begin
 select id into inquiry_id from pg_temp.b1_ids;
 insert into pg_temp.b1_results values('different_uid_rls_read_hidden',rhh_private.inquiry_detail(inquiry_id) is null);
 update rhh.inquiries set read_at=null,state_version=state_version+1 where id=inquiry_id;
 get diagnostics changed=row_count;
 insert into pg_temp.b1_results values('different_uid_rls_update_hidden',changed=0);
end $$;
reset role;
set local role rhh_admin_writer;
do $$ declare denied boolean:=false; begin
 begin perform id from rhh.inquiries; exception when insufficient_privilege then denied:=true; end;
 insert into pg_temp.b1_results values('admin_executor_inbox_denied',denied);
end $$;
reset role;
insert into pg_temp.b1_results values('one_notification_per_accepted_inquiry',
 (select count(*)=20 from rhh_private.inquiry_email_jobs j join rhh.inquiries i on i.id=j.inquiry_id where i.professional_id='30000000-0000-4000-8000-0000000000b1'));
insert into pg_temp.b1_results values('notifications_use_original_verified_auth_recipient',
 not exists(select 1 from rhh_private.inquiry_email_jobs j join rhh.inquiries i on i.id=j.inquiry_id
 join auth.users u on u.id=i.recipient_id where i.professional_id='30000000-0000-4000-8000-0000000000b1'
 and (j.recipient_id<>i.recipient_id or j.recipient_email is distinct from u.email or j.state<>'pending')));
insert into pg_temp.b1_results values('admin_notification_contacts_denied',
 not has_column_privilege('rhh_admin_writer','rhh_private.inquiry_email_jobs','recipient_email','select'));
set local role anon;
do $$ declare denied boolean:=false; begin
 begin perform public.rhh_claim_inquiry_email();exception when insufficient_privilege then denied:=true;end;
 insert into pg_temp.b1_results values('notification_worker_credential_required',denied);
end $$;
reset role;
select test,passed from pg_temp.b1_results order by test;
rollback;
