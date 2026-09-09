-- Espace admin (Alexia), documents, messagerie, visuels d'étape.

-- ============================================================
-- ADMINS (staff / conciergerie)
-- ============================================================

create table if not exists admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

alter table admins enable row level security;

create policy "admins read their own row" on admins
  for select using (user_id = auth.uid());

-- ============================================================
-- Visuel optionnel par étape d'itinéraire
-- ============================================================

alter table itinerary_items add column if not exists image_path text;

-- ============================================================
-- DOCUMENTS (par voyage)
-- ============================================================

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  title text not null,
  storage_path text not null,
  category text not null default 'other'
    check (category in ('passport', 'esta', 'insurance', 'rental', 'ticket', 'other')),
  created_at timestamptz not null default now()
);

alter table documents enable row level security;

create policy "members read documents" on documents
  for select using (is_trip_member(trip_id));

-- ============================================================
-- MESSAGES (chat voyageur <-> conciergerie)
-- ============================================================

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  sender_type text not null check (sender_type in ('traveler', 'concierge')),
  sender_traveler_id uuid references travelers(id) on delete set null,
  sender_admin_id uuid references admins(user_id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table messages enable row level security;

create policy "members read messages" on messages
  for select using (is_trip_member(trip_id));

create policy "members send messages" on messages
  for insert with check (
    is_trip_member(trip_id)
    and sender_type = 'traveler'
    and sender_traveler_id in (
      select id from travelers where trip_id = messages.trip_id and user_id = auth.uid()
    )
  );

-- ============================================================
-- ACCÈS ADMIN COMPLET (Alexia peut tout gérer, sur tous les voyages)
-- ============================================================

create policy "admins manage trips" on trips
  for all using (is_admin()) with check (is_admin());

create policy "admins manage travelers" on travelers
  for all using (is_admin()) with check (is_admin());

create policy "admins manage days" on itinerary_days
  for all using (is_admin()) with check (is_admin());

create policy "admins manage items" on itinerary_items
  for all using (is_admin()) with check (is_admin());

create policy "admins manage flights" on flights
  for all using (is_admin()) with check (is_admin());

create policy "admins manage photos" on photos
  for all using (is_admin()) with check (is_admin());

create policy "admins manage documents" on documents
  for all using (is_admin()) with check (is_admin());

create policy "admins manage messages" on messages
  for all using (is_admin()) with check (is_admin());

-- ============================================================
-- STORAGE : visuels d'étape + documents
-- ============================================================

insert into storage.buckets (id, name, public)
values ('trip-assets', 'trip-assets', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('trip-documents', 'trip-documents', false)
on conflict (id) do nothing;

create policy "admins manage trip-assets" on storage.objects for all
  using (bucket_id = 'trip-assets' and is_admin())
  with check (bucket_id = 'trip-assets' and is_admin());

create policy "members read trip-assets" on storage.objects for select
  using (
    bucket_id = 'trip-assets'
    and is_trip_member((storage.foldername(name))[1]::uuid)
  );

create policy "admins manage trip-documents" on storage.objects for all
  using (bucket_id = 'trip-documents' and is_admin())
  with check (bucket_id = 'trip-documents' and is_admin());

create policy "members read trip-documents" on storage.objects for select
  using (
    bucket_id = 'trip-documents'
    and is_trip_member((storage.foldername(name))[1]::uuid)
  );

-- ============================================================
-- TEMPORAIRE : chat de démo sans authentification voyageur
-- (à retirer une fois la connexion par voyageur en place, voir ROADMAP.md)
-- ============================================================

create policy "demo public read messages" on messages
  for select to anon
  using (trip_id = '00000000-0000-0000-0000-000000000001');

create policy "demo public send messages" on messages
  for insert to anon
  with check (
    trip_id = '00000000-0000-0000-0000-000000000001'
    and sender_type = 'traveler'
    and sender_traveler_id = (
      select id from travelers
      where trip_id = '00000000-0000-0000-0000-000000000001' and owner_slug = 'zoe'
    )
  );

create policy "demo public read trip-assets" on storage.objects for select to anon
  using (
    bucket_id = 'trip-assets'
    and (storage.foldername(name))[1] = '00000000-0000-0000-0000-000000000001'
  );
