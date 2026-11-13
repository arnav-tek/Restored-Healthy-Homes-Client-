-- Step 6 operator-only rollback fixture. Existing member/session binding, not JWT/browser/admin acceptance.
begin;set local lock_timeout='5s';set local statement_timeout='45s';
select pg_advisory_xact_lock(hashtextextended('e7ca010b-de06-4e0e-856d-f4ad54d5fcaa',0));
do $$ declare sid uuid;begin
 if exists(select 1 from rhh.professionals where owner_id='e7ca010b-de06-4e0e-856d-f4ad54d5fcaa') then raise exception 'Existing listing; preserve and stop';end if;
 if not exists(select 1 from rhh.accounts a join auth.users u on u.id=a.user_id where a.user_id='e7ca010b-de06-4e0e-856d-f4ad54d5fcaa' and a.role='member' and u.email_confirmed_at is not null) then raise exception 'Designated confirmed member unavailable';end if;
 select id into sid from auth.sessions where user_id='e7ca010b-de06-4e0e-856d-f4ad54d5fcaa' and (not_after is null or not_after>clock_timestamp()) limit 1;if sid is null then raise exception 'Designated session unavailable';end if;
 perform set_config('request.jwt.claim.sub','e7ca010b-de06-4e0e-856d-f4ad54d5fcaa',true);perform set_config('request.jwt.claims',jsonb_build_object('sub','e7ca010b-de06-4e0e-856d-f4ad54d5fcaa','session_id',sid)::text,true);
end $$;

create temp table review_results(test text primary key,passed boolean not null check(passed));grant insert on pg_temp.review_results to authenticated,anon;
insert into rhh.professionals(id,owner_id,business_name,city,state,description,healthy_home_practices) values('50000000-0000-4000-8000-0000000000f6','e7ca010b-de06-4e0e-856d-f4ad54d5fcaa','STEP6 REVIEWS ROLLBACK ONLY','Raleigh','NC','Rollback-only review test listing; never committed.','Rollback-only healthy-home test practices.');
insert into rhh.applications(professional_id,contact_name,contact_email,approval) values('50000000-0000-4000-8000-0000000000f6','Test fixture','fixture@example.invalid','approved');
insert into rhh.memberships(professional_id,status) values('50000000-0000-4000-8000-0000000000f6','active');
insert into rhh.professional_categories(professional_id,category_id) values('50000000-0000-4000-8000-0000000000f6','mold-inspection');
set local role anon;
do $$ declare input jsonb:='{"requestId":"50000000-0000-4000-8000-0000000000f7","displayName":"STEP6 REVIEW TEST","rating":4,"body":"Rollback-only service review content, never a real customer claim."}';denied boolean;begin
 insert into pg_temp.review_results values('anonymous_valid_save',public.rhh_submit_review('50000000-0000-4000-8000-0000000000f6',input)='{"saved":true}'::jsonb);
 insert into pg_temp.review_results values('exact_retry_acknowledges',public.rhh_submit_review('50000000-0000-4000-8000-0000000000f6',input)='{"saved":true}'::jsonb);
 denied:=false;begin perform public.rhh_submit_review('50000000-0000-4000-8000-0000000000f6',input||'{"status":"published"}');exception when sqlstate '22023' then denied:=true;end;insert into pg_temp.review_results values('publication_spoof_denied',denied);
 denied:=false;begin perform public.rhh_admin_reviews('{}');exception when insufficient_privilege then denied:=true;end;insert into pg_temp.review_results values('anonymous_private_queue_denied',denied);
 denied:=false;begin perform 1 from rhh.reviews;exception when insufficient_privilege then denied:=true;end;insert into pg_temp.review_results values('anonymous_raw_records_denied',denied);
 insert into pg_temp.review_results values('pending_reviews_not_public',not exists(select 1 from jsonb_array_elements(public.rhh_public_directory()->'reviews') r where r->>'professionalId'='50000000-0000-4000-8000-0000000000f6'));
end $$;
reset role;
insert into review_results values('one_saved_row',(select count(*)=1 from rhh.reviews where professional_id='50000000-0000-4000-8000-0000000000f6'));
insert into review_results values('one_intended_event',(select count(*)=1 from rhh_private.review_events where professional_id='50000000-0000-4000-8000-0000000000f6'));
insert into review_results values('event_bound_to_original_owner',(select bool_and(recipient_id='e7ca010b-de06-4e0e-856d-f4ad54d5fcaa' and state='pending_configuration') from rhh_private.review_events where professional_id='50000000-0000-4000-8000-0000000000f6'));
set local role authenticated;
do $$ declare denied boolean;begin
 insert into pg_temp.review_results values('member_cannot_read_pending',public.rhh_member_reviews()->'reviews'='[]'::jsonb);
 denied:=false;begin perform public.rhh_admin_reviews('{}');exception when insufficient_privilege then denied:=true;end;insert into pg_temp.review_results values('member_admin_queue_denied',denied);
 denied:=false;begin perform public.rhh_moderate_review('{"id":"50000000-0000-4000-8000-0000000000f8","version":1,"action":"publish","reason":"Forged member moderation","note":""}');exception when insufficient_privilege then denied:=true;end;insert into pg_temp.review_results values('member_self_moderation_denied',denied);
 denied:=false;begin update rhh.reviews set rating=5;exception when insufficient_privilege then denied:=true;end;insert into pg_temp.review_results values('member_score_change_denied',denied);
 denied:=false;begin perform 1 from rhh_private.review_events;exception when insufficient_privilege then denied:=true;end;insert into pg_temp.review_results values('member_private_events_denied',denied);
end $$;
reset role;
update rhh.reviews set status='published',contact_email='STEP6_PRIVATE@example.invalid',moderation_note='STEP6_PRIVATE_NOTE' where professional_id='50000000-0000-4000-8000-0000000000f6';
set local role authenticated;
insert into pg_temp.review_results values('member_owned_published_read',jsonb_array_length(public.rhh_member_reviews()->'reviews')=1);
insert into pg_temp.review_results values('member_contact_notes_excluded',position('STEP6_PRIVATE' in public.rhh_member_reviews()::text)=0);
reset role;
set local role anon;
insert into pg_temp.review_results values('public_published_rating',(select (r->>'rating')::integer=4 from jsonb_array_elements(public.rhh_public_directory()->'reviews') r where r->>'professionalId'='50000000-0000-4000-8000-0000000000f6'));
insert into pg_temp.review_results values('public_contact_notes_excluded',position('STEP6_PRIVATE' in public.rhh_public_directory()::text)=0);
reset role;
update rhh.applications set suspended=true where professional_id='50000000-0000-4000-8000-0000000000f6';
set local role authenticated;
insert into pg_temp.review_results values('suspension_overrides_member_reviews',public.rhh_member_reviews()->'reviews'='[]'::jsonb);
reset role;
set local role anon;
insert into pg_temp.review_results values('suspension_overrides_public_reviews',not exists(select 1 from jsonb_array_elements(public.rhh_public_directory()->'reviews') r where r->>'professionalId'='50000000-0000-4000-8000-0000000000f6'));
do $$ declare denied boolean:=false;begin begin perform public.rhh_submit_review('50000000-0000-4000-8000-0000000000f6','{"requestId":"50000000-0000-4000-8000-0000000000f9","displayName":"Test","rating":4,"body":"A hidden listing must not accept a new public review."}');exception when sqlstate 'PT404' then denied:=true;end;insert into pg_temp.review_results values('suspended_submission_denied',denied);end $$;
reset role;
select test,passed from review_results order by test;rollback;
