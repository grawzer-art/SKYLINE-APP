# SKYLINE APP V3.1 — Club Experience (direction visuelle)

Branche `feat/v3.1-club-visual` — **non fusionnée dans main**. Prototype : données fictives, aucun backend, aucune messagerie réelle.
Captures : `captures/` (CLUB, MY SPACE, MESSAGES, RADIO à 375 / 390 / 430 px ; suffixe `-bas` = bas de page). MY SPACE et MESSAGES sont capturés avec la communauté activée (état fictif).

## Choix visuels
- Base noir / blanc / argent, accents Sky Blue (états, anneaux, actifs) et Ibiza Sunset (mentions prototype, éclats photo). Typographie Archivo étendue (substitut OFL de Helvetica Now Extended) en titres, mono pour les micro-labels.
- Photographie immersive authentique (hero CLUB, MY SPACE, RADIO) ; recadrages sans visage pour les couvertures et tuiles.
- Logo officiel uniquement (wordmark/emblème du brand book), jamais redessiné.
- **CLUB** : titre fort, carte de membre au ratio carte bancaire (bord argent, emblème, inclinaison douce), accès MY SPACE / MEMBERS / MESSAGES / SOUVENIRS en tuiles photo.
- **MY SPACE** : profil d'abord (avatar, pseudo, ville, citation, goûts, visibilité) ; l'édition est une feuille secondaire (« Modifier »).
- **MESSAGES** : onglets Conversations / Demandes avec compteurs, avatars à anneau et point « non lu », recherche repliée.
- **RADIO** : sélection à la une plein écran avec lecteur intégré, playlists en défilement horizontal, DJ, mixes.

## Écarts avec la planche
- Aucune photo de personne : avatars à initiales (pas de faux participants).
- Artistes / DJ / playlists : placeholders « à confirmer » ; aucun média sans autorisation de diffusion.
- Typographie : substitut OFL tant que la police licenciée n'est pas fournie.
- Numéro de carte « attribué » : fictif, démo signalée.
- Planche reproduite comme interface responsive, pas à l'identique pixel pour pixel.

## Vérifications
`npm run test:unit` (45 + 7), `npm run test:e2e` (tout passe, 0 erreur console), lint et build propres.
