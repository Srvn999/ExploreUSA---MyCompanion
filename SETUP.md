# Connecter le prototype à Supabase

Ce document explique, étape par étape, comment brancher `index.html` sur
une vraie base de données Supabase, **sans rien changer au design**. Tant
que la configuration n'est pas renseignée, le prototype continue de
s'afficher exactement comme avant (données statiques).

## Structure du projet

```
index.html                       — le prototype (design inchangé)
js/
  supabaseClient.js               — crée le client Supabase
  data.js                         — fonctions de lecture/écriture (fetch, upload photo...)
  render.js                       — transforme les données en HTML identique au design
  bootstrap.js                    — point d'entrée, remplace la démo si Supabase répond
supabase/
  migrations/0001_init.sql        — schéma complet (tables, sécurité, storage)
  seed.sql                        — données de démo (reproduit l'exemple statique)
```

## 1. Créer le projet Supabase

1. Va sur [supabase.com](https://supabase.com) → **New project**.
2. Choisis un nom (ex. `my-companion`), un mot de passe de base de
   données, une région proche de tes utilisateurs.
3. Attends la fin du provisioning (~2 min).

## 2. Créer le schéma

1. Dans le tableau de bord Supabase, ouvre **SQL Editor**.
2. Colle le contenu de `supabase/migrations/0001_init.sql` et exécute-le.
   Cela crée les tables (`trips`, `travelers`, `itinerary_days`,
   `itinerary_items`, `flights`, `photos`), active la **Row Level
   Security** et crée le bucket de stockage `trip-photos`.
3. (Optionnel mais recommandé pour tester) Colle ensuite le contenu de
   `supabase/seed.sql` et exécute-le : ça recrée le voyage "Route 66"
   avec Zoé, Cécile, Alexia et le jour 6 exactement comme dans le
   prototype statique.

Si tu préfères le CLI Supabase :
```bash
supabase link --project-ref <ton-project-ref>
supabase db push          # applique 0001_init.sql
supabase db execute -f supabase/seed.sql
```

## 3. Récupérer les clés d'API

Dans **Project Settings → API** :
- **Project URL** (ex. `https://xxxxxxxx.supabase.co`)
- **anon public key**

Ces deux valeurs sont sûres à exposer côté client : c'est le modèle
Supabase. Ce qui protège les données, ce sont les policies RLS définies
dans la migration (chaque utilisateur ne voit que les voyages dont il
est membre).

## 4. Renseigner la config dans `index.html`

Tout en bas du fichier, juste avant les balises `<script>` de connexion,
il y a ce bloc :

```html
<script>
  window.MYCOMPANION_CONFIG = {
    supabaseUrl: "",
    supabaseAnonKey: "",
    tripId: ""
  };
</script>
```

Remplis les 3 champs :
- `supabaseUrl` / `supabaseAnonKey` : les valeurs de l'étape 3.
- `tripId` : l'identifiant du voyage à afficher. Si tu as exécuté
  `seed.sql`, c'est `00000000-0000-0000-0000-000000000001`. Sinon,
  récupère-le dans **Table Editor → trips**.

Recharge `index.html` dans le navigateur : l'itinéraire (jour 6) et les
3 vols viennent maintenant de la base de données. L'album photo, lui,
ne s'affiche dynamiquement que lorsque des lignes existent dans la table
`photos` — tant qu'il n'y en a pas, le prototype garde les vignettes de
démo.

## 5. Authentification (accès par voyageur)

Pour que Zoé, Cécile et Alexia se connectent chacune à leur compte et ne
voient que leur voyage :

1. Dans Supabase, active **Authentication → Providers → Email** (ou
   Magic Link, plus simple pour un usage familial : pas de mot de
   passe à retenir).
2. Crée un compte pour chaque voyageur (Authentication → Users → Invite),
   ou laisse-les s'inscrire eux-mêmes.
3. Lie chaque compte à sa ligne `travelers` : `update travelers set
   user_id = '<uuid auth du compte>' where owner_slug = 'zoe';` (idem
   pour cecile/alexia).
4. Ajoute un écran de connexion (email + lien magique) avant d'appeler
   `supabase.auth.signInWithOtp({ email })`. C'est la seule pièce qui
   reste à construire dans l'UI — elle n'existait pas dans le
   prototype statique.

Sans authentification, la clé anonyme n'a accès à aucune ligne (RLS
bloque tout par défaut) — c'est volontaire et sûr, mais ça veut dire que
l'étape 4 ne montrera des données que si tu es connecté avec un compte
lié à un `traveler`, ou si tu assouplis temporairement les policies
pour tester en développement.

## 6. Ajouter des photos

Utilise `window.MyCompanion.uploadPhoto({ tripId, travelerId, file })`
(défini dans `js/data.js`) pour brancher les boutons "Depuis la
galerie" / "Prendre une photo" de l'album à un vrai `<input type="file">`.
Cette fonction envoie le fichier dans le bucket `trip-photos` et crée la
ligne correspondante dans `photos` ; au prochain chargement, la photo
apparaît dans l'album avec une vraie vignette (URL signée, le bucket
étant privé).

## Ce qui reste volontairement statique

- Le **convertisseur de devises** et le **calcul taxes/tips** restent
  côté client (pas de données à stocker) — un vrai taux du jour
  nécessiterait un appel à une API de change externe, à ajouter plus
  tard si besoin (ex. via une Supabase Edge Function qui met le taux en
  cache).
- Les pastilles de jour (`J1`...`J18`) reflètent maintenant les lignes
  réelles de `itinerary_days`. Si tu veux garder 18 pastilles visibles
  même sans étapes prévues, crée une ligne `itinerary_days` par jour
  (le champ `location_label` peut rester vide).
