# Feuille de route — My Companion

## Fait

- Prototype cliquable (design figé, `index.html`)
- Backend Supabase créé : schéma, sécurité (RLS), stockage photos
- Itinéraire et vols branchés sur les vraies données
- Appli en ligne sur GitHub Pages

## À faire

### Connexion & sécurité
- Écran de connexion par voyageur (email / lien magique) pour Zoé, Cécile, Alexia
- Retirer la règle de lecture publique temporaire une fois la connexion en place
  (voir `supabase/migrations/0002_demo_public_read.sql`)

### Appli installable (PWA)
- Ajouter un logo/icône de l'appli
- Rendre l'appli installable sur l'écran d'accueil du téléphone (plein écran,
  sans barre d'adresse) — pas besoin d'App Store / Play Store

### Messagerie avec Alexia
- Vrai fil de discussion client ↔ Alexia (remplace le bouton "Écrire à Alexia"
  actuel qui ne fait rien)
- Historique des messages, notifications

### Page admin pour Alexia
- Interface séparée où Alexia renseigne/modifie les informations d'un client :
  itinéraire, vols, documents, etc. (sans toucher au code ni à Supabase
  directement)
- Gestion multi-clients (plusieurs voyages en parallèle)

### Voiture de location
- Nouvelle section : compagnie, référence de réservation, dates de prise en
  charge / retour, emplacement du comptoir, modèle du véhicule
- Lien avec les documents associés (contrat, permis international...)

### Espace documents
- Zone dédiée pour stocker les documents importants par voyage : passeports,
  ESTA, assurance voyage, contrat de location, billets... (au-delà du simple
  "checklist" actuel dans Plus)
- Upload et consultation, protégé comme l'album photo (même logique de bucket
  privé + RLS)

## Pour la prochaine session

Reprendre ce fichier, prioriser avec l'utilisateur, puis avancer point par
point en gardant la même approche : le design ne bouge pas, le backend suit.
