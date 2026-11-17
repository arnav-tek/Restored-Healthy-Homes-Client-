begin;
-- Editorial decisions do not grant or modify membership/paid entitlement.
create table rhh_private.editorial_featured (
 professional_id uuid primary key references rhh.professionals(id) on delete restrict,
 selected boolean not null,version integer not null check(version>0)
);
create table rhh_private.featured_changes (
 id uuid primary key default gen_random_uuid(),professional_id uuid not null references rhh.professionals(id) on delete restrict,
 actor_id uuid not null references rhh.accounts(user_id) on delete restrict,
 selected boolean not null,version integer not null,reason text not null check(length(reason) between 3 and 300),
 at timestamptz not null default statement_timestamp(),unique(professional_id,version)
);
create index featured_changes_recent_idx on rhh_private.featured_changes(at desc,id);
-- The only added domain index supports both the UTC date-range aggregate and ordered application pages.
create index applications_submitted_report_idx on rhh.applications(submitted_at desc,professional_id);
revoke all on rhh_private.editorial_featured,rhh_private.featured_changes from public,anon,authenticated;
alter table rhh_private.editorial_featured enable row level security;alter table rhh_private.editorial_featured force row level security;
alter table rhh_private.featured_changes enable row level security;alter table rhh_private.featured_changes force row level security;
create policy editorial_admin_select on rhh_private.editorial_featured for select to rhh_admin_writer using ((select rhh_private.is_admin()));
create policy editorial_admin_insert on rhh_private.editorial_featured for insert to rhh_admin_writer with check ((select rhh_private.is_admin()));
create policy editorial_admin_update on rhh_private.editorial_featured for update to rhh_admin_writer using ((select rhh_private.is_admin())) with check ((select rhh_private.is_admin()));
create policy editorial_public_select on rhh_private.editorial_featured for select to rhh_public_reader using(selected);
create policy featured_history_select on rhh_private.featured_changes for select to rhh_admin_writer using ((select rhh_private.is_admin()));
create policy featured_history_insert on rhh_private.featured_changes for insert to rhh_admin_writer with check ((select rhh_private.is_admin()));
grant select,insert on rhh_private.editorial_featured to rhh_admin_writer;
grant update(selected,version) on rhh_private.editorial_featured to rhh_admin_writer;
grant select,insert on rhh_private.featured_changes to rhh_admin_writer;
grant select(professional_id,selected) on rhh_private.editorial_featured to rhh_public_reader;
grant execute on function rhh.is_publicly_eligible(text,text,boolean) to rhh_admin_writer;
grant select(featured_entitlement) on rhh.memberships to rhh_admin_writer;
create function rhh_private.immutable_featured_history() returns trigger language plpgsql set search_path='' as $$begin raise exception using errcode='42501',message='immutable_featured_history';end$$;
revoke all on function rhh_private.immutable_featured_history() from public,anon,authenticated;
create trigger immutable_featured_history before update or delete on rhh_private.featured_changes for each row execute function rhh_private.immutable_featured_history();
-- All public readers (including paginated location search) reuse this eligibility-filtered projection.
-- Keep the existing paid `featured` flag unchanged and expose only the additional saved editorial boolean.
do $migration$
declare d text;baseline text := $old$'featured',m.featured_entitlement='active',$old$;
begin
 d:=pg_get_functiondef('rhh_private.public_directory()'::regprocedure);
 if position(baseline in d)=0 then raise exception 'Unexpected featured projection baseline';end if;
 execute replace(d,baseline,$new$'featured',m.featured_entitlement='active','editorialFeatured',exists(select 1 from rhh_private.editorial_featured ef where ef.professional_id=p.id and ef.selected),$new$);
end $migration$;
grant create on schema rhh_private to rhh_admin_writer;
create function rhh_private.admin_operations(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid;act text;pg integer:=1;view_name text;target uuid;wanted boolean;expected integer;current_version integer;current_selected boolean;why text;unchanged boolean:=false;month_value text;month_start date;
begin
 actor:=rhh_private.require_admin();
 if jsonb_typeof(payload) is distinct from 'object' or jsonb_typeof(payload->'action') is distinct from 'string' then raise exception using errcode='22023',message='invalid_operation';end if;
 act:=payload->>'action';
 if not(payload ? 'page') or jsonb_typeof(payload->'page') is distinct from 'number' or payload->>'page' !~ '^[1-9][0-9]{0,5}$' then raise exception using errcode='22023',message='invalid_page';end if;
 pg:=(payload->>'page')::integer;
 if act in ('get_featured','set_featured') then
  view_name:=payload->>'view';
  if jsonb_typeof(payload->'view') is distinct from 'string' or view_name not in ('selected','eligible','entitled') then raise exception using errcode='22023',message='invalid_featured_view';end if;
  if act='get_featured' then
   if payload-array['action','page','view']<>'{}' then raise exception using errcode='22023',message='invalid_operation';end if;
  else
   if payload-array['action','page','view','id','selected','version','reason']<>'{}' or not(payload ?& array['action','page','view','id','selected','version','reason']) or jsonb_typeof(payload->'id') is distinct from 'string' or payload->>'id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' or jsonb_typeof(payload->'selected') is distinct from 'boolean' or jsonb_typeof(payload->'version') is distinct from 'number' or payload->>'version' !~ '^(0|[1-9][0-9]{0,8})$' or jsonb_typeof(payload->'reason') is distinct from 'string' then raise exception using errcode='22023',message='invalid_featured_change';end if;
   target:=(payload->>'id')::uuid;wanted:=(payload->>'selected')::boolean;expected:=(payload->>'version')::integer;why:=trim(payload->>'reason');
   if length(regexp_replace(why,U&'[\+010000-\+10ffff]','xx','g')) not between 3 and 300 then raise exception using errcode='22023',message='invalid_reason';end if;
   -- Serializes competing decisions, including the initial absent selection, with listing suspension/approval.
   perform 1 from rhh.applications where professional_id=target for update;
   if not found then raise exception using errcode='PT404',message='listing_unavailable';end if;
   select version,selected into current_version,current_selected from rhh_private.editorial_featured where professional_id=target;
   current_version:=coalesce(current_version,0);current_selected:=coalesce(current_selected,false);
   if current_version<>expected then raise exception using errcode='PT409',message='stale_editorial_selection';end if;
   if wanted and not exists(select 1 from rhh.applications a join rhh.memberships m on m.professional_id=a.professional_id where a.professional_id=target and rhh.is_publicly_eligible(a.approval,m.status,a.suspended)) then raise exception using errcode='PT409',message='listing_not_eligible';end if;
   unchanged:=wanted=current_selected;
   if not unchanged then
    insert into rhh_private.editorial_featured(professional_id,selected,version) values(target,wanted,current_version+1) on conflict(professional_id) do update set selected=excluded.selected,version=excluded.version;
    insert into rhh_private.featured_changes(professional_id,actor_id,selected,version,reason) values(target,actor,wanted,current_version+1,why);
   end if;
  end if;
  return (with rows as (
   select p.id,p.business_name,a.approval,a.suspended,m.status,m.featured_entitlement,coalesce(ef.selected,false) selected,coalesce(ef.version,0) version,rhh.is_publicly_eligible(a.approval,m.status,a.suspended) eligible
   from rhh.professionals p join rhh.applications a on a.professional_id=p.id left join rhh.memberships m on m.professional_id=p.id left join rhh_private.editorial_featured ef on ef.professional_id=p.id
  ), filtered as(select * from rows where case view_name when 'selected' then selected when 'eligible' then eligible else featured_entitlement='active' end),paged as(select * from filtered order by lower(business_name),id limit 20 offset (pg-1)*20)
  select jsonb_build_object('kind','featured','page',pg,'view',view_name,'total',(select count(*) from filtered),'items',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'businessName',business_name,'approval',approval,'membership',status,'suspended',suspended,'entitlement',coalesce(featured_entitlement,'none'),'selected',selected,'version',version,'eligible',eligible,'visible',eligible and (selected or featured_entitlement='active')) order by lower(business_name),id),'[]') from paged),
   'history',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'professionalId',professional_id,'actorId',actor_id,'selected',selected,'version',version,'reason',reason,'at',at) order by at desc,id),'[]') from (select * from rhh_private.featured_changes order by at desc,id limit 20) h))) ||case when act='set_featured' then jsonb_build_object('saved',true,'unchanged',unchanged) else '{}'::jsonb end;
 elsif act='report' then
  if payload-array['action','page','month']<>'{}' or jsonb_typeof(payload->'month') is distinct from 'string' or payload->>'month' !~ '^(?!0000)[0-9]{4}-(0[1-9]|1[0-2])$' then raise exception using errcode='22023',message='invalid_report_month';end if;
  month_value:=payload->>'month';month_start:=make_date(substr(month_value,1,4)::integer,substr(month_value,6,2)::integer,1);
  return (with listings as materialized (
   select p.id,p.business_name,a.approval,a.suspended,a.submitted_at,m.status,m.featured_entitlement,coalesce(ef.selected,false) selected,rhh.is_publicly_eligible(a.approval,m.status,a.suspended) eligible
   from rhh.professionals p join rhh.applications a on a.professional_id=p.id left join rhh.memberships m on m.professional_id=p.id left join rhh_private.editorial_featured ef on ef.professional_id=p.id
  ),months as(select d from generate_series(greatest(timestamp '0001-01-01',month_start::timestamp-interval '11 months'),month_start::timestamp,interval '1 month') d),
  category_counts as(select c.id,c.name,c.active,count(l.id) total,count(l.id) filter(where l.status='active') active_memberships,count(l.id) filter(where l.eligible) eligible from rhh.categories c left join rhh.professional_categories pc on pc.category_id=c.id left join listings l on l.id=pc.professional_id group by c.id,c.name,c.active order by c.id limit 32),
  page_rows as(select * from listings order by submitted_at desc,id limit 20 offset (pg-1)*20)
  select jsonb_build_object('kind','report','asOf',statement_timestamp(),'month',month_value,'page',pg,'total',(select count(*) from listings),
   'applicationStatuses',(select jsonb_build_object('pending',count(*) filter(where approval='pending'),'approved',count(*) filter(where approval='approved'),'rejected',count(*) filter(where approval='rejected')) from listings),
   'membershipStates',(select jsonb_build_object('active',count(*) filter(where status='active'),'inactive',count(*) filter(where status='inactive'),'past_due',count(*) filter(where status='past_due'),'canceled',count(*) filter(where status='canceled'),'trialing',count(*) filter(where status='trialing'),'unpaid',count(*) filter(where status='unpaid'),'missing',(select count(*) from listings where status is null)) from rhh.memberships),
   'eligible',(select count(*) from listings where eligible),
   'featured',(select jsonb_build_object('selected',count(*) filter(where selected),'visibleEditorial',count(*) filter(where selected and eligible),'entitled',count(*) filter(where featured_entitlement='active'),'visibleEntitled',count(*) filter(where featured_entitlement='active' and eligible),'visible',count(*) filter(where eligible and (selected or featured_entitlement='active'))) from listings),
   'categories',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'active',active,'total',total,'activeMemberships',active_memberships,'eligible',eligible) order by id),'[]') from category_counts),
   'months',(select coalesce(jsonb_agg(jsonb_build_object('month',to_char(d,'YYYY-MM'),'count',(select count(*) from rhh.applications a where a.submitted_at>=d at time zone 'UTC' and a.submitted_at<(d+interval '1 month') at time zone 'UTC')) order by d),'[]') from months),
   'undated',(select count(*) from listings where submitted_at is null),
   'items',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'businessName',business_name,'approval',approval,'membership',status,'suspended',suspended,'submittedAt',submitted_at) order by submitted_at desc,id),'[]') from page_rows)));
 else raise exception using errcode='22023',message='invalid_operation';end if;
end$$;
alter function rhh_private.admin_operations(jsonb) owner to rhh_admin_writer;
revoke all on function rhh_private.admin_operations(jsonb) from public,anon,authenticated;grant execute on function rhh_private.admin_operations(jsonb) to authenticated;
create function public.rhh_admin_operations(payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select rhh_private.admin_operations(payload)$$;
revoke all on function public.rhh_admin_operations(jsonb) from public,anon,authenticated;grant execute on function public.rhh_admin_operations(jsonb) to authenticated;
revoke create on schema rhh_private from rhh_admin_writer;
notify pgrst,'reload schema';
commit;
