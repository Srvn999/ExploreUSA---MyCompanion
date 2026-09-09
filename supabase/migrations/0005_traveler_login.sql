-- Connexion par voyageur (lien magique par email).
--
-- Principe : Alexia renseigne l'email d'un voyageur dans l'admin et lui
-- envoie un lien de connexion (supabase.auth.signInWithOtp). Quand le
-- voyageur clique dessus, un compte Supabase Auth est créé pour lui côté
-- serveur ; le client (index.html) "réclame" alors la ligne `travelers`
-- correspondant à cet email en y inscrivant son user_id.

alter table travelers add column if not exists email text;

-- Lit l'email de l'utilisateur connecté sans dépendre des droits sur
-- auth.users (même principe que is_admin()/is_trip_member()).
create or replace function my_auth_email()
returns text
language sql
security definer
set search_path = public
as $$
  select email from auth.users where id = auth.uid();
$$;

-- Un voyageur authentifié peut "réclamer" la ligne qui porte son email,
-- tant qu'elle n'a pas déjà été réclamée par quelqu'un d'autre.
create policy "travelers can claim their invite" on travelers
  for update
  using (
    user_id is null
    and email is not null
    and lower(email) = lower(my_auth_email())
  )
  with check (user_id = auth.uid());
