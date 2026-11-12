-- Stage 4: caller-authorized admin RPCs and explicit public projections only.
begin;
create role rhh_admin_writer nologin noinherit nobypassrls;
create role rhh_public_reader nologin noinherit nobypassrls;
grant rhh_admin_writer, rhh_public_reader to postgres;
grant usage on schema rhh, rhh_private, auth to rhh_admin_writer, rhh_public_reader;
grant create on schema rhh_private to rhh_admin_writer, rhh_public_reader;
grant execute on function auth.uid() to rhh_admin_writer;

-- Non-recursive, private role lookup. Browser metadata is never consulted.
create function rhh_private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists (select 1 from rhh.accounts a join auth.users u on u.id=a.user_id
 where a.user_id=(select auth.uid()) and a.role='admin'
 and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false));
$$;
revoke all on function rhh_private.is_admin() from public, anon, authenticated;
grant execute on function rhh_private.is_admin() to rhh_admin_writer;
create function rhh_private.require_admin() returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor uuid; begin
 select a.user_id into actor from rhh.accounts a join auth.users u on u.id=a.user_id
 where a.user_id=(select auth.uid()) and a.role='admin'
 and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)
 for share of a;
 if actor is null then raise exception using errcode='42501',message='admin_required'; end if;
 return actor;
end $$;
revoke all on function rhh_private.require_admin() from public, anon, authenticated;
grant execute on function rhh_private.require_admin() to rhh_admin_writer;

alter table rhh.applications add column decision_version integer not null default 1 check(decision_version>0);
create table rhh.application_decisions (
 id uuid primary key default gen_random_uuid(),
 professional_id uuid not null references rhh.professionals(id),
 actor_id uuid not null references rhh.accounts(user_id),
 action text not null check(action in ('approve','reject','suspend','reinstate')),
 reason text not null check(length(reason) between 3 and 300),
 internal_notes text not null check(length(internal_notes)<=5000),
 before_state jsonb not null, after_state jsonb not null,
 decided_at timestamptz not null default clock_timestamp(),
 decision_version integer not null,
 unique(professional_id,decision_version)
);
create index application_decisions_actor_idx on rhh.application_decisions(actor_id);
alter table rhh.application_decisions enable row level security;
alter table rhh.application_decisions force row level security;
-- SQL-operator-only role history: no application role can grant privileges.
create table rhh.account_role_history (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references rhh.accounts(user_id),
 previous_role text, assigned_role text not null check(assigned_role in ('member','admin')),
 assigned_by text not null default session_user, assigned_at timestamptz not null default clock_timestamp()
);
create index account_role_history_user_idx on rhh.account_role_history(user_id);
alter table rhh.account_role_history enable row level security;
alter table rhh.account_role_history force row level security;
revoke all on rhh.application_decisions,rhh.account_role_history from public,anon,authenticated;

grant select (id, owner_id, business_name, public_display_name, city, state, description, healthy_home_practices,
 public_email, public_phone, website, profile_version) on rhh.professionals to rhh_admin_writer;
grant select (professional_id,contact_name,contact_email,approval,suspended,decision_reason,suspension_reason,internal_notes,submitted_at,decision_version),
 update (approval,suspended,decision_reason,suspension_reason,internal_notes,decision_version) on rhh.applications to rhh_admin_writer;
grant select (professional_id,status) on rhh.memberships to rhh_admin_writer;
grant select (id,name,monthly_usd,active) on rhh.categories to rhh_admin_writer;
grant select on rhh.professional_categories to rhh_admin_writer;
grant select (professional_id,name,verification,position,id) on rhh.credentials to rhh_admin_writer;
grant select (professional_id,name,position,id) on rhh.services to rhh_admin_writer;
grant select,insert on rhh.application_decisions to rhh_admin_writer;
do $$ declare t text; begin
 foreach t in array array['professionals','applications','memberships','categories','professional_categories','credentials','services','application_decisions'] loop
 execute format('create policy admin_read on rhh.%I for select to rhh_admin_writer using ((select rhh_private.is_admin()))',t);
 end loop;
end $$;
create policy admin_decide on rhh.applications for update to rhh_admin_writer
 using ((select rhh_private.is_admin())) with check ((select rhh_private.is_admin()));
create policy admin_history on rhh.application_decisions for insert to rhh_admin_writer
 with check ((select rhh_private.is_admin()) and actor_id=(select auth.uid()));

create function rhh_private.admin_snapshot() returns jsonb
language sql security invoker set search_path='' as $$
 select jsonb_build_object('catalog',(select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'monthlyUsd',c.monthly_usd,'active',c.active) order by c.id),'[]') from rhh.categories c),
 'applications',(select coalesce(jsonb_agg(jsonb_build_object(
 'id',p.id,'version',p.profile_version,'decisionVersion',a.decision_version,'approval',a.approval,'membership',m.status,'suspended',a.suspended,
 'decisionReason',a.decision_reason,'suspensionReason',a.suspension_reason,'internalNotes',a.internal_notes,'submittedAt',a.submitted_at,
 'profile',jsonb_build_object('name',a.contact_name,'email',a.contact_email,'phone',p.public_phone,'businessName',p.business_name,'publicDisplayName',p.public_display_name,'publicEmail',p.public_email,'website',p.website,'city',p.city,'state',p.state,'description',p.description,'practices',p.healthy_home_practices,
 'categoryIds',(select coalesce(jsonb_agg(pc.category_id order by pc.category_id),'[]') from rhh.professional_categories pc where pc.professional_id=p.id),
 'services',(select coalesce(jsonb_agg(s.name order by s.position,s.id),'[]') from rhh.services s where s.professional_id=p.id),
 'listedCredentials',(select coalesce(jsonb_agg(c.name order by c.position,c.id),'[]') from rhh.credentials c where c.professional_id=p.id)),
 'credentials',(select coalesce(jsonb_agg(jsonb_build_object('name',c.name,'verification',c.verification) order by c.position,c.id),'[]') from rhh.credentials c where c.professional_id=p.id),
 'history',(select coalesce(jsonb_agg(jsonb_build_object('id',h.id,'actorId',h.actor_id,'action',h.action,'reason',h.reason,'internalNotes',h.internal_notes,'decidedAt',h.decided_at,'decisionVersion',h.decision_version) order by h.decision_version desc),'[]') from rhh.application_decisions h where h.professional_id=p.id)
 ) order by a.submitted_at desc,p.id),'[]') from rhh.professionals p join rhh.applications a on a.professional_id=p.id join rhh.memberships m on m.professional_id=p.id));
$$;
alter function rhh_private.admin_snapshot() owner to rhh_admin_writer;
revoke all on function rhh_private.admin_snapshot() from public,anon,authenticated;
create function rhh_private.admin_workspace() returns jsonb
language plpgsql security definer set search_path='' as $$ begin
 perform rhh_private.require_admin(); return rhh_private.admin_snapshot(); end $$;
alter function rhh_private.admin_workspace() owner to rhh_admin_writer;
revoke all on function rhh_private.admin_workspace() from public,anon,authenticated;
grant execute on function rhh_private.admin_workspace() to authenticated;
create function public.rhh_admin_workspace() returns jsonb
language sql security invoker set search_path='' as $$ select rhh_private.admin_workspace() $$;
revoke all on function public.rhh_admin_workspace() from public,anon;
grant execute on function public.rhh_admin_workspace() to authenticated;

create function rhh_private.admin_decide(target_id uuid,expected_profile_version integer,expected_decision_version integer,decision text,reason text,notes text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid; pv integer; a rhh.applications%rowtype; next_approval text; next_suspended boolean; begin
 actor := rhh_private.require_admin();
 if decision is null or decision not in ('approve','reject','suspend','reinstate') or reason is null or length(trim(reason)) not between 3 and 300 or notes is null or length(notes)>5000 then
 raise exception using errcode='22023',message='invalid_decision'; end if;
 -- Match the existing member-edit transaction lock before reading the profile version.
 perform pg_advisory_xact_lock(hashtextextended(owner_id::text,0)) from rhh.professionals where id=target_id;
 select profile_version into pv from rhh.professionals where id=target_id;
 select professional_id,approval,suspended,decision_version into a.professional_id,a.approval,a.suspended,a.decision_version from rhh.applications where professional_id=target_id for update;
 if pv is null then raise exception using errcode='P0002',message='application_missing'; end if;
 if expected_profile_version is distinct from pv or expected_decision_version is distinct from a.decision_version then
 raise exception using errcode='40001',message='stale_decision'; end if;
 next_approval:=a.approval; next_suspended:=a.suspended;
 if decision='approve' and a.approval<>'approved' then next_approval:='approved';
 elsif decision='reject' and a.approval<>'rejected' then next_approval:='rejected';
 elsif decision='suspend' and a.approval='approved' and not a.suspended then next_suspended:=true;
 elsif decision='reinstate' and a.approval='approved' and a.suspended then next_suspended:=false;
 else raise exception using errcode='22023',message='invalid_transition'; end if;
 update rhh.applications set approval=next_approval,suspended=next_suspended,
 decision_reason=case when decision in ('approve','reject') then trim(reason) else decision_reason end,
 suspension_reason=case when decision in ('suspend','reinstate') then trim(reason) else suspension_reason end,
 internal_notes=notes,decision_version=decision_version+1 where professional_id=target_id;
 insert into rhh.application_decisions(professional_id,actor_id,action,reason,internal_notes,before_state,after_state,decision_version)
 values(target_id,actor,decision,trim(reason),notes,jsonb_build_object('approval',a.approval,'suspended',a.suspended),jsonb_build_object('approval',next_approval,'suspended',next_suspended),a.decision_version+1);
 return rhh_private.admin_snapshot();
end $$;
alter function rhh_private.admin_decide(uuid,integer,integer,text,text,text) owner to rhh_admin_writer;
revoke all on function rhh_private.admin_decide(uuid,integer,integer,text,text,text) from public,anon,authenticated;
grant execute on function rhh_private.admin_decide(uuid,integer,integer,text,text,text) to authenticated;
create function public.rhh_admin_decide(target_id uuid,expected_profile_version integer,expected_decision_version integer,decision text,reason text,notes text) returns jsonb
language sql security invoker set search_path='' as $$ select rhh_private.admin_decide(target_id,expected_profile_version,expected_decision_version,decision,reason,notes) $$;
revoke all on function public.rhh_admin_decide(uuid,integer,integer,text,text,text) from public,anon;
grant execute on function public.rhh_admin_decide(uuid,integer,integer,text,text,text) to authenticated;

-- Member status reasons are explicitly public to the owner, never internal notes/history.
grant select (decision_reason,suspension_reason) on rhh.applications to rhh_member_writer;
create or replace function rhh_private.member_snapshot() returns jsonb
language sql security invoker set search_path = '' as $$
  select jsonb_build_object(
    'catalog', (select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'monthlyUsd',c.monthly_usd,'active',c.active) order by c.id),'[]'::jsonb) from rhh.categories c),
    'application', (select jsonb_build_object(
      'id',p.id,'version',p.profile_version,'approval',a.approval,'membership',m.status,'suspended',a.suspended,'decisionReason',a.decision_reason,'suspensionReason',a.suspension_reason,
      'credentials',(select coalesce(jsonb_agg(jsonb_build_object('name',c.name,'verification',c.verification) order by c.position,c.id),'[]'::jsonb) from rhh.credentials c where c.professional_id=p.id),
      'profile',jsonb_build_object('name',a.contact_name,'email',a.contact_email,'phone',p.public_phone,
        'businessName',p.business_name,'publicDisplayName',p.public_display_name,'publicEmail',p.public_email,
        'website',p.website,'city',p.city,'state',p.state,'description',p.description,'practices',p.healthy_home_practices,
        'categoryIds',(select coalesce(jsonb_agg(pc.category_id order by pc.category_id),'[]'::jsonb) from rhh.professional_categories pc where pc.professional_id=p.id),
        'services',(select coalesce(jsonb_agg(s.name order by s.position,s.id),'[]'::jsonb) from rhh.services s where s.professional_id=p.id),
        'listedCredentials',(select coalesce(jsonb_agg(c.name order by c.position,c.id),'[]'::jsonb) from rhh.credentials c where c.professional_id=p.id)))
      from rhh.professionals p join rhh.applications a on a.professional_id=p.id
      join rhh.memberships m on m.professional_id=p.id where p.owner_id=auth.uid()));
$$;

-- A non-login read executor only sees eligible public columns. Base schemas stay closed.
grant select (professional_id,approval,suspended) on rhh.applications to rhh_public_reader;
grant select (professional_id,status,featured_entitlement) on rhh.memberships to rhh_public_reader;
create policy public_eligibility_application on rhh.applications for select to rhh_public_reader using (true);
create policy public_eligibility_membership on rhh.memberships for select to rhh_public_reader using (true);
grant select (id,business_name,city,state,description,service_area,public_email,public_phone,website,free_phone_consultation) on rhh.professionals to rhh_public_reader;
create policy public_profile on rhh.professionals for select to rhh_public_reader using (
 exists(select 1 from rhh.applications a join rhh.memberships m on m.professional_id=a.professional_id
 where a.professional_id=id and a.approval='approved' and m.status='active' and not a.suspended));
grant select on rhh.professional_categories to rhh_public_reader;
grant select (id,professional_id,name,position) on rhh.services to rhh_public_reader;
grant select (id,professional_id,name,verification,position) on rhh.credentials to rhh_public_reader;
do $$ declare t text; begin
 foreach t in array array['professional_categories','services','credentials'] loop
 execute format('create policy public_related on rhh.%I for select to rhh_public_reader using (exists (select 1 from rhh.professionals p where p.id=professional_id))',t);
 end loop;
end $$;
grant select (id,name,monthly_usd,active) on rhh.categories to rhh_public_reader;
create policy public_category on rhh.categories for select to rhh_public_reader using (
 active or exists(select 1 from rhh.professional_categories pc where pc.category_id=id));
create function rhh_private.public_directory() returns jsonb
language sql security definer set search_path='' as $$
 select jsonb_build_object('catalog',(select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'monthlyUsd',c.monthly_usd,'active',c.active) order by c.id),'[]') from rhh.categories c),
 'profiles',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'businessName',p.business_name,'city',p.city,'state',p.state,
 'specialty','', 'summary',p.description,'serviceArea',p.service_area,'freeConsultation',p.free_phone_consultation,
 'featured',m.featured_entitlement='active',
 'contact',jsonb_build_object('email',p.public_email,'phone',p.public_phone,'website',p.website),
 'categoryIds',(select coalesce(jsonb_agg(pc.category_id order by pc.category_id),'[]') from rhh.professional_categories pc where pc.professional_id=p.id),
 'services',(select coalesce(jsonb_agg(s.name order by s.position,s.id),'[]') from rhh.services s where s.professional_id=p.id),
 'verifiedCredentials',(select coalesce(jsonb_agg(c.name order by c.position,c.id),'[]') from rhh.credentials c where c.professional_id=p.id and c.verification='verified'),
 'listedCredentials',(select coalesce(jsonb_agg(c.name order by c.position,c.id),'[]') from rhh.credentials c where c.professional_id=p.id and c.verification='unverified')
 ) order by p.business_name,p.id),'[]') from rhh.professionals p join rhh.applications a on a.professional_id=p.id join rhh.memberships m on m.professional_id=p.id
 where a.approval='approved' and m.status='active' and not a.suspended));
$$;
alter function rhh_private.public_directory() owner to rhh_public_reader;
revoke all on function rhh_private.public_directory() from public,anon,authenticated;
grant usage on schema rhh_private to anon;
grant execute on function rhh_private.public_directory() to anon,authenticated;
create function public.rhh_public_directory() returns jsonb
language sql security invoker set search_path='' as $$ select rhh_private.public_directory() $$;
revoke all on function public.rhh_public_directory() from public;
grant execute on function public.rhh_public_directory() to anon,authenticated;
revoke create on schema rhh_private from rhh_admin_writer,rhh_public_reader;
notify pgrst,'reload schema';
commit;
