# SKYLINE APP V2 — HOME · rapport de première implémentation

Branche : `v2-private-members` (la production n'est pas touchée). Captures : `captures/` (375, 390, 430 px ; phases avant / pendant / après).

## Décisions de design
- **HOME = une seule composition** : photo plein cadre, étiquette membre, légende verticale « From France to Ibiza », titre signature en 4 lignes (« 10 000 » en bleu ciel), filet, countdown discret, accès MY FLIGHT. Puis un seul contenu prioritaire (SKYLINE EXPERIENCE) en composition asymétrique. Rien d'autre.
- **Navigation à 4 onglets** : HOME · MY FLIGHT · EXPLORE · CLUB. MORE supprimé.
- **Profil** (avatar) : identité, informations pratiques (aide-mémoire discret, repliable), aide, à propos, accès au crew. Notifications : icône cloche conservée.
- **Ambiance par phase** (avant / pendant / après) : photo, accent, message, countdown (jusqu'au départ, puis jusqu'à la fin, puis absent). Pour la revue créative : `/?phase=before|during|after` force une phase (démo uniquement).
- **Supprimé** : checklist et son état local (purgé sur les appareils), jauge de progression, cartes de raccourcis, tuiles rondes, onglet MORE, couronne VIP. Anciennes routes : `/pass` → `/flight`, `/more` → `/`.
- **Conservé** : panneau « concept », annonces filtrables (déplacées dans EXPLORE, écran temporaire), crew (via le profil), notifications, sheets accessibles, retour système.

## Tests (Chromium/Playwright — pas de Safari iOS réel)
Build, lint, 20 vérifications d'interaction OK ; 0 débordement horizontal à 320 / 375 / 390 / 430 / 1280 px ; 0 erreur console ; reduced-motion respecté.

## Écarts restants vis-à-vis des planches approuvées
| Sujet | État |
|---|---|
| Photographie du hero (aile / mer / lumière réelles) | **Bloqué par asset** — ciel provisoire généré, étiqueté « Visuel provisoire » |
| Photo « DJ set dans l'avion » | **Bloqué par asset** — ambiance lumineuse abstraite, aucune fausse scène |
| Wordmark officiel + emblème rond | **Bloqué par asset** — substitut typographique sans point |
| Helvetica Now (Extended / Regular / Medium) | **Bloqué par licence/fichiers** — substitut Archivo (OFL) |
| Photos d'ambiance « pendant » et « après » | **Bloqué par asset** — placeholders (coucher de soleil, nuit) |
| MY FLIGHT, EXPLORE éditorial, CLUB (carte membre, archives) | Non conçus (hors mission : attendre la validation de HOME) |
| Safari iOS réel, performances sur appareil | Non testé ici |

## Assets exacts à fournir
1. Wordmark SKYLINE (SVG, noir + blanc) et emblème rond si utilisé.
2. Helvetica Now Extended Bold, Regular, Medium (.woff2 licenciés).
3. Hero « avant » : photo verticale, aile d'avion / nuages / lumière, ≥ 1170×2532, zone calme dans le tiers bas.
4. Hero « pendant » : photo verticale Ibiza lumineuse, mêmes dimensions.
5. Hero « après » : photo verticale intime/club, mêmes dimensions.
6. Visuel « DJ set dans l'avion » : photo 4:5, ≥ 1600 px de large (ou courte vidéo).
7. Photographies d'artistes officielles et confirmées, uniquement le moment venu.
Branchement : `src/data/demo.ts` (`images`, `brand.wordmarkSrc`), puis `PLACEHOLDER_PHOTOS = false`.
