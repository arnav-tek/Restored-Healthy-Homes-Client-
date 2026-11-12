-- Restore the namespace permission required by existing auth.uid() calls in RLS.
-- No Auth table, credential, session, or client schema access is granted.
begin;
grant usage on schema auth to rhh_member_writer, rhh_admin_writer, rhh_public_reader;
notify pgrst,'reload schema';
commit;
