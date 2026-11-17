begin;
-- Match the application validator: a dot in a URL fragment is not a dotted provider hostname.
-- Preserve the already-applied function, ownership, grants and all other validation.
do $migration$
declare definition text; baseline text := $old$split_part(split_part(substr(out->>'providerUrl',9),'/',1),'?',1)$old$;
begin
 definition:=pg_get_functiondef('rhh_private.validate_content(text,jsonb,boolean)'::regprocedure);
 if position(baseline in definition)=0 then raise exception 'Unexpected content URL validator baseline';end if;
 execute replace(definition,baseline,$new$split_part(split_part(split_part(substr(out->>'providerUrl',9),'/',1),'?',1),'#',1)$new$);
end $migration$;
notify pgrst,'reload schema';
commit;
