# 04 — SKYLINE HQ : architecture de l'environnement organisateurs

Wireframe : `wireframes/wf-hq.png` (`/v3/wireframes#hq`). **Application séparée** de l'app membres : autre adresse, autre déploiement, autre politique d'accès, mêmes données.

## Pourquoi séparée
- Surface d'attaque distincte : un compte membre compromis ne donne jamais accès à des fonctions d'administration.
- Interface pensée « bureau » (files, tableaux, formulaires) vs mobile émotionnel.
- Journal d'audit, double authentification et rôles propres.
- Peut être ouverte à des prestataires (modération, régie) avec des droits limités.

## Modules (par priorité)
| # | Module | Fonction | Alimente |
|---|---|---|---|
| 1 | **Signals** | Créer / programmer / dépublier une révélation (type, titre, accroche, texte, photo, média, lien, statut brouillon ⇄ publié) | HOME, EXPLORE, SIGNAL |
| 2 | **Programme & LIVE** | Activités confirmées (titre, horaire, lieu, transfert), annonces importantes, état « confirmé / provisoire » | HOME NOW, MY FLIGHT |
| 3 | **Voyage & réservations** | Statut de réservation, **départ vérifié** (saisi par un humain, horodaté, signature de la personne) | MY FLIGHT |
| 4 | **Radio & médias** | Sélections, DJ, mixes ; **registre des droits** par média (ayant droit, périmètre, expiration) | RADIO, SIGNAL |
| 5 | **Membres** | Liste des inscrits, statut, suspension, export/suppression RGPD | — |
| 6 | **Modération** | File de signalements, contexte limité, sanctions, appels | MEMBERS, MESSAGES |
| 7 | **Messages d'équipe** | Annonces ciblées (tous / groupe), conforme aux règles de fréquence | HOME |
| 8 | **Rôles & accès** | Création des comptes HQ, attribution des rôles | — |
| 9 | **Journal d'audit** | Qui a fait quoi, quand (lecture seule, non modifiable) | — |

## Rôles (principe du moindre privilège)
| Rôle | Peut | Ne peut pas |
|---|---|---|
| Propriétaire | Tout, y compris rôles | — (double validation pour supprimer des données) |
| Éditeur | Signals, Radio, Programme (publier) | Voir les messages, gérer les membres |
| Opérations | Programme & LIVE, Voyage | Publier des Signals, modérer |
| Modérateur | Traiter les signalements, suspendre | Lire les conversations hors signalement |
| Lecture seule | Consulter | Modifier |

Règles : double authentification **obligatoire** ; sessions courtes ; connexion depuis des adresses autorisées en option ; aucune action de masse sans confirmation ; chaque action sensible journalisée ; publication de contenus officiels avec **validation à deux** (auteur ≠ approbateur) pour les annonces importantes et les informations de voyage.

## Parcours HQ clés
1. **Publier un SIGNAL** : brouillon → prévisualisation « comme un membre » → validation → publication (immédiate ou programmée) → apparaît sur HOME (si le plus récent) et EXPLORE.
2. **Annoncer une info importante pendant Ibiza** : rédaction → validation à deux → publication → bandeau HOME.
3. **Traiter un signalement** : file → contexte (motif + derniers messages joints) → décision (clore / avertir / suspendre) → notification neutre au signaleur → journal.
4. **Demande RGPD** : recherche du membre → export ou suppression → confirmation → journal.

## Données partagées (aperçu)
`members`, `profiles` (visibilité), `contact_requests`, `conversations`, `messages`, `blocks`, `reports`, `signals`, `media` (+ `media_rights`), `programme_items`, `announcements`, `bookings`, `staff_users`, `staff_roles`, `audit_log`.
L'app membres lit via des règles d'accès au niveau des lignes (un membre ne lit que ses données et les profils visibles) ; HQ utilise des rôles de service distincts.

## Hors périmètre de la première version de HQ
Paiement, billetterie, CRM, e-mailing de masse, analytics individuels de comportement des membres.
