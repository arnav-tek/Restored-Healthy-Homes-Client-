-- Durable inquiry notifications. No provider, scheduler, key or historical sends
-- are activated by this migration. Public inquiry receipts remain unchanged.
begin;
create role rhh_notification_worker nologin noinherit nobypassrls;
grant rhh_notification_worker to postgres;
grant usage on schema rhh_private to rhh_notification_worker;
grant create on schema rhh_private to rhh_notification_worker,rhh_admin_writer;

create table rhh_private.inquiry_email_jobs (
 id uuid primary key default gen_random_uuid(),
 inquiry_id uuid not null unique references rhh.inquiries(id) on delete restrict,
 recipient_id uuid not null references rhh.accounts(user_id) on delete restrict,
 recipient_email text check(length(recipient_email) between 3 and 254),
 state text not null default 'pending' check(state in ('pending','processing','retry','accepted','failed','unknown','canceled','test_recorded')),
 attempts integer not null default 0 check(attempts between 0 and 7),
 manual_retries integer not null default 0 check(manual_retries between 0 and 2),
 version integer not null default 1 check(version>0),
 next_attempt_at timestamptz not null default clock_timestamp(),
 lease_token uuid,lease_until timestamptz,send_started_at timestamptz,
 provider_name text check(length(provider_name) between 1 and 64),
 from_address text check(length(from_address) between 3 and 254),
 inbox_origin text check(length(inbox_origin) between 1 and 256),
 delivery_mode text check(delivery_mode in ('live','test')),
 first_send_at timestamptz,idempotency_until timestamptz,
 has_uncertain_send boolean not null default false,
 provider_message_id text check(length(provider_message_id)<=200 and provider_message_id !~ '[[:cntrl:]]'),
 failure_code text not null default '' check(failure_code in ('','rate_limited','unavailable','timeout','network','rejected','invalid_recipient','configuration','unknown','worker_abandoned','recipient_unavailable','configuration_changed','idempotency_expired','expired','adapter_contract')),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),accepted_at timestamptz,
 check((state='processing' and lease_token is not null and lease_until is not null) or (state<>'processing' and lease_token is null and lease_until is null)),
 check(state='processing' or send_started_at is null),
 check(state<>'accepted' or (delivery_mode is not null and delivery_mode='live')),
 check(state<>'test_recorded' or (delivery_mode is not null and delivery_mode='test'))
);
create index inquiry_email_ready_idx on rhh_private.inquiry_email_jobs(next_attempt_at,created_at,id) where state in ('pending','retry');
create index inquiry_email_leases_idx on rhh_private.inquiry_email_jobs(lease_until,id) where state='processing';
create index inquiry_email_recipient_idx on rhh_private.inquiry_email_jobs(recipient_id);
create table rhh_private.inquiry_email_events (
 id uuid primary key default gen_random_uuid(),
 job_id uuid not null references rhh_private.inquiry_email_jobs(id) on delete restrict,
 event text not null check(event in ('claimed','accepted','temporary','permanent','ambiguous','recovered','canceled','manual_retry','test_recorded')),
 attempt integer not null check(attempt between 0 and 7),
 code text not null default '' check(code in ('','rate_limited','unavailable','timeout','network','rejected','invalid_recipient','configuration','unknown','worker_abandoned','recipient_unavailable','configuration_changed','idempotency_expired','expired','adapter_contract')),
 actor_id uuid references rhh.accounts(user_id) on delete restrict,
 reason text not null default '' check(length(reason)<=300),
 occurred_at timestamptz not null default clock_timestamp(),
 check((event='manual_retry')=(actor_id is not null))
);
create index inquiry_email_events_job_idx on rhh_private.inquiry_email_events(job_id,occurred_at desc,id);
create index inquiry_email_events_actor_idx on rhh_private.inquiry_email_events(actor_id) where actor_id is not null;
create table rhh_private.inquiry_email_worker_keys (
 token_hash text primary key check(token_hash ~ '^[0-9a-f]{64}$'),
 enabled boolean not null default false,
 allow_test boolean not null default false
);
revoke all on rhh_private.inquiry_email_jobs,rhh_private.inquiry_email_events,rhh_private.inquiry_email_worker_keys from public,anon,authenticated;
alter table rhh_private.inquiry_email_jobs enable row level security;
alter table rhh_private.inquiry_email_jobs force row level security;
alter table rhh_private.inquiry_email_events enable row level security;
alter table rhh_private.inquiry_email_events force row level security;
alter table rhh_private.inquiry_email_worker_keys enable row level security;
alter table rhh_private.inquiry_email_worker_keys force row level security;
grant select,update on rhh_private.inquiry_email_jobs to rhh_notification_worker;
grant insert(job_id,event,attempt,code) on rhh_private.inquiry_email_events to rhh_notification_worker;
create policy worker_jobs on rhh_private.inquiry_email_jobs to rhh_notification_worker using(true) with check(true);
create policy worker_events on rhh_private.inquiry_email_events for insert to rhh_notification_worker with check(actor_id is null);

-- The worker key is a separate, high-entropy server credential, not a browser role.
-- Its verifier is operator-configured later. The migration installs no key.
create function rhh_private.require_inquiry_email_worker() returns boolean
language plpgsql security definer set search_path='' as $$
declare token text; test_allowed boolean; begin
 begin token:=current_setting('request.headers',true)::jsonb->>'x-rhh-notification-worker';
 exception when invalid_text_representation then token:=null; end;
 if token is null or length(token) not between 32 and 128 or token !~ '^[A-Za-z0-9_-]+$'
 then raise exception using errcode='42501',message='notification_worker_required'; end if;
 select allow_test into test_allowed from rhh_private.inquiry_email_worker_keys
 where token_hash=encode(sha256(convert_to(token,'UTF8')),'hex') and enabled;
 if test_allowed is null then raise exception using errcode='42501',message='notification_worker_required'; end if;
 return test_allowed;
end $$;
revoke all on function rhh_private.require_inquiry_email_worker() from public,anon,authenticated;
grant execute on function rhh_private.require_inquiry_email_worker() to rhh_notification_worker;

-- Snapshot verified Auth email only; never use member-editable public contacts.
-- A missing/unavailable route creates a canceled job, not a failed inquiry save.
create function rhh_private.enqueue_inquiry_email() returns trigger
language plpgsql security definer set search_path='' as $$
declare address text; begin
 if tg_op<>'INSERT' or tg_table_schema<>'rhh' or tg_table_name<>'inquiries'
 then raise exception 'invalid_notification_trigger'; end if;
 if new.recipient_id is null then return new; end if;
 select u.email into address from rhh.accounts a join auth.users u on u.id=a.user_id
 where a.user_id=new.recipient_id and a.role='member' and u.email_confirmed_at is not null
 and not coalesce(u.is_anonymous,false) and u.deleted_at is null
 and (u.banned_until is null or u.banned_until<=clock_timestamp())
 and length(u.email) between 3 and 254 and u.email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$';
 insert into rhh_private.inquiry_email_jobs(inquiry_id,recipient_id,recipient_email,state,failure_code)
 values(new.id,new.recipient_id,address,case when address is null then 'canceled' else 'pending' end,
 case when address is null then 'recipient_unavailable' else '' end);
 return new;
end $$;
revoke all on function rhh_private.enqueue_inquiry_email() from public,anon,authenticated;
create trigger inquiry_email_outbox after insert on rhh.inquiries for each row execute function rhh_private.enqueue_inquiry_email();

-- Recheck snapshot, current ownership, verified email, role and account availability.
-- An email change/transfer cancels; historical inbox messages retain B1 ownership.
create function rhh_private.inquiry_email_route_valid(target uuid) returns boolean
language plpgsql security definer set search_path='' as $$ begin
 perform rhh_private.require_inquiry_email_worker();
 return exists(select 1 from rhh_private.inquiry_email_jobs j
 join rhh.inquiries i on i.id=j.inquiry_id
 join rhh.professionals p on p.id=i.professional_id
 join rhh.accounts a on a.user_id=j.recipient_id join auth.users u on u.id=a.user_id
 where j.id=target and i.recipient_id=j.recipient_id and p.owner_id=j.recipient_id
 and a.role='member' and u.email=j.recipient_email and u.email_confirmed_at is not null
 and not coalesce(u.is_anonymous,false) and u.deleted_at is null
 and (u.banned_until is null or u.banned_until<=clock_timestamp()));
end $$;
revoke all on function rhh_private.inquiry_email_route_valid(uuid) from public,anon,authenticated;
grant execute on function rhh_private.inquiry_email_route_valid(uuid) to rhh_notification_worker;

create function rhh_private.claim_inquiry_email() returns jsonb
language plpgsql security definer set search_path='' as $$
declare j rhh_private.inquiry_email_jobs%rowtype; recovered_state text; n integer:=0; begin
 perform rhh_private.require_inquiry_email_worker();
 -- Bounded recovery. Fencing tokens invalidate every abandoned worker.
 for j in select * from rhh_private.inquiry_email_jobs where state='processing'
 and lease_until<=clock_timestamp() order by lease_until,id limit 20 for update skip locked loop
  recovered_state:=case
   when (j.send_started_at is not null or j.has_uncertain_send) and not(coalesce(j.idempotency_until>clock_timestamp(),false) and j.attempts<5+j.manual_retries and j.created_at>clock_timestamp()-interval '24 hours') then 'unknown'
   when j.attempts>=5+j.manual_retries then 'failed'
   when j.created_at<=clock_timestamp()-interval '24 hours' then 'canceled' else 'retry' end;
  update rhh_private.inquiry_email_jobs set state=recovered_state,
   has_uncertain_send=has_uncertain_send or send_started_at is not null,
   lease_token=null,lease_until=null,send_started_at=null,next_attempt_at=clock_timestamp(),
   failure_code='worker_abandoned',updated_at=clock_timestamp(),version=version+1 where id=j.id;
  insert into rhh_private.inquiry_email_events(job_id,event,attempt,code) values(j.id,'recovered',j.attempts,'worker_abandoned');
 end loop;
 for j in select * from rhh_private.inquiry_email_jobs where state in ('pending','retry')
 and next_attempt_at<=clock_timestamp() order by next_attempt_at,created_at,id limit 10 for update skip locked loop
  if j.created_at<=clock_timestamp()-interval '24 hours' or j.attempts>=5+j.manual_retries then
   update rhh_private.inquiry_email_jobs set state=case when has_uncertain_send then 'unknown' else 'canceled' end,
    failure_code='expired',updated_at=clock_timestamp(),version=version+1 where id=j.id;
   insert into rhh_private.inquiry_email_events(job_id,event,attempt,code) values(j.id,'canceled',j.attempts,'expired');
   continue;
  end if;
  update rhh_private.inquiry_email_jobs set state='processing',attempts=attempts+1,
   lease_token=gen_random_uuid(),lease_until=clock_timestamp()+interval '120 seconds',send_started_at=null,
   updated_at=clock_timestamp(),version=version+1 where id=j.id returning * into j;
  insert into rhh_private.inquiry_email_events(job_id,event,attempt) values(j.id,'claimed',j.attempts);
  return jsonb_build_object('id',j.id,'lease',j.lease_token,'attempt',j.attempts);
 end loop;
 return null;
end $$;
alter function rhh_private.claim_inquiry_email() owner to rhh_notification_worker;
revoke all on function rhh_private.claim_inquiry_email() from public,anon,authenticated;
grant execute on function rhh_private.claim_inquiry_email() to anon;
create function public.rhh_claim_inquiry_email() returns jsonb language sql security invoker set search_path='' as $$ select rhh_private.claim_inquiry_email() $$;
revoke all on function public.rhh_claim_inquiry_email() from public,anon,authenticated;
grant execute on function public.rhh_claim_inquiry_email() to anon;

create function rhh_private.prepare_inquiry_email(target uuid,claim_token uuid,provider text,sender text,origin text,mode text,idempotency_seconds integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare j rhh_private.inquiry_email_jobs%rowtype; test_allowed boolean; canceled_code text; begin
 test_allowed:=rhh_private.require_inquiry_email_worker();
 if provider is null or provider !~ '^[a-z0-9_-]{1,64}$' or sender is null or length(sender)>254
 or sender !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or sender ~ '[<>[:cntrl:]]' or origin is null or length(origin)>256
 or (origin !~ '^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?$' and origin not in ('http://127.0.0.1:3230','http://localhost:3230'))
 or mode is null or mode not in ('live','test') or (mode='test' and not test_allowed)
 or idempotency_seconds is null or idempotency_seconds not between 0 and 604800
 then raise exception using errcode='22023',message='invalid_notification_configuration'; end if;
 select * into j from rhh_private.inquiry_email_jobs where id=target for update;
 if j.id is null or j.state<>'processing' or j.lease_token is distinct from claim_token
 or j.lease_until<=clock_timestamp() or j.send_started_at is not null
 then raise exception using errcode='PT409',message='notification_claim_stale'; end if;
 if not rhh_private.inquiry_email_route_valid(j.id) then canceled_code:='recipient_unavailable';
 elsif j.created_at<=clock_timestamp()-interval '24 hours' then canceled_code:='expired'; end if;
 if canceled_code is not null then
  update rhh_private.inquiry_email_jobs set state='canceled',failure_code=canceled_code,
   lease_token=null,lease_until=null,send_started_at=null,updated_at=clock_timestamp(),version=version+1 where id=j.id;
  insert into rhh_private.inquiry_email_events(job_id,event,attempt,code) values(j.id,'canceled',j.attempts,canceled_code);
  return null;
 end if;
 if (j.provider_name is not null and (j.provider_name<>provider or j.from_address<>sender or j.inbox_origin<>origin or j.delivery_mode<>mode))
 or (j.has_uncertain_send and (j.idempotency_until is null or j.idempotency_until<=clock_timestamp())) then
  update rhh_private.inquiry_email_jobs set state='unknown',failure_code=case when has_uncertain_send and (idempotency_until is null or idempotency_until<=clock_timestamp()) then 'idempotency_expired' else 'configuration_changed' end,
   lease_token=null,lease_until=null,send_started_at=null,updated_at=clock_timestamp(),version=version+1 where id=j.id;
  insert into rhh_private.inquiry_email_events(job_id,event,attempt,code) values(j.id,'ambiguous',j.attempts,'configuration_changed');
  return null;
 end if;
 update rhh_private.inquiry_email_jobs set provider_name=coalesce(provider_name,provider),from_address=coalesce(from_address,sender),
  inbox_origin=coalesce(inbox_origin,origin),delivery_mode=coalesce(delivery_mode,mode),
  idempotency_until=case when first_send_at is null and idempotency_seconds>0 then clock_timestamp()+make_interval(secs=>idempotency_seconds) else idempotency_until end,
  first_send_at=coalesce(first_send_at,clock_timestamp()),send_started_at=clock_timestamp(),
  updated_at=clock_timestamp(),version=version+1 where id=j.id returning * into j;
 return jsonb_build_object('id',j.id,'inquiryId',j.inquiry_id,'to',j.recipient_email,'from',j.from_address,
  'origin',j.inbox_origin,'mode',j.delivery_mode,'idempotencyKey','rhh-inquiry-notice-'||j.id::text);
end $$;
alter function rhh_private.prepare_inquiry_email(uuid,uuid,text,text,text,text,integer) owner to rhh_notification_worker;
revoke all on function rhh_private.prepare_inquiry_email(uuid,uuid,text,text,text,text,integer) from public,anon,authenticated;
grant execute on function rhh_private.prepare_inquiry_email(uuid,uuid,text,text,text,text,integer) to anon;
create function public.rhh_prepare_inquiry_email(target uuid,claim_token uuid,provider text,sender text,origin text,mode text,idempotency_seconds integer) returns jsonb
language sql security invoker set search_path='' as $$ select rhh_private.prepare_inquiry_email(target,claim_token,provider,sender,origin,mode,idempotency_seconds) $$;
revoke all on function public.rhh_prepare_inquiry_email(uuid,uuid,text,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.rhh_prepare_inquiry_email(uuid,uuid,text,text,text,text,integer) to anon;

create function rhh_private.finish_inquiry_email(target uuid,claim_token uuid,outcome text,code text,receipt text,retry_after_seconds integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare j rhh_private.inquiry_email_jobs%rowtype; next_state text; uncertain boolean; delay_seconds integer; begin
 perform rhh_private.require_inquiry_email_worker();
 if outcome is null or outcome not in ('accepted','test_recorded','temporary','permanent','ambiguous')
 or code is null or code not in ('','rate_limited','unavailable','timeout','network','rejected','invalid_recipient','configuration','unknown','adapter_contract')
 or (receipt is not null and (length(receipt)>200 or receipt ~ '[[:cntrl:]]'))
 or retry_after_seconds is null or retry_after_seconds not between 0 and 86400
 or (outcome in ('accepted','test_recorded') and code<>'') or (outcome in ('temporary','permanent','ambiguous') and code='')
 then raise exception using errcode='22023',message='invalid_notification_outcome'; end if;
 select * into j from rhh_private.inquiry_email_jobs where id=target for update;
 if j.id is null or j.state<>'processing' or j.lease_token is distinct from claim_token
 or j.lease_until<=clock_timestamp() or j.send_started_at is null
 then raise exception using errcode='PT409',message='notification_claim_stale'; end if;
 if (outcome='accepted' and j.delivery_mode<>'live') or (outcome='test_recorded' and j.delivery_mode<>'test')
 then raise exception using errcode='22023',message='invalid_notification_outcome'; end if;
 uncertain:=j.has_uncertain_send or outcome='ambiguous';
 next_state:=case when outcome in ('accepted','test_recorded') then outcome
  when outcome='permanent' then case when uncertain then 'unknown' else 'failed' end
  when j.attempts>=5+j.manual_retries then case when uncertain then 'unknown' else 'failed' end
  when uncertain and (j.idempotency_until is null or j.idempotency_until<=clock_timestamp()) then 'unknown'
  else 'retry' end;
 delay_seconds:=greatest(least(60*power(2,j.attempts-1)::integer,3600),retry_after_seconds)+floor(random()*11)::integer;
 if next_state='retry' and clock_timestamp()+make_interval(secs=>delay_seconds)>=j.created_at+interval '24 hours'
 then next_state:=case when uncertain then 'unknown' else 'canceled' end; end if;
 update rhh_private.inquiry_email_jobs set state=next_state,has_uncertain_send=uncertain,
  next_attempt_at=clock_timestamp()+make_interval(secs=>delay_seconds),
  provider_message_id=case when outcome='accepted' then receipt else provider_message_id end,
  accepted_at=case when outcome='accepted' then clock_timestamp() else accepted_at end,
  failure_code=case when outcome in ('accepted','test_recorded') then '' else code end,
  lease_token=null,lease_until=null,send_started_at=null,updated_at=clock_timestamp(),version=version+1 where id=j.id;
 insert into rhh_private.inquiry_email_events(job_id,event,attempt,code) values(j.id,outcome,j.attempts,code);
 return jsonb_build_object('state',next_state);
end $$;
alter function rhh_private.finish_inquiry_email(uuid,uuid,text,text,text,integer) owner to rhh_notification_worker;
revoke all on function rhh_private.finish_inquiry_email(uuid,uuid,text,text,text,integer) from public,anon,authenticated;
grant execute on function rhh_private.finish_inquiry_email(uuid,uuid,text,text,text,integer) to anon;
create function public.rhh_finish_inquiry_email(target uuid,claim_token uuid,outcome text,code text,receipt text,retry_after_seconds integer) returns jsonb
language sql security invoker set search_path='' as $$ select rhh_private.finish_inquiry_email(target,claim_token,outcome,code,receipt,retry_after_seconds) $$;
revoke all on function public.rhh_finish_inquiry_email(uuid,uuid,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.rhh_finish_inquiry_email(uuid,uuid,text,text,text,integer) to anon;

-- Operations metadata only: no recipient, sender, content or provider diagnostics.
grant select(id,inquiry_id,state,attempts,manual_retries,version,next_attempt_at,failure_code,created_at,updated_at,accepted_at,has_uncertain_send),
 update(state,next_attempt_at,manual_retries,version,updated_at) on rhh_private.inquiry_email_jobs to rhh_admin_writer;
grant select(job_id,event,attempt,code,occurred_at,reason),insert(job_id,event,attempt,code,actor_id,reason) on rhh_private.inquiry_email_events to rhh_admin_writer;
create policy admin_email_read on rhh_private.inquiry_email_jobs for select to rhh_admin_writer using((select rhh_private.is_admin()));
create policy admin_email_retry on rhh_private.inquiry_email_jobs for update to rhh_admin_writer
 using((select rhh_private.is_admin()) and state='failed' and not has_uncertain_send)
 with check((select rhh_private.is_admin()) and state='retry');
create policy admin_email_events_read on rhh_private.inquiry_email_events for select to rhh_admin_writer using((select rhh_private.is_admin()));
create policy admin_email_events_insert on rhh_private.inquiry_email_events for insert to rhh_admin_writer
 with check((select rhh_private.is_admin()) and event='manual_retry' and actor_id=(select rhh_private.request_user_id()));
create function rhh_private.admin_inquiry_email_jobs(page_number integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; begin
 perform rhh_private.require_admin();
 if page_number is null or page_number not between 1 and 10000 then raise exception using errcode='22023',message='invalid_notification_page'; end if;
 with items as (select id,inquiry_id,state,attempts,manual_retries,version,next_attempt_at,failure_code,created_at,updated_at,accepted_at
 from rhh_private.inquiry_email_jobs order by created_at desc,id desc limit 21 offset (page_number-1)*20)
 select jsonb_build_object('page',page_number,'hasNext',(select count(*)>20 from items),'jobs',coalesce((select jsonb_agg(jsonb_build_object(
 'id',j.id,'inquiryId',j.inquiry_id,'state',j.state,'attempts',j.attempts,'manualRetries',j.manual_retries,'version',j.version,
 'nextAttemptAt',j.next_attempt_at,'failureCode',j.failure_code,'createdAt',j.created_at,'updatedAt',j.updated_at,'acceptedAt',j.accepted_at,
 'events',(select coalesce(jsonb_agg(jsonb_build_object('event',e.event,'attempt',e.attempt,'code',e.code,'at',e.occurred_at,'reason',e.reason) order by e.occurred_at desc),'[]'::jsonb)
 from (select event,attempt,code,occurred_at,reason from rhh_private.inquiry_email_events where job_id=j.id order by occurred_at desc limit 10) e)
 ) order by j.created_at desc,j.id desc) from (select * from items order by created_at desc,id desc limit 20) j),'[]'::jsonb)) into result;
 return result;
end $$;
alter function rhh_private.admin_inquiry_email_jobs(integer) owner to rhh_admin_writer;
revoke all on function rhh_private.admin_inquiry_email_jobs(integer) from public,anon,authenticated;
grant execute on function rhh_private.admin_inquiry_email_jobs(integer) to authenticated;
create function public.rhh_admin_inquiry_email_jobs(page_number integer default 1) returns jsonb language sql security invoker set search_path='' as $$ select rhh_private.admin_inquiry_email_jobs(page_number) $$;
revoke all on function public.rhh_admin_inquiry_email_jobs(integer) from public,anon,authenticated;
grant execute on function public.rhh_admin_inquiry_email_jobs(integer) to authenticated;
create function rhh_private.retry_inquiry_email(target uuid,expected_version integer,reason text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid; j record; changed uuid; begin
 actor:=rhh_private.require_admin();
 if reason is null or length(btrim(reason)) not between 3 and 300 or expected_version is null or expected_version<1
 then raise exception using errcode='22023',message='invalid_notification_retry'; end if;
 select id,state,attempts,manual_retries,version,created_at,has_uncertain_send into j from rhh_private.inquiry_email_jobs where id=target;
 if j.id is null then raise exception using errcode='PT404',message='notification_unavailable'; end if;
 if j.version<>expected_version or j.state<>'failed' or j.has_uncertain_send or j.manual_retries>=2 or j.created_at<=clock_timestamp()-interval '24 hours'
 then raise exception using errcode='PT409',message='notification_retry_unavailable'; end if;
 update rhh_private.inquiry_email_jobs set state='retry',manual_retries=manual_retries+1,next_attempt_at=clock_timestamp(),updated_at=clock_timestamp(),version=version+1 where id=j.id and version=expected_version and state='failed' and not has_uncertain_send and manual_retries<2 returning id into changed;
 if changed is null then raise exception using errcode='PT409',message='notification_retry_unavailable'; end if;
 insert into rhh_private.inquiry_email_events(job_id,event,attempt,actor_id,reason) values(j.id,'manual_retry',j.attempts,actor,btrim(reason));
 return jsonb_build_object('queued',true);
end $$;
alter function rhh_private.retry_inquiry_email(uuid,integer,text) owner to rhh_admin_writer;
revoke all on function rhh_private.retry_inquiry_email(uuid,integer,text) from public,anon,authenticated;
grant execute on function rhh_private.retry_inquiry_email(uuid,integer,text) to authenticated;
create function public.rhh_retry_inquiry_email(target uuid,expected_version integer,reason text) returns jsonb language sql security invoker set search_path='' as $$ select rhh_private.retry_inquiry_email(target,expected_version,reason) $$;
revoke all on function public.rhh_retry_inquiry_email(uuid,integer,text) from public,anon,authenticated;
grant execute on function public.rhh_retry_inquiry_email(uuid,integer,text) to authenticated;
revoke create on schema rhh_private from rhh_notification_worker,rhh_admin_writer;
notify pgrst,'reload schema';
commit;
