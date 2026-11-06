# STAFF HQ V2 — B3 phase 1 : agenda opérationnel + notifications

Branche `feat/staff-v2-b3-agenda-notifications` (depuis `staff-preview` = `009e7b4`). **Rien n'est fusionné, déployé, ni appliqué à la base réelle.** Aucune variable Vercel modifiée, aucun compte créé, aucun rôle changé, aucune migration appliquée (une migration est *proposée*, §6).

## 1. Principe fondamental : un seul système de tâches
L'agenda **réutilise les missions B2** (même modèle, mêmes droits, même source local / base) :
- une **tâche** est une **mission** : créée dans l'agenda, elle apparaît dans Missions (et inversement) ;
- une mission est placée sur sa **date d'échéance** (`dueDate`), avec une **heure facultative** (`dueTime`) ; sans date elle va dans **« À planifier »** ;
- les **réunions et événements** sont un type **distinct** (`AgendaEvent`), jamais mélangé aux missions.
Les deux sources restent compatibles : **local** (démonstration, appareil) et **db** (Supabase). L'agenda **n'élargit jamais la visibilité** : il n'affiche que les missions que la base a autorisées.

## 2. Écrans et parcours
**Agenda STAFF** (`/staff/schedule`, onglet « Agenda » ; l'ancien planning de démonstration est conservé sous `/staff/schedule/programme`)
- **Mon agenda** (par défaut) · **Équipe** · semaine (‹ ›) · sept jours (point = éléments) · « Revenir à aujourd'hui ».
- Jour sélectionné : liste triée par heure (éléments horaires, puis « toute la journée »), responsable en vue Équipe, statut, priorité.
- Un seul bouton principal **« Ajouter »** : *Tâche* (mission : à soi, ou proposée à un membre — un administrateur attribue directement) ou *Réunion* (événement).
- Sections discrètes sous la liste : **Propositions à traiter** (administrateurs → fiche mission : Approuver / Refuser, droits B2), **En retard**, **À planifier**.
- Tap sur une mission → **fiche mission B2 complète** (infos, attribution, statut, commentaires, historique) dans la même feuille ; tap sur un événement → sa fiche.
- États : chargement (squelettes), erreur (Réessayer), accès refusé, configuration invalide, vide (messages sobres).

**Notifications STAFF** (`/staff/notifications`, cloche de l'en-tête avec compteur)
- Boîte **non lu / lu**, filtre *Toutes / Non lues*, « Tout lire », lien profond vers la mission (`/staff/missions?mission=<id>` ouvre la fiche).
- **Préférences** (roue) : 6 catégories (missions, propositions, validations, commentaires, rappels, annonces), délai de rappel (jour même / veille / 2 jours), carte push contextuelle. Les **annonces urgentes** ne sont jamais masquables.
- **Administrateurs** : « Écrire une annonce » (équipe STAFF ou tous les participants) → vérification → **confirmation explicite** (case dédiée pour l'envoi global) → **aperçu uniquement : rien n'est envoyé**.

**Notifications participants** (`/v3/notifications`, cloche de l'en-tête V3, Profil → Notifications, lien dans la feuille de démonstration historique)
- Lecture (non lu / lu, « Tout lire »), **préférences** par catégorie (annonces d'artistes, informations de vol, programme, rappels avant le départ, communications officielles), carte push contextuelle. FR / EN.
- **Boîte vide par défaut** : aucun faux événement. Des **exemples** étiquetés « Exemple » peuvent être affichés à la demande (démonstration), génériques (aucun artiste, horaire ou vol inventé).
- Expérience **distincte** de STAFF : catégories, clés de stockage et données sans aucun point commun (testé).

## 3. D'où viennent les notifications STAFF (aucun faux événement)
La boîte est **dérivée des données réelles** (`src/domain/notifications.ts`), identique en local et en base :
nouvelle mission / attribution (responsable) · proposition à traiter (administrateurs) ou faite à soi · proposition acceptée / refusée (proposant) · mission à valider (validateur) · validée / renvoyée (responsable) · commentaires (base) sur ses missions · rappels d'échéance (mes missions non terminées, selon le délai choisi) · retard.
Règles : jamais pour **ses propres actions**, seulement les **30 derniers jours**, seulement les personnes **concernées**, identifiants **stables** (l'état lu en dépend). En mode local, des exemples étiquetés sont proposés ; **jamais en mode base**. L'état lu et les préférences sont stockés sur l'appareil (clé par compte) en phase 1 — jamais de contenu de mission.

## 4. Architecture commune STAFF + participants
```
domain/notifications.ts            STAFF : catégories, dérivation, préférences, annonces (droits)
domain/participant-notifications.ts participants : catégories DISTINCTES, préférences, exemples
lib/push/contracts.ts              contrats Web Push (types, règles d'envoi, détection iPhone) — AUCUN envoi
lib/notifications/*                état lu / préférences (appareil), hook STAFF
components/notifications/PushCard  activation volontaire et contextuelle (inactive en phase 1)
```
**Séparation stricte des destinataires** : une notification a **une audience** (`staff` | `participants`) ou un destinataire nominatif — jamais les deux. La base (migration proposée) l'impose : contrainte « catégorie ↔ audience », RLS (un participant ne lit **jamais** une annonce STAFF ; un membre STAFF ne lit pas les annonces participants ; seuls les administrateurs relisent la « boîte d'envoi » participants).
**Envoi global** : réservé aux administrateurs (admin STAFF, super admin), **confirmation explicite obligatoire** (client : case à cocher ; base : paramètre `p_confirm` vrai, sinon `confirmation_required`).

## 5. Étude Web Push pour iPhone (PWA) — contrats, sans activation
**Contraintes iOS** : le Web Push n'existe que pour une **PWA ajoutée à l'écran d'accueil** (iOS / iPadOS **16.4+**), l'autorisation ne peut être demandée **que par un geste de l'utilisateur** dans l'application installée, via le **standard Web Push + VAPID** (pas de push silencieux). Safari hors PWA n'expose pas `PushManager`. → l'interface détecte l'état (`unsupported`, `needs_install`, `blocked`, `coming_soon`, `ready`) et guide (« Partager → Sur l'écran d'accueil »).
**Parcours cible (phase suivante)** : 1) l'utilisateur ouvre *Préférences → Sur cet appareil* ; 2) il appuie sur « Activer » (geste) ; 3) enregistrement du **service worker** (`/sw.js`, portée `/`, gère `push` et `notificationclick` vers le lien profond, **aucun cache** au départ) ; 4) `Notification.requestPermission()` ; 5) `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: <clé publique VAPID> })` ; 6) `POST /api/push/subscribe` (session vérifiée, l'identité vient de la **session**, jamais du corps) → fonction `register_push_subscription`.
**Appareils** : table `push_subscriptions` (une ligne par appareil, libellé, dernière activité, révocation). `endpoint`, `p256dh`, `auth` sont des **secrets** : *illisibles* côté utilisateur (droits par colonnes), lus uniquement par le serveur d'envoi. Liste « Mes appareils » + révocation par l'utilisateur ; réponse push `404/410` ⇒ abonnement supprimé.
**Sécurité des envois** : jamais depuis le navigateur ; **serveur uniquement**, clé privée VAPID en secret d'environnement (jamais dans le dépôt) ; audience et droits revérifiés (`canSendPush` : administrateur + confirmation) ; **charge utile minimale** (`minimalPayload` : « Nouvelle notification » + lien profond relatif, jamais de contenu sensible sur l'écran verrouillé ni d'URL externe) ; limitation de débit, dédoublonnage par `tag`, durée de vie courte (TTL), journalisation. Les préférences de l'utilisateur sont respectées (sauf urgences officielles).
**Contrats** (`src/lib/push/contracts.ts`) : `PushDevice`, `SubscribeRequest`, `SendRequest`, `PushPayload`, `PUSH_ROUTES` (`POST/DELETE /api/push/subscribe`, `GET /api/push/devices`, `POST /api/push/send`), `detectPushSupport`, `canSendPush`, `minimalPayload`, constante `PUSH_SENDING_ENABLED = false`.
**Phase 1 — garanties testées** : l'application **ne demande jamais** l'autorisation à l'ouverture, **n'enregistre aucun service worker**, n'appelle ni `requestPermission` ni `subscribe` (appels espionnés = 0, tests E2E) ; le bouton « Activer » est **inactif**. Aucun envoi réel.

## 6. Migration PROPOSÉE (non appliquée) — `supabase/proposals/B3_1_agenda_notifications.sql`
Placée **hors** de `supabase/migrations/` pour ne pas pouvoir être appliquée par erreur. **À valider avant application.** Non destructive, **sans aucun DROP ni CREATE OR REPLACE** de fonction existante.

### 6.1 Compatibilité des fonctions de missions (révision)
Stratégie retenue : **les fonctions B0 ne sont pas touchées** (`create_mission`, `update_mission`, `set_mission_status`, `assign_mission`, `resolve_assignment`, `add_mission_comment`, `archive_mission`, `delete_mission`, helpers). Mêmes signatures, même code, même OID, mêmes droits d'exécution.
- L'heure s'écrit par de **nouvelles fonctions `create_mission_v2` et `update_mission_v2`** (noms distincts : **aucune surcharge**, RPC non ambigu). Leur paramètre `p_time` est **obligatoire** (sans défaut) : l'omettre est une **erreur** (fonction introuvable), jamais un effacement silencieux ; `null` explicite = « aucune heure ».
- **Un client B2 ne peut pas effacer `due_time`** : l'ancienne `update_mission` ne touche pas la colonne. Si un client B2 efface la **date** d'une mission horodatée, un déclencheur de cohérence (`missions_keep_time_consistent`) efface l'heure (jamais d'état « heure sans date », jamais d'erreur côté B2).
- Dépendances PostgreSQL : l'ajout de colonnes à `missions` (type de retour des fonctions B0) a été vérifié **dans la même session** (plans en cache) : les anciennes fonctions fonctionnent à l'identique.
- Droits : nouvelles fonctions **révoquées pour `public` et `anon`** explicitement, accordées à `authenticated` (la fonction de déclencheur n'est exécutable par personne). Les droits des fonctions B0 ne sont pas modifiés. Vérifié avec deux jeux de privilèges par défaut (supabase_admin « large », postgres).
- **Client B3** : le réglage serveur `STAFF_DB_SCHEMA` (`b2` par défaut, `b3` après application de la migration) choisit les fonctions. En `b2`, le client n'appelle jamais `_v2` ni `list_team_agenda` et ne lit pas `due_time`. `STAFF_DB_SCHEMA=b3` sans `STAFF_DATA_SOURCE=db`, ou une valeur inconnue, produit l'erreur de configuration explicite (503).

### 6.2 Agenda collectif — `list_team_agenda(p_from, p_to)`
Lecture **sécurisée** pour **tous les membres STAFF actifs**, sans élargir la RLS B2 (un membre ne lit toujours pas les missions des autres).
- **Exposé (7 colonnes, exactement)** : `id`, `title`, `assignee_id`, `due_date`, `due_time`, `status`, `priority`.
- **Jamais exposé** : description, créateur, validateur, personne proposée, projet, version, **commentaires, historique**.
- **Règles de confidentialité (à valider)** : 1) membres STAFF actifs uniquement (participants, comptes inactifs ou sans accès, anonymes : refus) ; 2) missions **archivées exclues** ; 3) missions **privées exclues** (`missions.is_private`, défaut `false` = partagée ; modifiable par le créateur ou un administrateur via `set_mission_private`) ; 4) missions **datées** seulement, fenêtre **62 jours max**, **500 lignes max** (pas d'export en masse) ; 5) le **titre** d'une mission non privée est visible de toute l'équipe STAFF — **décision à confirmer** : conserver ce défaut « partagé » ou passer à « privé par défaut » (opt-in).
- Interface : en vue « Équipe », les entrées d'autres membres s'affichent en **lecture seule** (pas de fiche), avec la mention « le détail reste réservé aux personnes concernées ». Pas encore de bouton « mission privée » dans l'interface (fonction prête).

### 6.3 Autres éléments de la migration
| Contenu | Détail |
|---|---|
| Événements | table `agenda_events` + `create/update/delete_agenda_event` (création d'équipe = administrateurs ; personnelle = tout membre) ; client base de données à venir |
| Notifications | tables `notifications` (audience `staff` / `participants`, contrainte catégorie ↔ audience), `notification_reads`, `notification_preferences` ; `can_view_notification`, `mark_notifications_read`, `set_notification_preferences` |
| Annonces | `send_announcement(audience, titre, texte, urgent, confirm)` : **administrateurs**, **confirmation obligatoire** ; n'envoie **aucun push** |
| Web Push | `push_subscriptions` (secrets illisibles par colonnes) ; `register_push_subscription`, `revoke_push_subscription` |
| Droits | RLS partout, `anon` : aucun droit, `authenticated` : lecture seule (appareils : colonnes non secrètes), écritures par fonctions uniquement |

**Validation locale** : `tests/proposal-b3.test.mts` (13), `tests/proposal-compat.test.mts` (24 vérifications × 2 jeux de privilèges : fonctions B0 identiques avant/après, scénario client B2 rejoué avant/après dans la même session, `due_time` jamais effacé, parité des règles B0 ↔ `_v2`, matrice de droits), `tests/proposal-team-agenda.test.mts` (10), `tests/missions-service-b3.test.mts` (6). La suite **B2 complète (15 tests)** passe aussi sur B0 + proposition.

## 7. Tests
| Suite | Ce qu'elle prouve |
|---|---|
| `tests/agenda.test.mts` (8) | semaines (lundi), heure facultative, Mon agenda / Équipe, À planifier / En retard, propositions, **visibilité jamais élargie**, événements (portée, droits) |
| `tests/notifications.test.mts` (16) | dérivation (réattribution, validation, propositions, commentaires, rappels), fenêtre 30 j, préférences, urgents non masquables, exemples étiquetés, annonces (droits + confirmation), catégories participants distinctes, contrats push, **aucune autorisation / abonnement / service worker**, clés de stockage séparées |
| `tests/proposal-b3.test.mts` (13) · `proposal-compat` · `proposal-team-agenda` (10) · `missions-service-b3` (6) | migration proposée sur Postgres local : RLS, droits, séparation, **compatibilité avant / après**, **agenda collectif** |
| `tests/e2e-db-b3.cjs` (24) | schéma `b3` (faux serveur) : heure, agenda collectif, confidentialité (réponse réseau à 7 champs), états, ergonomie 320–430 px |
| `tests/e2e-agenda.cjs` (83) | parcours complets (local) + ergonomie **320 / 375 / 390 / 430 px** : agenda, ajout, formulaires, notifications STAFF et participants, préférences |
| `tests/e2e-db.cjs` (65) | + agenda et notifications en **mode base** (faux serveur Supabase local) : tâche = mission, pas d'heure ni d'événements sans table, commentaires → notification, annonce sans envoi, aucun stockage local de missions |
| suites existantes | participants (v3, v32, pass, SOUND), STAFF, missions, configuration, authentification : sans régression |

## 8. Limites de la phase 1
- **Pas d'envoi réel** et pas de service worker (volontaire). Le bouton d'activation est inactif.
- **Heure : base de données seulement après la migration** (`STAFF_DB_SCHEMA=b3`) ; **réunions et événements : mode local seulement** (client base de données à venir). Sans la migration (schéma `b2`, défaut), l'interface n'affiche ni heure ni événements partagés, sans faux contenu.
- **Vue Équipe en mode base** : schéma `b2` = missions concernant l'utilisateur (note affichée) ; schéma `b3` = planning collectif complet en lecture seule (colonnes minimales), administrateurs : tout.
- Notifications STAFF **calculées dans le navigateur** (état lu / préférences sur l'appareil) ; la table serveur et la synchronisation entre appareils viendront avec la migration.
- Pas de rappel « en arrière-plan » (il faut l'envoi push) ; les rappels s'affichent à l'ouverture.
- Boîte participants **vide** tant qu'aucune source officielle n'est branchée (annonces d'artistes, vol, programme : contenu de l'organisation, phase suivante). Libellés des cartes push et de la boîte participants traduits FR / EN ; l'écran STAFF est en français.
- Interface sombre SKYLINE existante conservée (identité 2027 : même palette, typographies, composants) ; « lumineuse » = accents `sky` / `sunset`, grands espaces, contraste soigné.
