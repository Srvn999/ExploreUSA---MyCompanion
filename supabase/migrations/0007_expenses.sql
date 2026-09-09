-- Frais partagés : cagnotte de groupe simple. Chaque dépense est répartie
-- à parts égales entre tous les voyageurs (hors guide) du voyage.

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  description text not null,
  amount numeric(10,2) not null check (amount > 0),
  paid_by uuid references travelers(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table expenses enable row level security;

-- Petit groupe de confiance en voyage : n'importe quel membre peut
-- ajouter/modifier/supprimer une dépense (pas seulement la sienne),
-- comme on gérerait une cagnotte physique ensemble.
create policy "members manage expenses" on expenses
  for all using (is_trip_member(trip_id)) with check (is_trip_member(trip_id));

create policy "admins manage expenses" on expenses
  for all using (is_admin()) with check (is_admin());
