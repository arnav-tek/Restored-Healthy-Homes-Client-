-- The dispatcher may advance delivery state but never reroute a job, rewrite
-- its age/inquiry association, or grant itself manual retry budget.
begin;
revoke update on rhh_private.inquiry_email_jobs from rhh_notification_worker;
grant update(state,attempts,version,next_attempt_at,lease_token,lease_until,send_started_at,
 provider_name,from_address,inbox_origin,delivery_mode,first_send_at,idempotency_until,
 has_uncertain_send,provider_message_id,failure_code,updated_at,accepted_at)
 on rhh_private.inquiry_email_jobs to rhh_notification_worker;
commit;
