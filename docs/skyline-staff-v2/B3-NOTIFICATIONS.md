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
Placée **hors** de `supabase/migrations/` pour ne pas pouvoir être appliquée par erreur. **À valider avant application.** Non destructive.
| Contenu | Détail |
|---|---|
| Heure des missions | `missions.due_time` (+ contrainte « heure ⇒ date ») ; `create_mission` / `update_mission` reçoivent `p_time` (défaut null) |
| Événements | table `agenda_events` + `create/update/delete_agenda_event` ; création d'équipe = administrateurs ; personnelle = tout membre ; lecture : membres STAFF (équipe) ou créateur (personnel) |
| Notifications | tables `notifications` (audience `staff` / `participants`, contrainte catégorie ↔ audience), `notification_reads`, `notification_preferences` ; `can_view_notification`, `mark_notifications_read`, `set_notification_preferences` |
| Annonces | `send_announcement(audience, titre, texte, urgent, confirm)` : **administrateurs**, **confirmation obligatoire** ; écrit l'annonce, **n'envoie aucun push** |
| Web Push | `push_subscriptions` (secrets illisibles par colonnes) ; `register_push_subscription`, `revoke_push_subscription` |
| Droits | RLS partout, `anon` : aucun droit, `authenticated` : lecture seule (appareils : colonnes non secrètes), écritures par fonctions uniquement |
**Validation locale** (`tests/proposal-b3.test.mts`, Postgres local, B0 + proposition) : 13 tests — compatibilité des anciens appels, heure, événements (visibilité, droits), **séparation STAFF / participants**, annonces (admin + confirmation), lecture, préférences, appareils (secrets illisibles), privilèges. La suite **B2 (15 tests) passe aussi** sur B0 + proposition.
**Attention de déploiement** : un client B2 qui appelle `update_mission` sans `p_time` effacerait l'heure → déployer le client B3 avec la migration. **Décision à prendre** : vue « Équipe » pour les membres — B2 limite la lecture aux missions qui les concernent ; une vue d'équipe complète demanderait une fonction de lecture minimale (titre, responsable, date, statut) pour tous les membres : à valider séparément.

## 7. Tests
| Suite | Ce qu'elle prouve |
|---|---|
| `tests/agenda.test.mts` (8) | semaines (lundi), heure facultative, Mon agenda / Équipe, À planifier / En retard, propositions, **visibilité jamais élargie**, événements (portée, droits) |
| `tests/notifications.test.mts` (16) | dérivation (réattribution, validation, propositions, commentaires, rappels), fenêtre 30 j, préférences, urgents non masquables, exemples étiquetés, annonces (droits + confirmation), catégories participants distinctes, contrats push, **aucune autorisation / abonnement / service worker**, clés de stockage séparées |
| `tests/proposal-b3.test.mts` (13) | migration proposée sur Postgres local (RLS, droits, séparation) |
| `tests/e2e-agenda.cjs` (83) | parcours complets (local) + ergonomie **320 / 375 / 390 / 430 px** : agenda, ajout, formulaires, notifications STAFF et participants, préférences |
| `tests/e2e-db.cjs` (65) | + agenda et notifications en **mode base** (faux serveur Supabase local) : tâche = mission, pas d'heure ni d'événements sans table, commentaires → notification, annonce sans envoi, aucun stockage local de missions |
| suites existantes | participants (v3, v32, pass, SOUND), STAFF, missions, configuration, authentification : sans régression |

## 8. Limites de la phase 1
- **Pas d'envoi réel** et pas de service worker (volontaire). Le bouton d'activation est inactif.
- **Heure et événements : mode local seulement** tant que la migration n'est pas appliquée (en mode base : tâches datées sans heure, pas de réunions partagées). L'interface le gère sans afficher de faux contenu.
- **Vue Équipe en mode base** : limitée par la RLS B2 aux missions concernant l'utilisateur (note affichée) ; les administrateurs voient tout.
- Notifications STAFF **calculées dans le navigateur** (état lu / préférences sur l'appareil) ; la table serveur et la synchronisation entre appareils viendront avec la migration.
- Pas de rappel « en arrière-plan » (il faut l'envoi push) ; les rappels s'affichent à l'ouverture.
- Boîte participants **vide** tant qu'aucune source officielle n'est branchée (annonces d'artistes, vol, programme : contenu de l'organisation, phase suivante). Libellés des cartes push et de la boîte participants traduits FR / EN ; l'écran STAFF est en français.
- Interface sombre SKYLINE existante conservée (identité 2027 : même palette, typographies, composants) ; « lumineuse » = accents `sky` / `sunset`, grands espaces, contraste soigné.
