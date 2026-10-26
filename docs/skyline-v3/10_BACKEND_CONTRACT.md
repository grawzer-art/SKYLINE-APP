# 10 — Contrat serveur (préparation, aucun service connecté)

Objectif : que l'interface actuelle puisse être branchée sur un serveur **sans être réécrite**, et que la sécurité ne repose jamais sur l'écran. Aucun prestataire n'est présupposé (hébergement **dans l'UE**, devis et validation requis avant tout service payant).

## Principe
```
Interface (écrans)  →  useCommunity() (actions)  →  [aujourd'hui] état local
                                                   →  [demain]   appels serveur
Règles métier : src/domain/community.ts  — appliquées par l'interface ET REVALIDÉES par le serveur
```
Le serveur **ne fait jamais confiance** au client : chaque règle de `domain/community.ts` (éligibilité, validation, quotas, débit, annuaire) est recalculée côté serveur avec l'heure du serveur.

## Actions (aujourd'hui dans `useCommunity`, demain des routes sécurisées)
| Action | Entrées | Règles côté serveur | Erreurs |
|---|---|---|---|
| `getEligibility` | — | Réservation confirmée par l'équipe + compte actif + 18+ + charte + consentement | — |
| `activate / leave` | attestations | Horodatage + version de la charte ; `leave` masque le profil | — |
| `updateProfile` | pseudo, ville, description, genres, visibilité | `validatePseudo`, listes fermées, limites ; **visibilité refusée si inéligible** | `invalid_*` |
| `uploadPhoto` | image | Type/poids, suppression EXIF, **file de modération** | `invalid_image` |
| `searchMembers` | texte, ville, genres, page | **Filtrage serveur** : visibles uniquement, hors bloqués (dans les deux sens) et soi-même ; ordre alphabétique ; pas d'identifiant séquentiel ; limite de débit | `forbidden`, `rate_limited` |
| `requestContact` | membre, mot ≤ 140 | `canRequestContact` (quota 10/24 h, 30 en attente, déjà lié, bloqué), `validateIntro` ; délai 30 j après refus | `quota`, `pending`, `blocked`, `already` |
| `answerRequest` | demande, accepter/refuser | Seul le destinataire ; refus silencieux | `forbidden` |
| `sendMessage` | conversation, texte | Éligible des deux côtés, lié, non bloqué, `validateMessage`, `isRateLimited` | `forbidden`, `link`, `phone`, `too_long`, `rate_limited` |
| `markRead / mute / deleteConversation` | conversation | Propre à l'utilisateur ; la suppression ne touche pas l'autre côté | — |
| `block / unblock` | membre | Effet immédiat et réciproque (invisibilité, plus de message) | — |
| `report` | membre, motif, message(s) | Joint le contexte (derniers messages) ; file HQ ; accusé neutre | — |
| `getRadio` | — | Uniquement les médias dont le **droit de diffusion est valide** | — |

## Modèle de données (extrait)
`members(id, pseudo, city, bio, genres[], visible, photo_id, locale, created_at)` ·
`eligibility(member_id, reservation_confirmed, adult_attested_at, charter_version, consent_at)` ·
`contact_requests(id, from, to, intro, state, created_at, decided_at)` ·
`conversations(id, a, b)` · `messages(id, conversation_id, sender, text, created_at)` ·
`blocks(blocker, blocked, created_at)` · `reports(id, reporter, target, reason, message_ids[], state)` ·
`signals`, `media(+rights)`, `programme_items`, `staff_*`, `audit_log`.

## Règles d'accès (au niveau des lignes)
- Un membre lit **son** profil et les profils *visibles* (jamais ceux qui l'ont bloqué ni qu'il a bloqués) ; jamais de colonne sensible.
- Un message n'est lisible que par ses deux participants, tant que ni l'un ni l'autre n'est suspendu.
- La modération ne lit que les messages **joints à un signalement**.
- Les brouillons, médias sans droit valide et profils non visibles **ne quittent jamais le serveur** (déjà appliqué pour les Signals).

## Conservation (paramétrable, à valider RGPD)
Messages : hypothèse 12 mois après la dernière activité ; profil : tant que le compte existe ; photo : jusqu'à retrait ; souvenirs : selon droits ; journal d'audit : durée à définir. Export et suppression à la demande.

## Ce qui est volontairement **absent** du prototype
Comptes, authentification, envoi/stockage réel, modération réelle, notifications push, paiement, intégration compagnie aérienne.

## Tests de référence (déjà écrits)
`npm run test:unit` : 52 tests de la couche métier et de l'i18n (à réutiliser tels quels côté serveur) · `npm run test:e2e` : 76 vérifications bout en bout du prototype.
