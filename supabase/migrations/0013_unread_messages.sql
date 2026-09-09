-- Petit repère "message non lu" (badge sur l'onglet Plus + la tuile
-- Message à Alexia) : on stocke juste la date du dernier message que le
-- voyageur a vu, pas un système de statut par message.
alter table travelers add column if not exists last_message_read_at timestamptz;

-- IMPORTANT — corrige un problème de sécurité/fonctionnement introduit
-- avec les rappels (migration 0012) : il n'existe aucune policy RLS
-- permettant à un voyageur de modifier sa propre ligne `travelers` une
-- fois son invitation "réclamée" (seule "travelers can claim their
-- invite" existe, et elle ne s'applique que tant que user_id est null).
-- Résultat concret : le bouton "Activer les rappels" ne sauvegardait en
-- réalité jamais reminders_enabled/reminder_lead_minutes en base — RLS
-- bloquait l'update silencieusement, donc la fonction serveur n'aurait
-- jamais trouvé de voyageur avec les rappels actifs.
--
-- Une policy UPDATE générale ("user_id = auth.uid()") réglerait le
-- symptôme mais ouvrirait un vrai trou : un voyageur pourrait alors aussi
-- modifier trip_id (rejoindre n'importe quel autre voyage en devinant son
-- UUID) ou role (se passer "guide"). On passe donc par deux fonctions
-- SECURITY DEFINER, qui ne touchent que les colonnes voulues sur la ligne
-- de l'appelant — même principe que is_admin()/is_trip_member() déjà
-- utilisées ailleurs dans le schéma.

create or replace function set_reminder_prefs(p_enabled boolean, p_lead_minutes int)
returns void
language sql
security definer
set search_path = public
as $$
  update travelers
  set reminders_enabled = p_enabled,
      reminder_lead_minutes = greatest(5, coalesce(p_lead_minutes, 30))
  where user_id = auth.uid();
$$;

create or replace function mark_messages_read()
returns void
language sql
security definer
set search_path = public
as $$
  update travelers
  set last_message_read_at = now()
  where user_id = auth.uid();
$$;

grant execute on function set_reminder_prefs(boolean, int) to authenticated;
grant execute on function mark_messages_read() to authenticated;
