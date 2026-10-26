# 06 — Plan de développement progressif et dépendances

Principe : **livrer par tranches utilisables**, du moins risqué au plus sensible. La messagerie vient en dernier et **ne peut pas ouvrir sans modération opérationnelle**. Aucune date : la taille (S/M/L) est relative ; les calendriers dépendent de l'équipe et de la date de l'événement.

```
P0 Fondations ─▶ P1 Contenus & HQ-lite ─▶ P2 Comptes & profils ─▶ P3 Annuaire & contacts ─▶ P4 Messagerie + Modération ─▶ P6 Durcissement
                        │                                                                      ▲
                        └──────────────▶ P5 Radio & Souvenirs (parallélisable dès P1) ────────┘
```

## P0 — Fondations *(S, bloquant)*
Décisions et pré-requis, aucun code produit.
- Valider l'UX (ce dossier) ; trancher les questions ouvertes (voir `00_README.md`).
- **Juridique** : politique de confidentialité, conditions d'utilisation, base légale, registre des traitements, analyse d'impact (messagerie entre participants), âge minimum.
- **Hébergement** : choisir la région UE et le prestataire (coût à valider avant tout engagement).
- **Assets officiels** : SVG du logo, polices Helvetica Now, photos autorisées, **autorisations de diffusion** (audio, personnes photographiées).
*Dépend de :* rien. *Débloque :* tout.

## P1 — Contenus & HQ-lite *(M)*
Rendre l'app **vivante sans communauté** : MY FLIGHT, LIVE, SIGNAL.
- Base de données + API en lecture ; stockage de médias.
- **HQ-lite** : connexion équipe (double authentification), rôles minimaux, modules Signals, Programme & LIVE, Voyage.
- Phase du voyage configurable ; HOME [avant / pendant / après] branché sur les données réelles.
- Journal d'audit dès le premier jour.
*Dépend de :* P0 (hébergement, assets). *Livre :* HOME, MY FLIGHT, EXPLORE (SIGNAL) alimentés par l'équipe.
*Critères :* un brouillon n'est jamais visible ; une info non confirmée ne s'affiche jamais ; publication à deux pour l'info voyage.

## P2 — Comptes & profils *(M)*
- Authentification **sans mot de passe** par invitation (lien e-mail) liée à la réservation ; 18+ ; consentements.
- Profil membre (MY SPACE) : pseudo, ville choisie, description, préférences, photo facultative (+ **modération des photos**), visibilité désactivée par défaut.
- Écran Profil : confidentialité, export et suppression RGPD.
- Notifications e-mail minimales (opt-in) ; push différé.
*Dépend de :* P1 (base, HQ). *Débloque :* P3.

## P3 — Annuaire & demandes de contact *(M)*
- Annuaire **côté serveur** : un profil non visible n'est jamais transmis ; réciprocité ; recherche ville + affinités.
- Demandes de contact (quotas, délais de ré-essai, refus silencieux), blocage, signalement (file HQ).
- **HQ Modération** (file, sanctions, appels) — *livré avec cette étape*.
*Dépend de :* P2. *Critère de sortie :* tests d'abus (spam de demandes, énumération de profils) passés.

## P4 — Messagerie *(L, la plus sensible)*
- Conversations 1:1 **texte seul**, temps réel, limites de débit, filtres automatiques (liens, numéros), conservation 12 mois.
- Signalement avec contexte joint ; blocage immédiat et réciproque.
- Notifications (opt-in).
*Dépend de :* P3 **et** modération opérationnelle **et** validation juridique (analyse d'impact). **Interdit d'ouvrir sans ces trois conditions.**
*Critères :* test d'intrusion, test de charge, procédure d'incident, équipe de modération formée et joignable pendant la période d'ouverture.

## P5 — Radio & Souvenirs *(M, parallélisable dès P1)*
- SKYLINE RADIO : sélections, DJ, mixes ; **registre des droits** obligatoire avant publication ; lecteur existant.
- Souvenirs : archives officielles (photos / aftermovies) avec **droit de retrait**.
*Dépend de :* P1 + autorisations de diffusion.

## P6 — Durcissement & lancement *(M)*
- Audit d'accessibilité (VoiceOver, taille dynamique), performances sur appareils réels, mode hors ligne du programme (PWA) pour le séjour.
- Revue de sécurité finale, sauvegardes testées, plan de crise.
- Répétition générale avec un groupe test.

## Tableau des dépendances techniques
| Brique | Requise par |
|---|---|
| Base de données + API + stockage | P1 → tout |
| Authentification | P2 → P3 → P4 |
| Rôles + audit + 2FA (HQ) | P1 → P3 (modération) → P4 |
| Règles d'accès par ligne (visibilité, blocage) | P2/P3 → P4 |
| File de modération (HQ) | P3 → P4 |
| Registre des droits médias | P5 |
| Temps réel (messagerie) | P4 |
| Service worker / hors ligne | P6 |

## Estimation de risque
| Risque | Gravité | Mitigation |
|---|---|---|
| Abus / harcèlement via la messagerie | Élevée | Opt-in, demande → acceptation, quotas, blocage, modération, ouverture conditionnelle |
| Fuite de profils non visibles | Élevée | Filtrage serveur, règles par ligne, tests d'énumération |
| Information de voyage erronée | Élevée | Saisie humaine, validation à deux, horodatage, mention de la source |
| Droits sur les médias | Moyenne | Registre des droits bloquant la publication |
| Connectivité à Ibiza | Moyenne | Cache hors ligne du programme |
| Dérive de périmètre (gamification, classements) | Moyenne | Règles de produit écrites (voir `00_README.md`) |
