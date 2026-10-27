# V3.1 — Carte membre SKYLINE CLUB + MY FLIGHT (pass)

Branche `feat/v3.1-card-flight` (non fusionnée). Captures : `captures-card-flight/` (375 / 390 / 430 px ; `-bas` = bas de page ; `reflet-gauche/droite` = lumière à deux positions du doigt).

## Carte membre CLUB
Noir profond, grain brossé, liseré clair en haut / sombre en bas (relief), emblème officiel + filigrane gravé, nom du membre en relief argent, une hiérarchie en trois niveaux (identité / nom / date + numéro). Reflet CSS qui suit le doigt (variables CSS, 1 mise à jour par image, aucun rendu React pendant le geste), balayage unique à l'apparition. Inclinaison par capteurs **facultative** : bouton « Activer le reflet au mouvement », permission iOS demandée uniquement à ce toucher. `prefers-reduced-motion` : aucun reflet ni inclinaison.

## MY FLIGHT
- Écran d'ouverture : photo aérienne en bandeau (21 rem, non plein écran), titre, **pass** visible sans défilement, puis trois univers : Flight details / Your stay / Live updates (onglet par défaut selon la phase : avant → vol, pendant → annonces).
- Pass : même matière que la carte, composition différente (participant, trajet France → Ibiza, perforation, statut d'accès réel, emplacement QR, « pas un titre de transport »). Statut « confirmé » uniquement si la réservation l'est (simulation du prototype) ; numéro de pass « attribué par l'équipe » ; **aucun faux QR**.
- Informations non disponibles : un seul message sobre par univers. Mentions légales et documents dans « Informations importantes » (feuille).
- Après Ibiza : le voyage passe en historique (souvenirs, Club).
- Aperçu de la mise en page : Simulation › « Données de voyage » › Aperçu fictif (valeurs marquées « Démo », jamais présentées comme réelles).

## À prévoir pour la production
Authentification membre ; réservation et statut officiels (API équipe) ; numéro de pass et QR sécurisé signé (rotation, hors ligne) ; contenus publiés par l'équipe (vol, séjour, annonces, horodatage) ; notifications des mises à jour ; police Helvetica Now Extended sous licence ; test sur iPhone réel (capteurs, performances).

## Limites
Tests réalisés avec Chromium mobile émulé (pointer events, safe areas via variables) ; **les capteurs et la permission iOS n'ont pas pu être testés sur iPhone réel** depuis cet environnement.
