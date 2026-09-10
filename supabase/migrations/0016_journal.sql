-- Carnet de voyage : notes personnelles d'un voyageur, une par jour
-- d'itinéraire, en complément de l'album photo partagé. À la différence
-- de l'album ou des frais, c'est un espace privé — chaque voyageur ne
-- voit/modifie que ses propres notes, jamais celles d'un autre membre
-- du même voyage.

create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  traveler_id uuid not null references travelers(id) on delete cascade,
  day_id uuid not null references itinerary_days(id) on delete cascade,
  body text not null default '',
  updated_at timestamptz not null default now(),
  unique (traveler_id, day_id)
);

alter table journal_entries enable row level security;

create policy "travelers manage own journal entries" on journal_entries
  for all
  using (traveler_id in (select id from travelers where user_id = auth.uid()))
  with check (traveler_id in (select id from travelers where user_id = auth.uid()));
