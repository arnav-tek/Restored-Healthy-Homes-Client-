-- Read-only hosted verification; run as the SQL Editor database role.
select 'Application tables' as check_name, count(*)::text as result from pg_tables where schemaname='rhh'
union all select 'Tables with forced RLS',count(*)::text from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='rhh' and c.relkind='r' and c.relrowsecurity and c.relforcerowsecurity
union all select 'Seeded categories',count(*)::text from rhh.categories
union all select 'Anonymous schema access',has_schema_privilege('anon','rhh','USAGE')::text
union all select 'Authenticated schema access',has_schema_privilege('authenticated','rhh','USAGE')::text
union all select 'Eligible approved active listing',rhh.is_publicly_eligible('approved','active',false)::text
union all select 'Suspended listing eligible',rhh.is_publicly_eligible('approved','active',true)::text
union all select 'Private records seeded',((select count(*) from rhh.accounts)+(select count(*) from rhh.professionals)+(select count(*) from rhh.reviews))::text;
