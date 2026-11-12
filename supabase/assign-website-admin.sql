-- SQL Editor / trusted database operator ONLY, after explicit account confirmation.
-- Replace both placeholders. UUID is authoritative; email is a typo safeguard only.
-- Never run this through a browser/member/service-role application client.
begin;
do $$
declare target uuid := '00000000-0000-0000-0000-000000000000';
 expected_email text := 'CONFIRMED_ACCOUNT_EMAIL';
 old_role text;
begin
 if not exists(select 1 from auth.users where id=target and lower(email)=lower(expected_email)
 and email_confirmed_at is not null and not coalesce(is_anonymous,false)) then
 raise exception 'Confirmed intended Auth account required'; end if;
 insert into rhh.accounts(user_id) values(target) on conflict(user_id) do nothing;
 select role into old_role from rhh.accounts where user_id=target for update;
 if old_role <> 'admin' then
 update rhh.accounts set role='admin' where user_id=target;
 insert into rhh.account_role_history(user_id,previous_role,assigned_role) values(target,old_role,'admin');
 end if;
end $$;
commit;
