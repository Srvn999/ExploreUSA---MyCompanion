-- Rappels par notification push avant l'heure prévue d'une étape
-- ("dans 30 min : Cadillac Ranch"). Le voyageur active/désactive à sa
-- guise et choisit le délai ; l'envoi effectif est fait par la fonction
-- serveur send-itinerary-reminders, appelée périodiquement par pg_cron
-- (voir supabase/functions/send-itinerary-reminders et
-- supabase/migrations/0012b_reminders_cron.sql).

alter table travelers add column if not exists reminders_enabled boolean not null default false;
alter table travelers add column if not exists reminder_lead_minutes int not null default 30;

-- Un abonnement Web Push par appareil/navigateur sur lequel le voyageur a
-- activé les rappels (il peut en avoir plusieurs : téléphone + tablette).
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  traveler_id uuid not null references travelers(id) on delete cascade,
  trip_id uuid not null references trips(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

-- Chaque voyageur ne gère (lit/écrit/supprime) que ses propres
-- abonnements — jamais ceux d'un autre membre du même voyage.
create policy "travelers manage own push subscription" on push_subscriptions
  for all
  using (traveler_id in (select id from travelers where user_id = auth.uid()))
  with check (traveler_id in (select id from travelers where user_id = auth.uid()));

-- Empêche d'envoyer deux fois le même rappel si le cron repasse dessus
-- avant l'heure de l'étape suivante. Table interne à la fonction serveur
-- (appelée avec la clé service_role, qui contourne RLS) : aucune policy
-- ici, donc aucun accès depuis l'API publique/le client.
create table if not exists sent_reminders (
  item_id uuid not null references itinerary_items(id) on delete cascade,
  traveler_id uuid not null references travelers(id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (item_id, traveler_id)
);

alter table sent_reminders enable row level security;
