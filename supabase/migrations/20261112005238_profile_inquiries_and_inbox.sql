-- Saved inquiries only. No email delivery, membership activation or admin inbox access.
begin;
create role rhh_inquiry_writer nologin noinherit nobypassrls;
grant rhh_inquiry_writer to postgres;
grant usage on schema rhh,rhh_private to rhh_inquiry_writer;
grant create on schema rhh_private to rhh_inquiry_writer;
-- Required for ownership changes when the hosted operator is not a superuser.
grant create on schema rhh_private to rhh_member_writer;

-- Historical inquiries keep their original recipient even if a listing changes owner.
-- Existing rows have unknown recipients: leave them quarantined (NULL), never infer one.
alter table rhh.inquiries
 add column recipient_id uuid references rhh.accounts(user_id) on delete restrict,
 add column read_at timestamptz,
 add column state_version integer not null default 1 check(state_version>0);
create index inquiries_inbox_idx on rhh.inquiries(recipient_id,created_at desc,id desc);
create index inquiries_unread_idx on rhh.inquiries(recipient_id) where read_at is null;
revoke all on rhh.inquiries from public,anon,authenticated,rhh_admin_writer,rhh_public_reader;
grant insert (professional_id,recipient_id,sender_name,sender_email,message) on rhh.inquiries to rhh_inquiry_writer;
create policy inquiry_submit on rhh.inquiries for insert to rhh_inquiry_writer with check(recipient_id is not null);
grant select(id,professional_id,recipient_id,sender_name,sender_email,message,created_at,read_at,state_version),
 update(read_at,state_version) on rhh.inquiries to rhh_member_writer;
create policy inquiry_recipient_read on rhh.inquiries for select to rhh_member_writer
 using(recipient_id=(select rhh_private.request_user_id()));
create policy inquiry_recipient_state on rhh.inquiries for update to rhh_member_writer
 using(recipient_id=(select rhh_private.request_user_id()))
 with check(recipient_id=(select rhh_private.request_user_id()));

-- Ephemeral pseudonymous abuse metadata, never exposed through the Data API.
create table rhh_private.inquiry_abuse_key (
 singleton boolean primary key default true check(singleton),
 secret text not null default (gen_random_uuid()::text||gen_random_uuid()::text)
);
insert into rhh_private.inquiry_abuse_key(singleton) values(true);
create table rhh_private.inquiry_limits (
 bucket text not null, starts_at timestamptz not null, expires_at timestamptz not null,
 used integer not null check(used>0), primary key(bucket,starts_at)
);
create index inquiry_limits_expiry_idx on rhh_private.inquiry_limits(expires_at);
create table rhh_private.inquiry_requests (
 request_id uuid primary key, digest text not null, expires_at timestamptz not null
);
create index inquiry_requests_expiry_idx on rhh_private.inquiry_requests(expires_at);
revoke all on rhh_private.inquiry_abuse_key,rhh_private.inquiry_limits,rhh_private.inquiry_requests from public,anon,authenticated;
alter table rhh_private.inquiry_abuse_key enable row level security;
alter table rhh_private.inquiry_abuse_key force row level security;
alter table rhh_private.inquiry_limits enable row level security;
alter table rhh_private.inquiry_limits force row level security;
alter table rhh_private.inquiry_requests enable row level security;
alter table rhh_private.inquiry_requests force row level security;
grant select(secret) on rhh_private.inquiry_abuse_key to rhh_inquiry_writer;
grant select,insert,update,delete on rhh_private.inquiry_limits to rhh_inquiry_writer;
grant select,insert,delete on rhh_private.inquiry_requests to rhh_inquiry_writer;
create policy inquiry_key_read on rhh_private.inquiry_abuse_key for select to rhh_inquiry_writer using(true);
create policy inquiry_limit_access on rhh_private.inquiry_limits to rhh_inquiry_writer using(true) with check(true);
create policy inquiry_request_access on rhh_private.inquiry_requests to rhh_inquiry_writer using(true) with check(true);

-- Only this fixed-path helper can inspect recipient eligibility or lock protected rows.
-- It cannot read inquiries or mutate accounts/listings. Not callable by API roles.
create function rhh_private.inquiry_recipient(target uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare recipient uuid; begin
 select owner_id into recipient from rhh.professionals where id=target;
 if recipient is null then raise exception using errcode='P0002',message='inquiry_unavailable'; end if;
 perform pg_advisory_xact_lock(hashtextextended(recipient::text,0));
 select p.owner_id into recipient from rhh.professionals p
 join rhh.applications a on a.professional_id=p.id
 join rhh.memberships m on m.professional_id=p.id
 join rhh.accounts ac on ac.user_id=p.owner_id
 join auth.users u on u.id=ac.user_id
 where p.id=target and a.approval='approved' and not a.suspended and m.status='active'
 and ac.role='member' and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)
 for share of p,a,m,ac,u;
 if recipient is null then raise exception using errcode='P0002',message='inquiry_unavailable'; end if;
 return recipient;
end $$;
revoke all on function rhh_private.inquiry_recipient(uuid) from public,anon,authenticated;
grant execute on function rhh_private.inquiry_recipient(uuid) to rhh_inquiry_writer;

create function rhh_private.submit_inquiry(payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare target uuid; request_key uuid; recipient uuid; sender text; address text; body text;
 secret_key text; sender_key text; content_digest text; previous_digest text;
 submitted_time timestamptz:=clock_timestamp(); window_start timestamptz; used_count integer;
 bucket_key text; bucket_limit integer; window_seconds integer; scope integer;
begin
 if payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>16384
 or (payload-array['professionalId','requestId','name','email','message'])<>'{}'::jsonb
 or not(payload ?& array['professionalId','requestId','name','email','message'])
 or exists(select 1 from jsonb_each(payload) x where jsonb_typeof(x.value)<>'string')
 then raise exception using errcode='22023',message='invalid_inquiry'; end if;
 begin target:=(payload->>'professionalId')::uuid; request_key:=(payload->>'requestId')::uuid;
 exception when invalid_text_representation then raise exception using errcode='22023',message='invalid_inquiry'; end;
 sender:=regexp_replace(payload->>'name','^[[:space:]]+|[[:space:]]+$','','g');
 address:=regexp_replace(payload->>'email','^[[:space:]]+|[[:space:]]+$','','g');
 body:=regexp_replace(payload->>'message','^[[:space:]]+|[[:space:]]+$','','g');
 if length(payload->>'name')>80 or length(sender)<1 or length(payload->>'email')>254
 or address !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
 or length(payload->>'message')>2000 or length(body)<10
 then raise exception using errcode='22023',message='invalid_inquiry'; end if;
 select secret into secret_key from rhh_private.inquiry_abuse_key;
 sender_key:=encode(sha256(convert_to(secret_key||lower(address),'UTF8')),'hex');
 content_digest:=encode(sha256(convert_to(secret_key||jsonb_build_array(target,sender,address,body)::text,'UTF8')),'hex');
 -- Serialize the same request key before checking metadata; unique PK is additional protection.
 perform pg_advisory_xact_lock(hashtextextended('inquiry-request:'||request_key::text,0));
 select digest into previous_digest from rhh_private.inquiry_requests where request_id=request_key and expires_at>submitted_time;
 if previous_digest is not null then
  if previous_digest<>content_digest then raise exception using errcode='22023',message='inquiry_request_changed'; end if;
  return jsonb_build_object('saved',true);
 end if;
 recipient:=rhh_private.inquiry_recipient(target);
 -- Consistent global -> target -> sender order. UPSERT holds row locks until commit.
 for scope in 1..3 loop
  bucket_key:=case scope when 1 then 'global' when 2 then 'target:'||target::text else 'sender:'||sender_key end;
  bucket_limit:=case scope when 1 then 100 when 2 then 20 else 3 end;
  window_seconds:=case when scope=3 then 900 else 3600 end;
  window_start:=to_timestamp(floor(extract(epoch from submitted_time)/window_seconds)*window_seconds);
  insert into rhh_private.inquiry_limits(bucket,starts_at,expires_at,used)
   values(bucket_key,window_start,window_start+make_interval(secs=>window_seconds),1)
  on conflict(bucket,starts_at) do update set used=rhh_private.inquiry_limits.used+1
   where rhh_private.inquiry_limits.used<bucket_limit returning used into used_count;
  if used_count is null then raise exception using errcode='P0001',message='inquiry_rate_limited'; end if;
 end loop;
 delete from rhh_private.inquiry_limits where expires_at<=submitted_time;
 delete from rhh_private.inquiry_requests where expires_at<=submitted_time;
 insert into rhh.inquiries(professional_id,recipient_id,sender_name,sender_email,message)
 values(target,recipient,sender,address,body);
 insert into rhh_private.inquiry_requests(request_id,digest,expires_at) values(request_key,content_digest,submitted_time+interval '24 hours');
 return jsonb_build_object('saved',true);
end $$;
alter function rhh_private.submit_inquiry(jsonb) owner to rhh_inquiry_writer;
revoke all on function rhh_private.submit_inquiry(jsonb) from public,anon,authenticated;
grant execute on function rhh_private.submit_inquiry(jsonb) to anon,authenticated;
create function public.rhh_submit_inquiry(payload jsonb) returns jsonb
language sql security invoker set search_path='' as $$ select rhh_private.submit_inquiry(payload) $$;
revoke all on function public.rhh_submit_inquiry(jsonb) from public,anon,authenticated;
grant execute on function public.rhh_submit_inquiry(jsonb) to anon,authenticated;

create function rhh_private.inquiry_detail(target uuid) returns jsonb
language sql security invoker set search_path='' as $$
 select jsonb_build_object('id',i.id,'professionalId',i.professional_id,'name',i.sender_name,
 'email',i.sender_email,'message',i.message,'createdAt',i.created_at,'readAt',i.read_at,'version',i.state_version)
 from rhh.inquiries i where i.id=target;
$$;
alter function rhh_private.inquiry_detail(uuid) owner to rhh_member_writer;
revoke all on function rhh_private.inquiry_detail(uuid) from public,anon,authenticated;
create function rhh_private.inbox(page_number integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; begin
 perform rhh_private.ensure_member();
 if page_number is null or page_number<1 or page_number>10000 then raise exception using errcode='22023',message='invalid_inbox_page'; end if;
 with items as (select id,sender_name,created_at,read_at from rhh.inquiries
  order by created_at desc,id desc limit 21 offset (page_number-1)*20)
 select jsonb_build_object('page',page_number,'hasNext',(select count(*)>20 from items),
 'items',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'name',x.sender_name,'createdAt',x.created_at,'readAt',x.read_at)
 order by x.created_at desc,x.id desc) from (select * from items order by created_at desc,id desc limit 20) x),'[]'::jsonb)) into result;
 return result;
end $$;
alter function rhh_private.inbox(integer) owner to rhh_member_writer;
revoke all on function rhh_private.inbox(integer) from public,anon,authenticated;
grant execute on function rhh_private.inbox(integer) to authenticated;
create function public.rhh_inbox(page_number integer default 1) returns jsonb
language sql security invoker set search_path='' as $$ select rhh_private.inbox(page_number) $$;
revoke all on function public.rhh_inbox(integer) from public,anon,authenticated;
grant execute on function public.rhh_inbox(integer) to authenticated;

create function rhh_private.read_inquiry(target uuid) returns jsonb
language plpgsql security definer set search_path='' as $$ begin
 perform rhh_private.ensure_member(); return rhh_private.inquiry_detail(target);
end $$;
alter function rhh_private.read_inquiry(uuid) owner to rhh_member_writer;
revoke all on function rhh_private.read_inquiry(uuid) from public,anon,authenticated;
grant execute on function rhh_private.read_inquiry(uuid) to authenticated;
create function public.rhh_read_inquiry(target uuid) returns jsonb
language sql security invoker set search_path='' as $$ select rhh_private.read_inquiry(target) $$;
revoke all on function public.rhh_read_inquiry(uuid) from public,anon,authenticated;
grant execute on function public.rhh_read_inquiry(uuid) to authenticated;

create function rhh_private.set_inquiry_read(target uuid,is_read boolean,expected_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare current_version integer; begin
 perform rhh_private.ensure_member();
 if is_read is null or expected_version is null or expected_version<1 then raise exception using errcode='22023',message='invalid_inquiry_state'; end if;
 select state_version into current_version from rhh.inquiries where id=target for update;
 if current_version is null then raise exception using errcode='P0002',message='inquiry_unavailable'; end if;
 if current_version<>expected_version then raise exception using errcode='40001',message='inquiry_state_conflict'; end if;
 update rhh.inquiries set read_at=case when is_read then coalesce(read_at,clock_timestamp()) else null end,
 state_version=state_version+1 where id=target;
 return rhh_private.inquiry_detail(target);
end $$;
alter function rhh_private.set_inquiry_read(uuid,boolean,integer) owner to rhh_member_writer;
revoke all on function rhh_private.set_inquiry_read(uuid,boolean,integer) from public,anon,authenticated;
grant execute on function rhh_private.set_inquiry_read(uuid,boolean,integer) to authenticated;
create function public.rhh_set_inquiry_read(target uuid,is_read boolean,expected_version integer) returns jsonb
language sql security invoker set search_path='' as $$ select rhh_private.set_inquiry_read(target,is_read,expected_version) $$;
revoke all on function public.rhh_set_inquiry_read(uuid,boolean,integer) from public,anon,authenticated;
grant execute on function public.rhh_set_inquiry_read(uuid,boolean,integer) to authenticated;
revoke create on schema rhh_private from rhh_inquiry_writer,rhh_member_writer;
notify pgrst,'reload schema';
commit;
