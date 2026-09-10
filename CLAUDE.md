# My Companion — notes pour Claude

Voir `ROADMAP.md` (état d'avancement, à faire) et `SETUP.md` (procédure
de connexion Supabase) pour le contexte fonctionnel. Ce fichier ne
contient que des conventions de travail à respecter d'une session à
l'autre.

## Principes

- **Le design ne bouge pas.** `index.html`/`admin.html` gardent leurs
  classes CSS et leur structure visuelle ; les nouvelles fonctionnalités
  s'intègrent dans les patterns existants plutôt que d'en inventer de
  nouveaux sans raison.
- **Sécurité systématique.** Pour toute nouvelle table/fonctionnalité
  touchant les données ou l'upload de fichiers :
  - RLS activée + policies au plus juste (jamais une table sans RLS).
  - `escapeHtml()` sur toute donnée utilisateur injectée dans le DOM
    (pas de framework ici, tout est construit à la main — un oubli =
    XSS stocké).
  - Fichiers uploadés : valider le type MIME réel et une taille max
    côté client avant l'envoi (l'attribut HTML `accept` n'est qu'une
    suggestion, pas une barrière).
  - Aucun secret (clé service_role, clé privée VAPID, jetons cron...)
    ne doit jamais atterrir dans un fichier commité — toujours vérifier
    par un grep avant de committer si un secret a été généré/manipulé
    dans la session.
  - Un audit sécurité complet a été fait le 10/9 (voir ROADMAP.md,
    section "Audit sécurité") — s'y référer pour l'état des lieux avant
    d'en relancer un depuis zéro.
- **Jamais de donnée inventée.** Numéros de téléphone, procédures
  spécifiques à un fournisseur commercial, etc. : toujours un champ
  éditable vide par Alexia plutôt qu'une valeur plausible mais fausse.
- Avant de commit/push : vérifier la syntaxe des fichiers modifiés
  (`node --check` pour le JS) et l'équilibre des balises `<div>` dans les
  fichiers HTML touchés (un script Python rapide suffit).
