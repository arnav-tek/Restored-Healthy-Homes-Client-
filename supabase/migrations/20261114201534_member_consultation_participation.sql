begin;
-- Reuse the owner-scoped, non-login/RLS-bound profile executor. No data is opted in.
grant select (free_phone_consultation), update (free_phone_consultation)
  on rhh.professionals to rhh_member_writer;
grant create on schema rhh_private to rhh_member_writer;
grant execute on function rhh_private.consultation_member() to rhh_member_writer;
create function rhh_private.member_consultation_preference(payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid := rhh_private.consultation_member(); pid uuid; ver integer; enabled boolean;
begin
  -- The identity helper locks the member account, then take one exclusive profile
  -- lock directly (avoid a SHARE-to-UPDATE upgrade between competing saves).
  if jsonb_typeof(payload) is distinct from 'object' then
    raise exception using errcode='22023',message='invalid_preference';
  end if;
  if payload->>'action'='get' then
    if payload <> '{"action":"get"}'::jsonb then
      raise exception using errcode='22023',message='invalid_preference';
    end if;
  elsif payload->>'action'='save' then
    if not (payload ?& array['action','enabled','version'])
      or payload - array['action','enabled','version'] <> '{}'::jsonb
      or jsonb_typeof(payload->'enabled') is distinct from 'boolean'
      or jsonb_typeof(payload->'version') is distinct from 'number'
      or (payload->>'version') !~ '^[1-9][0-9]{0,8}$' then
      raise exception using errcode='22023',message='invalid_preference';
    end if;
  else raise exception using errcode='22023',message='invalid_preference';
  end if;
  select id,profile_version,free_phone_consultation into pid,ver,enabled
    from rhh.professionals where owner_id=uid for update;
  if not found then raise exception using errcode='42501',message='owned_listing_required';end if;
  if payload->>'action'='save' then
    if (payload->>'version')::integer <> ver then
      raise exception using errcode='40001',message='stale_profile';
    end if;
    -- Same version boundary as profile/location edits, even for an explicit unchanged save.
    update rhh.professionals set free_phone_consultation=(payload->>'enabled')::boolean,
      profile_version=profile_version+1 where id=pid and owner_id=uid
      returning profile_version,free_phone_consultation into ver,enabled;
  end if;
  return jsonb_build_object('version',ver,'enabled',enabled);
end $$;
alter function rhh_private.member_consultation_preference(jsonb) owner to rhh_member_writer;
revoke all on function rhh_private.member_consultation_preference(jsonb) from public,anon,authenticated;
grant execute on function rhh_private.member_consultation_preference(jsonb) to authenticated;
create function public.rhh_member_consultation_preference(payload jsonb)
returns jsonb language sql security invoker set search_path='' as $$
  select rhh_private.member_consultation_preference(payload)
$$;
revoke all on function public.rhh_member_consultation_preference(jsonb) from public,anon,authenticated;
grant execute on function public.rhh_member_consultation_preference(jsonb) to authenticated;
revoke create on schema rhh_private from rhh_member_writer;
notify pgrst,'reload schema';
commit;
