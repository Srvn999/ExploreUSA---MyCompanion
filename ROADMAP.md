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

## À faire

### Connexion & sécurité
- Écran de connexion par voyageur (email / lien magique) pour Zoé, Cécile, Alexia
- Retirer les règles de lecture/écriture publiques temporaires une fois la
  connexion en place :
  - `supabase/migrations/0002_demo_public_read.sql`
  - Les policies "demo public ..." de `0003_admin_and_messages.sql`
  (le chat démo n'envoie actuellement qu'au nom de Zoé, en dur)

### Appli installable (PWA)
- Ajouter un logo/icône de l'appli
- Rendre l'appli installable sur l'écran d'accueil du téléphone (plein écran,
  sans barre d'adresse) — pas besoin d'App Store / Play Store

### Messagerie avec Alexia
- ✅ Fil de discussion de base (voir ci-dessus)
- Reste à faire : notifications (push/email) quand un message arrive,
  historique multi-appareils une fois l'auth voyageur en place

### Page admin pour Alexia
- ✅ Version de base (voir ci-dessus)
- Reste à faire : édition d'une étape existante (aujourd'hui on peut
  seulement ajouter/supprimer, pas modifier en place), réordonner les
  étapes par glisser-déposer, page de connexion "mot de passe oublié"

### Voiture de location
- Nouvelle section : compagnie, référence de réservation, dates de prise en
  charge / retour, emplacement du comptoir, modèle du véhicule
- Lien avec les documents associés (contrat, permis international...) —
  peut réutiliser la table `documents` existante (catégorie "rental")

### Espace documents
- ✅ Upload par Alexia depuis l'admin, catégorisation (passeport, ESTA,
  assurance, location, billet, autre)
- Reste à faire côté client : un écran dans `index.html` pour que les
  voyageurs consultent/téléchargent leurs documents (actuellement
  uploadables uniquement, pas encore affichés côté client)

## Pour la prochaine session

Reprendre ce fichier, prioriser avec l'utilisateur, puis avancer point par
point en gardant la même approche : le design ne bouge pas, le backend suit.
