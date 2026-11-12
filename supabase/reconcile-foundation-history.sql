-- One-time ledger reconciliation, NOT an application migration or a replay.
-- Only for verified restored-healthy-homes-staging (xjecnuebalmmblowmtks).
-- Uses the CLI's version/name/statements ledger shape. Source SQL stays in Git;
-- statements is NULL because this operation records SQL Editor execution only.
begin;
set local lock_timeout = '4s';
do $$
begin
  if to_regclass('supabase_migrations.schema_migrations') is not null then
    raise exception 'History already exists: inspect it before reconciliation';
  end if;
  if (select md5(string_agg(table_name||':'||column_name||':'||data_type||':'||is_nullable||':'||coalesce(column_default,''),'|' order by table_name,ordinal_position)) from information_schema.columns where table_schema='rhh') is distinct from '333db247180942ce7776fd5e4dfbe95f'
    or (select md5(string_agg(c.conrelid::regclass::text||':'||c.conname||':'||pg_get_constraintdef(c.oid),'|' order by c.conrelid::regclass::text,c.conname)) from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname='rhh' and c.contype <> 'n') is distinct from '85382f7b6a2a5e04bb5f6f74d91c895c'
    or (select md5(string_agg(indexdef,'|' order by indexname)) from pg_indexes where schemaname='rhh') is distinct from '1cd74aada2cab8a8f047333621b7e8ea'
    or (select md5(string_agg(id||':'||name||':'||monthly_usd||':'||billing_key,'|' order by id)) from rhh.categories) is distinct from 'c90b203114a5277200f9df1a99a33c14'
  then raise exception 'Foundation fingerprint mismatch'; end if;
  if (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='rhh' and c.relkind='r' and c.relrowsecurity and c.relforcerowsecurity) <> 15
    or has_schema_privilege('anon','rhh','usage') or has_schema_privilege('authenticated','rhh','usage')
    or exists(select 1 from pg_policies where schemaname='rhh')
  then raise exception 'Foundation access boundary mismatch'; end if;
end $$;
create schema if not exists supabase_migrations;
create table supabase_migrations.schema_migrations (
  version text not null primary key,
  statements text[],
  name text
);
revoke all on schema supabase_migrations from public, anon, authenticated;
revoke all on supabase_migrations.schema_migrations from public, anon, authenticated;
insert into supabase_migrations.schema_migrations(version,name)
values ('20261107231103','database_foundation');
commit;
select version,name from supabase_migrations.schema_migrations order by version;
