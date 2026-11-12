-- Read-only verification; no fixture insertion, role assignment or activation.
select 'versions' as check, string_agg(version,',' order by version) as result from supabase_migrations.schema_migrations
union all select 'forced_rls_tables',count(*)::text from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='rhh' and c.relkind='r' and c.relrowsecurity and c.relforcerowsecurity
union all select 'raw_anon_schema',has_schema_privilege('anon','rhh','usage')::text
union all select 'raw_member_schema',has_schema_privilege('authenticated','rhh','usage')::text
union all select 'anonymous_admin_rpc',has_function_privilege('anon','public.rhh_admin_workspace()','execute')::text
union all select 'anonymous_directory_rpc',has_function_privilege('anon','public.rhh_public_directory()','execute')::text
union all select 'member_role_edit',has_column_privilege('rhh_member_writer','rhh.accounts','role','update')::text
union all select 'admin_membership_edit',has_column_privilege('rhh_admin_writer','rhh.memberships','status','update')::text
union all select 'public_private_notes',has_column_privilege('rhh_public_reader','rhh.applications','internal_notes','select')::text
union all select 'unsafe_executors',count(*)::text from pg_roles where rolname in ('rhh_admin_writer','rhh_public_reader') and (rolcanlogin or rolbypassrls)
union all select 'function_fingerprint',md5(string_agg(n.nspname||'.'||p.proname||':'||p.prosecdef::text||':'||p.proowner::regrole::text||':'||md5(replace(p.prosrc,chr(13),'')), '|' order by n.nspname,p.proname)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='rhh_private' or (n.nspname='public' and p.proname like 'rhh_%');
