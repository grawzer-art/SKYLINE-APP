# V3.3 — Épure, SKYLINE PASS 3D, étude Apple Wallet

Branche `feat/v3.3-epure-pass-wallet` (depuis `feat/skyline-sound` : SKYLINE SOUND et son lecteur global sont conservés). Non fusionnée.

## Épure (rien de supprimé fonctionnellement)
- **HOME** : suppression des deux tuiles « accès rapides » (doublons de la barre de navigation) ; carte Signal sans badge « Démo » ni libellé redondant ; mention démo en simple ligne.
- **EXPLORE** : phrase d'intro et sur-titres redondants retirés, compteurs des filtres et badges « Démo » par ligne supprimés (la mention démo globale reste).
- **CLUB** : blocs « À venir » et état vide d'historique retirés (l'historique n'apparaît qu'après le départ), signature de bas de page retirée.
- Conservés : horaires, statuts, consignes, accès, mentions obligatoires, libellés d'accessibilité, NEW (nouveauté).

## SKYLINE PASS 3D
- Perspective plus marquée (rotation ≤ 6° / 7°), parallaxe subtile (emblème en arrière, nom en avant), reflets argentés + bleutés, hologramme discret (conique Sky Blue / argent masqué par fines hachures), balayage d'intro unique.
- Capteurs : lissage ; **iOS : permission demandée uniquement au toucher du bouton** ; navigateurs sans permission : actif sans demande. Desktop : survol du pointeur. Aucune rotation/animation avec « réduire les animations » ou sans capteur (version statique).
- QR : emplacement hors des calques parallaxe, fond opaque ; il suit seulement la légère rotation globale du pass (≤ 7°). Le vrai QR n'existe pas encore (voir Wallet).

## Tests
tsc ✔ · lint ✔ · build ✔ · unitaires ✔ · e2e v3, v3.2, sound ✔ et **nouveau `tests/e2e-pass.cjs`** (capteurs simulés avec `deviceorientation`, permission iOS accordée/refusée, désktop, réduction des animations).
**Non testé** : vrai iPhone (capteurs réels, ressenti de fluidité, performances), Safari/PWA. À vérifier à la main : fluidité à 60 i/s, lisibilité du pass sous reflets, bouton « Activer le reflet au mouvement » → fenêtre de permission iOS.

## Apple Wallet
Étude et plan : `docs/skyline-wallet/PLAN.md`. Aucun bouton Wallet ajouté.
