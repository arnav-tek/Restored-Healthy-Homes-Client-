-- Read-only post-migration verification. Does not reveal private records.
select
  (select string_agg(version, ',' order by version) from supabase_migrations.schema_migrations) as versions,
  (select count(*) from pg_policies where schemaname='rhh') as policies,
  (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='rhh' and c.relkind='r' and c.relrowsecurity and c.relforcerowsecurity) as forced_rls_tables,
  has_schema_privilege('authenticated','rhh','usage') as raw_schema_access,
  has_column_privilege('rhh_member_writer','rhh.applications','internal_notes','select') as notes_access,
  has_column_privilege('rhh_member_writer','rhh.applications','approval','update') as approval_edit,
  has_column_privilege('rhh_member_writer','rhh.credentials','verification','update') as verification_edit,
  (select rolcanlogin or rolbypassrls from pg_roles where rolname='rhh_member_writer') as unsafe_executor,
  has_function_privilege('anon','public.rhh_member_workspace()','execute') as anonymous_rpc,
  has_function_privilege('authenticated','public.rhh_member_workspace()','execute') as authenticated_rpc,
  (select count(*) from rhh.accounts) as accounts,
  (select count(*) from rhh.professionals) as listings,
  (select md5(string_agg(n.nspname||'.'||p.proname||':'||p.prosecdef::text||':'||p.proowner::regrole::text||':'||md5(replace(p.prosrc,chr(13),'')), '|' order by n.nspname,p.proname)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='rhh_private' or (n.nspname='public' and p.proname like 'rhh_%')) as functions_fingerprint;
