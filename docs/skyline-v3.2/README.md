# SKYLINE APP V3.2 — Final visual polish & mobile UX

Branche `design/v3.2-final-polish`, créée depuis `main` (qui contient déjà `feat/v3.1-club-visual` et `feat/v3.1-card-flight`, carte métallique et MY FLIGHT inclus). Non fusionnée.
Captures : `avant/` (main, 390 px) et `apres/` (375 / 390 / 430 px). Vidéo : `parcours-390.webm`.

## Audit initial
- Microtextes mono entre 8 et 10 px (≈ 100 occurrences) portant des informations utiles ; texte secondaire à 50–66 % d'opacité.
- Bandeau « prototype » sur deux lignes à 375 px, chevauchant l'en-tête ; puce de phase de 36 px de haut.
- Activation de la communauté : liste de 5 conditions + 3 interrupteurs, sans explication de ce qu'elle change.
- MEMBERS / fiche membre / chat : champs carrés et avatars à initiales plats, hors du langage V3.1 ; astuce de chat trop volumineuse.
- EXPLORE : carte Radio basse, aucune structure, carte DJ en 4/5 très haute, rien sur la programmation ni les souvenirs.
- HOME : CTA « My Flight » souligné peu visible ; titre et identité membre sans hiérarchie ; pas d'accès utiles sous la révélation.

## Corrections
- **Global** : plancher de lisibilité (labels ≥ 11 px, informations utiles 12 px), texte secondaire relevé (`--text-dim` 0.66 → 0.74, `text-cloud/≤65` relevés), cartes à rayon commun 8–10 px, marge haute des écrans réduite, bandeau prototype sur une ligne, cibles tactiles ≥ 40 px.
- **HOME** : identité membre en nom + ligne d'édition, titre agrandi, compte à rebours plus lisible, CTA en bouton plein, deux accès rapides (Mon pass, Skyline Radio), carte Signal plus haute.
- **CLUB / MY FLIGHT** : carte et pass conservés ; sheen plus visible mais sobre, QR remplacé par un emplacement lisible (« QR — à la confirmation »), onglets alignés, statuts plus grands.
- **EXPLORE** : introduction, Skyline Radio en carte 5/4 avec bouton d'ouverture, accès Souvenirs, section Programmation avec un seul état d'attente (aucun artiste inventé), concept DJ set en carré.
- **Activation de la communauté** : photo + 3 promesses claires (privé par défaut, vous choisissez qui vous écrit, vous partez quand vous voulez), statut de réservation en une ligne, 3 consentements regroupés (aucun présélectionné), charte et bouton ; après activation : « Gérer mes préférences » et « Quitter ». Blocage/signalement inchangés.
- **MEMBERS / MEMBER / MESSAGES / CHAT** : avatars `Face`, champs arrondis, pastilles lisibles, astuce de chat compacte.

## Tests exécutés
`npx tsc --noEmit` ✔ · `npm run lint` ✔ · `npm run build` ✔ · `npm run test:unit` (45 + 7) ✔ · `npm run test:e2e` : `e2e-v3.cjs` (tout passe) + `e2e-v32.cjs` (parcours HOME→FLIGHT, HOME→CLUB→SPACE, CLUB→communauté, CLUB→MEMBERS→profil, EXPLORE→RADIO ; texte agrandi 20 px sans débordement à 375 px ; aucun texte < 11 px ; cibles tactiles ≥ 40 px ; focus clavier ; animations réduites) ✔.

## Problèmes restants (par importance)
1. Pas de test sur iPhone réel (capteurs, permission, safe areas physiques) : tests en Chromium mobile émulé uniquement.
2. HOME/EXPLORE (production) et écrans V3 gardent deux coques différentes (en-tête avec cloche vs bandeau prototype + puce de phase) : à unifier au branchement du backend.
3. MY FLIGHT, EXPLORE et la carte restent en français uniquement (hors dictionnaire FR/EN).
4. MY SPACE et SIGNAL n'ont reçu que la passe globale (lisibilité, rayons), pas de retouche de composition.
5. Titres des sélections radio : placeholders « à confirmer » tant que le catalogue n'existe pas.
6. Police Helvetica Now Extended non fournie : substitut OFL (Archivo).
