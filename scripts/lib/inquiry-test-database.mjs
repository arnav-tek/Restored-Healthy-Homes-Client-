import { readFile } from "node:fs/promises";
export const a = "00000000-0000-4000-8000-000000000001";
export const b = "00000000-0000-4000-8000-000000000002";
export const unconfirmed = "00000000-0000-4000-8000-000000000003";
const { PGlite } =
  await import("../../output/database-test/node_modules/@electric-sql/pglite/dist/index.js");
export async function openInquiryTestDatabase(options = {}) {
  const db = new PGlite(options);
  await db.exec(`create role anon; create role authenticated; create schema auth;
  create table auth.users(id uuid primary key, email_confirmed_at timestamptz, email text, banned_until timestamptz, deleted_at timestamptz, is_anonymous boolean default false);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  create table auth.sessions(id uuid primary key, user_id uuid references auth.users(id), not_after timestamptz);
  create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('session_id',coalesce(nullif(current_setting('request.jwt.claim.session_id',true),''),auth.uid()::text)) $$;
  grant usage on schema auth to authenticated;
  insert into auth.users(id,email_confirmed_at) values('${a}',now()),('${b}',now()),('${unconfirmed}',null);`);
  for (const file of [
    "20261107231103_database_foundation.sql",
    "20261108204528_member_ownership_and_applications.sql",
    "20261109015601_retain_assigned_inactive_categories.sql",
    "20261110001526_admin_application_management.sql",
    "20261111031243_public_professional_name.sql",
    "20261111032715_enforce_current_auth_session.sql",
    "20261112001517_restore_executor_auth_schema_usage.sql",
    "20261112001903_isolate_executor_identity_lookup.sql",
    "20261112005238_profile_inquiries_and_inbox.sql",
    "20261112012923_inquiry_rpc_http_statuses.sql",
    "20261112025714_inquiry_notification_outbox.sql",
    "20261112030645_notification_event_outcome_accuracy.sql",
    "20261112031605_restrict_notification_worker_routing_updates.sql",
  ]) {
    if (file === "20261112001903_isolate_executor_identity_lookup.sql")
      await db.exec(
        "revoke usage on schema auth from rhh_member_writer,rhh_admin_writer,rhh_public_reader",
      );
    await db.exec(
      await readFile(
        new URL(`../../supabase/migrations/${file}`, import.meta.url),
        "utf8",
      ),
    );
  }
  await db.exec(
    "insert into auth.sessions(id,user_id) select id,id from auth.users",
  );

  return db;
}
