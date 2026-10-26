# SKYLINE APP V3 — Product & UX Foundation

> **Mise à jour — décisions produit validées** (`08_DECISIONS.md`) : messagerie accessible avant le voyage sous conditions, 18+, profils privés par défaut, demandes de contact, modération SKYLINE, hébergement UE (devis avant tout service payant), français + architecture anglais. Les interfaces complètes **MY SPACE, MEMBERS, MESSAGES et SKYLINE RADIO** sont prototypées (`09_COMMUNITY_UI_SPEC.md`) et le contrat serveur est préparé (`10_BACKEND_CONTRACT.md`). Toujours **aucune donnée réelle et aucun service connecté**.

Branche : `design/v3-product-ux` — **conception uniquement** : aucun backend, aucun compte, aucun message, aucune réservation réelle. La production (`main`) est inchangée et le prototype n'y est pas fusionné.

## Contenu de la livraison
| # | Livrable | Où |
|---|---|---|
| 1 | Arborescence détaillée des écrans | `01_SITEMAP.md` · plan navigable `/v3/screens` |
| 2 | Parcours membre avant / pendant / après | `02_MEMBER_JOURNEY.md` |
| 3 | Wireframes mobile-first (HOME, MY FLIGHT, EXPLORE, RADIO, MY SPACE, MEMBERS, MESSAGES, CLUB, HQ) | `03_WIREFRAMES.md` · `wireframes/` · `/v3/wireframes` |
| 4 | Architecture SKYLINE HQ | `04_SKYLINE_HQ.md` |
| 5 | Prototype navigable, données fictives | `/v3` (captures : `prototype/`) |
| 6 | Composants existants à réutiliser | `05_COMPONENTS.md` |
| 7 | Plan de développement et dépendances | `06_ROADMAP.md` |
| 8 | Sécurité, confidentialité, modération | `07_SECURITY_PRIVACY_MODERATION.md` |
| 9 | Décisions validées | `08_DECISIONS.md` |
| 10 | Spécification des interfaces communautaires | `09_COMMUNITY_UI_SPEC.md` · captures `community/` |
| 11 | Contrat serveur (préparation) | `10_BACKEND_CONTRACT.md` |

## Voir le prototype
**Depuis l'application** : onglet **Club** (carte membre, « Rejoindre la communauté », My Space, Members, Messages), onglet **My Flight**, et **Explore › Skyline Radio**. Les adresses directes `/v3/…` restent valables.

Sur l'aperçu Vercel de la branche (ou `npm run build && npm start` en local) : **`/v3`**.
- Bandeau « Prototype V3 · données fictives · aucun envoi réel » en permanence.
- Pastille de phase (en haut à droite) : **Avant / Pendant Ibiza / Après** — HOME, MY FLIGHT et CLUB s'adaptent.
- `/v3/screens` : plan cliquable. `/v3/wireframes` : wireframes annotés.
- Profil (avatar) › « Réinitialiser le prototype » remet l'état à zéro.

## Ce qui est fonctionnel dans le prototype (état local de l'appareil)
Changement de phase · annuaire (recherche, ville, affinités, réciprocité, profils privés jamais listés) · demande de contact (envoyer / annuler) · acceptation / refus de demandes · conversations (envoi local) · blocage et signalement (depuis fiche et conversation) · MY SPACE (pseudo, ville, description 140, 5 préférences max, visibilité) · réglages de confidentialité et notifications · lecteur audio réutilisable (état « indisponible » sans source, aucun autoplay) · visionneuse de souvenirs.

## Principes de produit (garde-fous écrits)
1. **Moins d'interface, plus d'expérience** : un contenu prioritaire par écran.
2. **Jamais de faux contenu officiel** : horaires, vols, lieux, artistes = emplacements « à confirmer » tant que l'équipe n'a pas publié.
3. **Le pass SKYLINE n'est pas un titre de transport.**
4. **Communauté sobre** : pas de publications publiques, likes, classements, badges ni gamification. Visibilité et notifications **opt-in**.
5. **Brand book** : palette officielle, wordmark et emblème fournis (jamais recréés), photographies authentiques, aucune fausse photo d'événement.

## Décisions
Les 11 questions initiales ont reçu une réponse : voir `08_DECISIONS.md`. Restent ouverts : vérification juridique du 18+, durée de conservation définitive (RGPD), équipe et astreinte de modération, hébergement UE (devis), droits de chaque média.

## Limites de cette livraison
- Prototype **non testé sur Safari iOS réel** (tests : `npm run test:unit` — 52 tests de règles ; `npm run test:e2e` — 76 vérifications Chromium, 17 écrans × 3 largeurs 375/390/430 px sans débordement ni erreur console).
- Les **filtres de messages sont indicatifs** (contournables) : ils réduisent le bruit mais ne remplacent ni signalements ni modération humaine.
- Wireframes en basse fidélité : la direction graphique finale de chaque nouvel écran reste à valider.
- Le logo est un PNG dérivé du fichier fourni ; Helvetica Now n'est pas fournie.
- Les profils et conversations du prototype sont **fictifs** (initiales, aucune photo de personne).
- Rien n'est chiffré ni dimensionné en jours : voir `06_ROADMAP.md` (tailles relatives).

## Prochaine étape proposée
Valider ce parcours et répondre aux questions ci-dessus. Ensuite seulement : **P1 — Contenus & HQ-lite** (MY FLIGHT et LIVE alimentés par l'équipe), qui rend l'app vivante sans exposer de données de membres.
