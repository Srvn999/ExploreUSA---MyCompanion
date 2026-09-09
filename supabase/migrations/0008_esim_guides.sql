-- Bibliothèque de tutos e-SIM par marque, partagée entre tous les voyages
-- (pas propre à un voyage en particulier). Alexia rédige/édite le contenu
-- de chaque marque — on ne devine pas le fonctionnement précis d'un
-- fournisseur commercial, ça change et une mauvaise étape peut coûter
-- un jour de forfait au client.

create table if not exists esim_guides (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  logo_emoji text,
  steps text not null default '', -- une étape par ligne
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table esim_guides enable row level security;

create policy "authenticated read esim guides" on esim_guides
  for select using (auth.uid() is not null);

create policy "admins manage esim guides" on esim_guides
  for all using (is_admin()) with check (is_admin());
