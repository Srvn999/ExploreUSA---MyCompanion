-- TEMPORAIRE : autorise la lecture publique du seul voyage de démo
-- (00000000-0000-0000-0000-000000000001), le temps de vérifier que la
-- connexion Supabase fonctionne, avant que l'écran de connexion (Étape 5
-- de SETUP.md) ne soit en place. Aucune autre donnée n'est concernée.
-- À supprimer une fois l'authentification par voyageur activée :
--   drop policy "demo public read - trips" on trips;
--   drop policy "demo public read - travelers" on travelers;
--   drop policy "demo public read - days" on itinerary_days;
--   drop policy "demo public read - items" on itinerary_items;
--   drop policy "demo public read - flights" on flights;

create policy "demo public read - trips" on trips
  for select to anon
  using (id = '00000000-0000-0000-0000-000000000001');

create policy "demo public read - travelers" on travelers
  for select to anon
  using (trip_id = '00000000-0000-0000-0000-000000000001');

create policy "demo public read - days" on itinerary_days
  for select to anon
  using (trip_id = '00000000-0000-0000-0000-000000000001');

create policy "demo public read - items" on itinerary_items
  for select to anon
  using (
    day_id in (
      select id from itinerary_days where trip_id = '00000000-0000-0000-0000-000000000001'
    )
  );

create policy "demo public read - flights" on flights
  for select to anon
  using (trip_id = '00000000-0000-0000-0000-000000000001');
