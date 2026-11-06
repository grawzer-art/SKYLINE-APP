# STAFF HQ V2 — B2 : synchronisation des missions avec Supabase

Branche : `feat/staff-v2-b2-sync` (depuis `55d028d`). **Aucune migration modifiée, aucun compte créé, aucun rôle attribué, aucun réglage d'authentification touché.**

## 1. Trois couches d'activation (rien ne bascule automatiquement)
| Couche | Variable | Défaut | Effet |
|---|---|---|---|
| Authentification | `STAFF_AUTH_MODE` | `demo` | `supabase` = connexion individuelle (B0) |
| Source des données | `STAFF_DATA_SOURCE` | `local` | `db` = missions dans la base. **Ignorée (retour à `local`) si l'authentification n'est pas `supabase`.** Seule la valeur exacte `db` active. |
| Interface | — | — | La source est exposée par `/api/staff/session` (`dataSource`), décidée côté serveur. |

Le mode local (démonstration, `localStorage`) est conservé tel quel. En authentification Supabase **sans** `STAFF_DATA_SOURCE=db`, le comportement B0 est inchangé : données locales séparées par compte + bannière « Données locales · non partagées ».

## 2. Architecture
```
MissionsScreen / MissionsGlance
        └─ useMissions()  ← point d'entrée unique (src/lib/useMissions.ts)
             ├─ useLocalMissions  (démo, localStorage, jamais d'appel base)
             └─ useDbMissions     (jamais de stockage navigateur)
                    └─ createMissionsService(port)   (src/lib/missions/service.ts)
                            └─ DbPort → createSupabasePort(client navigateur : clé publique + jeton utilisateur → RLS)
```
- **Aucune règle d'autorisation dans le service** : il transmet, convertit, traduit les erreurs. La base décide (RLS + fonctions `SECURITY DEFINER`).
- **Garde d'identifiants** : tout identifiant doit être un UUID. Un identifiant local fictif (`tom`, `m-123`…) n'atteint **jamais** la base (refus avant l'appel, testé). L'identité d'action en mode `db` est `session.userId` (UUID du compte), jamais le `slug`.
- **Annuaire** : `list_team()` (UUID). Annuaire vide ⇒ « Accès refusé » (participant, compte inactif).
- **Pas de mise à jour optimiste** : l'écran affiche l'état renvoyé par la base. Rechargement au retour sur l'onglet (≥ 15 s) et sur demande (« Actualiser »).
- **Tables lues** : `missions`, `mission_events`, `mission_comments` (RLS). **Fonctions appelées** : les 8 fonctions d'écriture + `list_team` (liste fermée, testée). Aucune écriture directe dans une table.

## 3. Trois actions séparées (aucune opération composite silencieuse)
| Action | Fonction SQL | Écran |
|---|---|---|
| Informations (titre, description, validateur, échéance, priorité) | `update_mission` (verrou de version) | « Modifier les informations » |
| Attribution (admin : immédiate ; créateur / responsable : **proposition**) | `assign_mission` | section « Attribution » |
| Décision sur une proposition | `resolve_assignment` | Approuver / Refuser (admins) |
| Statut | `set_mission_status` | section « Statut » / « Validation » |
| Commentaires | `add_mission_comment` | section « Commentaires » |
| Archiver / Supprimer | `archive_mission` / `delete_mission` | confirmation dédiée |

Chaque action a son **propre** état (en cours / réussi / erreur), son propre message et sa propre gestion d'erreur (hook `useAction`, un envoi à la fois).

## 4. Erreurs, permissions, conflits
- Messages français **sûrs** : jamais le texte brut du serveur (`mapDbError`). Catégories : non autorisé, conflit, introuvable, invalide, session expirée (lien de reconnexion), réseau, inattendu.
- **Conflit** : `update_mission` compare la version ; refus → « Conflit de modification » + « Recharger » ; les saisies de l'utilisateur sont conservées ; après rechargement, avertissement « La mission a changé » + « Reprendre les valeurs actuelles ». Les autres fonctions verrouillent la ligne et revalident la règle sur l'état réel (ex. `same_status`).
- **Limite connue** : seul `update_mission` porte un contrôle de version. Un changement de statut ou d'attribution sur état périmé est refusé si la règle ne l'autorise plus, sinon il s'applique (dernier arrivé).
- États d'écran : chargement (squelettes), erreur (Réessayer), accès refusé, actualisation échouée (données conservées, avertissement), mission disparue (fenêtre refermée proprement).
- Les boutons masqués ou désactivés sont de l'ergonomie : **chaque action est revérifiée par la base**.

## 5. Tests (aucun n'écrit dans la base Supabase réelle)
| Suite | Ce qu'elle prouve |
|---|---|
| `tests/missions-service.test.mts` (15) | Le **vrai** service contre un **vrai** Postgres local avec les migrations B0 : anonyme / participant / compte inactif refusés ; un membre ne voit pas les missions des autres ; responsable ne peut jamais « terminer » ; propositions ; conflit de version ; commentaires ; archivage / suppression ; identifiants fictifs jamais envoyés ; UUID inexistant refusé par la base ; erreurs sans fuite |
| `tests/missions-modes.test.mts` (7) | Activation explicite ; aucun stockage navigateur en mode `db` ; aucun appel base en mode local ; aucune clé secrète ; liste fermée des fonctions / tables ; identité = UUID |
| `tests/missions.test.mts` (42) | Règles du domaine, dont l'édition « informations seulement » |
| `tests/e2e-db.cjs` via `tests/run-db.sh` | Interface complète sur un **faux serveur Supabase local** : chargement, erreurs réseau, conflit, refus, commentaires, proposition → approbation, archivage, aucun `localStorage` |
| `tests/e2e-missions.cjs` etc. | Mode local inchangé (adapté aux nouveaux libellés) |

## 6. Limites restantes
- Projets : lecture seule non exposée (aucune fonction d'écriture ; nouvelle migration à valider plus tard).
- Annuaire / planning / messages / annonces restent locaux (B3).
- Pas de temps réel (rechargement manuel ou au retour sur l'onglet).
- Historique chargé en bloc (≤ 5000 évènements) ; pagination à prévoir si le volume grandit.
- E2E : le faux serveur valide l'interface, pas la sécurité ; la sécurité repose sur les tests PGlite. **Reste à faire avant activation** : un essai réel avec les 3 comptes (hors périmètre B2).

## 7. Activation (à faire plus tard, par vous)
1. Authentification Supabase opérationnelle (comptes, rôles : hors B2).
2. Vercel Preview : `STAFF_AUTH_MODE=supabase` puis `STAFF_DATA_SOURCE=db`.
3. Vérifier avec chaque compte : Tom (admin), Qafard (member), un participant (doit être refusé).
