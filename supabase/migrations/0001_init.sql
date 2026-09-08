-- My Companion — schéma initial
-- À exécuter dans Supabase (SQL Editor ou `supabase db push`)

create extension if not exists pgcrypto;

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  destination text,
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

-- Un voyageur = un membre du voyage, éventuellement lié à un compte
-- Supabase Auth (user_id) une fois qu'il s'est connecté.
create table if not exists travelers (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  owner_slug text not null, -- ex: 'zoe', 'cecile', 'alexia' — sert de filtre album
  role text not null default 'member' check (role in ('member', 'concierge')),
  avatar_letter text,
  created_at timestamptz not null default now(),
  unique (trip_id, owner_slug)
);

create table if not exists itinerary_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  day_number int not null,
  date date,
  location_label text,
  unique (trip_id, day_number)
);

create table if not exists itinerary_items (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references itinerary_days(id) on delete cascade,
  time text not null,
  item_type text not null check (item_type in ('hotel', 'activity', 'restaurant')),
  title text not null,
  map_query text,
  badge_labels text[] not null default '{}', -- ex: '{"Payé ✓","Parking inclus"}'
  sort_order int not null default 0
);

create table if not exists flights (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  tag text not null, -- ex: "ALLER · AF 022"
  status text not null default 'À l''heure',
  origin_code text not null,
  destination_code text not null,
  schedule_label text not null, -- ex: "Mer. 12 juin · 10:35 → 13:05"
  passenger_name text,
  gate text,
  boarding_time text,
  seat text,
  sort_order int not null default 0
);

create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  traveler_id uuid references travelers(id) on delete set null,
  day_id uuid references itinerary_days(id) on delete set null,
  storage_path text not null, -- chemin dans le bucket 'trip-photos'
  taken_at timestamptz,
  location_label text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- HELPER : l'utilisateur connecté est-il membre de ce voyage ?
-- ============================================================

create or replace function is_trip_member(p_trip_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from travelers
    where trip_id = p_trip_id and user_id = auth.uid()
  );
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table trips enable row level security;
alter table travelers enable row level security;
alter table itinerary_days enable row level security;
alter table itinerary_items enable row level security;
alter table flights enable row level security;
alter table photos enable row level security;

create policy "members read their trip" on trips
  for select using (is_trip_member(id));

create policy "members read travelers" on travelers
  for select using (is_trip_member(trip_id));

create policy "members read days" on itinerary_days
  for select using (is_trip_member(trip_id));

create policy "members read itinerary items" on itinerary_items
  for select using (
    is_trip_member((select trip_id from itinerary_days where id = day_id))
  );

create policy "members read flights" on flights
  for select using (is_trip_member(trip_id));

create policy "members read photos" on photos
  for select using (is_trip_member(trip_id));

create policy "members insert photos" on photos
  for insert with check (is_trip_member(trip_id));

-- ============================================================
-- STORAGE : bucket pour l'album photo
-- Convention de chemin : <trip_id>/<traveler_id>/<fichier>
-- ============================================================

insert into storage.buckets (id, name, public)
values ('trip-photos', 'trip-photos', false)
on conflict (id) do nothing;

create policy "members read their trip photos"
  on storage.objects for select
  using (
    bucket_id = 'trip-photos'
    and is_trip_member((storage.foldername(name))[1]::uuid)
  );

create policy "members upload their trip photos"
  on storage.objects for insert
  with check (
    bucket_id = 'trip-photos'
    and is_trip_member((storage.foldername(name))[1]::uuid)
  );
