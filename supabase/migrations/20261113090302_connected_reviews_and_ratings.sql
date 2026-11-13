begin;
create role rhh_review_writer nologin noinherit nobypassrls;grant rhh_review_writer to postgres;
grant usage on schema rhh,rhh_private to rhh_review_writer;
grant create on schema rhh_private to rhh_review_writer,rhh_admin_writer,rhh_public_reader,rhh_member_writer;
alter table rhh.reviews add column version integer not null default 1 check(version>0),add column published_at timestamptz,add column updated_at timestamptz not null default clock_timestamp();
-- Preserve legacy publication dates without claiming newly verified customer identity.
update rhh.reviews set published_at=created_at where status='published';
create index reviews_public_order_idx on rhh.reviews(professional_id,published_at desc,id) where status='published';
create table rhh_private.review_requests(request_id uuid primary key,content_hash text not null,review_id uuid not null references rhh.reviews(id),expires_at timestamptz not null);
create index review_requests_hash_idx on rhh_private.review_requests(content_hash,expires_at);create index review_requests_expiry_idx on rhh_private.review_requests(expires_at);
create table rhh_private.review_limits(key text primary key,attempts integer not null check(attempts>0),expires_at timestamptz not null);create index review_limits_expiry_idx on rhh_private.review_limits(expires_at);
create table rhh_private.review_abuse_config(singleton boolean primary key default true check(singleton),secret text not null);insert into rhh_private.review_abuse_config(secret) values(gen_random_uuid()::text||gen_random_uuid()::text);
create table rhh_private.review_routing(review_id uuid primary key references rhh.reviews(id),account_id uuid references rhh.accounts(user_id));create index review_routing_account_idx on rhh_private.review_routing(account_id);
create table rhh_private.review_decisions(id uuid primary key default gen_random_uuid(),review_id uuid not null references rhh.reviews(id),version integer not null check(version>0),action text not null check(action in ('publish','hide','reject','restore')),previous_status text not null,next_status text not null,actor_id uuid not null references rhh.accounts(user_id),reason text not null check(length(reason) between 3 and 300),note text not null check(length(note)<=500),rating_snapshot smallint not null check(rating_snapshot between 1 and 5),name_snapshot text not null,body_snapshot text not null,created_at timestamptz not null default clock_timestamp(),unique(review_id,version));create index review_decisions_actor_idx on rhh_private.review_decisions(actor_id);
create table rhh_private.review_revisions(review_id uuid not null references rhh.reviews(id),version integer not null,rating smallint not null,display_name text not null,body text not null,created_at timestamptz not null default clock_timestamp(),primary key(review_id,version));
create table rhh_private.review_events(id uuid primary key default gen_random_uuid(),review_id uuid not null references rhh.reviews(id),version integer not null,event_type text not null check(event_type in ('review.submitted','review.published','review.rejected')),recipient_id uuid references rhh.accounts(user_id),professional_id uuid not null references rhh.professionals(id),recipient_email text,recipient_key text not null,state text not null check(state in ('pending_configuration','canceled')),created_at timestamptz not null default clock_timestamp(),unique(review_id,version,event_type,recipient_key));create index review_events_recipient_idx on rhh_private.review_events(recipient_id);create index review_events_professional_idx on rhh_private.review_events(professional_id);
do $$ declare t text;begin foreach t in array array['review_requests','review_limits','review_abuse_config','review_routing','review_decisions','review_revisions','review_events'] loop execute format('alter table rhh_private.%I enable row level security',t);execute format('alter table rhh_private.%I force row level security',t);execute format('revoke all on rhh_private.%I from public,anon,authenticated',t);end loop;end $$;
create function rhh_private.review_eligible(pid uuid) returns boolean language sql security definer set search_path='' as $$select exists(select 1 from rhh.professionals p join rhh.applications a on a.professional_id=p.id join rhh.memberships m on m.professional_id=p.id where p.id=pid and a.approval='approved' and m.status='active' and not a.suspended)$$;
revoke all on function rhh_private.review_eligible(uuid) from public,anon,authenticated;grant execute on function rhh_private.review_eligible(uuid) to rhh_review_writer,rhh_public_reader,rhh_admin_writer;
create function rhh_private.review_target(pid uuid) returns uuid language plpgsql security definer set search_path='' as $$begin
 perform 1 from rhh.professionals p join rhh.applications a on a.professional_id=p.id join rhh.memberships m on m.professional_id=p.id where p.id=pid and a.approval='approved' and m.status='active' and not a.suspended for share of p,a,m;
 if not found then raise exception using errcode='PT404',message='review_listing_unavailable';end if;return pid;
end $$;
revoke all on function rhh_private.review_target(uuid) from public,anon,authenticated;grant execute on function rhh_private.review_target(uuid) to rhh_review_writer,rhh_admin_writer;
create function rhh_private.review_event(target uuid,event_name text,event_version integer) returns void language plpgsql security definer set search_path='' as $$
declare pid uuid;uid uuid;mail text;begin
 if event_name not in ('review.submitted','review.published','review.rejected') then raise exception using errcode='22023',message='invalid_review_event';end if;
 select professional_id into pid from rhh.reviews where id=target;
 if event_name='review.submitted' then
  if event_version<>1 or not exists(select 1 from rhh.reviews where id=target and version=1 and status='pending') or not rhh_private.review_eligible(pid) then raise exception using errcode='42501',message='invalid_submission_event';end if;
 else
  perform rhh_private.require_admin();
  if not exists(select 1 from rhh_private.review_decisions d join rhh.reviews r on r.id=d.review_id where d.review_id=target and d.version=event_version and r.version=event_version and event_name='review.'||d.next_status) then raise exception using errcode='42501',message='invalid_decision_event';end if;
 end if;

 select ac.user_id,u.email into uid,mail from rhh_private.review_routing r join rhh.professionals p on p.id=pid and p.owner_id=r.account_id join rhh.accounts ac on ac.user_id=r.account_id join auth.users u on u.id=ac.user_id where r.review_id=target and ac.role='member' and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) and u.deleted_at is null and (u.banned_until is null or u.banned_until<=clock_timestamp()) and u.email is not null;
 insert into rhh_private.review_events(review_id,version,event_type,recipient_id,professional_id,recipient_email,recipient_key,state) values(target,event_version,event_name,uid,pid,mail,coalesce('account:'||uid::text,'unroutable:'||target::text),case when uid is null then 'canceled' else 'pending_configuration' end) on conflict(review_id,version,event_type,recipient_key) do nothing;
end $$;
revoke all on function rhh_private.review_event(uuid,text,integer) from public,anon,authenticated;
-- This internal helper is not an API capability. Its only callers validate submission/admin authority.
grant execute on function rhh_private.review_event(uuid,text,integer) to rhh_review_writer,rhh_admin_writer;
create function rhh_private.review_created_route() returns trigger language plpgsql security definer set search_path='' as $$begin
 insert into rhh_private.review_routing(review_id,account_id) select new.id,owner_id from rhh.professionals where id=new.professional_id;return new;
end $$;
revoke all on function rhh_private.review_created_route() from public,anon,authenticated;create trigger review_created_route after insert on rhh.reviews for each row execute function rhh_private.review_created_route();
create function rhh_private.review_change_guard() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.professional_id is distinct from old.professional_id then raise exception using errcode='42501',message='review_target_immutable';end if;
 if new.rating is distinct from old.rating or new.body is distinct from old.body or new.display_name is distinct from old.display_name then insert into rhh_private.review_revisions(review_id,version,rating,display_name,body) values(old.id,old.version,old.rating,old.display_name,old.body);new.status:='pending';end if;
 new.version:=old.version+1;new.updated_at:=clock_timestamp();
 if new.status='published' and old.status<>'published' then new.published_at:=clock_timestamp();elsif new.status<>'published' then new.published_at:=null;end if;
 return new;
end $$;
revoke all on function rhh_private.review_change_guard() from public,anon,authenticated;create trigger review_change_guard before update on rhh.reviews for each row execute function rhh_private.review_change_guard();
grant select,insert,update,delete on rhh_private.review_requests,rhh_private.review_limits to rhh_review_writer;
grant select(secret) on rhh_private.review_abuse_config to rhh_review_writer;
create policy review_request_writer on rhh_private.review_requests to rhh_review_writer using(true) with check(true);create policy review_limit_writer on rhh_private.review_limits to rhh_review_writer using(true) with check(true);create policy review_abuse_writer on rhh_private.review_abuse_config for select to rhh_review_writer using(true);
grant insert(id,professional_id,display_name,rating,body) on rhh.reviews to rhh_review_writer;create policy review_submit on rhh.reviews for insert to rhh_review_writer with check(status='pending' and rhh_private.review_eligible(professional_id));
create function rhh_private.submit_review(target uuid,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare pid uuid:=rhh_private.review_target(target);rid uuid;hash text;prior record;reviewid uuid;lim text;n integer;name_text text;body_text text;score integer;begin
 if jsonb_typeof(payload) is distinct from 'object' or (select count(*) from jsonb_object_keys(payload))<>4 or exists(select 1 from jsonb_object_keys(payload) k where k not in ('requestId','displayName','rating','body')) or jsonb_typeof(payload->'displayName') is distinct from 'string' or jsonb_typeof(payload->'body') is distinct from 'string' or jsonb_typeof(payload->'rating') is distinct from 'number' then raise exception using errcode='22023',message='invalid_review';end if;
 begin rid:=(payload->>'requestId')::uuid;score:=(payload->>'rating')::integer;exception when invalid_text_representation or numeric_value_out_of_range then raise exception using errcode='22023',message='invalid_review';end;
 name_text:=regexp_replace(payload->>'displayName','^[[:space:]]+|[[:space:]]+$','','g');body_text:=regexp_replace(payload->>'body','^[[:space:]]+|[[:space:]]+$','','g');
 if rid is null or score not between 1 and 5 or length(name_text) not between 2 and 80 or length(body_text) not between 20 and 2000 then raise exception using errcode='22023',message='invalid_review';end if;
 select encode(sha256(convert_to(secret||jsonb_build_array(pid,lower(regexp_replace(name_text,'[[:space:]]+',' ','g')),score,lower(regexp_replace(body_text,'[[:space:]]+',' ','g')))::text,'UTF8')),'hex') into hash from rhh_private.review_abuse_config;
 perform pg_advisory_xact_lock(hashtextextended('review-request:'||rid::text,0));
 select content_hash,review_id into prior from rhh_private.review_requests where request_id=rid and expires_at>clock_timestamp();
 if prior.review_id is not null then if prior.content_hash<>hash then raise exception using errcode='PT409',message='review_request_conflict';end if;return jsonb_build_object('saved',true);end if;
 delete from rhh_private.review_requests where expires_at<=clock_timestamp();delete from rhh_private.review_limits where expires_at<=clock_timestamp();
 foreach lim in array array['global:'||floor(extract(epoch from clock_timestamp())/3600)::text,'listing:'||pid::text||':'||floor(extract(epoch from clock_timestamp())/3600)::text] loop
 insert into rhh_private.review_limits(key,attempts,expires_at) values(lim,1,clock_timestamp()+interval '1 hour') on conflict(key) do update set attempts=rhh_private.review_limits.attempts+1 where rhh_private.review_limits.attempts<case when lim like 'global:%' then 100 else 20 end returning attempts into n;
 if n is null then raise exception using errcode='PT429',message='review_limit';end if;
 end loop;
 perform pg_advisory_xact_lock(hashtextextended('review-content:'||hash,0));
 select review_id into reviewid from rhh_private.review_requests where content_hash=hash and expires_at>clock_timestamp() limit 1;
 if reviewid is null then reviewid:=gen_random_uuid();insert into rhh.reviews(id,professional_id,display_name,rating,body) values(reviewid,pid,name_text,score,body_text);perform rhh_private.review_event(reviewid,'review.submitted',1);end if;
 insert into rhh_private.review_requests(request_id,content_hash,review_id,expires_at) values(rid,hash,reviewid,clock_timestamp()+interval '24 hours') on conflict(request_id) do update set content_hash=excluded.content_hash,review_id=excluded.review_id,expires_at=excluded.expires_at;
 return jsonb_build_object('saved',true);
end $$;
alter function rhh_private.submit_review(uuid,jsonb) owner to rhh_review_writer;revoke all on function rhh_private.submit_review(uuid,jsonb) from public,anon,authenticated;grant execute on function rhh_private.submit_review(uuid,jsonb) to anon,authenticated;
create function public.rhh_submit_review(target uuid,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select rhh_private.submit_review(target,payload)$$;revoke all on function public.rhh_submit_review(uuid,jsonb) from public,anon,authenticated;grant execute on function public.rhh_submit_review(uuid,jsonb) to anon,authenticated;
grant select(id,professional_id,display_name,rating,body,published_at,status) on rhh.reviews to rhh_public_reader;
create policy review_public on rhh.reviews for select to rhh_public_reader using(status='published' and rhh_private.review_eligible(professional_id));
create function rhh_private.public_review_snapshot() returns jsonb language sql security definer set search_path='' as $$select coalesce(jsonb_agg(jsonb_build_object('id',id,'professionalId',professional_id,'displayName',display_name,'rating',rating,'body',body,'publishedAt',published_at) order by published_at desc,id),'[]') from rhh.reviews where status='published' and rhh_private.review_eligible(professional_id)$$;
alter function rhh_private.public_review_snapshot() owner to rhh_public_reader;revoke all on function rhh_private.public_review_snapshot() from public,anon,authenticated;grant execute on function rhh_private.public_review_snapshot() to rhh_member_writer;
do $$ declare d text;old text;begin d:=pg_get_functiondef('rhh_private.public_directory()'::regprocedure);old:='''profiles'',';if position(old in d)=0 then raise exception 'Unexpected public projection baseline';end if;execute replace(d,old,'''reviews'',rhh_private.public_review_snapshot(),''profiles'',');end $$;
create function rhh_private.review_member_target() returns uuid language plpgsql security definer set search_path='' as $$declare uid uuid:=rhh_private.confirmed_user_id();pid uuid;begin
 perform 1 from rhh.accounts where user_id=uid and role='member' for share;if not found then raise exception using errcode='42501',message='member_required';end if;
 select id into pid from rhh.professionals where owner_id=uid for share;return pid;
end $$;revoke all on function rhh_private.review_member_target() from public,anon,authenticated;grant execute on function rhh_private.review_member_target() to rhh_member_writer;
create function rhh_private.member_reviews() returns jsonb language plpgsql security definer set search_path='' as $$declare pid uuid:=rhh_private.review_member_target();items jsonb:=rhh_private.public_review_snapshot();begin
 return jsonb_build_object('professionalId',pid,'reviews',(select coalesce(jsonb_agg(r),'[]') from jsonb_array_elements(items) r where r->>'professionalId'=pid::text));end $$;
alter function rhh_private.member_reviews() owner to rhh_member_writer;revoke all on function rhh_private.member_reviews() from public,anon,authenticated;grant execute on function rhh_private.member_reviews() to authenticated;
create function public.rhh_member_reviews() returns jsonb language sql security invoker set search_path='' as $$select rhh_private.member_reviews()$$;revoke all on function public.rhh_member_reviews() from public,anon,authenticated;grant execute on function public.rhh_member_reviews() to authenticated;
grant select(id,professional_id,display_name,rating,body,status,moderation_note,version,published_at,created_at,updated_at),update(status,moderation_note) on rhh.reviews to rhh_admin_writer;
create policy review_admin on rhh.reviews to rhh_admin_writer using((select rhh_private.is_admin())) with check((select rhh_private.is_admin()));
grant select,insert on rhh_private.review_decisions to rhh_admin_writer;create policy review_decision_read on rhh_private.review_decisions for select to rhh_admin_writer using((select rhh_private.is_admin()));create policy review_decision_write on rhh_private.review_decisions for insert to rhh_admin_writer with check((select rhh_private.is_admin()) and actor_id=(select rhh_private.request_user_id()));
create function rhh_private.review_admin_lock(pid uuid) returns void language plpgsql security definer set search_path='' as $$begin perform rhh_private.require_admin();perform 1 from rhh.professionals where id=pid for share;end $$;
revoke all on function rhh_private.review_admin_lock(uuid) from public,anon,authenticated;grant execute on function rhh_private.review_admin_lock(uuid) to rhh_admin_writer;
create function rhh_private.moderate_review(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$declare actor uuid:=rhh_private.require_admin();target uuid;expected integer;act text;why text;memo text;pid uuid;r record;next_status text;begin
 if jsonb_typeof(payload) is distinct from 'object' or (select count(*) from jsonb_object_keys(payload))<>5 or exists(select 1 from jsonb_object_keys(payload) k where k not in ('id','version','action','reason','note')) then raise exception using errcode='22023',message='invalid_review_decision';end if;
 begin target:=(payload->>'id')::uuid;expected:=(payload->>'version')::integer;exception when invalid_text_representation or numeric_value_out_of_range then raise exception using errcode='22023',message='invalid_review_decision';end;
 act:=payload->>'action';why:=btrim(payload->>'reason');memo:=btrim(payload->>'note');
 if act is null or act not in ('publish','reject','hide','restore') or jsonb_typeof(payload->'reason') is distinct from 'string' or length(why) not between 3 and 300 or jsonb_typeof(payload->'note') is distinct from 'string' or length(memo)>500 then raise exception using errcode='22023',message='invalid_review_decision';end if;
 select professional_id into pid from rhh.reviews where id=target;
 if act='publish' then perform rhh_private.review_target(pid);else perform rhh_private.review_admin_lock(pid);end if;
 select id,professional_id,display_name,body,rating,status,version into r from rhh.reviews where id=target for update;if r.id is null then raise exception using errcode='PT404',message='review_unavailable';end if;
 if expected is null or expected<>r.version then raise exception using errcode='PT409',message='stale_review_decision';end if;
 if (act='publish' and r.status<>'pending') or (act='reject' and r.status not in ('pending','published','hidden')) or (act='hide' and r.status<>'published') or (act='restore' and r.status not in ('hidden','rejected')) then raise exception using errcode='PT409',message='invalid_review_transition';end if;
 next_status:=case act when 'publish' then 'published' when 'hide' then 'hidden' when 'reject' then 'rejected' else 'pending' end;
 update rhh.reviews set status=next_status,moderation_note=memo where id=r.id;
 insert into rhh_private.review_decisions(review_id,version,action,previous_status,next_status,actor_id,reason,note,rating_snapshot,name_snapshot,body_snapshot) values(r.id,r.version+1,act,r.status,next_status,actor,why,memo,r.rating,r.display_name,r.body);
 if next_status in ('published','rejected') then perform rhh_private.review_event(r.id,'review.'||next_status,r.version+1);end if;
 return jsonb_build_object('saved',true,'status',next_status,'version',r.version+1);
end $$;
alter function rhh_private.moderate_review(jsonb) owner to rhh_admin_writer;revoke all on function rhh_private.moderate_review(jsonb) from public,anon,authenticated;grant execute on function rhh_private.moderate_review(jsonb) to authenticated;
create function public.rhh_moderate_review(payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select rhh_private.moderate_review(payload)$$;revoke all on function public.rhh_moderate_review(jsonb) from public,anon,authenticated;grant execute on function public.rhh_moderate_review(jsonb) to authenticated;
create function rhh_private.admin_reviews(filters jsonb) returns jsonb language plpgsql security definer set search_path='' as $$declare state text;pid uuid;target uuid;page integer;items jsonb;detail jsonb;total integer;begin
 perform rhh_private.require_admin();if jsonb_typeof(filters) is distinct from 'object' or exists(select 1 from jsonb_object_keys(filters) k where k not in ('status','professional','id','page')) then raise exception using errcode='22023',message='invalid_review_filters';end if;
 state:=coalesce(filters->>'status','pending');begin pid:=(filters->>'professional')::uuid;target:=(filters->>'id')::uuid;page:=coalesce((filters->>'page')::integer,1);exception when invalid_text_representation or numeric_value_out_of_range then raise exception using errcode='22023',message='invalid_review_filters';end;
 if state not in ('all','pending','published','hidden','rejected') or page not between 1 and 10000 then raise exception using errcode='22023',message='invalid_review_filters';end if;
 with matching as(select id,professional_id,display_name,rating,body,status,moderation_note,version,created_at from rhh.reviews where (state='all' or status=state) and (pid is null or professional_id=pid)),paged as(select * from matching order by created_at,id limit 20 offset (page-1)*20)
 select (select count(*) from matching),coalesce(jsonb_agg(jsonb_build_object('id',id,'professionalId',professional_id,'displayName',display_name,'rating',rating,'body',body,'status',status,'version',version,'note',moderation_note,'eligible',rhh_private.review_eligible(professional_id)) order by created_at,id),'[]') into total,items from paged;
 if target is not null then select jsonb_build_object('id',id,'professionalId',professional_id,'displayName',display_name,'rating',rating,'body',body,'status',status,'version',version,'note',moderation_note,'eligible',rhh_private.review_eligible(professional_id),'history',(select coalesce(jsonb_agg(jsonb_build_object('version',d.version,'action',d.action,'previousStatus',d.previous_status,'nextStatus',d.next_status,'actorId',d.actor_id,'reason',d.reason,'note',d.note,'displayName',d.name_snapshot,'rating',d.rating_snapshot,'body',d.body_snapshot,'at',d.created_at) order by d.created_at desc,d.id),'[]') from rhh_private.review_decisions d where d.review_id=r.id)) into detail from rhh.reviews r where id=target;if detail is null then raise exception using errcode='PT404',message='review_unavailable';end if;end if;
 return jsonb_build_object('page',page,'hasNext',total>page*20,'total',total,'items',items,'detail',detail,'professionals',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'businessName',business_name) order by business_name,id),'[]') from rhh.professionals));
end $$;
alter function rhh_private.admin_reviews(jsonb) owner to rhh_admin_writer;revoke all on function rhh_private.admin_reviews(jsonb) from public,anon,authenticated;grant execute on function rhh_private.admin_reviews(jsonb) to authenticated;
create function public.rhh_admin_reviews(filters jsonb default '{}'::jsonb) returns jsonb language sql security invoker set search_path='' as $$select rhh_private.admin_reviews(filters)$$;revoke all on function public.rhh_admin_reviews(jsonb) from public,anon,authenticated;grant execute on function public.rhh_admin_reviews(jsonb) to authenticated;
revoke create on schema rhh_private from rhh_review_writer,rhh_admin_writer,rhh_public_reader,rhh_member_writer;
notify pgrst,'reload schema';commit;
