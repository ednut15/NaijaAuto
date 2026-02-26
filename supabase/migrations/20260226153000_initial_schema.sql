create extension if not exists pgcrypto;

create type user_role as enum ('buyer', 'seller', 'moderator', 'super_admin');
create type seller_type as enum ('dealer', 'private');
create type listing_status as enum ('draft', 'pending_review', 'approved', 'rejected', 'archived', 'sold');
create type body_type as enum ('car', 'suv', 'pickup');
create type fuel_type as enum ('petrol', 'diesel', 'hybrid', 'electric');
create type transmission as enum ('automatic', 'manual');
create type moderation_action as enum ('approve', 'reject');
create type payment_status as enum ('initiated', 'paid', 'failed');
create type contact_channel as enum ('phone', 'whatsapp');

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  role user_role not null default 'buyer',
  seller_type seller_type,
  email text,
  phone text,
  phone_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists seller_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  full_name text not null,
  state text,
  city text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists dealer_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  business_name text not null,
  cac_number text,
  address text,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references users(id) on delete cascade,
  seller_type seller_type not null,
  status listing_status not null default 'draft',
  title text not null,
  description text not null,
  price_ngn integer not null check (price_ngn > 0),
  year integer not null check (year between 1980 and extract(year from now())::int + 1),
  make text not null,
  model text not null,
  body_type body_type not null,
  mileage_km integer not null default 0 check (mileage_km >= 0),
  transmission transmission not null,
  fuel_type fuel_type not null,
  vin text not null,
  state text not null,
  city text not null,
  lat numeric(9,6) not null,
  lng numeric(9,6) not null,
  slug text not null unique,
  contact_phone text not null,
  contact_whatsapp text not null,
  is_featured boolean not null default false,
  featured_until timestamptz,
  approved_at timestamptz,
  rejection_reason text,
  search_vector tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vin_len check (char_length(vin) = 17)
);

create unique index if not exists idx_listings_unique_vin_live
  on listings (vin)
  where status in ('draft', 'pending_review', 'approved', 'sold');

create index if not exists idx_listings_status_created on listings(status, created_at desc);
create index if not exists idx_listings_state_city on listings(state, city);
create index if not exists idx_listings_price on listings(price_ngn);
create index if not exists idx_listings_year on listings(year);
create index if not exists idx_listings_featured_until on listings(is_featured, featured_until desc);
create index if not exists idx_listings_search_vector on listings using gin(search_vector);

create table if not exists listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  photo_url text not null,
  photo_hash text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_listing_photos_listing_id on listing_photos(listing_id);
create index if not exists idx_listing_photos_hash on listing_photos(photo_hash);

create table if not exists favorites (
  user_id uuid not null references users(id) on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table if not exists listing_contact_events (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  channel contact_channel not null,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_listing_contact_events_listing_date
  on listing_contact_events(listing_id, created_at desc);

create table if not exists moderation_reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  moderator_id uuid not null references users(id) on delete restrict,
  action moderation_action not null,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists featured_packages (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  duration_days integer not null check (duration_days > 0),
  amount_ngn integer not null check (amount_ngn > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists payment_transactions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  seller_id uuid not null references users(id) on delete cascade,
  package_code text not null,
  amount_ngn integer not null,
  provider text not null default 'paystack',
  reference text not null unique,
  status payment_status not null default 'initiated',
  webhook_event_id text unique,
  provider_transaction_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_created
  on notifications(user_id, created_at desc);

create table if not exists otp_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  phone text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_otp_user_phone_created
  on otp_verifications(user_id, phone, created_at desc);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references users(id) on delete set null,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_entity
  on audit_logs(entity_type, entity_id, created_at desc);

create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  state text not null,
  city text not null,
  lat numeric(9,6) not null,
  lng numeric(9,6) not null,
  created_at timestamptz not null default now(),
  unique(state, city)
);

create index if not exists idx_locations_state_city on locations(state, city);

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_users_updated_at
before update on users
for each row execute function set_updated_at();

create trigger trg_seller_profiles_updated_at
before update on seller_profiles
for each row execute function set_updated_at();

create trigger trg_dealer_profiles_updated_at
before update on dealer_profiles
for each row execute function set_updated_at();

create trigger trg_listings_updated_at
before update on listings
for each row execute function set_updated_at();

create or replace function listings_search_vector_trigger() returns trigger as $$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.make, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.model, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.city, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(new.state, '')), 'C');
  return new;
end;
$$ language plpgsql;

create trigger trg_listings_search_vector
before insert or update on listings
for each row execute function listings_search_vector_trigger();

insert into featured_packages (code, name, duration_days, amount_ngn)
values
  ('feature_7_days', 'Featured - 7 Days', 7, 25000),
  ('feature_14_days', 'Featured - 14 Days', 14, 45000),
  ('feature_30_days', 'Featured - 30 Days', 30, 80000)
on conflict (code) do nothing;
