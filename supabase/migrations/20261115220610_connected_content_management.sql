begin;
-- Existing articles/pathways retain their IDs and published data. Drafts live separately.
create table rhh_private.content_documents (
 id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('resource','pathway','about','contact','terms','privacy','disclaimer')),
 key text not null check(length(key)<=100 and key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 article_id uuid unique references rhh.articles(id) on delete restrict,
 category_id text unique references rhh.categories(id) on delete restrict,
 draft jsonb not null, published jsonb, version integer not null default 1 check(version>0),published_version integer,
 unique(kind,key),check((kind='resource')=(article_id is not null)),check((kind='pathway')=(category_id is not null)),
 check((published is null)=(published_version is null)),check(kind in ('resource','pathway') or key=kind)
);
create table rhh_private.content_changes (
 id uuid primary key default gen_random_uuid(),document_id uuid not null references rhh_private.content_documents(id) on delete restrict,
 actor_id uuid not null references rhh.accounts(user_id) on delete restrict,
 action text not null check(action in ('create','save','publish','unpublish')),version integer not null,
 at timestamptz not null default now(),reason text not null check(length(reason) between 3 and 300),
 snapshot jsonb not null,unique(document_id,version)
);
create index content_changes_document_idx on rhh_private.content_changes(document_id,version desc);
create index content_public_idx on rhh_private.content_documents(kind,key) where published is not null;
revoke all on rhh_private.content_documents,rhh_private.content_changes from public,anon,authenticated;
alter table rhh_private.content_documents enable row level security;
alter table rhh_private.content_documents force row level security;
alter table rhh_private.content_changes enable row level security;
alter table rhh_private.content_changes force row level security;
create policy content_admin_read on rhh_private.content_documents for select to rhh_admin_writer using ((select rhh_private.is_admin()));
create policy content_admin_insert on rhh_private.content_documents for insert to rhh_admin_writer with check ((select rhh_private.is_admin()));
create policy content_admin_update on rhh_private.content_documents for update to rhh_admin_writer using ((select rhh_private.is_admin())) with check ((select rhh_private.is_admin()));
create policy content_public_read on rhh_private.content_documents for select to rhh_public_reader using (published is not null);
create policy content_history_read on rhh_private.content_changes for select to rhh_admin_writer using ((select rhh_private.is_admin()));
create policy content_history_append on rhh_private.content_changes for insert to rhh_admin_writer with check ((select rhh_private.is_admin()));
grant select,insert on rhh_private.content_documents to rhh_admin_writer;
grant update(draft,published,published_version,version) on rhh_private.content_documents to rhh_admin_writer;
grant select,insert on rhh_private.content_changes to rhh_admin_writer;
grant select(kind,key,published) on rhh_private.content_documents to rhh_public_reader;
create function rhh_private.immutable_content_history() returns trigger language plpgsql set search_path='' as $$begin raise exception using errcode='42501',message='immutable_content_history';end$$;
revoke all on function rhh_private.immutable_content_history() from public,anon,authenticated;
create trigger immutable_content_history before update or delete on rhh_private.content_changes for each row execute function rhh_private.immutable_content_history();
-- Carry forward real legacy records only. No demo/client copy or fictional article is seeded.
insert into rhh_private.content_documents(id,kind,key,article_id,draft,published,published_version)
 select id,'resource',slug,id,jsonb_build_object('title',title,'summary',summary,'category',category,'body',body),
 case when status='published' then jsonb_build_object('title',title,'summary',summary,'category',category,'body',body) end,case when status='published' then 1 end from rhh.articles;
insert into rhh_private.content_documents(kind,key,category_id,draft,published,published_version)
 select 'pathway',category_id,category_id,jsonb_build_object('introduction',introduction,'providerName',provider_name,'providerUrl',provider_url,'kind',qualification_kind,'description',description,'requirements',requirements,'steps',array_to_string(steps,E'\n'),'timeline',timeline,'costs',costs),
 case when status='published' then jsonb_build_object('introduction',introduction,'providerName',provider_name,'providerUrl',provider_url,'kind',qualification_kind,'description',description,'requirements',requirements,'steps',array_to_string(steps,E'\n'),'timeline',timeline,'costs',costs) end,case when status='published' then 1 end from rhh.certification_pathways;
-- Scoped executors can mirror publication into the existing domain tables; browsers cannot.
grant select,insert on rhh.articles,rhh.certification_pathways to rhh_admin_writer;
grant update(title,summary,category,body,status) on rhh.articles to rhh_admin_writer;
grant update(introduction,provider_name,provider_url,qualification_kind,description,requirements,steps,timeline,costs,status) on rhh.certification_pathways to rhh_admin_writer;
create policy article_admin_read on rhh.articles for select to rhh_admin_writer using ((select rhh_private.is_admin()));
create policy article_admin_insert on rhh.articles for insert to rhh_admin_writer with check ((select rhh_private.is_admin()));
create policy article_admin_update on rhh.articles for update to rhh_admin_writer using ((select rhh_private.is_admin())) with check ((select rhh_private.is_admin()));
create policy pathway_admin_read on rhh.certification_pathways for select to rhh_admin_writer using ((select rhh_private.is_admin()));
create policy pathway_admin_insert on rhh.certification_pathways for insert to rhh_admin_writer with check ((select rhh_private.is_admin()));
create policy pathway_admin_update on rhh.certification_pathways for update to rhh_admin_writer using ((select rhh_private.is_admin())) with check ((select rhh_private.is_admin()));
-- Explicit fields, limits and URL policies apply to direct RPC calls too.
create function rhh_private.validate_content(k text,d jsonb,publishing boolean default false) returns jsonb language plpgsql immutable set search_path='' as $$
declare specs jsonb:='{"resource":{"title":120,"summary":350,"category":30,"body":10000},"pathway":{"introduction":500,"providerName":160,"providerUrl":400,"kind":50,"description":1500,"requirements":1500,"steps":2000,"timeline":500,"costs":700},"about":{"title":120,"summary":350,"story":10000,"why":5000,"videoSrc":500,"posterSrc":500,"captionsSrc":500,"transcript":10000},"contact":{"title":120,"summary":350,"body":5000,"email":254,"phone":40},"terms":{"title":120,"summary":350,"body":30000},"privacy":{"title":120,"summary":350,"body":30000},"disclaimer":{"title":120,"summary":350,"body":10000}}';spec jsonb;f text;v text;out jsonb:='{}';lines text[];
begin
 spec:=specs->k;
 if spec is null or jsonb_typeof(d) is distinct from 'object' or d-array(select jsonb_object_keys(spec))<>'{}' or not(d ?& array(select jsonb_object_keys(spec))) then raise exception using errcode='22023',message='invalid_content_fields';end if;
 for f in select jsonb_object_keys(spec) loop
  v:=d->>f;
  if jsonb_typeof(d->f) is distinct from 'string' or length(regexp_replace(v,U&'[\+010000-\+10ffff]','xx','g'))>(spec->>f)::int or v ~ E'[\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x7f]' then raise exception using errcode='22023',message='invalid_content_fields';end if;
  out:=out||jsonb_build_object(f,trim(v));
 end loop;
 if k='resource' and out->>'category'<>'' and out->>'category' not in ('planning','professionals','platform','stories') then raise exception using errcode='22023',message='invalid_content_category';end if;
 if k='pathway' and out->>'providerUrl'<>'' and (out->>'providerUrl' !~* '^https://[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:443)?([/?#][^[:space:]\\]*)?$' or split_part(split_part(substr(out->>'providerUrl',9),'/',1),'?',1) not like '%.%') then raise exception using errcode='22023',message='unsafe_provider_url';end if;
 if k='about' then
  if (out->>'videoSrc'<>'' and out->>'videoSrc' !~ '^/media/client/[a-zA-Z0-9_-]+\.(mp4|webm)$') or (out->>'posterSrc'<>'' and out->>'posterSrc' !~ '^/media/client/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$') or (out->>'captionsSrc'<>'' and out->>'captionsSrc' !~ '^/media/client/[a-zA-Z0-9_-]+\.vtt$') then raise exception using errcode='22023',message='unsafe_media_url';end if;
 end if;
 if k='contact' and ((out->>'email'<>'' and out->>'email' !~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$') or (out->>'phone'<>'' and out->>'phone' !~ '^\+?[0-9() .-]{7,40}$')) then raise exception using errcode='22023',message='invalid_public_contact';end if;
 if publishing then
  if k='pathway' then
   if length(out->>'introduction')<20 or length(out->>'providerName')<3 or length(out->>'providerUrl')<3 or length(out->>'description')<20 or length(out->>'requirements')<10 or length(out->>'steps')<10 or length(out->>'timeline')<3 or length(out->>'costs')<3 or out->>'kind' not in ('Professional certification','Training / continuing education','Provider training and assessment') then raise exception using errcode='22023',message='incomplete_pathway';end if;
   lines:=array(select trim(x) from unnest(regexp_split_to_array(out->>'steps',E'\\r?\\n')) x where trim(x)<>'');
   if cardinality(lines) not between 1 and 8 or exists(select 1 from unnest(lines) x where length(regexp_replace(x,U&'[\+010000-\+10ffff]','xx','g'))>300) then raise exception using errcode='22023',message='invalid_pathway_steps';end if;
  else
   if out->>'title'='' or out->>'summary'='' or (k<>'about' and out->>'body'='') then raise exception using errcode='22023',message='incomplete_content';end if;
   if k='resource' and (length(out->>'title')<3 or length(out->>'summary')<20 or length(out->>'body')<40 or out->>'category'='') then raise exception using errcode='22023',message='incomplete_resource';end if;
   if k='about' and (out->>'story'='' or out->>'why'='' or (out->>'videoSrc'<>'' and (out->>'captionsSrc'='' or out->>'transcript'=''))) then raise exception using errcode='22023',message='incomplete_about';end if;
  end if;
 end if;
 return out;
end$$;
revoke all on function rhh_private.validate_content(text,jsonb,boolean) from public,anon,authenticated;
grant execute on function rhh_private.validate_content(text,jsonb,boolean) to rhh_admin_writer,rhh_public_reader;
-- Even published DTOs are reconstructed field-by-field, never raw draft/history rows.
create function rhh_private.content_public_fields(k text,d jsonb) returns jsonb language sql immutable set search_path='' as $$
 select coalesce(jsonb_object_agg(f,d->f),'{}') from jsonb_object_keys(('{"resource":{"title":120,"summary":350,"category":30,"body":10000},"pathway":{"introduction":500,"providerName":160,"providerUrl":400,"kind":50,"description":1500,"requirements":1500,"steps":2000,"timeline":500,"costs":700},"about":{"title":120,"summary":350,"story":10000,"why":5000,"videoSrc":500,"posterSrc":500,"captionsSrc":500,"transcript":10000},"contact":{"title":120,"summary":350,"body":5000,"email":254,"phone":40},"terms":{"title":120,"summary":350,"body":30000},"privacy":{"title":120,"summary":350,"body":30000},"disclaimer":{"title":120,"summary":350,"body":10000}}'::jsonb)->k) f
$$;
revoke all on function rhh_private.content_public_fields(text,jsonb) from public,anon,authenticated;grant execute on function rhh_private.content_public_fields(text,jsonb) to rhh_admin_writer,rhh_public_reader;
grant create on schema rhh_private to rhh_admin_writer,rhh_public_reader;
create function rhh_private.admin_content(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid;act text;doc rhh_private.content_documents;k text;ky text;d jsonb;why text;pg integer:=1;target uuid;unchanged boolean:=false;total_rows integer;
begin
 actor:=rhh_private.require_admin();
 if jsonb_typeof(payload) is distinct from 'object' or jsonb_typeof(payload->'action') is distinct from 'string' then raise exception using errcode='22023',message='invalid_content';end if;
 act:=payload->>'action';
 if act='get' then
  if payload-array['action','page','id']<>'{}' or (payload ? 'page' and (jsonb_typeof(payload->'page') is distinct from 'number' or payload->>'page' !~ '^[1-9][0-9]{0,5}$')) or (payload ? 'id' and (jsonb_typeof(payload->'id') is distinct from 'string' or payload->>'id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')) then raise exception using errcode='22023',message='invalid_content';end if;
  pg:=coalesce((payload->>'page')::integer,1);target:=(payload->>'id')::uuid;
 else
  k:=payload->>'kind';why:=trim(payload->>'reason');
  if jsonb_typeof(payload->'kind') is distinct from 'string' or k not in ('resource','pathway','about','contact','terms','privacy','disclaimer') or jsonb_typeof(payload->'reason') is distinct from 'string' or length(why) not between 3 and 300 then raise exception using errcode='22023',message='invalid_content';end if;
  if act='create' then
   if payload-array['action','kind','key','fields','reason']<>'{}' or not(payload ?& array['action','kind','key','fields','reason']) or jsonb_typeof(payload->'key') is distinct from 'string' then raise exception using errcode='22023',message='invalid_content';end if;
   ky:=payload->>'key';d:=rhh_private.validate_content(k,payload->'fields');
   if length(ky) not between 1 and 100 or ky !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or (k not in ('resource','pathway') and ky<>k) then raise exception using errcode='22023',message='invalid_content_key';end if;
   if k='resource' then
    insert into rhh.articles(slug,title,summary,category,body,status) values(ky,coalesce(nullif(d->>'title',''),'Untitled'),d->>'summary',d->>'category',d->>'body','draft') returning id into target;
   elsif k='pathway' then
    if not exists(select 1 from rhh.categories where id=ky) then raise exception using errcode='22023',message='invalid_content_category';end if;
    insert into rhh.certification_pathways(category_id,introduction,provider_name,provider_url,qualification_kind,description,requirements,steps,timeline,costs,status) values(ky,d->>'introduction',d->>'providerName',d->>'providerUrl',d->>'kind',d->>'description',d->>'requirements','{}',d->>'timeline',d->>'costs','draft');
   end if;
   insert into rhh_private.content_documents(id,kind,key,article_id,category_id,draft) values(coalesce(target,gen_random_uuid()),k,ky,case when k='resource' then target end,case when k='pathway' then ky end,d) returning * into doc;
  elsif act in ('save','publish','unpublish') then
   if jsonb_typeof(payload->'id') is distinct from 'string' or payload->>'id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' or jsonb_typeof(payload->'version') is distinct from 'number' or payload->>'version' !~ '^[1-9][0-9]{0,8}$' or not(payload ?& array['action','id','kind','version','reason']) then raise exception using errcode='22023',message='invalid_content';end if;
   if (act='save' and (payload-array['action','id','kind','version','fields','reason']<>'{}' or not(payload ? 'fields'))) or (act='publish' and (payload-array['action','id','kind','version','approved','reason']<>'{}' or payload->'approved' is distinct from 'true'::jsonb)) or (act='unpublish' and payload-array['action','id','kind','version','reason']<>'{}') then raise exception using errcode='22023',message='invalid_content';end if;
   select * into doc from rhh_private.content_documents where id=(payload->>'id')::uuid and kind=k for update;
   if not found then raise exception using errcode='PT404',message='content_unavailable';end if;
   if doc.version<>(payload->>'version')::integer then raise exception using errcode='PT409',message='stale_content';end if;
   if act='save' then
    d:=rhh_private.validate_content(k,payload->'fields');unchanged:=d=doc.draft;
    if not unchanged then update rhh_private.content_documents set draft=d,version=version+1 where id=doc.id returning * into doc;end if;
   elsif act='publish' then
    d:=rhh_private.validate_content(k,doc.draft,true);unchanged:=d=doc.published;
    if not coalesce(unchanged,false) then
     update rhh_private.content_documents set published=d,published_version=version+1,version=version+1 where id=doc.id returning * into doc;
     if k='resource' then update rhh.articles set title=d->>'title',summary=d->>'summary',category=d->>'category',body=d->>'body',status='published' where id=doc.article_id;
     elsif k='pathway' then update rhh.certification_pathways set introduction=d->>'introduction',provider_name=d->>'providerName',provider_url=d->>'providerUrl',qualification_kind=d->>'kind',description=d->>'description',requirements=d->>'requirements',steps=array(select trim(x) from unnest(regexp_split_to_array(d->>'steps',E'\\r?\\n')) x where trim(x)<>''),timeline=d->>'timeline',costs=d->>'costs',status='published' where category_id=doc.category_id;end if;
    end if;
   else
    unchanged:=doc.published is null;
    if not unchanged then
     update rhh_private.content_documents set published=null,published_version=null,version=version+1 where id=doc.id returning * into doc;
     if k='resource' then update rhh.articles set status='draft' where id=doc.article_id;elsif k='pathway' then update rhh.certification_pathways set status='draft' where category_id=doc.category_id;end if;
    end if;
   end if;
  else raise exception using errcode='22023',message='invalid_content_action';end if;
  if not coalesce(unchanged,false) then insert into rhh_private.content_changes(document_id,actor_id,action,version,reason,snapshot) values(doc.id,actor,act,doc.version,why,doc.draft);end if;
  target:=doc.id;
 end if;
 select count(*) into total_rows from rhh_private.content_documents where target is null or id=target;
 return jsonb_build_object('page',pg,'total',total_rows,'items',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'kind',kind,'key',key,'fields',draft,'version',version,'publishedVersion',published_version,'published',case when published is not null then jsonb_build_object('kind',kind,'key',key,'fields',rhh_private.content_public_fields(kind,published)) end) order by kind,key),'[]') from (select * from rhh_private.content_documents where target is null or id=target order by kind,key limit 20 offset (pg-1)*20) q),
 'history',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'action',action,'version',version,'reason',reason,'at',at) order by version desc),'[]') from (select * from rhh_private.content_changes where document_id=target order by version desc limit 20) h)) || case when act='get' then '{}'::jsonb else jsonb_build_object('saved',true,'unchanged',coalesce(unchanged,false)) end;
exception when unique_violation then raise exception using errcode='PT409',message='duplicate_content_key';end$$;
alter function rhh_private.admin_content(jsonb) owner to rhh_admin_writer;
revoke all on function rhh_private.admin_content(jsonb) from public,anon,authenticated;grant execute on function rhh_private.admin_content(jsonb) to authenticated;
create function public.rhh_admin_content(payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select rhh_private.admin_content(payload)$$;
revoke all on function public.rhh_admin_content(jsonb) from public,anon,authenticated;grant execute on function public.rhh_admin_content(jsonb) to authenticated;
create function rhh_private.public_content(kind_name text,content_key text default null,page_number integer default 1,category_filter text default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare size integer:=case when kind_name='resource' then 12 else 32 end;
begin
 if (category_filter is not null and (kind_name<>'resource' or category_filter not in ('planning','professionals','platform','stories'))) or kind_name not in ('resource','pathway','about','contact','terms','privacy','disclaimer') or page_number not between 1 and 100000 or (content_key is not null and (length(content_key)>100 or content_key !~ '^[a-z0-9]+(-[a-z0-9]+)*$')) then raise exception using errcode='22023',message='invalid_content_query';end if;
 return jsonb_build_object('page',page_number,'total',(select count(*) from rhh_private.content_documents where kind=kind_name and published is not null and (content_key is null or key=content_key) and (category_filter is null or published->>'category'=category_filter)),
 'items',(select coalesce(jsonb_agg(jsonb_build_object('kind',kind,'key',key,'fields',rhh_private.content_public_fields(kind,published)) order by key),'[]') from (select kind,key,published from rhh_private.content_documents where kind=kind_name and published is not null and (content_key is null or key=content_key) and (category_filter is null or published->>'category'=category_filter) order by key limit size offset (page_number-1)*size) q));
end$$;
alter function rhh_private.public_content(text,text,integer,text) owner to rhh_public_reader;
revoke all on function rhh_private.public_content(text,text,integer,text) from public;grant execute on function rhh_private.public_content(text,text,integer,text) to anon,authenticated;
create function public.rhh_public_content(kind_name text,content_key text default null,page_number integer default 1,category_filter text default null) returns jsonb language sql security invoker set search_path='' as $$select rhh_private.public_content(kind_name,content_key,page_number,category_filter)$$;
revoke all on function public.rhh_public_content(text,text,integer,text) from public;grant execute on function public.rhh_public_content(text,text,integer,text) to anon,authenticated;
revoke create on schema rhh_private from rhh_admin_writer,rhh_public_reader;
notify pgrst,'reload schema';
commit;
