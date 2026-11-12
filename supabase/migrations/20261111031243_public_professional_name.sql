-- Publish only the member-selected public name; private contacts remain inaccessible.
begin;
grant select (public_display_name) on rhh.professionals to rhh_public_reader;

create or replace function rhh_private.public_directory() returns jsonb
language sql security definer set search_path='' as $$
 select jsonb_build_object('catalog',(select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'monthlyUsd',c.monthly_usd,'active',c.active) order by c.id),'[]') from rhh.categories c),
 'profiles',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'businessName',p.business_name,'publicDisplayName',p.public_display_name,'city',p.city,'state',p.state,
 'specialty','', 'summary',p.description,'serviceArea',p.service_area,'freeConsultation',p.free_phone_consultation,
 'featured',m.featured_entitlement='active',
 'contact',jsonb_build_object('email',p.public_email,'phone',p.public_phone,'website',p.website),
 'categoryIds',(select coalesce(jsonb_agg(pc.category_id order by pc.category_id),'[]') from rhh.professional_categories pc where pc.professional_id=p.id),
 'services',(select coalesce(jsonb_agg(s.name order by s.position,s.id),'[]') from rhh.services s where s.professional_id=p.id),
 'verifiedCredentials',(select coalesce(jsonb_agg(c.name order by c.position,c.id),'[]') from rhh.credentials c where c.professional_id=p.id and c.verification='verified'),
 'listedCredentials',(select coalesce(jsonb_agg(c.name order by c.position,c.id),'[]') from rhh.credentials c where c.professional_id=p.id and c.verification='unverified')
 ) order by p.business_name,p.id),'[]') from rhh.professionals p join rhh.applications a on a.professional_id=p.id join rhh.memberships m on m.professional_id=p.id
 where a.approval='approved' and m.status='active' and not a.suspended));
$$;

-- CREATE OR REPLACE preserves the restricted owner and existing execute grants.
notify pgrst,'reload schema';
commit;
