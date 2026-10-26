# SKYLINE APP V2 — HOME · alignement brand book + SKYLINE SIGNAL

Branche : `v2-private-members` (production non touchée). Captures : `captures/` (375, 390, 430 px ; révélation SIGNAL ; Explore).

## Respect du brand book
- **Wordmark** : plus aucune recréation typographique. Un **emplacement identifié** (« Wordmark officiel · à fournir ») occupe le header ; `brand.wordmarkSrc` / `brand.emblemSrc` (src/data/demo.ts) brancheront les fichiers officiels. Pas de ®, pas d'avion décoratif, emblème non reconstitué.
- **Couleurs** : palette seule. Avatars monochromes (plus de teintes), pastille de notification en bleu ciel ; l'orange est réservé aux révélations musicales (point SIGNAL).
- **Typographies** : titres Archivo (substitut OFL de Helvetica Now Extended), texte Helvetica Neue/Arial, chiffres JetBrains Mono, accroches **Light espacé** (`.font-tagline`).
- **Photographie** : plus aucune fausse illustration d'événement. Sans fichier, `Photo` affiche un **emplacement « Photo à fournir »** décrivant l'asset exact. Seuls les ciels du hero (abstraits, étiquetés « Visuel provisoire ») servent de fond de travail.
- **Ton** : conseils bagages/vêtements supprimés ; informations légales et pratiques factuelles dans le profil.

## HOME
Header (wordmark) · statut membre · photographie dominante · accroche « LA FÊTE COMMENCE À 10 000 MÈTRES. » · countdown discret · accès MY FLIGHT · **une seule annonce : SKYLINE SIGNAL** · navigation 4 onglets. Tout tient dans la première vue (375/390/430 px). Ambiances avant / pendant / après : `/?phase=before|during|after`.

## SKYLINE SIGNAL
Indicateur discret (point orange) sur la bande HOME et sur l'onglet EXPLORE tant que des révélations restent à ouvrir → ouverture plein écran (révélation circulaire, titres en fondu ; simple fondu si reduced-motion) → contenu **toujours consultable** (« Revoir » sur HOME, archive dans EXPLORE). Aucun point, score ou récompense. État mémorisé localement (démo). Contenus **fictifs** : artiste, lieu et mix de démonstration.

## Tests (Chromium/Playwright — pas de Safari iOS réel)
Build, lint ; ~28 vérifications d'interaction OK (SIGNAL, retour système, persistance, profil, redirections, nav, filtres, reduced-motion) ; 0 débordement à 320/375/390/430/1280 px ; 0 erreur console.

## Écarts restants / assets à fournir
| Sujet | État |
|---|---|
| Wordmark officiel + emblème circulaire (SVG/PNG ; blanc sur fond sombre, noir, argenté) | **Bloqué par asset** — emplacement visible |
| Helvetica Now Extended / Regular / Medium / Light (.woff2 licenciés) | **Bloqué par licence** — substituts |
| Hero « avant » : photo verticale aérienne ≥ 1170×2532, zone calme dans le tiers bas | **Bloqué par asset** |
| Hero « pendant » (Ibiza, lumière naturelle) et « après » (intime) : mêmes dimensions | **Bloqué par asset** |
| Médias des Signals (portrait artiste 4:5, lieu 4:5, visuel mix 1:1, vidéo officielle) | **Bloqué par asset / droits** |
| Photos réelles pour EXPLORE, CLUB (archives, aftermovies) | Hors mission |
| MY FLIGHT, EXPLORE éditorial, CLUB (carte membre noir/argent/blanc) | Non conçus — attendre la validation de HOME |
| Safari iOS réel / performances appareil | Non testé ici |

## Mise à jour — photographies authentiques intégrées
13 photographies de la première édition (fournies par SKYLINE) sont dans `public/photos/` (redimensionnées à 1200 px, ≈ 2,4 Mo au total). Hero « avant » : coucher de soleil au hublot ; « pendant » : fête en cabine ; « après » : escalier de nuit ; DJ set : présentation du concept (HOME → Explore) ; photos des Signals « lieu » et « mix ».
Toutes les images générées ont été supprimées. Le Signal « artiste » garde volontairement un emplacement : aucune annonce d'artiste fictive ne doit s'appuyer sur le visage d'une vraie personne.
Droits à confirmer avant diffusion publique : accord des personnes photographiées (participants, DJ) et crédit photographe.

## Mise à jour — logos officiels
Fichier fourni : emblème circulaire noir sur blanc (JPG). Dérivés dans `public/brand/` : `skyline-emblem-white.png` et `skyline-emblem-black.png` (fond rendu transparent, couleurs Cloud White / Jet Black ; conversion de couleur uniquement, aucun redessin) et `skyline-wordmark-white.png` (simple rognage du mot SKYLINE dans l'emblème, sans retouche). Branchés via `brand.wordmarkSrc` / `brand.emblemSrc`. Usages : wordmark dans le header, emblème dans le profil et le pied de page, icône d'écran d'accueil.
Limites : fichiers matriciels (pas de SVG) → à remplacer par les SVG officiels ; le « wordmark seul » du brand book (avec ®, « EVENT » espacé) n'a pas été fourni : le mot rogné de l'emblème en tient lieu, à faire valider ; variante argentée non dérivée (Club à venir).
