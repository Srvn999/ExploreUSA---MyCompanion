-- Permet à un voyageur (pas seulement Alexia) d'ajouter un "compagnon de
-- route" à son propre voyage — une personne sans email ni compte, juste
-- pour pouvoir lui attribuer des dépenses dans la cagnotte partagée.
create policy "members add travelers to their trip" on travelers
  for insert with check (is_trip_member(trip_id));
