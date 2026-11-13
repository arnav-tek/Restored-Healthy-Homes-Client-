-- Private processed profile images; no direct client Storage policies.
begin;
create role rhh_media_writer nologin noinherit nobypassrls;
grant rhh_media_writer to postgres;
grant usage on schema rhh,rhh_private to rhh_media_writer;
grant create on schema rhh_private to rhh_media_writer,rhh_public_reader;
grant execute on function rhh_private.confirmed_user_id(),rhh_private.request_user_id() to rhh_media_writer;
alter table rhh.professionals add column media_version integer not null default 1 check(media_version>0);
grant select(id,owner_id,media_version),update(media_version) on rhh.professionals to rhh_media_writer;
grant select(user_id,role) on rhh.accounts to rhh_media_writer;
create policy media_owner_profile on rhh.professionals to rhh_media_writer using(owner_id=(select rhh_private.request_user_id())) with check(owner_id=(select rhh_private.request_user_id()));
create policy media_owner_account on rhh.accounts for select to rhh_media_writer using(user_id=(select rhh_private.request_user_id()));
create table rhh_private.profile_media(
 id uuid primary key default gen_random_uuid(),professional_id uuid not null references rhh.professionals(id) on delete restrict,owner_id uuid not null references rhh.accounts(user_id) on delete restrict,
 state text not null default 'draft' check(state in ('draft','current','cleanup')),published boolean not null default false,
 created_at timestamptz not null default clock_timestamp(),check(state='current' or not published));
create index profile_media_professional_idx on rhh_private.profile_media(professional_id);
create unique index profile_media_current_idx on rhh_private.profile_media(professional_id) where state='current';
create table rhh_private.profile_media_quotas(user_id uuid not null references rhh.accounts(user_id),day date not null,attempts integer not null check(attempts between 1 and 20),primary key(user_id,day));
alter table rhh_private.profile_media enable row level security;
alter table rhh_private.profile_media force row level security;
alter table rhh_private.profile_media_quotas enable row level security;
alter table rhh_private.profile_media_quotas force row level security;
revoke all on rhh_private.profile_media,rhh_private.profile_media_quotas from public,anon,authenticated;
grant select,insert,update,delete on rhh_private.profile_media,rhh_private.profile_media_quotas to rhh_media_writer;
create policy media_owner on rhh_private.profile_media to rhh_media_writer using(owner_id=(select rhh_private.request_user_id()) and exists(select 1 from rhh.professionals p where p.id=professional_id and p.owner_id=(select rhh_private.request_user_id()))) with check(owner_id=(select rhh_private.request_user_id()) and exists(select 1 from rhh.professionals p where p.id=professional_id and p.owner_id=(select rhh_private.request_user_id())));
create policy media_quotas on rhh_private.profile_media_quotas to rhh_media_writer using(user_id=(select rhh_private.request_user_id())) with check(user_id=(select rhh_private.request_user_id()));
-- Existing public-reader RLS exposes only approved + active + unsuspended listings.
grant select(id,professional_id,state,published) on rhh_private.profile_media to rhh_public_reader;
-- Original private uploads are not transferred to a different listing owner.
create function rhh_private.media_public_eligible(target uuid) returns boolean language sql security definer set search_path='' as $$
 select exists(select 1 from rhh_private.profile_media m join rhh.professionals p on p.id=m.professional_id join rhh.applications a on a.professional_id=p.id join rhh.memberships b on b.professional_id=p.id where m.id=target and m.owner_id=p.owner_id and m.state='current' and m.published and a.approval='approved' and b.status='active' and not a.suspended)
$$;
revoke all on function rhh_private.media_public_eligible(uuid) from public,anon,authenticated;
grant execute on function rhh_private.media_public_eligible(uuid) to rhh_public_reader;
create policy media_public on rhh_private.profile_media for select to rhh_public_reader using(rhh_private.media_public_eligible(id));
create function rhh_private.member_media_object_exists(target uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare uid uuid:=rhh_private.confirmed_user_id(); begin
 if not exists(select 1 from rhh_private.profile_media m join rhh.professionals p on p.id=m.professional_id join rhh.accounts a on a.user_id=p.owner_id where m.id=target and m.owner_id=uid and p.owner_id=uid and a.role='member') then raise exception using errcode='42501',message='media_denied';end if;
 return exists(select 1 from storage.objects o join rhh_private.profile_media m on o.name=m.professional_id::text||'/'||m.id::text||'.webp' where m.id=target and o.bucket_id='rhh-profile-images');
end $$;
revoke all on function rhh_private.member_media_object_exists(uuid) from public,anon,authenticated;
grant execute on function rhh_private.member_media_object_exists(uuid) to rhh_media_writer;
create function rhh_private.member_media(action text,target uuid,expected_version integer,publish boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid; pid uuid; v integer; mid uuid; current_id uuid; current_published boolean; result jsonb; begin
 uid:=rhh_private.confirmed_user_id();
 if not exists(select 1 from rhh.accounts where user_id=uid and role='member') then raise exception using errcode='42501',message='media_denied';end if;
 select id,media_version into pid,v from rhh.professionals where owner_id=uid for update;
 if pid is null then raise exception using errcode='PT404',message='listing_required';end if;
 if action is null or action not in ('get','reserve','save','cancel','route','cleanup','ack') then raise exception using errcode='22023',message='invalid_media_action';end if;
 if action='reserve' then
  if (select count(*) from rhh_private.profile_media where professional_id=pid)>=4 then raise exception using errcode='PT429',message='media_quota';end if;
  insert into rhh_private.profile_media_quotas(user_id,day,attempts) values(uid,(clock_timestamp() at time zone 'UTC')::date,1) on conflict(user_id,day) do update set attempts=rhh_private.profile_media_quotas.attempts+1 where rhh_private.profile_media_quotas.attempts<20 returning user_id into mid;
  if mid is null then raise exception using errcode='PT429',message='media_daily_quota';end if;
  delete from rhh_private.profile_media_quotas where day<(clock_timestamp() at time zone 'UTC')::date-2;
  insert into rhh_private.profile_media(professional_id,owner_id) values(pid,uid) returning id into mid;
  return jsonb_build_object('id',mid,'objectPath',pid::text||'/'||mid::text||'.webp');
 elsif action='save' then
  select id,published into current_id,current_published from rhh_private.profile_media where professional_id=pid and state='current';
  if publish is null then raise exception using errcode='22023',message='invalid_publication';end if;
  if current_id is not distinct from target and coalesce(current_published,false)=publish then action:='get';
  else
   if expected_version is null or expected_version<>v then raise exception using errcode='PT409',message='stale_media';end if;
   if target is not null and not exists(select 1 from rhh_private.profile_media where id=target and professional_id=pid and state in ('draft','current') and (state='current' or created_at>clock_timestamp()-interval '24 hours')) then raise exception using errcode='PT404',message='media_unavailable';end if;
   if target is not null and not rhh_private.member_media_object_exists(target) then raise exception using errcode='PT409',message='upload_incomplete';end if;
   update rhh_private.profile_media set state='cleanup',published=false where professional_id=pid and state='current' and id is distinct from target;
   update rhh_private.profile_media set state='current',published=publish where id=target and professional_id=pid;
   update rhh.professionals set media_version=media_version+1 where id=pid returning media_version into v;
  end if;
 elsif action='cancel' then
  update rhh_private.profile_media set state='cleanup',published=false where id=target and professional_id=pid and state='draft';
  if not found then raise exception using errcode='PT409',message='media_not_draft';end if;
 elsif action='route' then
  select jsonb_build_object('id',id,'objectPath',professional_id::text||'/'||id::text||'.webp') into result from rhh_private.profile_media where id=target and professional_id=pid and state in ('draft','current');
  return result;
 elsif action='ack' then
  if exists(select 1 from rhh_private.profile_media where id=target and professional_id=pid and state='cleanup' and created_at<clock_timestamp()-interval '10 minutes') then
   if rhh_private.member_media_object_exists(target) then raise exception using errcode='PT409',message='cleanup_incomplete';end if;
   delete from rhh_private.profile_media where id=target and professional_id=pid and state='cleanup';
  end if;
 elsif action='cleanup' then
  update rhh_private.profile_media set state='cleanup',published=false where professional_id=pid and state='draft' and created_at<=clock_timestamp()-interval '24 hours';
  return (select coalesce(jsonb_agg(jsonb_build_object('id',id,'objectPath',professional_id::text||'/'||id::text||'.webp')),'[]') from rhh_private.profile_media where professional_id=pid and state='cleanup' and created_at<clock_timestamp()-interval '10 minutes');
 end if;
 return jsonb_build_object('version',v,'photoId',(select id from rhh_private.profile_media where professional_id=pid and state='current'),'published',coalesce((select published from rhh_private.profile_media where professional_id=pid and state='current'),false),'drafts',(select coalesce(jsonb_agg(id order by created_at),'[]') from rhh_private.profile_media where professional_id=pid and state='draft'));
end $$;
alter function rhh_private.member_media(text,uuid,integer,boolean) owner to rhh_media_writer;
revoke all on function rhh_private.member_media(text,uuid,integer,boolean) from public,anon,authenticated;
grant execute on function rhh_private.member_media(text,uuid,integer,boolean) to authenticated;
create function public.rhh_member_media(action text default 'get',target uuid default null,expected_version integer default null,publish boolean default false) returns jsonb language sql security invoker set search_path='' as $$ select rhh_private.member_media(action,target,expected_version,publish) $$;
revoke all on function public.rhh_member_media(text,uuid,integer,boolean) from public,anon,authenticated;
grant execute on function public.rhh_member_media(text,uuid,integer,boolean) to authenticated;
create function rhh_private.public_profile_media(target_id uuid,media_id uuid) returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object('id',m.id,'objectPath',m.professional_id::text||'/'||m.id::text||'.webp') from rhh_private.profile_media m join rhh.professionals p on p.id=m.professional_id where p.id=target_id and m.id=media_id and m.state='current' and m.published
$$;
alter function rhh_private.public_profile_media(uuid,uuid) owner to rhh_public_reader;
revoke all on function rhh_private.public_profile_media(uuid,uuid) from public,anon,authenticated;
grant execute on function rhh_private.public_profile_media(uuid,uuid) to anon,authenticated;
create function public.rhh_public_profile_media(target_id uuid,media_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select rhh_private.public_profile_media(target_id,media_id) $$;
revoke all on function public.rhh_public_profile_media(uuid,uuid) from public,anon,authenticated;
grant execute on function public.rhh_public_profile_media(uuid,uuid) to anon,authenticated;
do $patch$ declare definition text; old text:=$old$'featured',m.featured_entitlement='active',$old$; replacement text:=$new$'featured',m.featured_entitlement='active', 'photoId',(select pm.id from rhh_private.profile_media pm where pm.professional_id=p.id and pm.state='current' and pm.published),$new$; begin
 definition:=pg_get_functiondef('rhh_private.public_directory()'::regprocedure);
 if position(old in definition)=0 then raise exception 'Unexpected public directory baseline';end if;
 execute replace(definition,old,replacement);
end $patch$;
-- All byte operations use the server-only Storage adapter after RPC authorization.
-- No client INSERT/UPDATE/DELETE/SELECT or signing policy is created for this bucket.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('rhh-profile-images','rhh-profile-images',false,1048576,array['image/webp']);
revoke create on schema rhh_private from rhh_media_writer,rhh_public_reader;
notify pgrst,'reload schema';
commit;
