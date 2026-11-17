begin;
-- Names are mutable; existing IDs, prices, billing keys and relationships are not.
alter table rhh.categories add column description text not null default '' check(length(description)<=300);
create unique index category_comparable_name_idx on rhh.categories
 ((regexp_replace(lower(normalize(name,NFKC)),'[^[:alnum:]]','','g')));
create table rhh_private.category_catalog_state(singleton boolean primary key default true check(singleton),version integer not null default 1 check(version>0));
insert into rhh_private.category_catalog_state(singleton) values(true);
create table rhh_private.category_changes(
 id uuid primary key default gen_random_uuid(),category_id text not null references rhh.categories(id) on delete restrict,
 actor_id uuid not null references rhh.accounts(user_id) on delete restrict,action text not null check(action in ('create','rename')),
 reason text not null check(length(reason) between 3 and 300),previous_name text,new_name text not null,
 version integer not null unique check(version>1),at timestamptz not null default clock_timestamp());
alter table rhh_private.category_catalog_state enable row level security;alter table rhh_private.category_catalog_state force row level security;
alter table rhh_private.category_changes enable row level security;alter table rhh_private.category_changes force row level security;
revoke all on rhh_private.category_catalog_state,rhh_private.category_changes from public,anon,authenticated;
grant select,update(version) on rhh_private.category_catalog_state to rhh_admin_writer;
grant select,insert on rhh_private.category_changes to rhh_admin_writer;
create policy category_revision_admin on rhh_private.category_catalog_state to rhh_admin_writer using((select rhh_private.is_admin())) with check((select rhh_private.is_admin()));
create policy category_history_read on rhh_private.category_changes for select to rhh_admin_writer using((select rhh_private.is_admin()));
create policy category_history_insert on rhh_private.category_changes for insert to rhh_admin_writer with check((select rhh_private.is_admin()) and actor_id=(select rhh_private.request_user_id()));
grant select(id,name,monthly_usd,billing_key,active,description),insert(id,name,monthly_usd,billing_key,active,description),update(name) on rhh.categories to rhh_admin_writer;
create policy category_admin_read on rhh.categories for select to rhh_admin_writer using((select rhh_private.is_admin()));
create policy category_admin_create on rhh.categories for insert to rhh_admin_writer with check((select rhh_private.is_admin()) and active);
create policy category_admin_rename on rhh.categories for update to rhh_admin_writer using((select rhh_private.is_admin())) with check((select rhh_private.is_admin()));
grant create on schema rhh_private to rhh_admin_writer,rhh_public_reader;
create function rhh_private.protect_category_configuration() returns trigger language plpgsql security invoker set search_path='' as $$begin
 if tg_op='DELETE' or new.id is distinct from old.id or new.monthly_usd is distinct from old.monthly_usd or new.billing_key is distinct from old.billing_key then raise exception using errcode='42501',message='category_configuration_immutable';end if;return new;end $$;
revoke all on function rhh_private.protect_category_configuration() from public,anon,authenticated;
create trigger protect_category_configuration before update or delete on rhh.categories for each row execute function rhh_private.protect_category_configuration();
create function rhh_private.category_history_immutable() returns trigger language plpgsql security invoker set search_path='' as $$begin raise exception using errcode='42501',message='category_history_immutable';end $$;
revoke all on function rhh_private.category_history_immutable() from public,anon,authenticated;
create trigger category_history_immutable before update or delete on rhh_private.category_changes for each row execute function rhh_private.category_history_immutable();

create function rhh_private.admin_categories(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=rhh_private.require_admin();rev integer;act text;cid text;label text;why text;before_name text;unchanged boolean:=false;begin
 if jsonb_typeof(payload) is distinct from 'object' then raise exception using errcode='22023',message='invalid_category';end if;
 act:=payload->>'action';
 if act='get' then
  if payload<>'{"action":"get"}'::jsonb then raise exception using errcode='22023',message='invalid_category';end if;
  select version into rev from rhh_private.category_catalog_state where singleton for share;
 elsif act in ('create','rename') then
  if jsonb_typeof(payload->'version') is distinct from 'number' or (payload->>'version') !~ '^[1-9][0-9]{0,8}$'
    or not(payload ?& array['action','id','name','version','reason'])
    or (act='rename' and payload-array['action','id','name','version','reason']<>'{}'::jsonb)
    or (act='create' and (not(payload ?& array['description','monthlyUsd','billingKey']) or payload-array['action','id','name','version','reason','description','monthlyUsd','billingKey']<>'{}'::jsonb))
    or jsonb_typeof(payload->'id') is distinct from 'string' or jsonb_typeof(payload->'name') is distinct from 'string' or jsonb_typeof(payload->'reason') is distinct from 'string' then raise exception using errcode='22023',message='invalid_category';end if;
  cid:=payload->>'id';label:=regexp_replace(trim(normalize(payload->>'name',NFKC)),'\s+',' ','g');why:=trim(payload->>'reason');
  if cid !~ '^[a-z][a-z0-9-]{1,79}$' or length(regexp_replace(payload->>'name', U&'[\+010000-\+10ffff]','xx','g'))>80 or length(regexp_replace(label, U&'[\+010000-\+10ffff]','xx','g')) not between 3 and 80 or (label ~ '[[:cntrl:]<>]' or label ~ U&'[\00ad\0600-\0605\061c\06dd\070f\0890-\0891\08e2\180e\200b-\200f\202a-\202e\2060-\2064\2066-\206f\feff\fff9-\fffb\+0110bd\+0110cd\+013430-\+01343f\+01bca0-\+01bca3\+01d173-\+01d17a\+0e0001\+0e0020-\+0e007f]') or regexp_replace(lower(label),'[^[:alnum:]]','','g')='' or length(why) not between 3 and 300 then raise exception using errcode='22023',message='invalid_category';end if;
  select version into rev from rhh_private.category_catalog_state where singleton for update;
  if (payload->>'version')::integer<>rev then raise exception using errcode='PT409',message='stale_category_catalog';end if;
  if exists(select 1 from rhh.categories where id<>cid and regexp_replace(lower(normalize(name,NFKC)),'[^[:alnum:]]','','g')=regexp_replace(lower(label),'[^[:alnum:]]','','g')) then raise exception using errcode='PT409',message='duplicate_category';end if;
  if act='create' then
   if (select count(*) from rhh.categories)>=32 then raise exception using errcode='22023',message='category_limit';end if;
   if jsonb_typeof(payload->'description') is distinct from 'string' or length(trim(payload->>'description')) not between 20 and 300
    or jsonb_typeof(payload->'monthlyUsd') is distinct from 'number' or (payload->>'monthlyUsd') !~ '^[1-9][0-9]{0,4}$' or (payload->>'monthlyUsd')::integer>10000
    or jsonb_typeof(payload->'billingKey') is distinct from 'string' or (payload->>'billingKey') !~ '^[a-z][a-z0-9_-]{1,79}$' then raise exception using errcode='22023',message='invalid_category_configuration';end if;
   insert into rhh.categories(id,name,description,monthly_usd,billing_key,active) values(cid,label,trim(payload->>'description'),(payload->>'monthlyUsd')::integer,payload->>'billingKey',true);
  else
   select name into before_name from rhh.categories where id=cid for update;
   if not found then raise exception using errcode='PT404',message='category_unavailable';end if;
   unchanged:=label=before_name;
   if not unchanged then update rhh.categories set name=label where id=cid;end if;
  end if;
  if not unchanged then
   update rhh_private.category_catalog_state set version=version+1 where singleton returning version into rev;
   insert into rhh_private.category_changes(category_id,actor_id,action,reason,previous_name,new_name,version) values(cid,actor,act,why,before_name,label,rev);
  end if;
 else raise exception using errcode='22023',message='invalid_category';end if;
 return jsonb_build_object('version',rev,'items',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'description',description,'monthlyUsd',monthly_usd,'billingKey',billing_key,'active',active) order by name,id),'[]') from rhh.categories),
 'history',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'categoryId',category_id,'actorId',actor_id,'action',action,'reason',reason,'previousName',previous_name,'name',new_name,'version',version,'at',at) order by version desc),'[]') from (select * from rhh_private.category_changes order by version desc limit 20) h))
 ||case when act='get' then '{}'::jsonb else jsonb_build_object('saved',true,'unchanged',unchanged) end;
exception when unique_violation then raise exception using errcode='PT409',message='duplicate_category';end $$;
alter function rhh_private.admin_categories(jsonb) owner to rhh_admin_writer;
revoke all on function rhh_private.admin_categories(jsonb) from public,anon,authenticated;grant execute on function rhh_private.admin_categories(jsonb) to authenticated;
create function public.rhh_admin_categories(payload jsonb default '{"action":"get"}') returns jsonb language sql security invoker set search_path='' as $$select rhh_private.admin_categories(payload)$$;
revoke all on function public.rhh_admin_categories(jsonb) from public,anon,authenticated;grant execute on function public.rhh_admin_categories(jsonb) to authenticated;

grant select(description) on rhh.categories to rhh_public_reader;
-- Preserve the established public category visibility and projection; no billing keys/history.
create function rhh_private.public_categories() returns jsonb language sql security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'description',description,'monthlyUsd',monthly_usd,'active',active) order by name,id),'[]') from rhh.categories
$$;
alter function rhh_private.public_categories() owner to rhh_public_reader;revoke all on function rhh_private.public_categories() from public;grant execute on function rhh_private.public_categories() to anon,authenticated;
create function public.rhh_public_categories() returns jsonb language sql security invoker set search_path='' as $$select rhh_private.public_categories()$$;
revoke all on function public.rhh_public_categories() from public;grant execute on function public.rhh_public_categories() to anon,authenticated;
do $$declare d text;old text:='''name'',c.name,''monthlyUsd''';begin
 d:=pg_get_functiondef('rhh_private.public_directory()'::regprocedure);
 if position(old in d)=0 then raise exception 'Unexpected category projection baseline';end if;
 execute replace(d,old,'''name'',c.name,''description'',c.description,''monthlyUsd''');
end $$;
-- Queue labels must follow saved category names while category IDs/requests stay unchanged.
grant select(id,name) on rhh.categories to rhh_consultation_writer;
create policy consultation_saved_category_names on rhh.categories for select to rhh_consultation_writer using(true);
do $$declare d text;old text:='''categoryId'',c.category_id,''topic''';begin
 d:=pg_get_functiondef('rhh_private.consultation_workspace(boolean,text,jsonb)'::regprocedure);
 if position(old in d)=0 then raise exception 'Unexpected consultation projection baseline';end if;
 execute replace(d,old,'''categoryId'',c.category_id,''categoryName'',(select cat.name from rhh.categories cat where cat.id=c.category_id),''topic''');
end $$;
revoke create on schema rhh_private from rhh_admin_writer,rhh_public_reader;
notify pgrst,'reload schema';
commit;
