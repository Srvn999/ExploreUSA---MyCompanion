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
- Nouvelle section : compagnie, référence de réservation, dates de prise en
  charge / retour, emplacement du comptoir, modèle du véhicule
- Lien avec les documents associés (contrat, permis international...) —
  peut réutiliser la table `documents` existante (catégorie "rental")

### Espace documents
- ✅ Upload par Alexia depuis l'admin, catégorisation (passeport, ESTA,
  assurance, location, billet, autre)
- ✅ Écran côté client (tuile "Documents" dans Plus) : liste groupée par
  catégorie, ouverture via URL signée temporaire

## Pour la prochaine session

Reprendre ce fichier, prioriser avec l'utilisateur, puis avancer point par
point en gardant la même approche : le design ne bouge pas, le backend suit.
