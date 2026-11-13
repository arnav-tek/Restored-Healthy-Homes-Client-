begin;
create role rhh_credential_member nologin noinherit nobypassrls;
grant rhh_credential_member to postgres;
grant usage on schema rhh,rhh_private to rhh_credential_member;
grant create on schema rhh_private to rhh_credential_member,rhh_admin_writer;
grant execute on function rhh_private.confirmed_user_id(),rhh_private.request_user_id() to rhh_credential_member;
alter table rhh.credentials add column archived boolean not null default false,add column review_state text not null default 'pending' check(review_state in ('pending','verified','rejected','revoked')),add column review_version integer not null default 1 check(review_version>0),add column evidence_id uuid;
-- Preserve stored legacy decisions without inventing reviewers or review dates.
update rhh.credentials set review_state='verified' where verification='verified';
create table rhh_private.credential_evidence(id uuid primary key default gen_random_uuid(),credential_id uuid not null references rhh.credentials(id) on delete restrict,professional_id uuid not null references rhh.professionals(id) on delete restrict,owner_id uuid not null references rhh.accounts(user_id) on delete restrict,state text not null default 'draft' check(state in ('draft','current','retained','cleanup')),created_at timestamptz not null default clock_timestamp());
create unique index credential_evidence_current_idx on rhh_private.credential_evidence(credential_id) where state='current';
create index credential_evidence_owner_idx on rhh_private.credential_evidence(owner_id,professional_id);
create index credential_evidence_prof_idx on rhh_private.credential_evidence(professional_id);
alter table rhh.credentials add constraint credentials_evidence_fk foreign key(evidence_id) references rhh_private.credential_evidence(id) on delete restrict;
create table rhh_private.credential_reviews(id uuid primary key default gen_random_uuid(),credential_id uuid not null references rhh.credentials(id) on delete restrict,version integer not null,action text not null check(action in ('verify','reject','revoke','evidence_changed','claim_changed')),claim_name text not null,evidence_id uuid references rhh_private.credential_evidence(id) on delete restrict,actor_id uuid references rhh.accounts(user_id),reason text not null check(length(reason) between 3 and 300),previous_state text not null,next_state text not null,reviewed_at timestamptz not null default clock_timestamp(),unique(credential_id,version));
create index credential_reviews_actor_idx on rhh_private.credential_reviews(actor_id);
create index credential_reviews_evidence_idx on rhh_private.credential_reviews(evidence_id);
create table rhh_private.credential_upload_limits(owner_id uuid not null references rhh.accounts(user_id),day date not null,attempts integer not null check(attempts between 1 and 10),primary key(owner_id,day));
do $$ declare t text;begin foreach t in array array['credential_evidence','credential_reviews','credential_upload_limits'] loop execute format('alter table rhh_private.%I enable row level security',t);execute format('alter table rhh_private.%I force row level security',t);execute format('revoke all on rhh_private.%I from public,anon,authenticated',t);end loop;end $$;
create function rhh_private.credential_owner(pid uuid) returns boolean language sql security definer set search_path='' as $$ select exists(select 1 from rhh.professionals p join rhh.accounts a on a.user_id=p.owner_id where p.id=pid and p.owner_id=rhh_private.confirmed_user_id() and a.role='member') $$;
revoke all on function rhh_private.credential_owner(uuid) from public,anon,authenticated;
grant execute on function rhh_private.credential_owner(uuid) to rhh_credential_member;
create function rhh_private.credential_listing(target uuid,admin_mode boolean) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid;pid uuid;begin
 if admin_mode then perform rhh_private.require_admin();select professional_id into pid from rhh.credentials where id=target;perform 1 from rhh.professionals where id=pid for update;
 else uid:=rhh_private.confirmed_user_id();perform 1 from rhh.accounts where user_id=uid and role='member' for share;if not found then raise exception using errcode='42501',message='credential_member_required';end if;select id into pid from rhh.professionals where owner_id=uid for update;end if;
 if pid is null then raise exception using errcode='PT404',message='credential_listing_unavailable';end if;return pid;
end $$;
revoke all on function rhh_private.credential_listing(uuid,boolean) from public,anon,authenticated;
grant execute on function rhh_private.credential_listing(uuid,boolean) to rhh_credential_member,rhh_admin_writer;
grant select(id,professional_id,name,verification,position,archived,review_state,review_version,evidence_id),update(evidence_id) on rhh.credentials to rhh_credential_member;
create policy credential_member_read on rhh.credentials for select to rhh_credential_member using(rhh_private.credential_owner(professional_id));
create policy credential_member_attach on rhh.credentials for update to rhh_credential_member using(not archived and rhh_private.credential_owner(professional_id)) with check(not archived and verification='unverified' and review_state='pending' and rhh_private.credential_owner(professional_id));
grant select,insert on rhh_private.credential_evidence to rhh_credential_member;
grant update(state),delete on rhh_private.credential_evidence to rhh_credential_member;
create policy credential_file_member on rhh_private.credential_evidence to rhh_credential_member using(owner_id=(select rhh_private.request_user_id()) and rhh_private.credential_owner(professional_id)) with check(owner_id=(select rhh_private.request_user_id()) and rhh_private.credential_owner(professional_id));
grant select,insert,update,delete on rhh_private.credential_upload_limits to rhh_credential_member;
create policy credential_limits_member on rhh_private.credential_upload_limits to rhh_credential_member using(owner_id=(select rhh_private.request_user_id())) with check(owner_id=(select rhh_private.request_user_id()));
grant select(archived,review_state,review_version,evidence_id,reviewed_by,reviewed_at),update(verification,review_state,review_version,reviewed_by,reviewed_at) on rhh.credentials to rhh_admin_writer;
create policy credential_admin_review on rhh.credentials for update to rhh_admin_writer using((select rhh_private.is_admin())) with check((select rhh_private.is_admin()));
grant select on rhh_private.credential_reviews,rhh_private.credential_evidence to rhh_admin_writer;
grant insert on rhh_private.credential_reviews to rhh_admin_writer;
create policy credential_audit_admin on rhh_private.credential_reviews for select to rhh_admin_writer using((select rhh_private.is_admin()));
create policy credential_audit_write on rhh_private.credential_reviews for insert to rhh_admin_writer with check((select rhh_private.is_admin()) and actor_id=(select rhh_private.request_user_id()) and action in ('verify','reject','revoke'));
create policy credential_file_admin on rhh_private.credential_evidence for select to rhh_admin_writer using((select rhh_private.is_admin()));
grant select(archived),update(archived) on rhh.credentials to rhh_member_writer;
revoke delete on rhh.credentials from rhh_member_writer;
grant select(archived,review_state) on rhh.credentials to rhh_public_reader;
-- Unchanged claims retain decisions. Removal/name changes archive and invalidate,
-- preserving immutable references and audit records instead of cascading deletion.
create function rhh_private.credential_change_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare action_name text;actor uuid;begin
 if new.name is distinct from old.name or new.archived is distinct from old.archived or new.evidence_id is distinct from old.evidence_id then
  if old.archived and not new.archived then raise exception using errcode='PT409',message='archived_credential_immutable';end if;
  action_name:=case when new.name is distinct from old.name or new.archived then 'claim_changed' else 'evidence_changed' end;
  if new.name is distinct from old.name or new.archived then new.evidence_id:=null;end if;
  if old.evidence_id is distinct from new.evidence_id then update rhh_private.credential_evidence set state='retained' where id=old.evidence_id and state='current';end if;
  new.review_version:=old.review_version+1;new.verification:='unverified';new.review_state:='pending';new.reviewed_by:=null;new.reviewed_at:=null;
  actor:=rhh_private.request_user_id();if not exists(select 1 from rhh.accounts where user_id=actor) then actor:=null;end if;
  insert into rhh_private.credential_reviews(credential_id,version,action,claim_name,evidence_id,actor_id,reason,previous_state,next_state) values(old.id,new.review_version,action_name,old.name,coalesce(new.evidence_id,old.evidence_id),actor,case when action_name='claim_changed' then 'Claim changed or removed; new review required.' else 'Evidence changed or removed; new review required.' end,old.review_state,'pending');
 end if;
 if (new.verification='verified') is distinct from (new.review_state='verified') then raise exception using errcode='23514',message='credential_review_inconsistent';end if;
 return new;
end $$;
revoke all on function rhh_private.credential_change_guard() from public,anon,authenticated;
create trigger credential_change_guard before update on rhh.credentials for each row execute function rhh_private.credential_change_guard();
do $patch$ declare d text;old text;replacement text;routine text;begin
 d:=pg_get_functiondef('rhh_private.save_member_application(jsonb,integer,boolean)'::regprocedure);
 old:='where professional_id=pid and name=claim.x and not(id=any(kept_claims))';replacement:='where professional_id=pid and not archived and name=claim.x and not(id=any(kept_claims))';if position(old in d)=0 then raise exception 'Unexpected claim matching baseline';end if;d:=replace(d,old,replacement);
 old:='delete from rhh.credentials where professional_id=pid and not(id=any(kept_claims));';replacement:='update rhh.credentials set archived=true where professional_id=pid and not archived and not(id=any(kept_claims));';if position(old in d)=0 then raise exception 'Unexpected claim removal baseline';end if;execute replace(d,old,replacement);
 foreach routine in array array['rhh_private.member_snapshot()','rhh_private.admin_snapshot()','rhh_private.public_directory()'] loop
  d:=pg_get_functiondef(routine::regprocedure);old:='where c.professional_id=p.id';if position(old in d)=0 then raise exception 'Unexpected credential projection baseline';end if;d:=replace(d,old,old||' and not c.archived');
  if routine='rhh_private.public_directory()' then d:=replace(d,'and c.verification=''verified''','and c.verification=''verified'' and c.review_state=''verified''');end if;execute d;
 end loop;
end $patch$;
create function rhh_private.credential_file(target uuid,admin_mode boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare e rhh_private.credential_evidence%rowtype;begin
 if admin_mode then perform rhh_private.require_admin();else perform rhh_private.confirmed_user_id();end if;
 select * into e from rhh_private.credential_evidence where id=target and state in ('draft','current','retained');
 if e.id is null then return null;end if;
 if not admin_mode and (e.owner_id is distinct from rhh_private.request_user_id() or not rhh_private.credential_owner(e.professional_id)) then return null;end if;
 return jsonb_build_object('id',e.id,'objectPath',e.owner_id::text||'/'||e.professional_id::text||'/'||e.id::text||'.webp');
end $$;
revoke all on function rhh_private.credential_file(uuid,boolean) from public,anon,authenticated;
grant execute on function rhh_private.credential_file(uuid,boolean) to authenticated,rhh_credential_member,rhh_admin_writer;
create function public.rhh_credential_file(target uuid,admin_mode boolean default false) returns jsonb language sql security invoker set search_path='' as $$select rhh_private.credential_file(target,admin_mode)$$;
revoke all on function public.rhh_credential_file(uuid,boolean) from public,anon,authenticated;
grant execute on function public.rhh_credential_file(uuid,boolean) to authenticated;
create function rhh_private.credential_object_exists(target uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare e rhh_private.credential_evidence%rowtype;begin
 perform rhh_private.confirmed_user_id();select * into e from rhh_private.credential_evidence where id=target;
 if e.id is null then return false;end if;
 if not rhh_private.is_admin() and (e.owner_id is distinct from rhh_private.request_user_id() or not rhh_private.credential_owner(e.professional_id)) then raise exception using errcode='42501',message='credential_file_denied';end if;
 return exists(select 1 from storage.objects where bucket_id='rhh-credential-evidence' and name=e.owner_id::text||'/'||e.professional_id::text||'/'||e.id::text||'.webp');
end $$;
revoke all on function rhh_private.credential_object_exists(uuid) from public,anon,authenticated;
grant execute on function rhh_private.credential_object_exists(uuid) to rhh_credential_member,rhh_admin_writer;
create function rhh_private.member_credential_snapshot() returns jsonb language sql security invoker set search_path='' as $$
 select jsonb_build_object('claims',coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'verification',c.verification,'state',c.review_state,'version',c.review_version,'evidenceId',c.evidence_id,'drafts',(select coalesce(jsonb_agg(e.id order by e.created_at),'[]') from rhh_private.credential_evidence e where e.credential_id=c.id and e.state='draft')) order by c.position,c.id),'[]')) from rhh.credentials c where not c.archived
$$;
alter function rhh_private.member_credential_snapshot() owner to rhh_credential_member;
revoke all on function rhh_private.member_credential_snapshot() from public,anon,authenticated;
create function rhh_private.member_credentials(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare pid uuid:=rhh_private.credential_listing(null,false);uid uuid:=rhh_private.confirmed_user_id();act text;cid uuid;target uuid;expected integer;c record;e record;eid uuid;counter integer;begin
 if jsonb_typeof(payload) is distinct from 'object' or exists(select 1 from jsonb_object_keys(payload) k where k not in ('action','claimId','target','version')) then raise exception using errcode='22023',message='invalid_credential_request';end if;
 act:=payload->>'action';if act is null or act not in ('get','reserve','attach','cancel','cleanup','ack') then raise exception using errcode='22023',message='invalid_credential_action';end if;
 begin cid:=(payload->>'claimId')::uuid;target:=(payload->>'target')::uuid;expected:=(payload->>'version')::integer;exception when invalid_text_representation or numeric_value_out_of_range then raise exception using errcode='22023',message='invalid_credential_request';end;
 if act='attach' and (not(payload ? 'target') or not(payload ? 'version')) then raise exception using errcode='22023',message='explicit_evidence_choice_required';end if;
 if act in ('reserve','attach') then
  select id,evidence_id,review_version into c from rhh.credentials where id=cid and professional_id=pid and not archived for update;
  if c.id is null then raise exception using errcode='PT404',message='credential_unavailable';end if;
 end if;
 if act='reserve' then
  if (select count(*) from rhh_private.credential_evidence where professional_id=pid)>=20 or (select count(*) from rhh_private.credential_evidence where professional_id=pid and state='draft')>=4 then raise exception using errcode='PT429',message='evidence_retention_limit';end if;
  insert into rhh_private.credential_upload_limits(owner_id,day,attempts) values(uid,(clock_timestamp() at time zone 'UTC')::date,1) on conflict(owner_id,day) do update set attempts=rhh_private.credential_upload_limits.attempts+1 where rhh_private.credential_upload_limits.attempts<10 returning attempts into counter;
  if counter is null then raise exception using errcode='PT429',message='credential_upload_limit';end if;
  insert into rhh_private.credential_evidence(credential_id,professional_id,owner_id) values(cid,pid,uid) returning id into eid;
  return jsonb_build_object('id',eid,'objectPath',uid::text||'/'||pid::text||'/'||eid::text||'.webp');
 elsif act='attach' then
  if c.evidence_id is not distinct from target then return rhh_private.member_credential_snapshot();end if;
  if expected is null or expected<>c.review_version then raise exception using errcode='PT409',message='stale_credential';end if;
  if target is not null then
   select id into e from rhh_private.credential_evidence where id=target and credential_id=cid and professional_id=pid and owner_id=uid and state='draft' and created_at>clock_timestamp()-interval '24 hours';
   if e.id is null then raise exception using errcode='PT404',message='evidence_unavailable';end if;
   if not rhh_private.credential_object_exists(target) then raise exception using errcode='PT409',message='evidence_upload_incomplete';end if;
  end if;
  update rhh_private.credential_evidence set state='retained' where id=c.evidence_id and state='current';
  update rhh_private.credential_evidence set state='current' where id=target;
  update rhh.credentials set evidence_id=target where id=cid;
 elsif act='cancel' then
  update rhh_private.credential_evidence set state='cleanup' where id=target and state='draft';if not found then raise exception using errcode='PT409',message='only_unattached_drafts_can_be_discarded';end if;
 elsif act='cleanup' then
  update rhh_private.credential_evidence set state='cleanup' where state='draft' and created_at<=clock_timestamp()-interval '24 hours';
  return (select coalesce(jsonb_agg(jsonb_build_object('id',id,'objectPath',owner_id::text||'/'||professional_id::text||'/'||id::text||'.webp')),'[]') from rhh_private.credential_evidence where state='cleanup' and created_at<clock_timestamp()-interval '10 minutes');
 elsif act='ack' then
  if exists(select 1 from rhh_private.credential_evidence where id=target and state='cleanup' and created_at<clock_timestamp()-interval '10 minutes') then
   if rhh_private.credential_object_exists(target) then raise exception using errcode='PT409',message='evidence_cleanup_incomplete';end if;
   delete from rhh_private.credential_evidence where id=target and state='cleanup';
  end if;
 end if;
 return rhh_private.member_credential_snapshot();
end $$;
alter function rhh_private.member_credentials(jsonb) owner to rhh_credential_member;
revoke all on function rhh_private.member_credentials(jsonb) from public,anon,authenticated;
grant execute on function rhh_private.member_credentials(jsonb) to authenticated;
create function public.rhh_member_credentials(payload jsonb default '{"action":"get"}'::jsonb) returns jsonb language sql security invoker set search_path='' as $$select rhh_private.member_credentials(payload)$$;
revoke all on function public.rhh_member_credentials(jsonb) from public,anon,authenticated;
grant execute on function public.rhh_member_credentials(jsonb) to authenticated;
create function rhh_private.admin_credentials(page_number integer) returns jsonb language plpgsql security definer set search_path='' as $$begin
 perform rhh_private.require_admin();if page_number is null or page_number not between 1 and 10000 then raise exception using errcode='22023',message='invalid_credential_page';end if;
 return jsonb_build_object('page',page_number,'hasNext',(select count(*)>page_number*20 from rhh.credentials),'claims',(select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'professionalId',c.professional_id,'businessName',p.business_name,'archived',c.archived,'verification',c.verification,'state',c.review_state,'version',c.review_version,'evidenceId',c.evidence_id,'history',(select coalesce(jsonb_agg(jsonb_build_object('action',h.action,'version',h.version,'claimName',h.claim_name,'evidenceId',h.evidence_id,'actorId',h.actor_id,'reason',h.reason,'previousState',h.previous_state,'nextState',h.next_state,'at',h.reviewed_at) order by h.version desc),'[]') from rhh_private.credential_reviews h where h.credential_id=c.id)) order by c.id),'[]') from (select * from rhh.credentials order by id limit 20 offset (page_number-1)*20) c join rhh.professionals p on p.id=c.professional_id));
end $$;
alter function rhh_private.admin_credentials(integer) owner to rhh_admin_writer;
revoke all on function rhh_private.admin_credentials(integer) from public,anon,authenticated;
grant execute on function rhh_private.admin_credentials(integer) to authenticated;
create function public.rhh_admin_credentials(page_number integer default 1) returns jsonb language sql security invoker set search_path='' as $$select rhh_private.admin_credentials(page_number)$$;
revoke all on function public.rhh_admin_credentials(integer) from public,anon,authenticated;
grant execute on function public.rhh_admin_credentials(integer) to authenticated;
create function rhh_private.review_credential(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=rhh_private.require_admin();pid uuid;target uuid;expected integer;expected_evidence uuid;act text;reason_text text;c record;next_state text;decided_at timestamptz:=clock_timestamp();begin
 if jsonb_typeof(payload) is distinct from 'object' or (select count(*) from jsonb_object_keys(payload))<>5 or exists(select 1 from jsonb_object_keys(payload) k where k not in ('claimId','version','evidenceId','action','reason')) then raise exception using errcode='22023',message='invalid_credential_review';end if;
 begin target:=(payload->>'claimId')::uuid;expected:=(payload->>'version')::integer;expected_evidence:=(payload->>'evidenceId')::uuid;exception when invalid_text_representation or numeric_value_out_of_range then raise exception using errcode='22023',message='invalid_credential_review';end;
 act:=payload->>'action';reason_text:=btrim(payload->>'reason');if jsonb_typeof(payload->'reason') is distinct from 'string' or jsonb_typeof(payload->'action') is distinct from 'string' or act is null or act not in ('verify','reject','revoke') or reason_text is null or length(reason_text) not between 3 and 300 then raise exception using errcode='22023',message='invalid_credential_review';end if;
 pid:=rhh_private.credential_listing(target,true);
 select id,name,evidence_id,review_state,review_version,archived into c from rhh.credentials where id=target and professional_id=pid for update;
 if c.id is null or c.archived then raise exception using errcode='PT404',message='credential_unavailable';end if;
 if expected is null or expected<>c.review_version or expected_evidence is distinct from c.evidence_id then raise exception using errcode='PT409',message='stale_credential_review';end if;
 if (act='verify' and c.review_state='verified') or (act='reject' and c.review_state<>'pending') or (act='revoke' and c.review_state<>'verified') then raise exception using errcode='PT409',message='invalid_credential_transition';end if;
 if act='verify' and (c.evidence_id is null or not exists(select 1 from rhh_private.credential_evidence e join rhh.professionals p on p.id=e.professional_id where e.id=c.evidence_id and e.credential_id=c.id and e.state='current' and e.owner_id=p.owner_id) or not rhh_private.credential_object_exists(c.evidence_id)) then raise exception using errcode='PT409',message='current_evidence_required';end if;
 next_state:=case act when 'verify' then 'verified' when 'reject' then 'rejected' else 'revoked' end;
 update rhh.credentials set verification=case when act='verify' then 'verified' else 'unverified' end,review_state=next_state,review_version=review_version+1,reviewed_by=actor,reviewed_at=decided_at where id=c.id;
 insert into rhh_private.credential_reviews(credential_id,version,action,claim_name,evidence_id,actor_id,reason,previous_state,next_state,reviewed_at) values(c.id,c.review_version+1,act,c.name,c.evidence_id,actor,reason_text,c.review_state,next_state,decided_at);
 return jsonb_build_object('saved',true,'version',c.review_version+1,'state',next_state);
end $$;
alter function rhh_private.review_credential(jsonb) owner to rhh_admin_writer;
revoke all on function rhh_private.review_credential(jsonb) from public,anon,authenticated;
grant execute on function rhh_private.review_credential(jsonb) to authenticated;
create function public.rhh_review_credential(payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select rhh_private.review_credential(payload)$$;
revoke all on function public.rhh_review_credential(jsonb) from public,anon,authenticated;
grant execute on function public.rhh_review_credential(jsonb) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('rhh-credential-evidence','rhh-credential-evidence',false,1048576,array['image/webp']);
revoke create on schema rhh_private from rhh_credential_member,rhh_admin_writer;
notify pgrst,'reload schema';commit;
