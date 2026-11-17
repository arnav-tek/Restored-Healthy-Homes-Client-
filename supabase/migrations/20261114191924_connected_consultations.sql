begin;
create role rhh_consultation_writer nologin noinherit nobypassrls;
grant rhh_consultation_writer to postgres;
grant usage on schema rhh,rhh_private to rhh_consultation_writer;
grant create on schema rhh_private to rhh_consultation_writer;
grant execute on function rhh_private.confirmed_user_id(),rhh_private.require_admin() to rhh_consultation_writer;
alter table rhh.consultations add column version integer not null default 1 check(version>0),
 add column assigned_owner uuid references rhh.accounts(user_id),
 add column updated_at timestamptz not null default clock_timestamp();
create table rhh_private.consultation_receipts(
 request_id uuid primary key, consultation_id uuid unique not null references rhh.consultations(id),
 token_hash text not null, content_hash text not null, expires_at timestamptz not null);
create table rhh_private.consultation_limits(key text primary key,attempts integer not null,expires_at timestamptz not null);
create table rhh_private.consultation_config(singleton boolean primary key default true check(singleton),secret text not null);
insert into rhh_private.consultation_config(secret) values(gen_random_uuid()::text||gen_random_uuid()::text);
create table rhh_private.consultation_events(
 id uuid primary key default gen_random_uuid(),consultation_id uuid not null references rhh.consultations(id),
 version integer not null,action text not null,actor_id uuid,professional_id uuid,assigned_owner uuid,
 previous_status text,next_status text not null,created_at timestamptz not null default clock_timestamp(),
 notification_state text not null default 'pending_configuration' check(notification_state='pending_configuration'),
 unique(consultation_id,version));
create index consultation_events_target_idx on rhh_private.consultation_events(consultation_id,version);
create index consultation_receipts_expiry_idx on rhh_private.consultation_receipts(expires_at);
create index consultation_limits_expiry_idx on rhh_private.consultation_limits(expires_at);
grant select,insert,update on rhh.consultations to rhh_consultation_writer;
create policy consultation_executor on rhh.consultations to rhh_consultation_writer using(true) with check(true);
do $$ declare t text;begin
 foreach t in array array['consultation_receipts','consultation_limits','consultation_config','consultation_events'] loop
 execute format('alter table rhh_private.%I enable row level security',t);
 execute format('alter table rhh_private.%I force row level security',t);
 execute format('revoke all on rhh_private.%I from public,anon,authenticated',t);
 execute format('create policy consultation_executor on rhh_private.%I to rhh_consultation_writer using(true) with check(true)',t);
 end loop;end $$;
grant select,insert on rhh_private.consultation_receipts,rhh_private.consultation_events to rhh_consultation_writer;
grant select,insert,update,delete on rhh_private.consultation_limits to rhh_consultation_writer;
grant select on rhh_private.consultation_config to rhh_consultation_writer;

-- Narrow privileged lookups: never return contact details, tokens or account roles.
create function rhh_private.consultation_member() returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=rhh_private.confirmed_user_id();begin
 perform 1 from rhh.accounts where user_id=uid and role='member' for share;
 if not found then raise exception using errcode='42501',message='member_required';end if;return uid;end $$;
create function rhh_private.consultation_candidates() returns jsonb language plpgsql security definer set search_path='' as $$begin
 perform rhh_private.require_admin();
 return (select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.business_name,'categoryIds',
 (select coalesce(jsonb_agg(pc.category_id),'[]') from rhh.professional_categories pc join rhh.categories c on c.id=pc.category_id and c.active where pc.professional_id=p.id)) order by p.business_name,p.id),'[]')
 from rhh.professionals p join rhh.accounts ac on ac.user_id=p.owner_id and ac.role='member'
 join rhh.applications a on a.professional_id=p.id join rhh.memberships m on m.professional_id=p.id
 where p.free_phone_consultation and a.approval='approved' and not a.suspended and m.status='active');end $$;
create function rhh_private.consultation_target(pid uuid,category text) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid;begin
 select p.owner_id into uid from rhh.professionals p join rhh.accounts ac on ac.user_id=p.owner_id and ac.role='member'
 join rhh.applications a on a.professional_id=p.id join rhh.memberships m on m.professional_id=p.id
 join rhh.professional_categories pc on pc.professional_id=p.id and pc.category_id=category
 join rhh.categories c on c.id=pc.category_id and c.active
 where p.id=pid and p.free_phone_consultation and a.approval='approved' and not a.suspended and m.status='active'
 for share of p,ac,a,m,pc,c;
 if uid is null then raise exception using errcode='PT409',message='specialist_unavailable';end if;return uid;end $$;
create function rhh_private.consultation_category(category text) returns boolean language sql security definer set search_path='' as $$select exists(select 1 from rhh.categories where id=category and active)$$;
create function rhh_private.consultation_owned(pid uuid,uid uuid) returns boolean language sql security definer set search_path='' as $$select exists(select 1 from rhh.professionals where id=pid and owner_id=uid)$$;
revoke all on function rhh_private.consultation_member(),rhh_private.consultation_candidates(),rhh_private.consultation_target(uuid,text),rhh_private.consultation_category(text),rhh_private.consultation_owned(uuid,uuid) from public,anon,authenticated;
grant execute on function rhh_private.consultation_member(),rhh_private.consultation_candidates(),rhh_private.consultation_target(uuid,text),rhh_private.consultation_category(text),rhh_private.consultation_owned(uuid,uuid) to rhh_consultation_writer;

create function rhh_private.consultation_public(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare rid uuid;token text;hash text;content text;cid uuid;r rhh.consultations%rowtype;receipt record;lim text;n integer;begin
 if jsonb_typeof(payload) is distinct from 'object' or action is null or action not in ('submit','status','cancel') then raise exception using errcode='22023',message='invalid_request';end if;
 if exists(select 1 from jsonb_object_keys(payload) k where k not in ('requestId','token','name','email','categoryId','topic','format','version')) then raise exception using errcode='22023',message='invalid_fields';end if;
 begin rid:=(payload->>'requestId')::uuid;exception when invalid_text_representation then raise exception using errcode='22023',message='invalid_request';end;
 token:=payload->>'token';if rid is null or token is null or token !~ '^[a-f0-9]{64}$' then raise exception using errcode='22023',message='invalid_receipt';end if;
 hash:=encode(sha256(convert_to(token,'UTF8')),'hex');
 perform pg_advisory_xact_lock(hashtextextended('consultation:'||rid::text,0));
 select * into receipt from rhh_private.consultation_receipts where request_id=rid;
 if action='submit' then
 if not(payload ?& array['requestId','token','name','email','categoryId','topic','format']) or (select count(*) from jsonb_object_keys(payload))<>7 or exists(select 1 from jsonb_each(payload) where jsonb_typeof(value)<>'string')
 or length(btrim(payload->>'name')) not between 2 and 100 or length(payload->>'name')>100
 or length(payload->>'email')>254 or (payload->>'email') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
 or length(btrim(payload->>'topic')) not between 20 and 2000 or length(payload->>'topic')>2000
 or (payload->>'format') not in ('phone','no-preference') or not rhh_private.consultation_category(payload->>'categoryId') then raise exception using errcode='22023',message='invalid_submission';end if;
 select encode(sha256(convert_to(secret||(payload-'requestId'-'token')::text,'UTF8')),'hex') into content from rhh_private.consultation_config;
 if receipt.request_id is not null then
 if receipt.token_hash<>hash or receipt.content_hash<>content or receipt.expires_at<=clock_timestamp() then raise exception using errcode='PT409',message='receipt_conflict';end if;
 return jsonb_build_object('saved',true);end if;
 delete from rhh_private.consultation_limits where expires_at<=clock_timestamp();
 foreach lim in array array['global:'||floor(extract(epoch from clock_timestamp())/3600)::text,
 'email:'||encode(sha256(convert_to(lower(payload->>'email')||(select secret from rhh_private.consultation_config),'UTF8')),'hex')||':'||floor(extract(epoch from clock_timestamp())/86400)::text] loop
 n:=null;insert into rhh_private.consultation_limits values(lim,1,clock_timestamp()+interval '1 day') on conflict(key) do update set attempts=rhh_private.consultation_limits.attempts+1 where rhh_private.consultation_limits.attempts<case when lim like 'global:%' then 100 else 5 end returning attempts into n;
 if n is null then raise exception using errcode='PT429',message='request_limit';end if;end loop;
 insert into rhh.consultations(category_id,contact_name,contact_email,topic,format) values(payload->>'categoryId',btrim(payload->>'name'),lower(payload->>'email'),btrim(payload->>'topic'),payload->>'format') returning id into cid;
 insert into rhh_private.consultation_receipts values(rid,cid,hash,content,clock_timestamp()+interval '30 days');
 insert into rhh_private.consultation_events(consultation_id,version,action,next_status) values(cid,1,'submitted','requested');
 return jsonb_build_object('saved',true);
 end if;
 if receipt.request_id is null or receipt.token_hash<>hash or receipt.expires_at<=clock_timestamp() then raise exception using errcode='PT404',message='receipt_unavailable';end if;
 select * into r from rhh.consultations where id=receipt.consultation_id for update;
 if action='cancel' then
 if (payload->>'version')::integer is distinct from r.version then raise exception using errcode='PT409',message='stale_request';end if;
 if r.status<>'cancelled' then
 update rhh.consultations set status='cancelled',version=version+1,updated_at=clock_timestamp() where id=r.id returning * into r;
 insert into rhh_private.consultation_events(consultation_id,version,action,next_status) values(r.id,r.version,'visitor_cancelled','cancelled');end if;end if;
 return jsonb_build_object('status',r.status,'version',r.version,'categoryId',r.category_id);
end $$;
alter function rhh_private.consultation_public(text,jsonb) owner to rhh_consultation_writer;
revoke all on function rhh_private.consultation_public(text,jsonb) from public,anon,authenticated;
grant execute on function rhh_private.consultation_public(text,jsonb) to anon,authenticated;
create function public.rhh_consultation_public(action text,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select rhh_private.consultation_public(action,payload)$$;
revoke all on function public.rhh_consultation_public(text,jsonb) from public,anon,authenticated;
grant execute on function public.rhh_consultation_public(text,jsonb) to anon,authenticated;

create function rhh_private.consultation_workspace(admin_view boolean,action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid;pid uuid;owner_uid uuid;target uuid;expected integer;r rhh.consultations%rowtype;next_state text;page integer;items jsonb;total integer;begin
 if admin_view is null then raise exception using errcode='22023',message='invalid_scope';end if;
 if admin_view then uid:=rhh_private.require_admin();else uid:=rhh_private.consultation_member();end if;
 if jsonb_typeof(payload) is distinct from 'object' or action is null then raise exception using errcode='22023',message='invalid_request';end if;
 if action='list' then
 if exists(select 1 from jsonb_object_keys(payload) k where k<>'page') then raise exception using errcode='22023',message='invalid_filter';end if;
 page:=coalesce((payload->>'page')::integer,1);if page not between 1 and 10000 then raise exception using errcode='22023',message='invalid_page';end if;
 select count(*) into total from rhh.consultations c where admin_view or (c.assigned_owner=uid and rhh_private.consultation_owned(c.professional_id,uid));
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'categoryId',c.category_id,'topic',c.topic,'format',c.format,'status',c.status,'version',c.version,'professionalId',c.professional_id,'createdAt',c.created_at)
 ||case when admin_view then jsonb_build_object('name',c.contact_name,'email',c.contact_email,'note',c.admin_note) else '{}'::jsonb end order by c.created_at desc,c.id),'[]') into items
 from (select * from rhh.consultations c where admin_view or (c.assigned_owner=uid and rhh_private.consultation_owned(c.professional_id,uid)) order by c.created_at desc,c.id limit 20 offset (page-1)*20) c;
 return jsonb_build_object('items',items,'page',page,'hasNext',total>page*20,'candidates',case when admin_view then rhh_private.consultation_candidates() else '[]'::jsonb end);
 end if;
 if exists(select 1 from jsonb_object_keys(payload) k where k not in ('id','version','professionalId','note')) or
 (admin_view and action not in ('assign','cancel','note')) or (not admin_view and action not in ('accept','decline')) then raise exception using errcode='22023',message='invalid_action';end if;
 target:=(payload->>'id')::uuid;expected:=(payload->>'version')::integer;
 -- Consistent target-before-request locks; optimistic version catches intervening reassignment.
 select * into r from rhh.consultations where id=target;
 if r.id is null then raise exception using errcode='PT404',message='request_unavailable';end if;
 if not admin_view and (r.assigned_owner is distinct from uid or not rhh_private.consultation_owned(r.professional_id,uid)) then raise exception using errcode='42501',message='assignment_required';end if;
 if action='assign' then pid:=(payload->>'professionalId')::uuid;owner_uid:=rhh_private.consultation_target(pid,r.category_id);
 elsif action='accept' then owner_uid:=rhh_private.consultation_target(r.professional_id,r.category_id);if owner_uid<>uid then raise exception using errcode='42501',message='assignment_required';end if;end if;
 select * into r from rhh.consultations where id=target for update;
 if expected is null or expected<>r.version then raise exception using errcode='PT409',message='stale_request';end if;
 if not admin_view and (r.assigned_owner is distinct from uid or not rhh_private.consultation_owned(r.professional_id,uid)) then raise exception using errcode='42501',message='assignment_required';end if;
 if (r.status='cancelled' and action<>'note') or (action in ('accept','decline') and r.status<>'assigned') then raise exception using errcode='PT409',message='invalid_transition';end if;
 if action='note' and (jsonb_typeof(payload->'note') is distinct from 'string' or length(payload->>'note')>500) then raise exception using errcode='22023',message='invalid_note';end if;
 next_state:=case action when 'assign' then 'assigned' when 'accept' then 'accepted' when 'decline' then 'requested' when 'cancel' then 'cancelled' else r.status end;
 update rhh.consultations set status=next_state,version=version+1,updated_at=clock_timestamp(),
 professional_id=case action when 'assign' then pid when 'decline' then null else professional_id end,
 assigned_owner=case action when 'assign' then owner_uid when 'decline' then null else assigned_owner end,
 admin_note=case when action='note' then btrim(payload->>'note') else admin_note end where id=r.id;
 insert into rhh_private.consultation_events(consultation_id,version,action,actor_id,professional_id,assigned_owner,previous_status,next_status)
 select id,version,action,uid,professional_id,assigned_owner,r.status,status from rhh.consultations where id=r.id;
 return jsonb_build_object('saved',true);
end $$;
alter function rhh_private.consultation_workspace(boolean,text,jsonb) owner to rhh_consultation_writer;
revoke all on function rhh_private.consultation_workspace(boolean,text,jsonb) from public,anon,authenticated;
grant execute on function rhh_private.consultation_workspace(boolean,text,jsonb) to authenticated;
create function public.rhh_consultation_workspace(admin_view boolean,action text,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select rhh_private.consultation_workspace(admin_view,action,payload)$$;
revoke all on function public.rhh_consultation_workspace(boolean,text,jsonb) from public,anon,authenticated;
grant execute on function public.rhh_consultation_workspace(boolean,text,jsonb) to authenticated;
revoke create on schema rhh_private from rhh_consultation_writer;
notify pgrst,'reload schema';
commit;
