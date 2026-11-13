begin;
do $patch$ declare d text;old text;replacement text;begin
 d:=pg_get_functiondef('rhh_private.admin_qa(jsonb)'::regprocedure);
 old:='q.id question_id,q.created_at from rhh.questions';replacement:='q.id question_id,q.created_at,0::bigint queue_order from rhh.questions';if position(old in d)=0 then raise exception 'Unexpected question queue baseline';end if;d:=replace(d,old,replacement);
 old:='q.id,a.created_at from rhh.answers';replacement:='q.id,a.created_at,a.queue_position from rhh.answers';if position(old in d)=0 then raise exception 'Unexpected answer queue baseline';end if;d:=replace(d,old,replacement);
 old:='from matching order by created_at,id limit';replacement:='from matching order by queue_order,created_at,id limit';if position(old in d)=0 then raise exception 'Unexpected queue pagination baseline';end if;d:=replace(d,old,replacement);
 old:='order by created_at,id),';replacement:='order by queue_order,created_at,id),';if position(old in d)=0 then raise exception 'Unexpected queue projection baseline';end if;d:=replace(d,old,replacement);
 execute d;
end $patch$;
notify pgrst,'reload schema';commit;
