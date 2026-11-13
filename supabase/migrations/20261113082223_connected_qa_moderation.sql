begin;
grant create on schema rhh_private to rhh_admin_writer;
alter table rhh.questions add column version integer not null default 1 check(version>0),add column updated_at timestamptz not null default clock_timestamp();
create table rhh_private.qa_decisions(
 id uuid primary key default gen_random_uuid(),question_id uuid not null references rhh.questions(id),answer_id uuid references rhh.answers(id),version integer not null,parent_version integer not null,action text not null check(action in ('publish','reject','hide','restore')),previous_status text not null,next_status text not null,actor_id uuid not null references rhh.accounts(user_id),reason text not null check(length(reason) between 3 and 300),note text not null check(length(note)<=500),body_snapshot text not null,title_snapshot text not null,created_at timestamptz not null default clock_timestamp());
create unique index qa_question_decision_version on rhh_private.qa_decisions(question_id,version) where answer_id is null;
create unique index qa_answer_decision_version on rhh_private.qa_decisions(answer_id,version) where answer_id is not null;
create index qa_decisions_actor_idx on rhh_private.qa_decisions(actor_id);
create table rhh_private.qa_moderation_events(
 id uuid primary key default gen_random_uuid(),decision_id uuid not null references rhh_private.qa_decisions(id),event_type text not null check(event_type in ('qa.question_rejected','qa.answer_published','qa.answer_rejected')),question_id uuid not null references rhh.questions(id),answer_id uuid references rhh.answers(id),recipient_id uuid references rhh.accounts(user_id),professional_id uuid references rhh.professionals(id),recipient_email text,recipient_key text not null,state text not null check(state in ('pending_configuration','canceled')),created_at timestamptz not null default clock_timestamp(),unique(decision_id,event_type,recipient_key));
create index qa_mod_event_question_idx on rhh_private.qa_moderation_events(question_id);
create index qa_mod_event_answer_idx on rhh_private.qa_moderation_events(answer_id);
create index qa_mod_event_recipient_idx on rhh_private.qa_moderation_events(recipient_id);
create index qa_mod_event_professional_idx on rhh_private.qa_moderation_events(professional_id);
alter table rhh_private.qa_decisions enable row level security;alter table rhh_private.qa_decisions force row level security;
alter table rhh_private.qa_moderation_events enable row level security;alter table rhh_private.qa_moderation_events force row level security;
revoke all on rhh_private.qa_decisions,rhh_private.qa_moderation_events from public,anon,authenticated;
grant select,insert on rhh_private.qa_decisions to rhh_admin_writer;
create policy qa_decision_read on rhh_private.qa_decisions for select to rhh_admin_writer using((select rhh_private.is_admin()));
create policy qa_decision_write on rhh_private.qa_decisions for insert to rhh_admin_writer with check((select rhh_private.is_admin()) and actor_id=(select rhh_private.request_user_id()));
-- Events are closed to all request executors. A narrow current-admin function writes routing snapshots.
grant select(id,category_id,title,body,status,version,moderation_note,created_at,updated_at),update(status,version,moderation_note,updated_at) on rhh.questions to rhh_admin_writer;
grant select(id,question_id,professional_id,author_account_id,attribution_snapshot,body,status,version,queue_position,moderation_note,created_at,updated_at),update(status,version,queue_position,moderation_note,updated_at) on rhh.answers to rhh_admin_writer;
grant usage on sequence rhh.answers_queue_position_seq to rhh_admin_writer;
create policy qa_admin_questions on rhh.questions to rhh_admin_writer using((select rhh_private.is_admin())) with check((select rhh_private.is_admin()));
create policy qa_admin_answers on rhh.answers to rhh_admin_writer using((select rhh_private.is_admin())) with check((select rhh_private.is_admin()));
-- Canonical order for member edits and all moderation: participant/listing, question
-- row, question advisory lock, answer row. Parent versions also cover child edits.
create or replace function rhh_private.qa_lock_question(target uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare participant jsonb:=rhh_private.qa_participant();begin
 if participant is null then return false;end if;
 perform 1 from rhh.questions where id=target and status='published' and participant->'categoryIds' ? category_id for update;return found;
end $$;
do $patch$ declare d text;old text;begin
 d:=pg_get_functiondef('rhh_private.qa_answer_guard()'::regprocedure);
 old:='if tg_op=''UPDATE'' and new.body is distinct from old.body then';
 if position(old in d)=0 then raise exception 'Unexpected answer revision guard';end if;
 execute replace(d,old,old||$guard$
  new.status:='pending';new.version:=old.version+1;new.updated_at:=clock_timestamp();
  if new.queue_position=old.queue_position then new.queue_position:=nextval('rhh.answers_queue_position_seq'::regclass);end if;
 $guard$);
end $patch$;
create function rhh_private.qa_question_version() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.title is distinct from old.title or new.body is distinct from old.body or new.category_id is distinct from old.category_id then new.status:='pending';end if;
 new.version:=old.version+1;new.updated_at:=clock_timestamp();return new;
end $$;
revoke all on function rhh_private.qa_question_version() from public,anon,authenticated;
create trigger qa_question_version before update on rhh.questions for each row execute function rhh_private.qa_question_version();
create function rhh_private.qa_child_version() returns trigger language plpgsql security definer set search_path='' as $$begin
 update rhh.questions set version=version+1 where id=new.question_id;return new;
end $$;
revoke all on function rhh_private.qa_child_version() from public,anon,authenticated;
create trigger qa_child_version after insert or update on rhh.answers for each row execute function rhh_private.qa_child_version();
create function rhh_private.qa_answer_eligible(target uuid) returns boolean language plpgsql security definer set search_path='' as $$begin
 perform rhh_private.require_admin();
 perform 1 from rhh.answers x join rhh.professionals p on p.id=x.professional_id join rhh.applications a on a.professional_id=p.id join rhh.memberships m on m.professional_id=p.id join rhh.accounts ac on ac.user_id=x.author_account_id join auth.users u on u.id=ac.user_id join rhh.questions q on q.id=x.question_id where x.id=target and p.owner_id=x.author_account_id and ac.role='member' and a.approval='approved' and m.status='active' and not a.suspended and exists(select 1 from rhh.professional_categories pc where pc.professional_id=p.id and pc.category_id=q.category_id) and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) and u.deleted_at is null and (u.banned_until is null or u.banned_until<=clock_timestamp()) for share of p,a,m,ac;return found;
end $$;
revoke all on function rhh_private.qa_answer_eligible(uuid) from public,anon,authenticated;
grant execute on function rhh_private.qa_answer_eligible(uuid) to rhh_admin_writer;
create function rhh_private.qa_parent_status(target uuid) returns text language plpgsql security definer set search_path='' as $$
declare uid uuid:=rhh_private.confirmed_user_id();begin
 return (select q.status from rhh.questions q join rhh.answers a on a.question_id=q.id join rhh.professionals p on p.id=a.professional_id where a.id=target and a.author_account_id=uid and p.owner_id=uid);
end $$;
revoke all on function rhh_private.qa_parent_status(uuid) from public,anon,authenticated;
grant execute on function rhh_private.qa_parent_status(uuid) to rhh_qa_writer;
do $$ declare d text;old text;begin
 d:=pg_get_functiondef('rhh_private.member_qa(uuid,integer)'::regprocedure);old:=$needle$'status',status,'version',version)$needle$;
 if position(old in d)=0 then raise exception 'Unexpected member answer projection';end if;
 execute replace(d,old,$replacement$'status',status,'version',version,'parentStatus',rhh_private.qa_parent_status(id))$replacement$);
end $$;
create function rhh_private.qa_record_moderation_event(decision uuid) returns void language plpgsql security definer set search_path='' as $$
declare d rhh_private.qa_decisions%rowtype;uid uuid;pid uuid;mail text;event text;begin
 perform rhh_private.require_admin();select * into d from rhh_private.qa_decisions where id=decision;
 if d.id is null then raise exception using errcode='PT404',message='decision_unavailable';end if;
 if d.answer_id is null then
  if d.next_status<>'rejected' then return;end if;event:='qa.question_rejected';
 else
  if d.next_status not in ('published','rejected') then return;end if;
  event:=case when d.next_status='published' then 'qa.answer_published' else 'qa.answer_rejected' end;
  select ac.user_id,p.id,u.email into uid,pid,mail from rhh.answers x join rhh.professionals p on p.id=x.professional_id join rhh.accounts ac on ac.user_id=x.author_account_id join auth.users u on u.id=ac.user_id where x.id=d.answer_id and p.owner_id=x.author_account_id and ac.role='member' and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) and u.deleted_at is null and (u.banned_until is null or u.banned_until<=clock_timestamp()) and u.email is not null;
 end if;
 insert into rhh_private.qa_moderation_events(decision_id,event_type,question_id,answer_id,recipient_id,professional_id,recipient_email,recipient_key,state) values(d.id,event,d.question_id,d.answer_id,uid,pid,mail,coalesce('account:'||uid::text,'unroutable:'||coalesce(d.answer_id,d.question_id)::text),case when uid is null then 'canceled' else 'pending_configuration' end) on conflict(decision_id,event_type,recipient_key) do nothing;
end $$;
revoke all on function rhh_private.qa_record_moderation_event(uuid) from public,anon,authenticated;
grant execute on function rhh_private.qa_record_moderation_event(uuid) to rhh_admin_writer;
create function rhh_private.moderate_qa(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=rhh_private.require_admin();kind text;target uuid;expected integer;parent_expected integer;act text;why text;memo text;qid uuid;q record;r record;next_status text;did uuid;eligible boolean;begin
 if jsonb_typeof(payload) is distinct from 'object' or (select count(*) from jsonb_object_keys(payload))<>7 or exists(select 1 from jsonb_object_keys(payload) k where k not in ('kind','id','version','parentVersion','action','reason','note')) then raise exception using errcode='22023',message='invalid_qa_decision';end if;
 kind:=payload->>'kind';act:=payload->>'action';why:=btrim(payload->>'reason');memo:=btrim(payload->>'note');
 if kind is null or kind not in ('question','answer') or act is null or act not in ('publish','reject','hide','restore') or jsonb_typeof(payload->'reason') is distinct from 'string' or length(why) not between 3 and 300 or jsonb_typeof(payload->'note') is distinct from 'string' or length(memo)>500 then raise exception using errcode='22023',message='invalid_qa_decision';end if;
 begin target:=(payload->>'id')::uuid;expected:=(payload->>'version')::integer;parent_expected:=(payload->>'parentVersion')::integer;exception when invalid_text_representation or numeric_value_out_of_range then raise exception using errcode='22023',message='invalid_qa_decision';end;
 if kind='answer' then select question_id into qid from rhh.answers where id=target;eligible:=rhh_private.qa_answer_eligible(target);else qid:=target;end if;
 select id,title,body,status,version into q from rhh.questions where id=qid for update;
 if q.id is null then raise exception using errcode='PT404',message='qa_record_unavailable';end if;
 perform pg_advisory_xact_lock(hashtextextended('qa-answer:'||qid::text,0));
 if kind='answer' then select id,body,status,version into r from rhh.answers where id=target and question_id=qid for update;
 else select q.id id,q.body body,q.status status,q.version version into r;end if;
 if r.id is null then raise exception using errcode='PT404',message='qa_record_unavailable';end if;
 if expected is null or expected<>r.version or (kind='answer' and (parent_expected is null or parent_expected<>q.version)) or (kind='question' and parent_expected is not null) then raise exception using errcode='PT409',message='stale_qa_decision';end if;
 if (act='publish' and r.status<>'pending') or (act='reject' and r.status not in ('pending','published','hidden')) or (act='hide' and r.status<>'published') or (act='restore' and r.status not in ('hidden','rejected')) then raise exception using errcode='PT409',message='invalid_qa_transition';end if;
 if kind='answer' and act='publish' and not eligible then raise exception using errcode='PT409',message='answer_author_unavailable';end if;
 next_status:=case act when 'publish' then 'published' when 'reject' then 'rejected' when 'hide' then 'hidden' else 'pending' end;
 if kind='question' then update rhh.questions set status=next_status,moderation_note=memo where id=target;
 else update rhh.answers set status=next_status,moderation_note=memo,version=version+1,updated_at=clock_timestamp() where id=target;
  if act='restore' then update rhh.answers set queue_position=default where id=target;end if;
 end if;
 insert into rhh_private.qa_decisions(question_id,answer_id,version,parent_version,action,previous_status,next_status,actor_id,reason,note,body_snapshot,title_snapshot) values(qid,case when kind='answer' then target end,r.version+1,q.version,act,r.status,next_status,actor,why,memo,r.body,q.title) returning id into did;
 perform rhh_private.qa_record_moderation_event(did);
 return jsonb_build_object('saved',true,'status',next_status,'version',r.version+1);
end $$;
alter function rhh_private.moderate_qa(jsonb) owner to rhh_admin_writer;
revoke all on function rhh_private.moderate_qa(jsonb) from public,anon,authenticated;
grant execute on function rhh_private.moderate_qa(jsonb) to authenticated;
create function public.rhh_moderate_qa(payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select rhh_private.moderate_qa(payload)$$;
revoke all on function public.rhh_moderate_qa(jsonb) from public,anon,authenticated;grant execute on function public.rhh_moderate_qa(jsonb) to authenticated;
create function rhh_private.qa_admin_item(kind text,target uuid) returns jsonb language plpgsql security invoker set search_path='' as $$declare result jsonb;begin
 if kind='question' then
 select jsonb_build_object('kind',kind,'id',q.id,'questionId',q.id,'title',q.title,'body',q.body,'categoryId',q.category_id,'status',q.status,'version',q.version,'parentStatus',q.status,'parentVersion',q.version,'note',q.moderation_note,'attribution','','answerCount',(select count(*) from rhh.answers where question_id=q.id),'canPublish',q.status='pending') into result from rhh.questions q where q.id=target;
 else
 select jsonb_build_object('kind',kind,'id',a.id,'questionId',q.id,'title',q.title,'body',a.body,'categoryId',q.category_id,'status',a.status,'version',a.version,'parentStatus',q.status,'parentVersion',q.version,'note',a.moderation_note,'attribution',a.attribution_snapshot,'answerCount',0,'canPublish',a.status='pending' and q.status='published' and rhh_private.qa_answer_eligible(a.id) and not exists(select 1 from rhh.answers x where x.question_id=q.id and x.id<>a.id and (x.status='published' or (x.status<>'rejected' and x.queue_position<a.queue_position)))) into result from rhh.answers a join rhh.questions q on q.id=a.question_id where a.id=target;
 end if;return result;
end $$;
alter function rhh_private.qa_admin_item(text,uuid) owner to rhh_admin_writer;
revoke all on function rhh_private.qa_admin_item(text,uuid) from public,anon,authenticated;
create function rhh_private.admin_qa(filters jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare queue text;state text;cat text;term text;page integer;target uuid;parent uuid;total integer;items jsonb;detail jsonb;begin
 perform rhh_private.require_admin();
 if jsonb_typeof(filters) is distinct from 'object' or exists(select 1 from jsonb_object_keys(filters) k where k not in ('queue','status','category','q','page','id','parent')) then raise exception using errcode='22023',message='invalid_qa_filters';end if;
 queue:=coalesce(filters->>'queue','questions');state:=coalesce(filters->>'status','pending');cat:=coalesce(filters->>'category','');term:=btrim(coalesce(filters->>'q',''));
 begin page:=coalesce((filters->>'page')::integer,1);target:=(filters->>'id')::uuid;parent:=(filters->>'parent')::uuid;exception when invalid_text_representation or numeric_value_out_of_range then raise exception using errcode='22023',message='invalid_qa_filters';end;
 if queue not in ('questions','answers') or state not in ('all','pending','published','hidden','rejected') or length(cat)>80 or length(term)>120 or page not between 1 and 10000 then raise exception using errcode='22023',message='invalid_qa_filters';end if;
 with candidates as(select q.id,q.title,q.body,q.status,q.category_id,q.id question_id,q.created_at from rhh.questions q where queue='questions' union all select a.id,q.title,a.body,a.status,q.category_id,q.id,a.created_at from rhh.answers a join rhh.questions q on q.id=a.question_id where queue='answers'),matching as(select * from candidates where (state='all' or status=state) and (cat='' or category_id=cat) and (parent is null or question_id=parent) and (term='' or position(lower(term) in lower(title||' '||body))>0)),paged as(select * from matching order by created_at,id limit 20 offset (page-1)*20)
 select (select count(*) from matching),coalesce(jsonb_agg(rhh_private.qa_admin_item(case queue when 'questions' then 'question' else 'answer' end,id) order by created_at,id),'[]') into total,items from paged;
 if target is not null then
 detail:=rhh_private.qa_admin_item(case queue when 'questions' then 'question' else 'answer' end,target);
 if detail is null then raise exception using errcode='PT404',message='qa_record_unavailable';end if;
 detail:=detail||jsonb_build_object('history',(select coalesce(jsonb_agg(jsonb_build_object('version',d.version,'action',d.action,'previousStatus',d.previous_status,'nextStatus',d.next_status,'actorId',d.actor_id,'reason',d.reason,'note',d.note,'body',d.body_snapshot,'title',d.title_snapshot,'at',d.created_at) order by d.created_at desc,d.id),'[]') from rhh_private.qa_decisions d where (queue='questions' and d.question_id=target and d.answer_id is null) or (queue='answers' and d.answer_id=target)));
 end if;
 return jsonb_build_object('queue',queue,'page',page,'hasNext',total>page*20,'total',total,'items',items,'detail',detail,'catalog',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name) order by id),'[]') from rhh.categories),'counts',jsonb_build_object('questions',(select count(*) from rhh.questions),'answers',(select count(*) from rhh.answers),'pendingQuestions',(select count(*) from rhh.questions where status='pending'),'pendingAnswers',(select count(*) from rhh.answers where status='pending')));
end $$;
alter function rhh_private.admin_qa(jsonb) owner to rhh_admin_writer;
revoke all on function rhh_private.admin_qa(jsonb) from public,anon,authenticated;grant execute on function rhh_private.admin_qa(jsonb) to authenticated;
create function public.rhh_admin_qa(filters jsonb default '{}'::jsonb) returns jsonb language sql security invoker set search_path='' as $$select rhh_private.admin_qa(filters)$$;
revoke all on function public.rhh_admin_qa(jsonb) from public,anon,authenticated;grant execute on function public.rhh_admin_qa(jsonb) to authenticated;
revoke create on schema rhh_private from rhh_admin_writer;
notify pgrst,'reload schema';commit;
