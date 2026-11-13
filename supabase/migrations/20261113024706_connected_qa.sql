begin;
create role rhh_qa_writer nologin noinherit nobypassrls;
grant rhh_qa_writer to postgres;
grant usage on schema rhh,rhh_private to rhh_qa_writer;
grant create on schema rhh_private to rhh_qa_writer,rhh_public_reader;
grant execute on function rhh_private.confirmed_user_id(),rhh_private.request_user_id() to rhh_qa_writer;
alter table rhh.answers add column author_account_id uuid references rhh.accounts(user_id),add column attribution_snapshot text not null default '',add column version integer not null default 1 check(version>0),add column queue_position bigint generated always as identity,add column updated_at timestamptz not null default clock_timestamp();
create index answers_queue_idx on rhh.answers(question_id,queue_position);
create index answers_owner_idx on rhh.answers(author_account_id);
create table rhh_private.qa_requests(request_id uuid primary key,content_hash text not null,question_id uuid not null references rhh.questions(id),expires_at timestamptz not null);
create index qa_requests_hash_idx on rhh_private.qa_requests(content_hash,expires_at);
create index qa_requests_expiry_idx on rhh_private.qa_requests(expires_at);
create table rhh_private.qa_limits(key text primary key,attempts integer not null check(attempts>0),expires_at timestamptz not null);
create index qa_limits_expiry_idx on rhh_private.qa_limits(expires_at);
create table rhh_private.qa_abuse_config(singleton boolean primary key default true check(singleton),secret text not null);
insert into rhh_private.qa_abuse_config(secret) values(gen_random_uuid()::text||gen_random_uuid()::text);
create table rhh_private.qa_answer_revisions(answer_id uuid not null references rhh.answers(id),version integer not null,body text not null,recorded_at timestamptz not null default clock_timestamp(),primary key(answer_id,version));
create table rhh_private.category_alert_events(id uuid primary key default gen_random_uuid(),event_type text not null check(event_type='qa.question_published'),question_id uuid not null references rhh.questions(id),recipient_id uuid not null references rhh.accounts(user_id),professional_id uuid not null references rhh.professionals(id),recipient_email text not null,created_at timestamptz not null default clock_timestamp(),state text not null default 'pending_configuration' check(state in ('pending_configuration','canceled')),unique(event_type,question_id,recipient_id));
create index category_alert_recipient_idx on rhh_private.category_alert_events(recipient_id);
create index category_alert_professional_idx on rhh_private.category_alert_events(professional_id);
do $$ declare t text;begin foreach t in array array['qa_requests','qa_limits','qa_abuse_config','qa_answer_revisions','category_alert_events'] loop execute format('alter table rhh_private.%I enable row level security',t);execute format('alter table rhh_private.%I force row level security',t);execute format('revoke all on rhh_private.%I from public,anon,authenticated',t);end loop;end $$;
grant select,insert,delete on rhh_private.qa_requests to rhh_qa_writer;
grant select,insert,update,delete on rhh_private.qa_limits to rhh_qa_writer;
grant select(secret) on rhh_private.qa_abuse_config to rhh_qa_writer;
create policy qa_request_writer on rhh_private.qa_requests to rhh_qa_writer using(true) with check(true);
create policy qa_limit_writer on rhh_private.qa_limits to rhh_qa_writer using(true) with check(true);
create policy qa_abuse_writer on rhh_private.qa_abuse_config for select to rhh_qa_writer using(true);
grant select(id,title,body,category_id,status) on rhh.questions to rhh_qa_writer,rhh_public_reader;
grant insert(id,title,body,category_id) on rhh.questions to rhh_qa_writer;
create policy qa_public_questions on rhh.questions for select to rhh_qa_writer,rhh_public_reader using(status='published');
create policy qa_submit_question on rhh.questions for insert to rhh_qa_writer with check(status='pending');
grant select(id,name,active) on rhh.categories to rhh_qa_writer;
create policy qa_catalog on rhh.categories for select to rhh_qa_writer using(true);
grant select(id,question_id,body,status) on rhh.answers to rhh_public_reader;
create policy qa_public_answers on rhh.answers for select to rhh_public_reader using(status='published' and exists(select 1 from rhh.questions q where q.id=question_id and q.status='published'));
grant select(id,question_id,professional_id,author_account_id,body,status,version,queue_position,created_at,updated_at),insert(id,question_id,professional_id,author_account_id,attribution_snapshot,body),update(body,version,queue_position,updated_at) on rhh.answers to rhh_qa_writer;
grant usage on sequence rhh.answers_queue_position_seq to rhh_qa_writer;
create policy qa_own_answer on rhh.answers for select to rhh_qa_writer using(author_account_id=(select rhh_private.request_user_id()));
create policy qa_insert_answer on rhh.answers for insert to rhh_qa_writer with check(status='pending' and author_account_id=(select rhh_private.request_user_id()));
create policy qa_edit_answer on rhh.answers for update to rhh_qa_writer using(status='pending' and author_account_id=(select rhh_private.request_user_id())) with check(status='pending' and author_account_id=(select rhh_private.request_user_id()));
-- Validated identity/role and existing listing relationship, not editable metadata.
create function rhh_private.qa_participant() returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=rhh_private.confirmed_user_id();pid uuid;business text;begin
 perform 1 from rhh.accounts where user_id=uid and role='member' for share;
 if not found then raise exception using errcode='42501',message='member_required';end if;
 select p.id,p.business_name into pid,business from rhh.professionals p join rhh.applications a on a.professional_id=p.id join rhh.memberships m on m.professional_id=p.id where p.owner_id=uid and a.approval='approved' and m.status='active' and not a.suspended for share of p,a,m;
 if pid is null then return null;end if;
 return jsonb_build_object('id',pid,'businessName',business,'categoryIds',(select coalesce(jsonb_agg(category_id),'[]') from rhh.professional_categories where professional_id=pid));
end $$;
revoke all on function rhh_private.qa_participant() from public,anon,authenticated;
grant execute on function rhh_private.qa_participant() to rhh_qa_writer;
create function rhh_private.submit_question(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare rid uuid;hash text;previous rhh_private.qa_requests%rowtype;qid uuid;lim text;n integer;cat text;title_text text;body_text text;begin
 if jsonb_typeof(payload) is distinct from 'object' or (select count(*) from jsonb_object_keys(payload))<>4 or exists(select 1 from jsonb_object_keys(payload) k where k not in ('requestId','title','body','categoryId')) then raise exception using errcode='22023',message='invalid_question';end if;
 if jsonb_typeof(payload->'requestId') is distinct from 'string' or jsonb_typeof(payload->'title') is distinct from 'string' or jsonb_typeof(payload->'body') is distinct from 'string' or jsonb_typeof(payload->'categoryId') is distinct from 'string' then raise exception using errcode='22023',message='invalid_question';end if;
 begin rid:=(payload->>'requestId')::uuid;exception when invalid_text_representation then raise exception using errcode='22023',message='invalid_question';end;
 cat:=payload->>'categoryId';title_text:=regexp_replace(payload->>'title','^[[:space:]]+|[[:space:]]+$','','g');body_text:=regexp_replace(payload->>'body','^[[:space:]]+|[[:space:]]+$','','g');
 if length(cat) not between 1 and 80 or length(title_text) not between 10 and 160 or length(body_text) not between 20 and 2000 then raise exception using errcode='22023',message='invalid_question';end if;
 select encode(sha256(convert_to(secret||jsonb_build_array(cat,lower(regexp_replace(title_text,'[[:space:]]+',' ','g')),lower(regexp_replace(body_text,'[[:space:]]+',' ','g')))::text,'UTF8')),'hex') into hash from rhh_private.qa_abuse_config;
 perform pg_advisory_xact_lock(hashtextextended('qa-request:'||rid::text,0));
 select * into previous from rhh_private.qa_requests where request_id=rid and expires_at>clock_timestamp();
 if previous.request_id is not null then
  if previous.content_hash<>hash then raise exception using errcode='PT409',message='question_request_conflict';end if;
  return jsonb_build_object('saved',true,'status','pending');
 end if;
 if not exists(select 1 from rhh.categories where id=cat and active) then raise exception using errcode='22023',message='invalid_question_category';end if;
 delete from rhh_private.qa_requests where expires_at<=clock_timestamp();delete from rhh_private.qa_limits where expires_at<=clock_timestamp();
 -- Fixed global/category order prevents quota races and deadlocks. No untrusted IPs.
 foreach lim in array array['global:'||floor(extract(epoch from clock_timestamp())/3600)::text,'category:'||cat||':'||floor(extract(epoch from clock_timestamp())/3600)::text] loop
  insert into rhh_private.qa_limits(key,attempts,expires_at) values(lim,1,clock_timestamp()+interval '1 hour') on conflict(key) do update set attempts=rhh_private.qa_limits.attempts+1 where rhh_private.qa_limits.attempts<case when lim like 'global:%' then 100 else 20 end returning attempts into n;
  if n is null then raise exception using errcode='PT429',message='question_limit';end if;
 end loop;
 perform pg_advisory_xact_lock(hashtextextended('qa-content:'||hash,0));
 select question_id into qid from rhh_private.qa_requests where content_hash=hash and expires_at>clock_timestamp() limit 1;
 if qid is null then qid:=gen_random_uuid();insert into rhh.questions(id,category_id,title,body) values(qid,cat,title_text,body_text);end if;
 insert into rhh_private.qa_requests(request_id,content_hash,question_id,expires_at) values(rid,hash,qid,clock_timestamp()+interval '24 hours') on conflict(request_id) do update set content_hash=excluded.content_hash,question_id=excluded.question_id,expires_at=excluded.expires_at;
 return jsonb_build_object('saved',true,'status','pending');
end $$;
-- INSERT-only receipt changes stay private to this narrowly scoped function.
grant update on rhh_private.qa_requests to rhh_qa_writer;
alter function rhh_private.submit_question(jsonb) owner to rhh_qa_writer;
revoke all on function rhh_private.submit_question(jsonb) from public,anon,authenticated;
grant execute on function rhh_private.submit_question(jsonb) to anon,authenticated;
create function public.rhh_submit_question(payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select rhh_private.submit_question(payload)$$;
revoke all on function public.rhh_submit_question(jsonb) from public,anon,authenticated;
grant execute on function public.rhh_submit_question(jsonb) to anon,authenticated;
create function rhh_private.qa_public_author(target uuid) returns jsonb language sql security definer set search_path='' as $$
 select case when p.owner_id=a.author_account_id and app.approval='approved' and m.status='active' and not app.suspended then jsonb_build_object('attribution',p.business_name,'profileHref','/professionals/'||p.id::text) else jsonb_build_object('attribution',a.attribution_snapshot) end from rhh.answers a join rhh.questions q on q.id=a.question_id join rhh.professionals p on p.id=a.professional_id join rhh.applications app on app.professional_id=p.id join rhh.memberships m on m.professional_id=p.id where a.id=target and a.status='published' and q.status='published'
$$;
revoke all on function rhh_private.qa_public_author(uuid) from public,anon,authenticated;
grant execute on function rhh_private.qa_public_author(uuid) to rhh_public_reader;
create function rhh_private.public_qa(target uuid) returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object('catalog',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'active',active) order by id),'[]') from rhh.categories), 'questions',(select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'title',q.title,'body',q.body,'categoryId',q.category_id,'answers',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'body',a.body)||rhh_private.qa_public_author(a.id) order by a.id),'[]') from rhh.answers a where a.question_id=q.id and a.status='published')) order by q.title,q.id),'[]') from rhh.questions q where q.status='published' and (target is null or q.id=target)))
$$;
alter function rhh_private.public_qa(uuid) owner to rhh_public_reader;
revoke all on function rhh_private.public_qa(uuid) from public,anon,authenticated;
grant execute on function rhh_private.public_qa(uuid) to anon,authenticated;
create function public.rhh_public_qa(target uuid default null) returns jsonb language sql security invoker set search_path='' as $$select rhh_private.public_qa(target)$$;
revoke all on function public.rhh_public_qa(uuid) from public,anon,authenticated;
grant execute on function public.rhh_public_qa(uuid) to anon,authenticated;
create function rhh_private.member_qa(target uuid,page_number integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare participant jsonb:=rhh_private.qa_participant();uid uuid:=rhh_private.confirmed_user_id();begin
 if page_number is null or page_number not between 1 and 10000 then raise exception using errcode='22023',message='invalid_qa_page';end if;
 if participant is null then return jsonb_build_object('eligible',false,'catalog','[]'::jsonb,'questions','[]'::jsonb,'question',null,'answers','[]'::jsonb,'page',page_number,'hasNext',false);end if;
 return jsonb_build_object('eligible',true,'page',page_number,'catalog',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'active',active) order by id),'[]') from rhh.categories where participant->'categoryIds' ? id),
 'questions',(select coalesce(jsonb_agg(x.item order by x.id),'[]') from (select id,jsonb_build_object('id',id,'title',title,'categoryId',category_id) item from rhh.questions where status='published' and participant->'categoryIds' ? category_id order by id limit 10 offset (page_number-1)*10) x),
 'hasNext',(select count(*)>(page_number*10) from rhh.questions where status='published' and participant->'categoryIds' ? category_id),
 'question',(select jsonb_build_object('id',id,'title',title,'body',body,'categoryId',category_id) from rhh.questions where id=target and status='published' and participant->'categoryIds' ? category_id),
 'answers',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'questionId',question_id,'body',body,'status',status,'version',version) order by queue_position),'[]') from rhh.answers where author_account_id=uid and professional_id=(participant->>'id')::uuid and (target is null or question_id=target)));
end $$;
alter function rhh_private.member_qa(uuid,integer) owner to rhh_qa_writer;
revoke all on function rhh_private.member_qa(uuid,integer) from public,anon,authenticated;
grant execute on function rhh_private.member_qa(uuid,integer) to authenticated;
create function public.rhh_member_qa(target uuid default null,page_number integer default 1) returns jsonb language sql security invoker set search_path='' as $$select rhh_private.member_qa(target,page_number)$$;
revoke all on function public.rhh_member_qa(uuid,integer) from public,anon,authenticated;
grant execute on function public.rhh_member_qa(uuid,integer) to authenticated;
create function rhh_private.qa_lock_question(target uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare participant jsonb:=rhh_private.qa_participant();begin
 if participant is null then return false;end if;
 perform 1 from rhh.questions where id=target and status='published' and participant->'categoryIds' ? category_id for share;
 return found;
end $$;
revoke all on function rhh_private.qa_lock_question(uuid) from public,anon,authenticated;
grant execute on function rhh_private.qa_lock_question(uuid) to rhh_qa_writer;
create function rhh_private.submit_answer(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare participant jsonb:=rhh_private.qa_participant();uid uuid:=rhh_private.confirmed_user_id();qid uuid;pid uuid;body_text text;previous record;expected integer;editing boolean;lim text;n integer;begin
 if participant is null then raise exception using errcode='42501',message='qa_participation_required';end if;pid:=(participant->>'id')::uuid;
 if jsonb_typeof(payload) is distinct from 'object' or exists(select 1 from jsonb_object_keys(payload) k where k not in ('questionId','body','version')) or jsonb_typeof(payload->'questionId') is distinct from 'string' or jsonb_typeof(payload->'body') is distinct from 'string' then raise exception using errcode='22023',message='invalid_answer';end if;
 begin qid:=(payload->>'questionId')::uuid;expected:=(payload->>'version')::integer;exception when invalid_text_representation or numeric_value_out_of_range then raise exception using errcode='22023',message='invalid_answer';end;
 body_text:=regexp_replace(payload->>'body','^[[:space:]]+|[[:space:]]+$','','g');if length(body_text) not between 20 and 3000 then raise exception using errcode='22023',message='invalid_answer';end if;
 if not rhh_private.qa_lock_question(qid) then raise exception using errcode='PT404',message='question_unavailable';end if;
 -- Exclusive question advisory lock is shared with publication gate, independent of browser clocks.
 perform pg_advisory_xact_lock(hashtextextended('qa-answer:'||qid::text,0));
 select id,body,status,version,queue_position into previous from rhh.answers where question_id=qid and professional_id=pid and author_account_id=uid for update;
 editing:=payload ? 'version';
 if previous.id is not null then
  if previous.body=body_text and not editing then return jsonb_build_object('saved',true,'status',previous.status,'version',previous.version);end if;
  if not editing or previous.status<>'pending' or expected is null or expected<>previous.version then raise exception using errcode='PT409',message='stale_or_reviewed_answer';end if;
  if previous.body=body_text then return jsonb_build_object('saved',true,'status','pending','version',previous.version);end if;
 elsif editing then raise exception using errcode='PT409',message='answer_missing';end if;
 lim:='answer:'||uid::text||':'||floor(extract(epoch from clock_timestamp())/3600)::text;
 insert into rhh_private.qa_limits(key,attempts,expires_at) values(lim,1,clock_timestamp()+interval '1 hour') on conflict(key) do update set attempts=rhh_private.qa_limits.attempts+1 where rhh_private.qa_limits.attempts<10 returning attempts into n;
 if n is null then raise exception using errcode='PT429',message='answer_limit';end if;
 if previous.id is null then
  insert into rhh.answers(id,question_id,professional_id,author_account_id,attribution_snapshot,body) values(gen_random_uuid(),qid,pid,uid,participant->>'businessName',body_text);
  return jsonb_build_object('saved',true,'status','pending','version',1);
 end if;
 update rhh.answers set body=body_text,version=version+1,queue_position=default,updated_at=clock_timestamp() where id=previous.id;
 return jsonb_build_object('saved',true,'status','pending','version',previous.version+1);
end $$;
alter function rhh_private.submit_answer(jsonb) owner to rhh_qa_writer;
revoke all on function rhh_private.submit_answer(jsonb) from public,anon,authenticated;
grant execute on function rhh_private.submit_answer(jsonb) to authenticated;
create function public.rhh_submit_answer(payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select rhh_private.submit_answer(payload)$$;
revoke all on function public.rhh_submit_answer(jsonb) from public,anon,authenticated;
grant execute on function public.rhh_submit_answer(jsonb) to authenticated;
create function rhh_private.qa_answer_guard() returns trigger language plpgsql security definer set search_path='' as $$ begin
 perform pg_advisory_xact_lock(hashtextextended('qa-answer:'||new.question_id::text,0));
 if tg_op='UPDATE' and new.body is distinct from old.body then
  insert into rhh_private.qa_answer_revisions(answer_id,version,body) values(old.id,old.version,old.body);
 end if;
 if new.status='published' then
  if not exists(select 1 from rhh.questions where id=new.question_id and status='published')
   or exists(select 1 from rhh.answers where question_id=new.question_id and id<>new.id and status='published')
   or exists(select 1 from rhh.answers where question_id=new.question_id and id<>new.id and status<>'rejected' and queue_position<new.queue_position)
   then raise exception using errcode='PT409',message='first_response_required';end if;
 end if;
 return new;
end $$;
revoke all on function rhh_private.qa_answer_guard() from public,anon,authenticated;
create trigger qa_answer_gate before insert or update on rhh.answers for each row execute function rhh_private.qa_answer_guard();
create function rhh_private.record_category_alert() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if new.status='published' and (tg_op='INSERT' or old.status is distinct from 'published') then
  insert into rhh_private.category_alert_events(event_type,question_id,recipient_id,professional_id,recipient_email)
  select 'qa.question_published',new.id,p.owner_id,p.id,u.email from rhh.professionals p join rhh.applications a on a.professional_id=p.id join rhh.memberships m on m.professional_id=p.id join rhh.professional_categories pc on pc.professional_id=p.id join rhh.accounts ac on ac.user_id=p.owner_id join auth.users u on u.id=ac.user_id where pc.category_id=new.category_id and a.approval='approved' and m.status='active' and not a.suspended and ac.role='member' and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) and u.deleted_at is null and (u.banned_until is null or u.banned_until<=clock_timestamp()) and u.email is not null on conflict(event_type,question_id,recipient_id) do nothing;
 end if;return new;
end $$;
revoke all on function rhh_private.record_category_alert() from public,anon,authenticated;
create trigger qa_category_alert after insert or update of status on rhh.questions for each row execute function rhh_private.record_category_alert();
revoke create on schema rhh_private from rhh_qa_writer,rhh_public_reader;
notify pgrst,'reload schema';
commit;
