-- Conseils libres d'Alexia pour le temps libre d'un jour : des idées à
-- voir/faire dans la ville du jour ("ne manquez pas The Bean ou la Willis
-- Tower"), sans réservation ni horaire associé — à la différence des
-- étapes programmées de itinerary_items. Le voyageur suit ou non, comme
-- il veut.

create table if not exists day_tips (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references itinerary_days(id) on delete cascade,
  trip_id uuid not null references trips(id) on delete cascade,
  title text not null,
  description text,
  map_query text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table day_tips enable row level security;

create policy "members read day tips" on day_tips
  for select using (is_trip_member(trip_id));

create policy "admins manage day tips" on day_tips
  for all using (is_admin()) with check (is_admin());
