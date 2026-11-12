-- Existing assignments remain readable; new selections still require active categories.
begin;
alter policy member_catalog_read on rhh.categories
  using (
    active or exists (
      select 1 from rhh.professional_categories pc
      join rhh.professionals p on p.id = pc.professional_id
      where pc.category_id = categories.id and p.owner_id = (select auth.uid())
    )
  );

create or replace function rhh_private.member_snapshot() returns jsonb
language sql security invoker set search_path = '' as $$
  select jsonb_build_object(
    'catalog', (select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'monthlyUsd',c.monthly_usd,'active',c.active) order by c.id),'[]'::jsonb) from rhh.categories c),
    'application', (select jsonb_build_object(
      'id',p.id,'version',p.profile_version,'approval',a.approval,'membership',m.status,'suspended',a.suspended,
      'credentials',(select coalesce(jsonb_agg(jsonb_build_object('name',c.name,'verification',c.verification) order by c.position,c.id),'[]'::jsonb) from rhh.credentials c where c.professional_id=p.id),
      'profile',jsonb_build_object('name',a.contact_name,'email',a.contact_email,'phone',p.public_phone,
        'businessName',p.business_name,'publicDisplayName',p.public_display_name,'publicEmail',p.public_email,
        'website',p.website,'city',p.city,'state',p.state,'description',p.description,'practices',p.healthy_home_practices,
        'categoryIds',(select coalesce(jsonb_agg(pc.category_id order by pc.category_id),'[]'::jsonb) from rhh.professional_categories pc where pc.professional_id=p.id),
        'services',(select coalesce(jsonb_agg(s.name order by s.position,s.id),'[]'::jsonb) from rhh.services s where s.professional_id=p.id),
        'listedCredentials',(select coalesce(jsonb_agg(c.name order by c.position,c.id),'[]'::jsonb) from rhh.credentials c where c.professional_id=p.id)))
      from rhh.professionals p join rhh.applications a on a.professional_id=p.id
      join rhh.memberships m on m.professional_id=p.id where p.owner_id=auth.uid()));
$$;
-- CREATE OR REPLACE preserves the existing owner and restricted execute grants.
notify pgrst, 'reload schema';
commit;
