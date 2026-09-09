-- Infos d'urgence par voyage (saisies par Alexia, jamais devinées côté
-- appli : un mauvais numéro d'urgence est dangereux, donc pas de valeur
-- par défaut fantaisiste, juste un champ vide tant que non renseigné).

alter table trips add column if not exists embassy_phone text;
alter table trips add column if not exists insurance_phone text;
alter table trips add column if not exists emergency_notes text;

-- Voiture de location (une par voyage pour l'instant).

create table if not exists rental_cars (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  company text,
  booking_ref text,
  vehicle_model text,
  pickup_date date,
  pickup_time text,
  pickup_location text,
  return_date date,
  return_time text,
  return_location text,
  counter_location text,
  notes text,
  created_at timestamptz not null default now()
);

alter table rental_cars enable row level security;

create policy "members read rental car" on rental_cars
  for select using (is_trip_member(trip_id));

create policy "admins manage rental car" on rental_cars
  for all using (is_admin()) with check (is_admin());
