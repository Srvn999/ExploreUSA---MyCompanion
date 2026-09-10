-- Bibliothèque de fiches "bon à savoir" culturelles/pratiques, partagée
-- entre tous les voyages (même logique que esim_guides, voir migration
-- 0008) : pourboires, essence, code de la route américain... Alexia
-- rédige/édite le contenu elle-même, jamais de fait inventé/générique
-- pré-rempli qui pourrait être faux ou dépassé.

create table if not exists culture_tips (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  icon_emoji text,
  body text not null default '',
  states text, -- ex. "Texas, Nouveau-Mexique" : indicatif, affiché tel quel si renseigné
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table culture_tips enable row level security;

create policy "authenticated read culture tips" on culture_tips
  for select using (auth.uid() is not null);

create policy "admins manage culture tips" on culture_tips
  for all using (is_admin()) with check (is_admin());
