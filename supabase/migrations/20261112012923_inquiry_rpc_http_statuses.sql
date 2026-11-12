-- PostgREST maps P0002/40001 to 500 and P0001 to 400. Keep direct RPCs
-- consistent with the website's neutral 404, quota 429 and stale-state 409.
-- No ownership, eligibility, rate-limit, ACL or RLS changes.
begin;
do $$
declare signature text; definition text;
begin
 foreach signature in array array[
  'rhh_private.inquiry_recipient(uuid)',
  'rhh_private.submit_inquiry(jsonb)',
  'rhh_private.set_inquiry_read(uuid,boolean,integer)'
 ] loop
  definition:=pg_get_functiondef(signature::regprocedure);
  definition:=replace(definition,'errcode=''P0002''','errcode=''PT404''');
  definition:=replace(definition,'errcode=''P0001''','errcode=''PT429''');
  definition:=replace(definition,'errcode=''40001''','errcode=''PT409''');
  execute definition;
 end loop;
end $$;
notify pgrst,'reload schema';
commit;
