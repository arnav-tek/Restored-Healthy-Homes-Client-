-- Read-only Stage 5 operator verification. No user/profile values or credentials.
select 'versions' as check,string_agg(version,',' order by version) as result from supabase_migrations.schema_migrations
union all select 'tables_without_forced_rls',count(*)::text from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='rhh' and c.relkind='r' and not(c.relrowsecurity and c.relforcerowsecurity)
union all select 'exposed_business_views',count(*)::text from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('rhh','public') and c.relkind in ('v','m')
union all select 'unsafe_definer_search_paths',count(*)::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='rhh_private' and p.prosecdef and not(p.proconfig @> array['search_path=""'])
union all select 'raw_member_schema',has_schema_privilege('authenticated','rhh','usage')::text
union all select 'raw_anon_schema',has_schema_privilege('anon','rhh','usage')::text
union all select 'member_session_table',has_table_privilege('authenticated','auth.sessions','select')::text
union all select 'member_session_helper',has_function_privilege('authenticated','rhh_private.has_current_session()','execute')::text
union all select 'public_contact_name',has_column_privilege('rhh_public_reader','rhh.applications','contact_name','select')::text
union all select 'public_notes',has_column_privilege('rhh_public_reader','rhh.applications','internal_notes','select')::text
union all select 'public_display_name',has_column_privilege('rhh_public_reader','rhh.professionals','public_display_name','select')::text
union all select 'member_role_edit',has_column_privilege('rhh_member_writer','rhh.accounts','role','update')::text
union all select 'admin_membership_edit',has_column_privilege('rhh_admin_writer','rhh.memberships','status','update')::text
union all select 'unsafe_executors',count(*)::text from pg_roles where rolname in ('rhh_member_writer','rhh_admin_writer','rhh_public_reader') and (rolcanlogin or rolbypassrls)
union all select 'anonymous_rpcs',string_agg(p.proname,',' order by p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'rhh_%' and has_function_privilege('anon',p.oid,'execute')
union all select 'authenticated_rpcs',string_agg(p.proname,',' order by p.proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'rhh_%' and has_function_privilege('authenticated',p.oid,'execute')
union all select 'function_fingerprint',md5(string_agg(n.nspname||'.'||p.proname||':'||p.prosecdef::text||':'||p.proowner::regrole::text||':'||md5(replace(p.prosrc,chr(13),'')), '|' order by n.nspname,p.proname)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='rhh_private' or (n.nspname='public' and p.proname like 'rhh_%');

-- Managed Auth schema access is not required; only the private UID helper is executable.
select rolname,has_schema_privilege(rolname,'auth','usage') as auth_usage,has_table_privilege(rolname,'auth.users','select') as auth_users_read,has_table_privilege(rolname,'auth.sessions','select') as auth_sessions_read from pg_roles where rolname in ('rhh_member_writer','rhh_admin_writer','rhh_public_reader');

select rolname,has_function_privilege(rolname,'rhh_private.request_user_id()','execute') as request_uid_lookup from pg_roles where rolname in ('anon','authenticated','rhh_member_writer','rhh_admin_writer','rhh_public_reader');
