-- Database foundation only. Browser access remains denied until live adapters,
-- server authentication and ownership policies are implemented and tested.
-- Apply once in the staging SQL Editor. An existing rhh schema aborts the
-- transaction rather than overwriting existing application data.
begin;
create schema rhh;
revoke all on schema rhh from public, anon, authenticated;
alter default privileges in schema rhh revoke all on tables from public, anon, authenticated;
alter default privileges in schema rhh revoke all on sequences from public, anon, authenticated;
alter default privileges in schema rhh revoke execute on functions from public, anon, authenticated;

create table rhh.categories (
  id text primary key check (id ~ '^[a-z][a-z0-9-]{1,79}$'),
  name text not null check (length(name) between 1 and 160),
  monthly_usd integer not null check (monthly_usd > 0),
  billing_key text not null unique,
  active boolean not null default true
);
insert into rhh.categories (id,name,monthly_usd,billing_key) values
('mold-inspection','Mold Testing / Inspectors',79,'membership-inspection'),
('mold-remediation','Mold Remediation',129,'membership-remediation'),
('healthy-renovations','Healthy Home Renovations',129,'membership-renovations'),
('healthy-builders','Healthy Home Builders',200,'membership-builders'),
('healthy-trades','Healthy Home Trades',129,'membership-trades'),
('healthy-designers','Healthy Home Designers',129,'membership-designers'),
('health-practitioners','Health Practitioners (Physicians, Nutritionists, Naturopaths)',129,'membership-practitioners'),
('mold-detection-dogs','Mold Detection Dogs',79,'membership-detection-dogs');

create table rhh.accounts (
  user_id uuid primary key references auth.users(id) on delete restrict,
  role text not null default 'member' check (role in ('member','admin')),
  created_at timestamptz not null default now()
);
create table rhh.professionals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid unique references rhh.accounts(user_id) on delete restrict,
  business_name text not null check (length(business_name) between 1 and 120),
  public_display_name text not null default '' check (length(public_display_name) <= 80),
  city text not null check (length(city) between 1 and 80),
  state text not null check (state ~ '^[A-Z]{2}$'),
  postal_code text check (postal_code ~ '^[0-9]{5}(-[0-9]{4})?$'),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  description text not null check (length(description) between 20 and 2000),
  healthy_home_practices text not null check (length(healthy_home_practices) between 20 and 1500),
  service_area text not null default '' check (length(service_area) <= 1000),
  public_email text not null default '' check (length(public_email) <= 254),
  public_phone text not null default '' check (length(public_phone) <= 40),
  website text not null default '' check (length(website) <= 200),
  free_phone_consultation boolean not null default false,
  created_at timestamptz not null default now(),
  check ((latitude is null) = (longitude is null))
);
create table rhh.applications (
  professional_id uuid primary key references rhh.professionals(id) on delete restrict,
  contact_name text not null check (length(contact_name) between 1 and 80),
  contact_email text not null check (length(contact_email) between 3 and 254),
  contact_phone text not null default '' check (length(contact_phone) <= 40),
  approval text not null default 'pending' check (approval in ('pending','approved','rejected')),
  suspended boolean not null default false,
  decision_reason text not null default '' check (length(decision_reason) <= 2000),
  suspension_reason text not null default '' check (length(suspension_reason) <= 2000),
  internal_notes text not null default '' check (length(internal_notes) <= 5000),
  submitted_at timestamptz not null default now()
);
create table rhh.memberships (
  professional_id uuid primary key references rhh.professionals(id) on delete restrict,
  status text not null default 'inactive' check (status in ('active','inactive','past_due','canceled','trialing','unpaid')),
  featured_entitlement text not null default 'none' check (featured_entitlement in ('none','active')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  updated_at timestamptz not null default now()
);
create table rhh.professional_categories (
  professional_id uuid not null references rhh.professionals(id) on delete restrict,
  category_id text not null references rhh.categories(id) on delete restrict,
  primary key (professional_id,category_id)
);
create index professional_categories_category_idx on rhh.professional_categories(category_id);
create table rhh.services (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references rhh.professionals(id) on delete restrict,
  name text not null check (length(name) between 1 and 120),
  unique (professional_id,name)
);
create table rhh.credentials (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references rhh.professionals(id) on delete restrict,
  name text not null check (length(name) between 1 and 120),
  verification text not null default 'unverified' check (verification in ('unverified','verified')),
  reviewed_by uuid references rhh.accounts(user_id) on delete restrict,
  reviewed_at timestamptz,
  check (verification <> 'verified' or (reviewed_by is not null and reviewed_at is not null))
);
create index credentials_professional_idx on rhh.credentials(professional_id);
create index credentials_reviewer_idx on rhh.credentials(reviewed_by);
create table rhh.inquiries (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references rhh.professionals(id) on delete restrict,
  sender_name text not null check (length(sender_name) between 1 and 80),
  sender_email text not null check (length(sender_email) between 3 and 254),
  message text not null check (length(message) between 10 and 2000),
  created_at timestamptz not null default now()
);
create index inquiries_recipient_idx on rhh.inquiries(professional_id,created_at);
create table rhh.questions (
  id uuid primary key default gen_random_uuid(),
  category_id text not null references rhh.categories(id) on delete restrict,
  title text not null check (length(title) between 10 and 160),
  body text not null check (length(body) between 20 and 2000),
  status text not null default 'pending' check (status in ('pending','published','rejected','hidden')),
  moderation_note text not null default '' check (length(moderation_note) <= 2000),
  created_at timestamptz not null default now()
);
create index questions_category_idx on rhh.questions(category_id,status,created_at);
create table rhh.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references rhh.questions(id) on delete restrict,
  professional_id uuid not null references rhh.professionals(id) on delete restrict,
  body text not null check (length(body) between 20 and 3000),
  status text not null default 'pending' check (status in ('pending','published','rejected','hidden')),
  moderation_note text not null default '' check (length(moderation_note) <= 2000),
  created_at timestamptz not null default now(),
  unique (question_id,professional_id)
);
create index answers_author_idx on rhh.answers(professional_id);
create unique index answers_one_published_idx on rhh.answers(question_id) where status = 'published';
create table rhh.reviews (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references rhh.professionals(id) on delete restrict,
  display_name text not null check (length(display_name) between 1 and 80),
  contact_email text check (length(contact_email) between 3 and 254),
  rating smallint not null check (rating between 1 and 5),
  body text not null check (length(body) between 20 and 2000),
  status text not null default 'pending' check (status in ('pending','published','rejected','hidden')),
  moderation_note text not null default '' check (length(moderation_note) <= 2000),
  created_at timestamptz not null default now()
);
create index reviews_professional_idx on rhh.reviews(professional_id,status);
create table rhh.consultations (
  id uuid primary key default gen_random_uuid(),
  category_id text not null references rhh.categories(id) on delete restrict,
  professional_id uuid references rhh.professionals(id) on delete restrict,
  contact_name text not null check (length(contact_name) between 1 and 100),
  contact_email text not null check (length(contact_email) between 3 and 254),
  topic text not null check (length(topic) between 20 and 2000),
  format text not null default 'phone' check (format in ('phone','no-preference')),
  status text not null default 'requested' check (status in ('requested','assigned','accepted','cancelled')),
  admin_note text not null default '' check (length(admin_note) <= 2000),
  created_at timestamptz not null default now(),
  check (status not in ('assigned','accepted') or professional_id is not null)
);
create index consultations_category_idx on rhh.consultations(category_id);
create index consultations_professional_idx on rhh.consultations(professional_id,status);
create table rhh.certification_pathways (
  category_id text primary key references rhh.categories(id) on delete restrict,
  introduction text not null,
  provider_name text not null,
  provider_url text not null,
  qualification_kind text not null,
  description text not null,
  requirements text not null,
  steps text[] not null default '{}',
  timeline text not null default 'To be confirmed',
  costs text not null default 'To be confirmed',
  status text not null default 'draft' check (status in ('draft','published'))
);
create table rhh.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(title) between 1 and 160),
  category text not null,
  summary text not null check (length(summary) <= 1000),
  body text not null check (length(body) <= 50000),
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz not null default now()
);
create function rhh.is_publicly_eligible(approval text, subscription text, suspended boolean)
returns boolean language sql immutable security invoker set search_path = ''
as $$ select coalesce(approval = 'approved' and subscription = 'active' and suspended = false, false) $$;

-- Deny by default on every application table, even if schema exposure changes.
-- Future migrations must add explicit ownership policies and public projections.
do $$ declare item record; begin
  for item in select tablename from pg_tables where schemaname = 'rhh' loop
    execute format('alter table rhh.%I enable row level security', item.tablename);
    execute format('alter table rhh.%I force row level security', item.tablename);
  end loop;
end $$;
revoke all on all tables in schema rhh from public, anon, authenticated;
revoke all on all sequences in schema rhh from public, anon, authenticated;
revoke all on all functions in schema rhh from public, anon, authenticated;
commit;
