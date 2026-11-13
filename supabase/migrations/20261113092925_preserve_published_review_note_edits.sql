begin;
create or replace function rhh_private.review_admin_lock(pid uuid) returns void language plpgsql security definer set search_path='' as $$begin
 perform rhh_private.require_admin();perform 1 from rhh.professionals p join rhh.applications a on a.professional_id=p.id join rhh.memberships m on m.professional_id=p.id where p.id=pid for share of p,a,m;
 if not found then raise exception using errcode='PT404',message='review_listing_unavailable';end if;
end $$;
do $patch$ declare d text;old text;replacement text;begin
 d:=pg_get_functiondef('rhh_private.moderate_review(jsonb)'::regprocedure);
 old:='if act=''publish'' then perform rhh_private.review_target(pid);else perform rhh_private.review_admin_lock(pid);end if;';replacement:='perform rhh_private.review_admin_lock(pid);';if position(old in d)=0 then raise exception 'Unexpected review lock baseline';end if;d:=replace(d,old,replacement);
 old:='body,rating,status,version into r';replacement:='body,rating,status,version,moderation_note into r';if position(old in d)=0 then raise exception 'Unexpected review snapshot baseline';end if;d:=replace(d,old,replacement);
 old:='(act=''publish'' and r.status<>''pending'')';replacement:='(act=''publish'' and r.status not in (''pending'',''published''))';if position(old in d)=0 then raise exception 'Unexpected review transition baseline';end if;d:=replace(d,old,replacement);
 old:='next_status:=case act';replacement:=$body$if act='publish' and r.status='pending' and not rhh_private.review_eligible(pid) then raise exception using errcode='PT404',message='review_listing_unavailable';end if;
 next_status:=case act$body$;if position(old in d)=0 then raise exception 'Unexpected review eligibility baseline';end if;d:=replace(d,old,replacement);
 old:='update rhh.reviews set status=next_status,moderation_note=memo where id=r.id;';replacement:=$body$if next_status=r.status and memo=r.moderation_note then return jsonb_build_object('saved',true,'status',r.status,'version',r.version,'unchanged',true);end if;
 update rhh.reviews set status=next_status,moderation_note=memo where id=r.id;$body$;if position(old in d)=0 then raise exception 'Unexpected review update baseline';end if;d:=replace(d,old,replacement);
 old:='if next_status in (''published'',''rejected'') then';replacement:='if next_status in (''published'',''rejected'') and next_status is distinct from r.status then';if position(old in d)=0 then raise exception 'Unexpected review notification baseline';end if;d:=replace(d,old,replacement);
 execute d;
end $patch$;
notify pgrst,'reload schema';commit;
