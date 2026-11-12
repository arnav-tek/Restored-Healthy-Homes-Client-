-- Stage 5: reject direct RPC access after logout/session revocation or time-box expiry.
-- Auth tables remain private; no client/executor receives access to session records.
begin;
create function rhh_private.has_current_session() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from auth.sessions s
 where s.user_id=(select auth.uid()) and s.id::text=(select auth.jwt()->>'session_id')
 and (s.not_after is null or s.not_after > now()));
$$;
revoke all on function rhh_private.has_current_session() from public,anon,authenticated;
-- Only existing postgres-owned identity helpers call this function.

create or replace function rhh_private.confirmed_user_id() returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); begin
  if uid is null or not rhh_private.has_current_session() or not exists (select 1 from auth.users u where u.id = uid
    and u.email_confirmed_at is not null and not coalesce(u.is_anonymous, false)) then
    raise exception using errcode = '42501', message = 'confirmed_identity_required';
  end if;
  return uid;
end $$;

create or replace function rhh_private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists (select 1 from rhh.accounts a join auth.users u on u.id=a.user_id
 where a.user_id=(select auth.uid()) and a.role='admin' and rhh_private.has_current_session()
 and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false));
$$;

create or replace function rhh_private.require_admin() returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor uuid; begin
 select a.user_id into actor from rhh.accounts a join auth.users u on u.id=a.user_id
 where a.user_id=(select auth.uid()) and a.role='admin' and rhh_private.has_current_session()
 and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)
 for share of a;
 if actor is null then raise exception using errcode='42501',message='admin_required'; end if;
 return actor;
end $$;

-- CREATE OR REPLACE preserves existing owners and restricted execute grants.
notify pgrst,'reload schema';
commit;
