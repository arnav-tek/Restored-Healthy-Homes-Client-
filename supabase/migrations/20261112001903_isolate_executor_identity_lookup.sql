-- Managed Auth schemas do not delegate USAGE to application executor roles.
-- Return only the verified request UID through a private, fixed-path helper.
begin;
create function rhh_private.request_user_id() returns uuid
language sql stable security definer set search_path='' as $$ select auth.uid() $$;
revoke all on function rhh_private.request_user_id() from public,anon,authenticated;
grant execute on function rhh_private.request_user_id() to rhh_member_writer,rhh_admin_writer,rhh_public_reader;

-- Preserve all existing ownership, role, session, RLS and projection decisions.
do $$ declare item record; definition text; statement text; begin
 for item in
  select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='rhh_private' and (not p.prosecdef or p.proowner in
   (select oid from pg_roles where rolname in ('rhh_member_writer','rhh_admin_writer','rhh_public_reader')))
   and position('auth.uid()' in p.prosrc)>0
 loop
  definition:=pg_get_functiondef(item.oid);
  execute replace(definition,'auth.uid()','rhh_private.request_user_id()');
 end loop;
 for item in
  select p.polname,p.polrelid,pg_get_expr(p.polqual,p.polrelid) as using_expression,
   pg_get_expr(p.polwithcheck,p.polrelid) as check_expression
  from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='rhh' and (position('auth.uid()' in coalesce(pg_get_expr(p.polqual,p.polrelid),''))>0
   or position('auth.uid()' in coalesce(pg_get_expr(p.polwithcheck,p.polrelid),''))>0)
 loop
  statement:=format('alter policy %I on %s',item.polname,item.polrelid::regclass);
  if item.using_expression is not null then statement:=statement||' using ('||replace(item.using_expression,'auth.uid()','rhh_private.request_user_id()')||')';end if;
  if item.check_expression is not null then statement:=statement||' with check ('||replace(item.check_expression,'auth.uid()','rhh_private.request_user_id()')||')';end if;
  execute statement;
 end loop;
end $$;
notify pgrst,'reload schema';
commit;
