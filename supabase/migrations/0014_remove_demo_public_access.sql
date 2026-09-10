-- Retire l'accès public (sans compte) au voyage de démo, laissé en place
-- depuis le tout début du projet pour faciliter les premiers tests avant
-- que la connexion par voyageur n'existe. Elle est maintenant en place
-- (migration 0005) : cet accès public n'a plus de raison d'être, et
-- laissait n'importe qui sur Internet écrire dans le chat de démo en se
-- faisant passer pour "Zoé" (voir la policy "demo public send messages").
--
-- N'affecte aucune donnée de vrai voyage : ces policies étaient toutes
-- strictement limitées au trip_id de démo
-- (00000000-0000-0000-0000-000000000001).

drop policy if exists "demo public read - trips" on trips;
drop policy if exists "demo public read - travelers" on travelers;
drop policy if exists "demo public read - days" on itinerary_days;
drop policy if exists "demo public read - items" on itinerary_items;
drop policy if exists "demo public read - flights" on flights;
drop policy if exists "demo public read messages" on messages;
drop policy if exists "demo public send messages" on messages;
drop policy if exists "demo public read trip-assets" on storage.objects;
