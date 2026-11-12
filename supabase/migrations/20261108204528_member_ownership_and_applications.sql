-- Stage 3. Authenticated RPCs only; rhh stays unexposed to the Data API.
-- No existing records are claimed by email, and no demo records are inserted.
begin;
create schema rhh_private;
revoke all on schema rhh_private from public, anon, authenticated;
alter default privileges in schema rhh_private revoke execute on functions from public;

-- A narrow, non-login executor: not a table owner, not a service role, no RLS bypass.
create role rhh_member_writer nologin noinherit nobypassrls;
grant rhh_member_writer to postgres;
grant usage on schema rhh, rhh_private, auth to rhh_member_writer;
grant create on schema rhh_private to rhh_member_writer;
grant execute on function auth.uid() to rhh_member_writer;

alter table rhh.professionals add column profile_version integer not null default 1 check (profile_version > 0);
alter table rhh.services add column position integer not null default 0 check (position >= 0);
alter table rhh.credentials add column position integer not null default 0 check (position >= 0);

grant select (user_id, role), insert (user_id) on rhh.accounts to rhh_member_writer;
grant select (id, owner_id, business_name, public_display_name, city, state, description,
  healthy_home_practices, public_email, public_phone, website, profile_version),
  insert (owner_id, business_name, public_display_name, city, state, description,
  healthy_home_practices, public_email, public_phone, website),
  update (business_name, public_display_name, city, state, description,
  healthy_home_practices, public_email, public_phone, website, profile_version)
  on rhh.professionals to rhh_member_writer;
grant select (professional_id, contact_name, contact_email, contact_phone, approval, suspended),
  insert (professional_id, contact_name, contact_email, contact_phone),
  update (contact_name, contact_email, contact_phone) on rhh.applications to rhh_member_writer;
grant select (professional_id, status), insert (professional_id) on rhh.memberships to rhh_member_writer;
grant select (id, name, monthly_usd, active) on rhh.categories to rhh_member_writer;
grant select, insert, delete on rhh.professional_categories to rhh_member_writer;
grant select (id, professional_id, name, position), insert (professional_id, name, position), delete
  on rhh.services to rhh_member_writer;
grant select (id, professional_id, name, verification, position),
  insert (professional_id, name, position), update (position), delete on rhh.credentials to rhh_member_writer;

create policy member_account_read on rhh.accounts for select to rhh_member_writer
  using (user_id = (select auth.uid()) and role = 'member');
create policy member_account_create on rhh.accounts for insert to rhh_member_writer
  with check (user_id = (select auth.uid()) and role = 'member');
create policy member_profile_read on rhh.professionals for select to rhh_member_writer
  using (owner_id = (select auth.uid()));
create policy member_profile_create on rhh.professionals for insert to rhh_member_writer
  with check (owner_id = (select auth.uid()));
create policy member_profile_edit on rhh.professionals for update to rhh_member_writer
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy member_catalog_read on rhh.categories for select to rhh_member_writer using (active);
do $$ declare t text; begin
  foreach t in array array['applications','memberships','professional_categories','services','credentials'] loop
    execute format('create policy member_read on rhh.%I for select to rhh_member_writer using (exists (select 1 from rhh.professionals p where p.id = professional_id and p.owner_id = (select auth.uid())))', t);
    execute format('create policy member_create on rhh.%I for insert to rhh_member_writer with check (exists (select 1 from rhh.professionals p where p.id = professional_id and p.owner_id = (select auth.uid())))', t);
  end loop;
  foreach t in array array['applications','credentials'] loop
    execute format('create policy member_edit on rhh.%I for update to rhh_member_writer using (exists (select 1 from rhh.professionals p where p.id = professional_id and p.owner_id = (select auth.uid()))) with check (exists (select 1 from rhh.professionals p where p.id = professional_id and p.owner_id = (select auth.uid())))', t);
  end loop;
  foreach t in array array['professional_categories','services','credentials'] loop
    execute format('create policy member_remove on rhh.%I for delete to rhh_member_writer using (exists (select 1 from rhh.professionals p where p.id = professional_id and p.owner_id = (select auth.uid())))', t);
  end loop;
end $$;

-- The only postgres-owned definer checks Auth directly. It cannot read or change business data.
create function rhh_private.confirmed_user_id() returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); begin
  if uid is null or not exists (select 1 from auth.users u where u.id = uid
    and u.email_confirmed_at is not null and not coalesce(u.is_anonymous, false)) then
    raise exception using errcode = '42501', message = 'confirmed_identity_required';
  end if;
  return uid;
end $$;
revoke all on function rhh_private.confirmed_user_id() from public, anon, authenticated;
grant execute on function rhh_private.confirmed_user_id() to rhh_member_writer;

create function rhh_private.member_snapshot() returns jsonb
language sql security invoker set search_path = '' as $$
  select jsonb_build_object(
    'catalog', (select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'monthlyUsd',c.monthly_usd) order by c.id),'[]'::jsonb) from rhh.categories c),
    'application', (select jsonb_build_object(
      'id',p.id,'version',p.profile_version,'approval',a.approval,'membership',m.status,'suspended',a.suspended,
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
alter function rhh_private.member_snapshot() owner to rhh_member_writer;
revoke all on function rhh_private.member_snapshot() from public, anon, authenticated;

create function rhh_private.ensure_member() returns uuid
language plpgsql security invoker set search_path = '' as $$
declare uid uuid := rhh_private.confirmed_user_id(); begin
  -- Serializes provisioning, repeated creation and edits for this identity only.
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  insert into rhh.accounts(user_id) values(uid) on conflict (user_id) do nothing;
  if not exists(select 1 from rhh.accounts where user_id=uid and role='member') then
    raise exception using errcode='42501', message='member_access_required';
  end if;
  return uid;
end $$;
alter function rhh_private.ensure_member() owner to rhh_member_writer;
revoke all on function rhh_private.ensure_member() from public, anon, authenticated;

create function rhh_private.member_workspace() returns jsonb
language plpgsql security definer set search_path = '' as $$ begin
  perform rhh_private.ensure_member();
  return rhh_private.member_snapshot();
end $$;
alter function rhh_private.member_workspace() owner to rhh_member_writer;
revoke all on function rhh_private.member_workspace() from public, anon, authenticated;

create function rhh_private.save_member_application(profile jsonb, expected_version integer, create_only boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid; pid uuid; current_version integer; field text; value text; claim record;
  claim_id uuid; kept_claims uuid[] := '{}';
begin
  uid := rhh_private.ensure_member();
  if create_only is null then raise exception using errcode='22023',message='invalid_profile'; end if;
  if jsonb_typeof(profile) is distinct from 'object' or exists (
    select 1 from jsonb_object_keys(profile) k where k not in
    ('name','businessName','email','phone','website','city','state','publicDisplayName','publicEmail',
     'description','practices','categoryIds','services','listedCredentials')) then
    raise exception using errcode='22023',message='invalid_profile';
  end if;
  foreach field in array array['name','businessName','email','phone','website','city','state','description','practices'] loop
    if jsonb_typeof(profile->field) is distinct from 'string' then
      raise exception using errcode='22023',message='invalid_profile'; end if;
  end loop;
  foreach field in array array['publicDisplayName','publicEmail'] loop
    if profile ? field and jsonb_typeof(profile->field) is distinct from 'string' then
      raise exception using errcode='22023',message='invalid_profile'; end if;
  end loop;
  if length(trim(profile->>'name')) not between 1 and 80
    or length(trim(profile->>'businessName')) not between 1 and 120
    or length(trim(profile->>'city')) not between 1 and 80
    or length(trim(profile->>'description')) not between 20 and 2000
    or length(trim(profile->>'practices')) not between 20 and 1500
    or length(profile->>'email') > 254 or profile->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or profile->>'state' !~ '^[A-Z]{2}$'
    or length(coalesce(profile->>'publicDisplayName','')) > 80
    or length(coalesce(profile->>'publicEmail','')) > 254
    or (coalesce(profile->>'publicEmail','') <> '' and profile->>'publicEmail' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
    or length(profile->>'phone') > 40
    or (profile->>'phone' <> '' and (profile->>'phone' !~ '^[+0-9().[:space:]-]{7,40}$' or length(regexp_replace(profile->>'phone','[^0-9]','','g')) not between 7 and 15))
    or length(profile->>'website') > 200
    or (profile->>'website' <> '' and profile->>'website' !~ '^https?://[^/@[:space:]]+\.[^/@[:space:]]+([/?#][^[:space:]]*)?$') then
    raise exception using errcode='22023',message='invalid_profile';
  end if;
  foreach field in array array['categoryIds','services','listedCredentials'] loop
    if jsonb_typeof(profile->field) is distinct from 'array' then
      raise exception using errcode='22023',message='invalid_profile'; end if;
    if exists (select 1 from jsonb_array_elements(profile->field) e where jsonb_typeof(e) <> 'string') then
      raise exception using errcode='22023',message='invalid_profile'; end if;
  end loop;
  if jsonb_array_length(profile->'categoryIds') not between 1 and 8
    or (select count(distinct x) from jsonb_array_elements_text(profile->'categoryIds') x) <> jsonb_array_length(profile->'categoryIds')
    or exists(select 1 from jsonb_array_elements_text(profile->'categoryIds') x where not exists(select 1 from rhh.categories c where c.id=x and c.active))
    or jsonb_array_length(profile->'services') not between 1 and 12
    or (select count(distinct x) from jsonb_array_elements_text(profile->'services') x) <> jsonb_array_length(profile->'services')
    or jsonb_array_length(profile->'listedCredentials') > 10 then
    raise exception using errcode='22023',message='invalid_profile';
  end if;
  foreach field in array array['services','listedCredentials'] loop
    for value in select jsonb_array_elements_text(profile->field) loop
      if length(trim(value)) not between 1 and 120 or value <> trim(value) then
        raise exception using errcode='22023',message='invalid_profile'; end if;
    end loop;
  end loop;

  select p.id,p.profile_version into pid,current_version from rhh.professionals p where p.owner_id=uid for update;
  if create_only and pid is not null then
    raise exception using errcode='P0001',message='application_exists';
  elsif not create_only and (pid is null or expected_version is null or expected_version <> current_version) then
    raise exception using errcode='P0001',message='stale_profile';
  end if;
  if pid is null then
    insert into rhh.professionals(owner_id,business_name,public_display_name,public_email,city,state,description,healthy_home_practices,public_phone,website)
    values(uid,profile->>'businessName',coalesce(profile->>'publicDisplayName',''),coalesce(profile->>'publicEmail',''),profile->>'city',profile->>'state',profile->>'description',profile->>'practices',profile->>'phone',profile->>'website') returning id into pid;
    insert into rhh.applications(professional_id,contact_name,contact_email,contact_phone)
    values(pid,profile->>'name',profile->>'email',profile->>'phone');
    insert into rhh.memberships(professional_id) values(pid);
  else
    update rhh.professionals set business_name=profile->>'businessName',public_display_name=coalesce(profile->>'publicDisplayName',''),
      public_email=coalesce(profile->>'publicEmail',''),city=profile->>'city',state=profile->>'state',description=profile->>'description',
      healthy_home_practices=profile->>'practices',public_phone=profile->>'phone',website=profile->>'website',profile_version=profile_version+1 where id=pid;
    update rhh.applications set contact_name=profile->>'name',contact_email=profile->>'email',contact_phone=profile->>'phone' where professional_id=pid;
  end if;
  delete from rhh.professional_categories where professional_id=pid;
  insert into rhh.professional_categories(professional_id,category_id) select pid,x from jsonb_array_elements_text(profile->'categoryIds') x;
  delete from rhh.services where professional_id=pid;
  insert into rhh.services(professional_id,name,position) select pid,x,(ord-1)::integer from jsonb_array_elements_text(profile->'services') with ordinality s(x,ord);
  -- Match each unchanged claim once; new/renamed claims use unverified defaults.
  for claim in select x,(ord-1)::integer as position from jsonb_array_elements_text(profile->'listedCredentials') with ordinality c(x,ord) loop
    claim_id := null;
    select id into claim_id from rhh.credentials where professional_id=pid and name=claim.x and not(id=any(kept_claims)) order by position,id limit 1;
    if claim_id is null then
      insert into rhh.credentials(professional_id,name,position) values(pid,claim.x,claim.position) returning id into claim_id;
    else
      update rhh.credentials set position=claim.position where id=claim_id;
    end if;
    kept_claims := array_append(kept_claims,claim_id);
  end loop;
  delete from rhh.credentials where professional_id=pid and not(id=any(kept_claims));
  return rhh_private.member_snapshot();
end $$;
alter function rhh_private.save_member_application(jsonb,integer,boolean) owner to rhh_member_writer;
revoke all on function rhh_private.save_member_application(jsonb,integer,boolean) from public, anon, authenticated;

-- Thin invoker entry points in the already-exposed public schema. No base tables or
-- private admin fields become Data API resources. Internal routines still verify uid.
create function public.rhh_member_workspace() returns jsonb language sql security invoker set search_path='' as $$
  select rhh_private.member_workspace(); $$;
create function public.rhh_create_application(profile jsonb) returns jsonb language sql security invoker set search_path='' as $$
  select rhh_private.save_member_application(profile,null,true); $$;
create function public.rhh_save_profile(profile jsonb, expected_version integer) returns jsonb language sql security invoker set search_path='' as $$
  select rhh_private.save_member_application(profile,expected_version,false); $$;
revoke all on function public.rhh_member_workspace(),public.rhh_create_application(jsonb),public.rhh_save_profile(jsonb,integer) from public,anon,authenticated;
grant usage on schema rhh_private to authenticated;
grant execute on function rhh_private.member_workspace(),rhh_private.save_member_application(jsonb,integer,boolean) to authenticated;
grant execute on function public.rhh_member_workspace(),public.rhh_create_application(jsonb),public.rhh_save_profile(jsonb,integer) to authenticated;
revoke create on schema rhh_private from rhh_member_writer;
notify pgrst, 'reload schema';
commit;
