# SKYLINE APP V3 — Product & UX Foundation

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

## Voir le prototype
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

## Décisions à valider (questions ouvertes)
1. **Visibilité par défaut** : désactivée (recommandé) — d'accord ?
2. **Âge minimum** : 18+ ? Vérification par attestation ou pièce justificative ?
3. **Ouverture de la messagerie** : seulement après l'événement, ou dès l'inscription ? (le risque est plus faible après, le bénéfice plus fort avant)
4. **Qui modère** (équipe SKYLINE, prestataire) et qui est joignable **pendant** Ibiza (urgences, sécurité) ?
5. **Conservation des messages** : 12 mois proposés.
6. **Accès au Club** : réservé aux participants confirmés ? liste d'attente ?
7. **Hébergement / prestataire de base de données** (coût et région UE) — validation requise avant tout engagement.
8. **Radio** : fichiers hébergés par SKYLINE ou intégrations de plateformes (conditions d'usage) ? Qui détient les droits ?
9. **Source des informations de vol** : saisie manuelle par l'équipe (recommandé) ; pas d'intégration compagnie en V3.
10. **Langues** : français seul, ou anglais dès le départ ?
11. **Photos de la première édition** : accord des personnes et crédit photographe (le dépôt GitHub est public — à passer en privé).

## Limites de cette livraison
- Prototype **non testé sur Safari iOS réel** (tests automatisés Chromium : 14 écrans × 3 largeurs 375/390/430 px sans débordement ni erreur console ; parcours de recette dans `tests-prototype.cjs`).
- Wireframes en basse fidélité : la direction graphique finale de chaque nouvel écran reste à valider.
- Le logo est un PNG dérivé du fichier fourni ; Helvetica Now n'est pas fournie.
- Les profils et conversations du prototype sont **fictifs** (initiales, aucune photo de personne).
- Rien n'est chiffré ni dimensionné en jours : voir `06_ROADMAP.md` (tailles relatives).

## Prochaine étape proposée
Valider ce parcours et répondre aux questions ci-dessus. Ensuite seulement : **P1 — Contenus & HQ-lite** (MY FLIGHT et LIVE alimentés par l'équipe), qui rend l'app vivante sans exposer de données de membres.
