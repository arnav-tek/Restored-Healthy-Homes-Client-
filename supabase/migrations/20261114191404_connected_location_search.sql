-- Public city/ZIP centers only; legacy coordinates/private contacts are not migrated.
begin;
create extension if not exists postgis with schema extensions;
create role rhh_location_writer nologin noinherit nobypassrls;
grant rhh_location_writer to postgres;
grant usage on schema rhh,rhh_private,extensions to rhh_location_writer,rhh_public_reader;
grant create on schema rhh_private to rhh_location_writer,rhh_public_reader;
grant execute on function rhh_private.confirmed_user_id(),rhh_private.request_user_id(),rhh_private.require_admin() to rhh_location_writer;
grant execute on function rhh_private.review_member_target() to rhh_location_writer;
grant select(id,owner_id,profile_version,city,state),update(city,state,profile_version) on rhh.professionals to rhh_location_writer;
create policy location_routing on rhh.professionals for select to rhh_location_writer using(true);
create policy location_member_edit on rhh.professionals for update to rhh_location_writer using(owner_id=(select rhh_private.request_user_id())) with check(owner_id=(select rhh_private.request_user_id()));

create table rhh_private.geocode_config(singleton boolean primary key default true check(singleton),gateway_hash text check(gateway_hash ~ '^[a-f0-9]{64}$'),daily_budget integer not null default 2400 check(daily_budget between 1 and 2800));
insert into rhh_private.geocode_config(singleton) values(true);
create table rhh_private.geocode_limits(bucket text not null,starts_at timestamptz not null,used integer not null,expires_at timestamptz not null,primary key(bucket,starts_at));
create table rhh_private.geocode_places(
 id uuid primary key default gen_random_uuid(),city text not null check(length(city) between 1 and 80),state text not null check(state ~ '^[A-Z]{2}$'),zip text not null check(zip='' or zip ~ '^\d{5}$'),kind text not null check(kind in ('city','postcode')),
 latitude double precision not null check(latitude between -90 and 90),longitude double precision not null check(longitude between -180 and 180),
 point extensions.geography(Point,4326) generated always as (extensions.st_setsrid(extensions.st_makepoint(longitude,latitude),4326)::extensions.geography) stored,
 provider text not null default 'geoapify' check(provider='geoapify'),attribution text not null default 'Powered by Geoapify · © OpenStreetMap contributors',resolved_at timestamptz not null default clock_timestamp());
create table rhh_private.geocode_cache(query_hash text primary key,places uuid[] not null default '{}',expires_at timestamptz not null,lease uuid,lease_until timestamptz,attempts integer not null default 0 check(attempts between 0 and 2));
create table rhh_private.professional_locations(professional_id uuid primary key references rhh.professionals(id) on delete restrict,owner_id uuid not null references rhh.accounts(user_id) on delete restrict,place_id uuid not null references rhh_private.geocode_places(id),
 point extensions.geography(Point,4326) not null,updated_at timestamptz not null default clock_timestamp());
create index professional_locations_point_idx on rhh_private.professional_locations using gist(point);
create index geocode_cache_expiry_idx on rhh_private.geocode_cache(expires_at);
create index geocode_limits_expiry_idx on rhh_private.geocode_limits(expires_at);
do $$declare t text;begin foreach t in array array['geocode_config','geocode_limits','geocode_places','geocode_cache','professional_locations'] loop
 execute format('alter table rhh_private.%I enable row level security',t);execute format('alter table rhh_private.%I force row level security',t);
 execute format('revoke all on rhh_private.%I from public,anon,authenticated',t);
 execute format('grant select,insert,update,delete on rhh_private.%I to rhh_location_writer',t);
 execute format('create policy location_executor on rhh_private.%I to rhh_location_writer using(true) with check(true)',t);
end loop;end $$;
-- Operator-only capability registration; no browser-accessible registration function.
create function rhh_private.configure_geocoding(gateway_hash text,budget integer) returns void language plpgsql security invoker set search_path='' as $$begin
 update rhh_private.geocode_config set gateway_hash=configure_geocoding.gateway_hash,daily_budget=budget where singleton;
end $$;
revoke all on function rhh_private.configure_geocoding(text,integer) from public,anon,authenticated;

create function rhh_private.place_json(p rhh_private.geocode_places) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('id',p.id,'city',p.city,'state',p.state,'zip',p.zip,'kind',p.kind,'latitude',p.latitude,'longitude',p.longitude,'label',p.city||', '||p.state||case when p.zip='' then '' else ' '||p.zip end)
$$;revoke all on function rhh_private.place_json(rhh_private.geocode_places) from public,anon,authenticated;
grant execute on function rhh_private.place_json(rhh_private.geocode_places) to rhh_location_writer,rhh_public_reader;

-- Serializable durable counters: attempted provider calls, not visitors. No raw search/IP logs.
create function rhh_private.geocode_tick(bucket_name text,period_seconds integer,max_calls integer) returns boolean language plpgsql security invoker set search_path='' as $$declare n integer;start_at timestamptz:=to_timestamp(floor(extract(epoch from clock_timestamp())/period_seconds)*period_seconds);begin
 insert into rhh_private.geocode_limits(bucket,starts_at,used,expires_at) values(bucket_name,start_at,1,start_at+make_interval(secs=>period_seconds*2))
 on conflict(bucket,starts_at) do update set used=rhh_private.geocode_limits.used+1 where rhh_private.geocode_limits.used<max_calls returning used into n;
 return n is not null;end $$;
alter function rhh_private.geocode_tick(text,integer,integer) owner to rhh_location_writer;revoke all on function rhh_private.geocode_tick(text,integer,integer) from public,anon,authenticated;
create function rhh_private.geocoding(gateway text,operation text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg rhh_private.geocode_config%rowtype;q text;client_key text;c rhh_private.geocode_cache%rowtype;lease_id uuid;item jsonb;p rhh_private.geocode_places%rowtype;ids uuid[]:='{}';cap integer;begin
 select * into cfg from rhh_private.geocode_config where singleton;
 if cfg.gateway_hash is null or encode(extensions.digest(gateway,'sha256'),'hex')<>cfg.gateway_hash or gateway is null then raise exception using errcode='42501',message='geocoding_gateway_denied';end if;
 if jsonb_typeof(payload)<>'object' then raise exception 'invalid_geocoding';end if;
 q:=payload->>'queryHash';client_key:=payload->>'clientHash';
 if q is null or q !~ '^[a-f0-9]{64}$' then raise exception 'invalid_geocoding';end if;
 perform pg_advisory_xact_lock(hashtextextended(q,98123));
 select * into c from rhh_private.geocode_cache where query_hash=q for update;
 if operation='complete' then
  if c.lease is null or c.lease::text is distinct from payload->>'lease' or c.lease_until<clock_timestamp() then raise exception 'geocoding_lease_expired';end if;
  if jsonb_typeof(payload->'places')<>'array' or jsonb_array_length(payload->'places')>5 then raise exception 'invalid_geocoding';end if;
  for item in select value from jsonb_array_elements(payload->'places') loop
   insert into rhh_private.geocode_places(city,state,zip,kind,latitude,longitude) values(item->>'city',item->>'state',item->>'zip',item->>'kind',(item->>'latitude')::float8,(item->>'longitude')::float8) returning * into p;
   ids:=array_append(ids,p.id);
  end loop;
  update rhh_private.geocode_cache set places=ids,expires_at=clock_timestamp()+interval '30 days',lease=null,lease_until=null where query_hash=q;
 elsif operation in ('begin','retry') then
  if client_key is null or client_key !~ '^[a-f0-9]{64}$' then raise exception 'invalid_geocoding';end if;
  delete from rhh_private.geocode_limits where expires_at<clock_timestamp();
  if not rhh_private.geocode_tick('ip:'||client_key,60,10) or not rhh_private.geocode_tick('ipday:'||client_key,86400,100) then return jsonb_build_object('state','limited');end if;
  if operation='begin' and c.expires_at>clock_timestamp() and c.lease is null then
   return jsonb_build_object('state','cached','places',(select coalesce(jsonb_agg(rhh_private.place_json(x) order by x.city,x.state,x.zip,x.id),'[]') from rhh_private.geocode_places x where x.id=any(c.places)));
  end if;
  if operation='retry' then
   if c.lease is null or c.lease::text is distinct from payload->>'lease' or c.lease_until<clock_timestamp() or c.attempts>=2 then return jsonb_build_object('state','busy');end if;
  elsif c.lease_until>clock_timestamp() then return jsonb_build_object('state','busy');end if;
  cap:=least(cfg.daily_budget,coalesce((payload->>'budget')::integer,2400));
  if cap<1 or cap>2800 then raise exception 'invalid_geocoding';end if;
  if not rhh_private.geocode_tick('provider-second',1,4) then return jsonb_build_object('state','limited');end if;
  if not rhh_private.geocode_tick('provider-day',86400,cap) then return jsonb_build_object('state','budget');end if;
  lease_id:=case when operation='retry' then c.lease else gen_random_uuid() end;
  insert into rhh_private.geocode_cache(query_hash,expires_at,lease,lease_until,attempts) values(q,clock_timestamp()-interval '1 second',lease_id,clock_timestamp()+interval '25 seconds',1)
  on conflict(query_hash) do update set lease=lease_id,lease_until=clock_timestamp()+interval '25 seconds',attempts=case when operation='retry' then rhh_private.geocode_cache.attempts+1 else 1 end;
  return jsonb_build_object('state','lookup','lease',lease_id);
 else raise exception 'invalid_geocoding';end if;
 return jsonb_build_object('state','cached','places',(select coalesce(jsonb_agg(rhh_private.place_json(x) order by x.city,x.state,x.zip,x.id),'[]') from rhh_private.geocode_places x where x.id=any(ids)));
end $$;
alter function rhh_private.geocoding(text,text,jsonb) owner to rhh_location_writer;revoke all on function rhh_private.geocoding(text,text,jsonb) from public;grant execute on function rhh_private.geocoding(text,text,jsonb) to anon,authenticated;
create function public.rhh_geocoding(gateway text,operation text,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select rhh_private.geocoding(gateway,operation,payload)$$;
revoke all on function public.rhh_geocoding(text,text,jsonb) from public;grant execute on function public.rhh_geocoding(text,text,jsonb) to anon,authenticated;

create function rhh_private.member_location(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$declare uid uuid:=rhh_private.confirmed_user_id();pid uuid;ver integer;chosen rhh_private.geocode_places%rowtype;current_place jsonb;begin
 perform rhh_private.review_member_target();
 select id,profile_version into pid,ver from rhh.professionals where owner_id=uid for update;
 if pid is null then raise exception using errcode='42501',message='owned_listing_required';end if;
 if jsonb_typeof(payload)<>'object' or payload - array['action','place','version']<>'{}'::jsonb then raise exception 'invalid_location';end if;
 if payload->>'action'='save' then
  if (payload->>'version')::integer is distinct from ver then raise exception using errcode='40001',message='stale_location';end if;
  if not payload ? 'place' then raise exception 'invalid_location';end if;
  if payload->>'place' is null then delete from rhh_private.professional_locations where professional_id=pid and owner_id=uid;
  else
   select * into chosen from rhh_private.geocode_places where id=(payload->>'place')::uuid;
   if chosen.id is null then raise exception 'invalid_location';end if;
   -- Same profile version boundary as ordinary edits; saving a location invalidates stale profile forms.
   update rhh.professionals set city=chosen.city,state=chosen.state where id=pid;
   insert into rhh_private.professional_locations(professional_id,owner_id,place_id,point) values(pid,uid,chosen.id,chosen.point)
   on conflict(professional_id) do update set owner_id=uid,place_id=chosen.id,point=chosen.point,updated_at=clock_timestamp();
  end if;
  update rhh.professionals set profile_version=profile_version+1 where id=pid returning profile_version into ver;
 elsif payload->>'action' is distinct from 'get' then raise exception 'invalid_location';end if;
 select rhh_private.place_json(g) into current_place from rhh_private.professional_locations l join rhh_private.geocode_places g on g.id=l.place_id where l.professional_id=pid and l.owner_id=uid;
 return jsonb_build_object('version',ver,'location',current_place);
end $$;
alter function rhh_private.member_location(jsonb) owner to rhh_location_writer;revoke all on function rhh_private.member_location(jsonb) from public,anon;grant execute on function rhh_private.member_location(jsonb) to authenticated;
create function public.rhh_member_location(payload jsonb default '{"action":"get"}') returns jsonb language sql security invoker set search_path='' as $$select rhh_private.member_location(payload)$$;
revoke all on function public.rhh_member_location(jsonb) from public,anon;grant execute on function public.rhh_member_location(jsonb) to authenticated;

create function rhh_private.location_current(pid uuid,uid uuid) returns boolean language sql security definer set search_path='' as $$select exists(select 1 from rhh.professionals where id=pid and owner_id=uid)$$;
alter function rhh_private.location_current(uuid,uuid) owner to rhh_location_writer;revoke all on function rhh_private.location_current(uuid,uuid) from public,anon,authenticated;grant execute on function rhh_private.location_current(uuid,uuid) to rhh_public_reader;
grant select on rhh_private.professional_locations,rhh_private.geocode_places to rhh_public_reader;
create policy location_public on rhh_private.professional_locations for select to rhh_public_reader using(rhh_private.review_eligible(professional_id) and rhh_private.location_current(professional_id,owner_id));
create policy place_public on rhh_private.geocode_places for select to rhh_public_reader using(true);
create function rhh_private.invalidate_public_location() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.city is distinct from old.city or new.state is distinct from old.state or new.owner_id is distinct from old.owner_id then delete from rhh_private.professional_locations where professional_id=new.id;end if;return new;end $$;
alter function rhh_private.invalidate_public_location() owner to rhh_location_writer;revoke all on function rhh_private.invalidate_public_location() from public,anon,authenticated;
create trigger invalidate_public_location after update of city,state,owner_id on rhh.professionals for each row execute function rhh_private.invalidate_public_location();

create function rhh_private.directory_search(filters jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare origin rhh_private.geocode_places%rowtype;snapshot jsonb;rad integer;pg integer;ordering text;result jsonb;begin
 if jsonb_typeof(filters)<>'object' or filters-array['q','category','state','minRating','radius','sort','page','place','location']<>'{}'::jsonb then raise exception 'invalid_search';end if;
 if filters ? 'latitude' or filters ? 'longitude' then raise exception 'invalid_search';end if;
 pg:=coalesce((filters->>'page')::integer,1);rad:=(filters->>'radius')::integer;ordering:=coalesce(nullif(filters->>'sort',''),'az');
 if pg not between 1 and 10000 or (rad is not null and rad not in (10,25,50,100)) or ordering not in ('az','za','nearest','rating') or length(coalesce(filters->>'q',''))>100 or length(coalesce(filters->>'category',''))>80 or coalesce(filters->>'state','') !~ '^([A-Z]{2})?$' or (filters->>'minRating' is not null and (filters->>'minRating')::numeric not in (1,2,3,4,4.5,5)) then raise exception 'invalid_search';end if;
 if nullif(filters->>'place','') is not null then select * into origin from rhh_private.geocode_places where id=(filters->>'place')::uuid;if origin.id is null then raise exception 'location_unavailable';end if;end if;
 if origin.id is null and (rad is not null or ordering='nearest' or nullif(filters->>'location','') is not null) then raise exception 'choose_location';end if;
 snapshot:=rhh_private.public_directory();
 with base as materialized (
  select p,l.point,g.id as place_id,rhh_private.place_json(g) as location,
   case when origin.id is not null and l.point is not null then extensions.st_distance(l.point,origin.point) end as meters,
   (select round(avg((r->>'rating')::numeric),1) from jsonb_array_elements(snapshot->'reviews') r where r->>'professionalId'=p->>'id') as average,
   (select count(*) from jsonb_array_elements(snapshot->'reviews') r where r->>'professionalId'=p->>'id') as review_count
  from jsonb_array_elements(snapshot->'profiles') p left join rhh_private.professional_locations l on l.professional_id=(p->>'id')::uuid left join rhh_private.geocode_places g on g.id=l.place_id
  where (coalesce(filters->>'category','')='' or p->'categoryIds' ? (filters->>'category')) and (coalesce(filters->>'state','')='' or p->>'state'=filters->>'state')
  and not exists(select 1 from regexp_split_to_table(lower(trim(coalesce(filters->>'q',''))),'\s+') term where term<>'' and position(term in lower(concat_ws(' ',p->>'businessName',p->>'summary',p->>'specialty',p->'services'::text,(select string_agg(c->>'name',' ') from jsonb_array_elements(snapshot->'catalog') c where p->'categoryIds' ? (c->>'id')))))=0)
 ), rated as materialized(select * from base where filters->>'minRating' is null or average >= (filters->>'minRating')::numeric),
 eligible as materialized(select * from rated where (origin.id is null or (rad is null and ordering<>'nearest') or point is not null) and (rad is null or (p->>'id')::uuid in (select spatial.professional_id from rhh_private.professional_locations spatial where extensions.st_dwithin(spatial.point,origin.point,rad*1609.344)))),
 numbered as(select *,row_number() over(order by case when ordering='nearest' then meters end asc nulls last,case when ordering='rating' then average end desc nulls last,case when ordering='rating' then review_count end desc,case when ordering='za' then lower(p->>'businessName') end desc,case when ordering<>'za' then lower(p->>'businessName') end asc,p->>'id') as rn from eligible),
 totals as(select count(*) as total,greatest(1,ceil(count(*)/6.0)::integer) as pages from eligible),
 paged as(select * from numbered where rn between (least(pg,(select pages from totals))-1)*6+1 and least(pg,(select pages from totals))*6)
 select jsonb_build_object('catalog',snapshot->'catalog','profiles',(select coalesce(jsonb_agg(p order by rn),'[]') from paged),
 'reviews',(select coalesce(jsonb_agg(r),'[]') from jsonb_array_elements(snapshot->'reviews') r where r->>'professionalId' in(select p->>'id' from paged)),
 'locations',(select coalesce(jsonb_agg(jsonb_build_object('professionalId',p->>'id','location',case when place_id is null then null else location end,'distanceMiles',meters/1609.344) order by rn),'[]') from paged),
 'total',total,'pages',pages,'page',least(pg,pages),'missingCoordinates',(select count(*) from rated where point is null),'origin',case when origin.id is null then null else rhh_private.place_json(origin) end) into result from totals;
 return result;end $$;
alter function rhh_private.directory_search(jsonb) owner to rhh_public_reader;revoke all on function rhh_private.directory_search(jsonb) from public;grant execute on function rhh_private.directory_search(jsonb) to anon,authenticated;
create function public.rhh_directory_search(filters jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select rhh_private.directory_search(filters)$$;
revoke all on function public.rhh_directory_search(jsonb) from public;grant execute on function public.rhh_directory_search(jsonb) to anon,authenticated;
revoke create on schema rhh_private from rhh_location_writer,rhh_public_reader;
notify pgrst,'reload schema';
commit;
