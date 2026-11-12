-- Keep the sanitized event reason consistent with the job's terminal reason.
-- No permissions, routing, retries or delivery activation change.
begin;
do $$ declare definition text;
 old_statement text:='insert into rhh_private.inquiry_email_events(job_id,event,attempt,code) values(j.id,''ambiguous'',j.attempts,''configuration_changed'');';
 new_statement text:='insert into rhh_private.inquiry_email_events(job_id,event,attempt,code) select j.id,''ambiguous'',j.attempts,failure_code from rhh_private.inquiry_email_jobs where id=j.id;';
begin
 definition:=pg_get_functiondef('rhh_private.prepare_inquiry_email(uuid,uuid,text,text,text,text,integer)'::regprocedure);
 if position(old_statement in definition)=0 then raise exception 'Unexpected notification routine baseline'; end if;
 execute replace(definition,old_statement,new_statement);
end $$;
notify pgrst,'reload schema';
commit;
