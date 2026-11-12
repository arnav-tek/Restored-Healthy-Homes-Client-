select 'tables' as check_name, count(*)::text as result from pg_tables where schemaname='rhh'
union all select 'forced_rls', count(*)::text from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='rhh' and c.relkind='r' and c.relrowsecurity and c.relforcerowsecurity
union all select 'columns_fingerprint',md5(string_agg(table_name||':'||column_name||':'||data_type||':'||is_nullable||':'||coalesce(column_default,''),'|' order by table_name,ordinal_position)) from information_schema.columns where table_schema='rhh'
union all select 'constraints_fingerprint',md5(string_agg(c.conrelid::regclass::text||':'||c.conname||':'||pg_get_constraintdef(c.oid),'|' order by c.conrelid::regclass::text,c.conname)) from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname='rhh' and c.contype <> 'n'
union all select 'indexes_fingerprint',md5(string_agg(indexdef,'|' order by indexname)) from pg_indexes where schemaname='rhh'
union all select 'catalog_fingerprint',md5(string_agg(id||':'||name||':'||monthly_usd||':'||billing_key,'|' order by id)) from rhh.categories
union all select 'browser_schema_access', (has_schema_privilege('anon','rhh','USAGE') or has_schema_privilege('authenticated','rhh','USAGE'))::text
union all select 'browser_table_grants',count(*)::text from information_schema.role_table_grants where table_schema='rhh' and grantee in ('PUBLIC','anon','authenticated')
union all select 'policies',count(*)::text from pg_policies where schemaname='rhh'
union all select 'eligibility_failures',count(*)::text from (values ('pending'),('approved'),('rejected')) a(approval) cross join (values ('active'),('inactive'),('past_due'),('canceled'),('trialing'),('unpaid')) s(subscription) cross join (values (true),(false)) u(suspended) where rhh.is_publicly_eligible(approval,subscription,suspended) is distinct from (approval='approved' and subscription='active' and suspended=false);

