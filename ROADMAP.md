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
- Rappels par notification push avant l'heure d'une étape ("dans 30 min :
  Cadillac Ranch"), activables/désactivables à volonté par le voyageur
  (tuile "Rappels" dans Plus, `#screen-reminders`), avec un délai
  configurable (15/30/60 min). Fonctionne même appli fermée/téléphone
  verrouillé — nécessite une pièce en plus du schéma habituel : une
  fonction serveur (`supabase/functions/send-itinerary-reminders`)
  appelée toutes les ~5 min par une tâche planifiée (pg_cron + pg_net),
  qui envoie la notification via Web Push (clés VAPID). Le fuseau horaire
  de chaque jour est déduit à la volée du lieu (`location_label`, via le
  même géocodage gratuit que la météo/les taxes) pour convertir l'heure
  locale de l'étape en heure réelle d'envoi — indispensable sur un
  roadtrip qui traverse plusieurs fuseaux. Migration `0012_reminders.sql`
  à exécuter (colonnes `reminders_enabled`/`reminder_lead_minutes` sur
  `travelers`, tables `push_subscriptions` et `sent_reminders`) +
  déploiement de la fonction (étape différente du SQL Editor habituel,
  voir message de livraison de cette fonctionnalité pour la marche à
  suivre complète)
- Audit UX (session du 9/9) : dix correctifs issus d'un passage en revue
  complet de l'appli —
  - Badge "message non lu" sur l'onglet Plus et la tuile "Message à
    Alexia", effacé dès l'ouverture du chat (`travelers.last_message_read_at`,
    fonction `mark_messages_read()`)
  - L'écran Itinéraire s'ouvre désormais sur le jour du jour (au lieu de
    toujours Jour 1), avec un repère visuel doré sur la pastille
    d'aujourd'hui
  - La demande de géolocalisation dans la fiche détail d'étape n'est plus
    automatique : un bouton "Voir la distance" explicite la déclenche
  - Chargement du voyage parallélisé (8 requêtes en même temps plutôt
    qu'en série) + rafraîchissements ciblés après ajout d'une dépense ou
    d'une photo (juste cette section, plus tout le voyage)
  - Confirmation avant déconnexion
  - Texte de la tuile Météo mis à jour (toutes les étapes, plus seulement
    "aujourd'hui")
  - "Conciergerie" remplacé par "Alexia" dans les textes voyageur (levée
    de l'ambiguïté avec le rôle "Guide")
  - Horodatage sous chaque message du chat
  - Progression "Jour X/Y" sur l'écran d'accueil
  - État de chargement ("Chargement de votre voyage...") entre la
    connexion réussie et l'affichage effectif du voyage, au lieu d'un
    écran de connexion figé sans retour visuel
  - **Corrige au passage un bug introduit avec les rappels** : aucune
    policy RLS ne permettait à un voyageur de modifier sa propre ligne
    `travelers` une fois son invitation acceptée, donc le bouton "Activer
    les rappels" ne sauvegardait en réalité jamais rien en base. Remplacé
    par une fonction `set_reminder_prefs()` (SECURITY DEFINER, ne touche
    que les colonnes utiles) plutôt qu'une policy UPDATE générale, qui
    aurait permis à un voyageur de modifier n'importe quelle colonne de sa
    ligne — y compris `trip_id` (rejoindre un autre voyage) ou `role`.
    Migration `0013_unread_messages.sql` à exécuter (nécessaire même sans
    s'intéresser au badge, pour que les rappels fonctionnent enfin)
- Visionneuse de document intégrée : toucher une pièce jointe (Documents,
  ou le contrat d'assurance dans Urgences) l'affiche désormais directement
  dans l'appli (image ou PDF) au lieu d'ouvrir un nouvel onglet — dont le
  comportement dépend du navigateur et pouvait forcer un téléchargement
  plutôt qu'un aperçu rapide. Les formats non prévisualisables (Word...)
  gardent un lien "Ouvrir le fichier". Le retour matériel/geste ferme la
  visionneuse sans quitter l'écran en dessous (`#docViewer` dans
  `index.html`, `openDocumentViewer` dans `js/render.js`)
- Admin — itinéraire plus lisible : chaque jour a maintenant un fond
  distinct (liseré terracotta, ombre légère, plus d'espace entre les
  jours) avec un badge "Jour N" bien visible en en-tête. Chaque étape
  affiche son horaire en évidence et un badge de couleur par type
  (hôtel/activité/restaurant). Les formulaires "Ajouter une étape" et
  "Conseils libres" sont isolés dans des encarts distincts avec un
  intitulé, pour distinguer plus facilement "les étapes déjà là" de "ce
  qu'on est en train d'ajouter"
- Audit sécurité (session du 10/9) : revue de toutes les policies RLS
  (chaque table vérifiée une par une), du stockage, de la gestion des
  secrets, et de l'échappement des données affichées (protection XSS —
  aucune faille trouvée, `escapeHtml` systématique). Deux correctifs
  appliqués :
  - Suppression des policies "demo public ..." qui laissaient n'importe
    qui sur Internet lire le voyage de démo et **écrire dans son chat**
    sans compte (migration `0014_remove_demo_public_access.sql`)
  - `@supabase/supabase-js` figé sur une version exacte (2.116.0) au lieu
    de la version majeure seule — évite qu'une mise à jour de la
    librairie (légitime ou non) change silencieusement de comportement
    pour tous les utilisateurs sans revue de notre part
- Traducteur dans Outils (3ᵉ sous-onglet, à côté du convertisseur €/$ et
  de Taxes & Tips) : français ↔ anglais ↔ espagnol, via MyMemory (gratuit,
  sans clé, comme la météo). L'espagnol est proposé au même niveau que
  l'anglais plutôt que restreint à certains États — utile sur les
  itinéraires façon Route 66 qui traversent Texas/Nouveau-Mexique/
  Arizona/Californie, mais rien n'empêche un voyageur de l'utiliser
  ailleurs. `window.MyCompanion.translateText` dans `js/data.js`, UI
  inline dans `index.html` (`sub-trad`)
- Traducteur : saisie vocale + photo (façon Google Lens)
  - ✅ Saisie vocale : reconnaissance native du navigateur (Web Speech
    API), aucune config. Bien supportée sur Chrome/Android ; le bouton
    micro se masque simplement sur les appareils qui ne la proposent pas
    (iPhone/Safari notamment — limite du navigateur, pas de l'appli)
  - ✅ Photo → texte (OCR) : Tesseract.js, tourne entièrement dans le
    navigateur du voyageur, aucune clé ni compte, aucun coût récurrent.
    Choix assumé avec l'utilisateur : la précision est correcte sur du
    texte imprimé net et bien cadré, mais en dessous d'une API cloud
    payante (Google Vision/Azure) sur des menus stylisés, mal éclairés ou
    de travers — solution à revoir si la qualité s'avère insuffisante en
    usage réel, en passant alors par une fonction serveur dédiée (comme
    send-itinerary-reminders) pour ne jamais exposer une clé payante
    côté client
- Retour matériel/geste, round 2 : le correctif précédent (voir plus haut)
  ne couvrait qu'à moitié le cas — plonger depuis un onglet principal
  (Plus, Itinéraire, Accueil...) vers un écran secondaire (Documents,
  Album, Urgences, fiche détail d'étape...) n'enregistrait que l'écran
  secondaire dans l'historique, jamais l'onglet de départ. Résultat : le
  retour ne remontait pas à la liste mais à ce qu'il y avait avant
  (parfois un tout autre écran resté en mémoire, parfois direct la
  logique de sortie). `showTab()` pose maintenant un repère pour
  l'onglet principal courant avant d'empiler l'écran secondaire — mais
  seulement au premier plongeon depuis cet onglet (pas à chaque
  changement d'écran secondaire imbriqué, ex. e-SIM marque → tuto, où le
  retour doit remonter à la liste des marques puis seulement ensuite à
  Plus). Vérifié une à une sur toutes les tuiles de Plus (Album,
  Urgences, Message à Alexia, Documents, Météo, Rappels, Frais partagés,
  e-SIM + son tuto par marque/méthode générale) + le raccourci "Écrire à
  Alexia" depuis l'accueil + la fiche détail d'étape depuis l'itinéraire
- Mode hors-ligne (roadbook) : à chaque chargement réussi du voyage, un
  instantané (itinéraire, documents — leur liste, pas les fichiers,
  infos urgence, voiture de location, vols, dépenses...) est gardé en
  local (`localStorage`, `js/offline.js`) sur l'appareil du voyageur.
  Si la connexion/la session Supabase est indisponible au chargement
  suivant (zone désertique, parc national, roaming capricieux), l'appli
  repart automatiquement de ce dernier instantané connu au lieu de
  bloquer sur l'écran de connexion — un bandeau "Mode hors-ligne —
  dernières données du [date/heure]" s'affiche en haut de l'appli tant
  que ces données ne sont pas rafraîchies. N'importe quel chargement en
  ligne réussi remet à jour le cache et masque le bandeau. Limite
  assumée : seules les métadonnées des documents sont mises en cache,
  pas les fichiers eux-mêmes (PDF/photos) — ouvrir un document reste
  impossible hors connexion (URL signée à la demande), un petit message
  l'indique maintenant au lieu de ne rien faire silencieusement. Cache
  vidé à la déconnexion (`signOut`), pour un appareil parfois partagé en
  famille/groupe d'amis
- Vue carte globale de l'itinéraire : bouton "Carte" en haut de l'onglet
  Itinéraire, ouvre un écran dédié avec toutes les étapes du voyage
  repérées sur une carte (Leaflet + tuiles OpenStreetMap, gratuit et
  sans clé, même logique que la météo/le géocodage déjà en place). Les
  étapes programmées sont reliées par un tracé en pointillés dans l'ordre
  du voyage ; les suggestions libres d'Alexia pour le temps libre
  apparaissent en plus, dans une couleur différente. Chaque point ouvre
  une bulle avec le nom du lieu et le jour. Géocodage fait à la volée à
  l'ouverture de l'écran seulement (pas au chargement du voyage), avec
  mise en cache en mémoire pour ne pas re-géocoder deux étapes au même
  endroit ni recommencer à chaque réouverture de l'écran dans la même
  session
- Notifications push sur le contenu du voyage (pas que les rappels
  d'horaire) : quand Alexia ajoute un document ou ajoute/modifie une
  étape d'itinéraire depuis l'admin, tous les voyageurs abonnés aux
  notifications (ceux qui ont déjà activé "Rappels" au moins une fois,
  même table `push_subscriptions`, pas de nouveau réglage à gérer) sont
  notifiés. Nouvelle fonction serveur `notify-trip-update`, appelée
  directement par le navigateur d'Alexia (pas par pg_cron) juste après
  l'ajout/la modification réussie — réutilise les mêmes secrets VAPID
  déjà configurés, aucun secret supplémentaire à ajouter. Vérifie que
  l'appelant est bien admin (`is_admin()`) avant d'envoyer quoi que ce
  soit : sans ça, n'importe quel voyageur connecté aurait pu notifier
  tous les autres membres du voyage. **Étape manuelle à faire une fois
  par Alexia/Servan** : déployer cette nouvelle fonction depuis le
  Dashboard Supabase (Edge Functions → Deploy a new function → coller le
  contenu de `supabase/functions/notify-trip-update/index.ts`), avec
  "Verify JWT" laissé activé (à la différence de la fonction des
  rappels) — voir le fichier pour le détail
- Fiches "bon à savoir" culturelles : nouvelle tuile dans l'onglet Plus,
  bibliothèque de fiches (pourboires, essence, code de la route
  américain...) rédigées et tenues à jour par Alexia depuis l'admin
  (bouton "🧭 Fiches bon à savoir", nouvelle table `culture_tips`),
  partagée entre tous les voyages — même mécanique que les guides e-SIM.
  Chaque fiche a un titre, un emoji optionnel, un texte libre, et un
  champ "États concernés" optionnel (affiché tel quel, purement
  indicatif). Comme pour les guides e-SIM : jamais de contenu pré-rempli
  par My Companion, uniquement ce qu'Alexia rédige elle-même. Migration
  `0015_culture_tips.sql` à appliquer une fois dans Supabase (SQL editor)

## À faire

### Connexion & sécurité
- ✅ Connexion par voyageur (voir ci-dessus)
- ✅ Retiré : les policies "demo public ..." (lecture publique du voyage
  de démo, écriture publique dans son chat, lecture publique de son
  bucket) — migration `0014_remove_demo_public_access.sql`
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
- ✅ Validation des fichiers uploadés (photos album, visuels d'étape,
  galerie de photos, documents) : type MIME réel + taille max vérifiés
  côté client avant l'envoi (`window.MyCompanion.validateUpload` dans
  `js/supabaseClient.js`, chargé par index.html et admin.html). L'attribut
  HTML `accept` n'était qu'une suggestion pour le sélecteur de fichiers,
  pas une vraie barrière
- ✅ La visionneuse PDF (iframe) a maintenant `sandbox="allow-same-origin"`
  (sans `allow-scripts`) — défense en profondeur contre un fichier
  déguisé en PDF, sans rien changer à l'affichage normal
- Compte admin d'Alexia sans double authentification (2FA) — action
  manuelle côté Alexia (Supabase ne permet pas de l'activer par migration
  SQL) : Authentication → Providers → Email, ou directement sur son
  compte utilisateur. À activer si elle est d'accord pour l'utiliser, vu
  que ce compte a accès à tous les voyages
- Choix assumé, pas un bug : n'importe quel voyageur peut modifier/
  supprimer les dépenses de n'importe qui d'autre du même voyage (esprit
  "cagnotte entre amis")
- Principe de sécurité systématique pour la suite du projet consigné
  dans `CLAUDE.md` (nouveau fichier) — à relire en début de session

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

### Rappels (notifications push)
- ✅ Toggle + délai (15/30/60 min) côté voyageur, abonnement Web Push
  (`js/reminders.js`), fonction serveur programmée (voir ci-dessus)
- ✅ **Correctif** : la librairie `npm:web-push` provoquait un timeout côté
  serveur (`Gateway Timeout` sur ~2/3 des appels, confirmé en prod le
  10/9) — elle utilise en interne des mécanismes réseau propres à Node.js
  qui restent bloqués dans le runtime Deno des fonctions Supabase. Envoi
  Web Push réimplémenté à la main (JWT VAPID signé + chiffrement du
  payload en aes128gcm, RFC 8291/8292) avec uniquement l'API Web Crypto
  standard, zéro dépendance npm. Logique de chiffrement vérifiée par un
  test de bout en bout (chiffrement + déchiffrement indépendant, hors
  Deno) avant mise en prod — voir `supabase/functions/send-itinerary-
  reminders/index.ts`
- Pas encore de contrôle fin par étape ("je veux le rappel pour le
  restaurant mais pas pour l'hôtel") : c'est un réglage global par
  voyageur pour l'instant. À ajouter facilement plus tard si le besoin se
  confirme (une case à cocher par étape, en plus du réglage global)
- Le clic sur la notification rouvre/focus l'appli à l'écran où elle
  était, pas directement sur la fiche détail de l'étape concernée (pas de
  deep-link pour l'instant)

## Pour la prochaine session

Reprendre ce fichier, prioriser avec l'utilisateur, puis avancer point par
point en gardant la même approche : le design ne bouge pas, le backend suit.
