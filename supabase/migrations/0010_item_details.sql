-- Fiche détail d'une étape d'itinéraire : adresse, horaires, conseil
-- d'Alexia, et une petite bibliothèque de photos (distincte du visuel
-- unique déjà affiché dans la carte de la timeline).

alter table itinerary_items add column if not exists address text;
alter table itinerary_items add column if not exists opening_hours text;
alter table itinerary_items add column if not exists alexia_tip text;

create table if not exists itinerary_item_photos (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references itinerary_items(id) on delete cascade,
  trip_id uuid not null references trips(id) on delete cascade,
  storage_path text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table itinerary_item_photos enable row level security;

create policy "members read item photos" on itinerary_item_photos
  for select using (is_trip_member(trip_id));

create policy "admins manage item photos" on itinerary_item_photos
  for all using (is_admin()) with check (is_admin());

-- Réutilise le bucket 'trip-assets' existant (mêmes policies, chemin
-- <trip_id>/<item_id>/<fichier>) : pas de nouveau bucket nécessaire.
