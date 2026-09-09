-- Données de démo — reproduit exactement le contenu statique du prototype
-- (Route 66, Zoé & Cécile, jour 6, Amarillo TX).
-- À exécuter une fois après la migration, dans le SQL Editor de Supabase
-- ou via `supabase db reset` (le CLI lance ce fichier automatiquement).

insert into trips (id, name, destination, start_date, end_date)
values ('00000000-0000-0000-0000-000000000001', 'Route 66', 'États-Unis', '2026-06-10', '2026-06-27');

insert into travelers (trip_id, display_name, owner_slug, role, avatar_letter) values
  ('00000000-0000-0000-0000-000000000001', 'Zoé',    'zoe',    'member',    'Z'),
  ('00000000-0000-0000-0000-000000000001', 'Cécile', 'cecile', 'member',    'C'),
  ('00000000-0000-0000-0000-000000000001', 'Alexia', 'alexia', 'guide', 'A');

-- Jour 6 : Amarillo, TX
insert into itinerary_days (id, trip_id, day_number, date, location_label)
values ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 6, '2026-06-15', 'Amarillo, TX');

insert into itinerary_items (day_id, time, item_type, title, map_query, badge_labels, sort_order) values
  ('00000000-0000-0000-0000-000000000101', '09:00', 'hotel',      'Route 66 Motel',        'Route 66 Motel, Amarillo TX',        '{"Payé ✓","Petit-déj inclus","Parking inclus"}', 1),
  ('00000000-0000-0000-0000-000000000101', '11:00', 'activity',   'Cadillac Ranch',         'Cadillac Ranch, Amarillo TX',        '{"Gratuit"}',                                    2),
  ('00000000-0000-0000-0000-000000000101', '13:00', 'restaurant', 'Big Texan Steak Ranch',  'Big Texan Steak Ranch, Amarillo TX', '{"À régler sur place"}',                         3),
  ('00000000-0000-0000-0000-000000000101', '19:00', 'hotel',      'Wigwam Motel',           'Wigwam Motel, Holbrook AZ',          '{"Payé ✓","Parking inclus","Petit-déj non inclus"}', 4);

insert into flights (trip_id, tag, status, origin_code, destination_code, schedule_label, passenger_name, gate, boarding_time, seat, sort_order) values
  ('00000000-0000-0000-0000-000000000001', 'ALLER · AF 022',         'À l''heure', 'CDG', 'ORD', 'Mer. 12 juin · 10:35 → 13:05 (heure locale)', 'ZOE MARTIN', 'C12', '09:55', '24A', 1),
  ('00000000-0000-0000-0000-000000000001', 'VOL INTERNE · AA 1450',  'À l''heure', 'ORD', 'AMA', 'Sam. 15 juin · 08:10 → 09:45',                 'ZOE MARTIN', 'B4',  '07:35', '14C', 2),
  ('00000000-0000-0000-0000-000000000001', 'RETOUR · DL 265',        'À l''heure', 'LAX', 'CDG', 'Mar. 25 juin · 16:20 → 11:40 (+1)',            'ZOE MARTIN', null,  null,    '31D', 3);
