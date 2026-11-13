-- Hosted rollback-only role/RLS test, not validated-JWT or file-transfer acceptance.
begin;
set local lock_timeout='5s';
set local statement_timeout='45s';
select pg_advisory_xact_lock(hashtextextended('e7ca010b-de06-4e0e-856d-f4ad54d5fcaa',0));
do $$ declare sid uuid; begin
 if exists(select 1 from rhh.professionals where owner_id='e7ca010b-de06-4e0e-856d-f4ad54d5fcaa') then raise exception 'Designated test member has an existing listing; preserve and stop';end if;
 if not exists(select 1 from rhh.accounts a join auth.users u on u.id=a.user_id where a.user_id='e7ca010b-de06-4e0e-856d-f4ad54d5fcaa' and a.role='member' and u.email_confirmed_at is not null) then raise exception 'Confirmed designated test member unavailable';end if;
 select id into sid from auth.sessions where user_id='e7ca010b-de06-4e0e-856d-f4ad54d5fcaa' and (not_after is null or not_after>clock_timestamp()) limit 1;
 if sid is null then raise exception 'Existing designated session unavailable';end if;
 perform set_config('request.jwt.claim.sub','e7ca010b-de06-4e0e-856d-f4ad54d5fcaa',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub','e7ca010b-de06-4e0e-856d-f4ad54d5fcaa','session_id',sid)::text,true);
end $$;
create temp table media_results(test text primary key,passed boolean not null check(passed));
grant insert on pg_temp.media_results to authenticated,anon;
insert into rhh.professionals(id,owner_id,business_name,city,state,description,healthy_home_practices) values('30000000-0000-4000-8000-0000000000d2','e7ca010b-de06-4e0e-856d-f4ad54d5fcaa','PROFILE MEDIA TEST - ROLLBACK ONLY','Raleigh','NC','Isolated rollback-only private profile media test.','Rollback-only healthy-home practices.');
insert into rhh.applications(professional_id,contact_name,contact_email) values('30000000-0000-4000-8000-0000000000d2','Rollback test','fixture@example.invalid');
insert into rhh.memberships(professional_id) values('30000000-0000-4000-8000-0000000000d2');
set local role authenticated;
do $$ declare item jsonb; ids uuid[]:='{}'; n integer; denied boolean; begin
 insert into pg_temp.media_results values('initial_saved_media_absent',public.rhh_member_media()->>'photoId' is null);
 for n in 1..4 loop item:=public.rhh_member_media('reserve');ids:=array_append(ids,(item->>'id')::uuid);end loop;
 insert into pg_temp.media_results values('randomized_own_listing_paths',item->>'objectPath'='30000000-0000-4000-8000-0000000000d2/'||ids[4]::text||'.webp');
 insert into pg_temp.media_results values('selection_does_not_save',public.rhh_member_media()->>'photoId' is null);
 denied:=false;begin perform public.rhh_member_media('save',ids[1],1,true);exception when sqlstate 'PT409' then denied:=true;end;insert into pg_temp.media_results values('uncompleted_upload_denied',denied);
 denied:=false;begin perform public.rhh_member_media('save',ids[1],99,true);exception when sqlstate 'PT409' then denied:=true;end;insert into pg_temp.media_results values('stale_version_denied',denied);
 denied:=false;begin perform public.rhh_member_media('reserve');exception when sqlstate 'PT429' then denied:=true;end;insert into pg_temp.media_results values('retained_file_quota_enforced',denied);
 perform public.rhh_member_media('cancel',ids[1]);
 denied:=false;begin perform public.rhh_member_media('save',ids[1],1,true);exception when sqlstate 'PT404' then denied:=true;end;insert into pg_temp.media_results values('canceled_draft_cannot_be_associated',denied);
 insert into pg_temp.media_results values('cleanup_grace_preserves_inflight_paths',public.rhh_member_media('cleanup')='[]'::jsonb);
 denied:=false;begin perform 1 from rhh_private.profile_media;exception when insufficient_privilege then denied:=true;end;insert into pg_temp.media_results values('raw_private_media_denied',denied);
 insert into pg_temp.media_results values('guessed_private_reference_unavailable',public.rhh_member_media('route','00000000-0000-4000-8000-000000000001') is null);
end $$;
reset role;
set local role anon;
do $$ declare denied boolean:=false; begin
 begin perform public.rhh_member_media();exception when insufficient_privilege then denied:=true;end;insert into pg_temp.media_results values('anonymous_member_media_denied',denied);
 insert into pg_temp.media_results values('unpublished_public_reference_unavailable',public.rhh_public_profile_media('30000000-0000-4000-8000-0000000000d2','00000000-0000-4000-8000-000000000001') is null);
end $$;
reset role;
select test,passed from media_results order by test;
rollback;
