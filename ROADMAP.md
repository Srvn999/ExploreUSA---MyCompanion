# Feuille de route — My Companion

## Fait

- Prototype cliquable (design figé, `index.html`)
- Backend Supabase créé : schéma, sécurité (RLS), stockage photos
- Itinéraire et vols branchés sur les vraies données
- Appli en ligne sur GitHub Pages
- Espace admin (`admin.html`) : Alexia crée des voyages, gère voyageurs,
  itinéraire jour par jour (avec visuel optionnel par étape), vols et
  documents
- Messagerie client ↔ Alexia (chat en temps réel, voir `screen-chat` dans
  `index.html` et l'onglet Messages d'`admin.html`)
- Connexion par voyageur (lien magique par email) : Alexia invite un
  voyageur depuis l'onglet Voyageurs de l'admin, le voyageur reçoit un
  email, clique, et son app s'ouvre directement sur son voyage
  (`js/auth.js`, `#authGate` dans `index.html`)
- Modification en place des étapes d'itinéraire depuis l'admin (plus
  besoin de supprimer/recréer pour changer une heure, un titre, etc.)
- Équipements hôtel en cases à cocher (piscine, parking, salle de sport...)
  dans l'admin, réutilisent le système de badges déjà affiché côté client
  — champ "Autres badges" toujours dispo en saisie libre à côté
- Compagnon de route sans compte : n'importe quel voyageur peut ajouter une
  personne (juste un prénom) depuis Frais partagés pour pouvoir lui
  attribuer des dépenses, même si elle n'utilise pas l'appli
- Météo : toutes les étapes du voyage (passées/en cours/à venir) listées
  avec min/max du jour, + recherche libre d'un lieu quelconque
- Retour matériel/geste (Android) désormais cohérent avec la navigation à
  l'écran : depuis Documents/Album/Chat/Urgences/Météo/Frais/e-SIM, un
  retour ramène à l'écran précédent (`Plus` en général) au lieu de fermer
  l'appli. Double-retour-pour-quitter réservé à la racine de l'appli
  installée (`js/backGuard.js`, `history.pushState`/`popstate`)
- Taxes & pourboires : bloc d'explication culturelle (pourquoi le pourboire
  n'est pas optionnel aux États-Unis, sauf mention "gratuity included" sur
  le ticket) directement dans l'outil Taxes & Tips
- Fiche détail d'une étape d'itinéraire : cliquer sur une étape (hôtel,
  restaurant, activité) ouvre désormais une fiche avec adresse, horaires
  d'ouverture, conseil d'Alexia (spécialité/à ne pas rater), une petite
  bibliothèque de photos si Alexia en a ajouté, et la distance depuis la
  position actuelle si le GPS est autorisé et le lieu géocodable
  (`js/render.js` → `renderItemDetail`, `#screen-item-detail`). Migration
  `0010_item_details.sql` à exécuter (colonnes `address`/`opening_hours`/
  `alexia_tip` + table `itinerary_item_photos`, réutilise le bucket
  `trip-assets` existant)
- Fiche "Voiture de location" (Documents) : mise en page corrigée
  (libellé/valeur empilés au lieu de côte à côte, illisible dès qu'une
  valeur était longue) + dates/heures formatées en français plutôt
  qu'affichées au format brut du champ HTML
- Conseils libres d'Alexia par jour ("ne manquez pas The Bean ou la Willis
  Tower") : idées à voir/faire dans la ville du jour, sans réservation ni
  horaire, distinctes des étapes programmées — le voyageur suit ou non.
  Gérées dans l'admin sous chaque jour, affichées sous la timeline de
  l'écran Itinéraire (`js/render.js` → section `.day-tips` dans
  `renderItinerary`). Migration `0011_day_tips.sql` à exécuter (nouvelle
  table `day_tips`)

## À faire

### Connexion & sécurité
- ✅ Connexion par voyageur (voir ci-dessus)
- Retirer les règles de lecture/écriture publiques temporaires une fois
  qu'on n'en a plus besoin pour les démos rapides :
  - `supabase/migrations/0002_demo_public_read.sql`
  - Les policies "demo public ..." de `0003_admin_and_messages.sql`
- Attention au lien magique : par défaut Supabase attend qu'il soit ouvert
  sur le même appareil/navigateur que celui utilisé pour le demander (flow
  PKCE). Si des voyageurs se plaignent que le lien reçu sur leur téléphone
  ne marche pas après une demande faite depuis l'admin, il faudra ajuster
  ce réglage dans Supabase (Authentication → Settings)
- **Avant d'inviter de vrais clients** : configurer un vrai fournisseur
  d'email (Resend, Postmark, Brevo...) dans Supabase → Authentication →
  Settings → SMTP Settings. L'envoi par défaut de Supabase est limité à
  quelques emails/heure (prévu pour les tests, pas pour la production) —
  sans ça, les invitations échoueront avec "email rate limit exceeded"
  dès qu'il y a plusieurs voyageurs à inviter le même jour

### Appli installable (PWA)
- ✅ Logo/icône (pin dégradé or/terracotta sur fond marine, cohérent avec
  l'iconographie déjà utilisée dans l'appli), `manifest.json`, service
  worker minimal (`sw.js`). Sur Android/Chrome, une bannière/le menu
  propose "Ajouter à l'écran d'accueil" ou "Installer l'application" ; sur
  iPhone/Safari, c'est manuel : Partager → "Sur l'écran d'accueil"
  (Apple ne propose pas de bannière automatique, c'est une limite d'iOS,
  pas de l'appli)
- À faire : remplacer le logo généré par le vrai logo de l'entreprise
  (Alexia l'a en local). Une fois le fichier fourni, remplacer
  `icons/icon-512.png`, `icons/icon-192.png`, `icons/apple-touch-icon.png`
  et `icons/favicon-32.png`

### Messagerie avec Alexia
- ✅ Fil de discussion de base (voir ci-dessus)
- Reste à faire : notifications (push/email) quand un message arrive,
  historique multi-appareils une fois l'auth voyageur en place

### Page admin pour Alexia
- ✅ Version de base + modification en place des étapes (voir ci-dessus)
- Reste à faire : même modification en place pour les vols/voyageurs/jours
  (aujourd'hui limités à ajouter/supprimer), réordonner les étapes par
  glisser-déposer, page de connexion "mot de passe oublié"

### Vols : saisie manuelle vs automatique
- Actuellement 100% manuel (Alexia saisit tout : horaires, porte, statut)
- Option à budgéter séparément : brancher une API de suivi de vols
  (ex. AeroDataBox, FlightAware) pour qu'Alexia n'ait à saisir que le
  numéro de vol + la date, et que le reste se mette à jour automatiquement
  (changements de porte, retards...). Implique un abonnement à une API
  externe, à choisir et budgéter avec l'utilisateur avant implémentation

### Voiture de location
- ✅ Intégrée à l'écran Documents (admin : onglet Documents ; client :
  carte en haut de l'écran Documents). Table `rental_cars`, une par
  voyage pour l'instant

### Frais partagés
- ✅ Écran dédié : chaque dépense divisée à parts égales entre les
  voyageurs (hors guide), solde par personne (à récupérer/à devoir),
  ajout/suppression accessible à tout membre du voyage (petit groupe de
  confiance, pas de restriction "ses propres dépenses uniquement")

### e-SIM
- ✅ Sélecteur de marque (Holafly, Airalo...) → tuto spécifique par
  marque, rédigé et tenu à jour par Alexia depuis l'admin (nouveau
  bouton "📶 Guides e-SIM", bibliothèque partagée entre tous les
  voyages — pas propre à un trip). Fallback "méthode générale"
  (iOS/Android) toujours disponible et 100% statique/hors-ligne pour
  les marques non listées
- Volontairement pas de tuto pré-rempli par marque commerciale précise
  (Holafly, Airalo...) : leur fonctionnement change et une étape fausse
  peut coûter un jour de forfait au client — à Alexia de rédiger/valider

### Météo du jour
- ✅ Écran dédié, via Open-Meteo (gratuit, sans clé) : géocode le lieu de
  l'étape du jour puis récupère température actuelle + min/max. Aucun
  compte ni configuration à faire côté Supabase pour celle-ci

### Urgences
- ✅ Écran dédié : 911 (universel), ambassade et assurance/rapatriement
  saisis par Alexia (onglet Infos de l'admin — volontairement vide par
  défaut, jamais de numéro inventé), notes libres, lien direct vers le
  document "assurance" si uploadé

### Espace documents
- ✅ Upload par Alexia depuis l'admin, catégorisation (passeport, ESTA,
  assurance, location, billet, autre)
- ✅ Écran côté client (tuile "Documents" dans Plus) : liste groupée par
  catégorie, ouverture via URL signée temporaire

### Fiche détail d'une étape d'itinéraire
- ✅ Admin : champs Adresse / Horaires d'ouverture / Conseil d'Alexia sur
  chaque étape, + galerie de photos dédiée (en plus du visuel unique déjà
  affiché sur la carte de la timeline) : ajout/suppression de plusieurs
  photos en mode édition d'une étape
- ✅ Client : cliquer sur une carte d'étape (hors icône Maps) ouvre la
  fiche détail — adresse avec lien Maps, horaires, conseil d'Alexia (style
  "message d'Alexia"), galerie de photos (clic = image en plein écran dans
  un nouvel onglet), distance depuis la position actuelle
- La distance GPS est calculée côté client (formule de Haversine) à partir
  de `navigator.geolocation` + un géocodage à la volée de l'adresse/lieu de
  l'étape (même service gratuit Open-Meteo que la météo) — rien à
  configurer côté Supabase. Si le voyageur refuse la géoloc ou que le lieu
  n'est pas géocodable, la ligne "Distance" reste simplement masquée
- Champs vides (pas d'adresse/horaires/conseil/photo) : la ligne
  correspondante n'apparaît juste pas sur la fiche, rien d'inventé

## Pour la prochaine session

Reprendre ce fichier, prioriser avec l'utilisateur, puis avancer point par
point en gardant la même approche : le design ne bouge pas, le backend suit.
