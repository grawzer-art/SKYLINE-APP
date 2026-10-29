# STAFF HQ V2 — Phase A : audit, architecture recommandée, risques, plan

Branche `feat/staff-hq-v2` (depuis `feat/staff-missions`). **Aucun code applicatif modifié** : ce document est le seul changement. En attente de validation avant la Phase B.

## 1. Audit de l'existant

### 1.1 Ce qui existe (vérifié dans le code)
| Domaine | État réel |
|---|---|
| Stack | Next.js 16.4 (App Router, `cacheComponents`), React 19, Tailwind v4, TypeScript, `motion`, `lucide-react`. **Aucune autre dépendance** : ni client de base de données, ni SDK d'authentification, ni stockage, ni temps réel. |
| Backend | **Aucun.** Une seule route serveur : `/api/demo-session`. Pas de variable d'environnement hors `DEMO_AUTH` / `DEMO_SESSION_SECRET`. Pas de `.env`, pas de `vercel.json`. |
| Authentification | **Démonstration uniquement** : cookie HMAC signé (`src/lib/auth/token.ts`), comptes fictifs sans mot de passe (`DEMO_ACCOUNTS`), secret par défaut **public** dans le dépôt, désactivée par défaut sur la production Vercel. Contrôle d'accès serveur réel dans `src/proxy.ts` (cookie vérifié avant tout rendu de `/staff/**`), mais ce n'est pas une identité individuelle. |
| Données STAFF | Missions : `localStorage` de l'appareil (`useMissions`). Équipe, planning, annonces, canaux : constantes TypeScript fictives (`src/data/staff.ts`). Aucune donnée partagée entre appareils. |
| Règles métier | `src/domain/missions.ts` : module **pur** (droits, validation, historique, tri, filtres), 36 tests unitaires. Directement réutilisable côté serveur. |
| UI STAFF | `StaffShell` (en-tête + 4 onglets HQ / Schedule / Comms / Team), `ui.tsx` (titres, sections), `MissionsScreen` (liste, filtres, fiche, formulaire, confirmation dans un panneau unique), `SpaceSwitcher`, écran de choix d'espace `/start`. Design conservé tel quel. |
| Tests | ≈ 240 contrôles : unitaires (community, i18n, sound, missions) + e2e Playwright (v3, v3.2, sound, pass, staff, missions). Tous les e2e STAFF reposent sur le cookie de démo. |
| Intégration | Les branches `feat/staff-hq` et `feat/staff-missions` **ne sont pas fusionnées dans `main`** ; `feat/skyline-sound` l'est (via V3.3). Aucune fuite de STAFF dans MEMBERS (proxy limité à `/staff`, `/` pour le choix d'espace). |

### 1.2 Services externes déjà disponibles (audit du compte)
- **Supabase** est connecté à cet environnement : organisation « JARVIS », deux projets en région **eu-west-3 (Paris)** — `JARVIS` (**INACTIVE / en pause**, créé le 15/10) et `sparrow-online` (actif, **sans rapport apparent avec SKYLINE**). Aucun n'est dédié à SKYLINE à ce stade. Je n'y ai **rien modifié** (lecture seule).
- **Vercel** : deux projets rattachés au dépôt (`skyline-app`, `skyline-ap`), déploiements automatiques par branche. Aucun service de stockage / base Vercel branché (rien dans le code).
- Aucun fournisseur d'authentification, de stockage de fichiers ni de messagerie temps réel n'est configuré.

### 1.3 Réutilisable / à refaire
**Réutilisable tel quel** : design system et composants (`StaffShell`, `ui`, `Sheet`, formulaires de `MissionsScreen`), règles `src/domain/missions.ts`, proxy de contrôle d'accès, routes `/staff/**`, tests de règles.
**À adapter** : `useMissions` (passera par une couche « repository »), `useActor` (identité issue de la vraie session), `StaffShell` (onglets HQ / MISSIONS / PLANNING / COMMS), `src/data/staff.ts` (équipe → table de profils ; planning/annonces/canaux fictifs → supprimés).
**À créer** : authentification individuelle, base de données + autorisations serveur, historique/commentaires/archives, événements + run of show, messagerie, fichiers, écrans HQ/PLANNING/COMMS/TEAM/FILES réels.

## 2. Architecture recommandée

### 2.1 Choix technique (à valider)
**Supabase (Postgres + Auth + Row Level Security + Realtime + Storage)**, région Paris, accédé depuis Next.js (`@supabase/ssr`) :
- **Authentification individuelle** sans mot de passe codé en dur : liens magiques / codes par e-mail pour 3 comptes **invités par Tom** (inscription publique désactivée) ; passkeys possibles plus tard.
- **Autorisations côté serveur au niveau de la base** (RLS) **et** dans le code serveur (règles pures de `src/domain/missions.ts` réutilisées) : défense en profondeur.
- **Temps réel** pour COMMS et mises à jour des missions (Realtime filtré par RLS).
- **Stockage privé** (bucket + URL signées) pour FILES, démarrage par liens + métadonnées.
- Hébergement UE (Paris) — cohérent avec la décision produit « base de données UE ».
Alternatives étudiées : Neon/Upstash via Vercel Marketplace + Auth.js (plus de pièces à assembler : auth, temps réel et stockage séparés) ; Firebase (hors UE par défaut). **Supabase couvre les 6 exigences en un seul service.**

### 2.2 Couches (séparation demandée)
```
UI (components/staff/*)            ← inchangée dans l'esprit, branchée sur des hooks
  └─ hooks (useMissions, useEvents, useMessages…)   ← appellent un « repository »
       └─ Repository (interface TypeScript)         ← contrat unique
            ├─ LocalDemoRepository   (localStorage, mode démonstration, explicitement signalé)
            └─ SupabaseRepository    (production, via Server Actions / Route Handlers)
Domaine pur (src/domain/*)          ← règles réutilisées par l'UI ET le serveur
Serveur (src/server/*)              ← vérifie session + règles + écrit l'historique (transaction)
Base (supabase/migrations/*.sql)    ← schéma, RLS, vues
```
Le mode démo reste possible (utile pour les tests et les previews) mais **localStorage n'est jamais présenté comme collaboratif**.

### 2.3 Rôles : application vs profession (séparés)
- **Rôle applicatif** (droits) : `admin` (Tom), `lead` (Graw), `member` (Qafard) — extensible (`viewer`, etc.).
- **Fonction professionnelle** (affichage) : Fondateur / Directeur Artistique & Digital / Photographe — **aucun effet sur les droits**.
- **Capacités** nommées plutôt que « admin partout » : `members.manage`, `missions.assign_others`, `missions.view_all`, `projects.manage`, `files.manage`… une table rôle → capacités permet d'ajouter un collaborateur sans changer le code.

### 2.4 Modèle de données (extensible, une seule source d'information)
```
profiles(id=auth.uid, slug, display_name, function_title, phone_pro, email_pro, active, created_at)
user_roles(user_id, role)                      role_capabilities(role, capability)
projects(id, name, description, owner_id, archived_at)   project_members(project_id, user_id)
missions(id, title, description, creator_id, assignee_id, validator_id, project_id?, priority, status,
         due_date?, archived_at?, created_at, updated_at, version)
mission_events(id, mission_id, at, actor_id, kind, from_status, to_status, note)   -- historique (append-only)
mission_comments(id, mission_id, author_id, body, created_at)
events(id, kind[meeting|shoot|travel|appointment|show], title, starts_at, ends_at?, place, notes, created_by, project_id?)
event_attendees(event_id, user_id)
run_of_show_items(id, event_id, starts_at, title, place, owner_id, instructions, changed_at, change_note)
channels(id, slug, name)  channel_members(channel_id, user_id)
messages(id, channel_id, author_id, body, reply_to?, important, created_at, edited_at?)
message_reads(user_id, channel_id, last_read_at)
files(id, title, kind[link|storage], url_or_path, mission_id?, project_id?, added_by, created_at)
file_versions(id, file_id, version, url_or_path, added_by, created_at, note)
audit_log(id, at, actor_id, action, entity, entity_id, meta)
```
- **Calendrier sans doublon** : les échéances de missions sont **lues** depuis `missions.due_date` (jamais copiées) ; changer la date de la mission change partout le calendrier, HQ et la fiche.
- Concurrence : colonne `version` (verrou optimiste) pour éviter d'écraser une modification simultanée.
- Pièces jointes COMMS : table `attachments(message_id, file_id)` prévue dès le départ.

### 2.5 Sécurité
- Aucune clé secrète côté client : seule la clé publique (anon) peut y figurer, et **toute donnée est protégée par RLS** ; la clé de service reste **uniquement côté serveur** (variable chiffrée Vercel).
- `/staff/**` : proxy + vérification de session dans chaque Server Action / Route Handler + RLS ; isolation stricte de MEMBERS (aucun accès croisé, tables distinctes et politiques distinctes).
- Fichiers et messages privés : bucket privé, URL signées à durée courte, politiques par appartenance (canal / projet / mission).
- Comptes : invitation par Tom uniquement, 3 comptes actifs ; Sarah, Loïck, Bastien **non créés** (ajout futur = invitation + ligne de profil + rôle).
- Démo : `DEMO_AUTH` désactivé en production ; **suppression des comptes fictifs** dès que l'authentification réelle est branchée.

## 3. Risques techniques
| # | Risque | Gravité | Réponse |
|---|---|---|---|
| 1 | **Aucun backend aujourd'hui** : la synchronisation réelle exige une base, une auth et des variables d'environnement qui n'existent pas | Bloquant | Phase « fondation » à valider (§4), avant tout écran réellement collaboratif |
| 2 | **Coût / limites Supabase** : le plan gratuit limite à 2 projets actifs (le compte en a déjà 2, dont 1 en pause) et **met en pause un projet inactif** — inacceptable pour un outil opérationnel | Élevé | Décision de votre part : réactiver/réutiliser `JARVIS`, créer un projet SKYLINE (possible coût), ou plan Pro. **Aucun service payant sans votre accord** |
| 3 | Fuite de données si RLS mal écrite | Élevé | Politiques minimales, tests SQL dédiés, revue ; clé de service jamais exposée |
| 4 | **Tests** : mon environnement de développement n'atteint pas les services externes (ex. SoundCloud bloqué) ; il faudra vérifier l'accès au projet Supabase depuis l'app | Moyen | Tests de règles purs (unitaires), repository simulé en mémoire pour les e2e, **tests d'intégration réels sur la Preview Vercel** |
| 5 | Next 16 `cacheComponents` : lectures authentifiées = rendu à la demande derrière `Suspense` ; risque de pages lentes ou d'erreurs de pré-rendu | Moyen | Suivre le guide « Authentication with Cache Components » du dépôt, données chargées côté serveur avec squelettes |
| 6 | Notifications « messages non lus » hors app : le web push iOS exige une PWA installée et l'accord de l'utilisateur | Moyen | V2 : non-lus **dans l'app** seulement ; push = phase ultérieure, à valider |
| 7 | Conflits d'édition entre trois appareils | Moyen | Verrou optimiste (`version`), historique append-only, messages d'erreur clairs |
| 8 | Fichiers : quota gratuit limité, pas d'antivirus, types/tailles à restreindre | Moyen | Liens + métadonnées d'abord ; stockage réel après validation du coût |
| 9 | Dérive des branches : `staff-hq` et `staff-missions` non fusionnées dans `main` ; production sans STAFF | Moyen | Fusionner dans l'ordre (staff-hq → staff-missions → staff-hq-v2) avant d'activer l'auth réelle |
| 10 | Régression MEMBERS / SKYLINE SOUND | Faible | Suite e2e existante exécutée à chaque phase ; STAFF cloisonné par le proxy |
| 11 | Données personnelles du staff (RGPD) | Moyen | Données minimales, hébergement UE, accès limité, durées de conservation à définir |

## 4. Plan de développement proposé
**Ajout recommandé : « Phase B0 — Fondation »** (indispensable à la synchronisation) :
1. Décision de votre part (voir §5) puis création/activation du projet Supabase (EU), schéma initial, RLS, 3 comptes invités (aucun mot de passe dans le code).
2. Couche `Repository` + `LocalDemoRepository` (reprend `useMissions`) + `SupabaseRepository` ; session réelle (remplace le cookie de démo, conservé derrière un drapeau pour les tests).
3. Tests : règles (unitaires), RLS (SQL), e2e avec repository en mémoire, vérification sur Preview.

Puis, une branche et une validation par phase :
- **B — Missions** : projet/catégorie, commentaires, demande de validation, approuver / corriger, archivage, réattribution, `Mes missions / Toutes / En attente de validation`, filtres, panneau de détail ; permissions explicites (Tom : tout ; Graw : attribution et suivi ; Qafard : création, suivi, projets auxquels il participe).
- **C — HQ** : « Bonjour, [prénom] », 3 indicateurs réels (missions en cours, validations en attente, messages non lus — masqués ou à 0 tant que la donnée n'existe pas), « À traiter » (2–3 missions urgentes), « Prochaine échéance », « Activité récente » (lue dans l'historique). États vides avec action. Suppression des gros blocs décoratifs.
- **D — Planning** : `events` + `run_of_show_items`, vue liste chronologique par défaut (calendrier mensuel en option), échéances de missions lues depuis `missions.due_date`, création/modification/attribution d'événements.
- **E — COMMS** : canaux Général / Production / Photo & vidéo, envoi, auteur + heure, historique, réponses, liens, messages importants, non-lus (`message_reads`), temps réel ; structure des pièces jointes prête.
- **F — TEAM / FILES** : fiches (Tom, Graw, Qafard) avec missions actives et projets suivis, édition de ses propres informations, gestion des accès par Tom, FILES (liens + métadonnées + versions, rattachés aux missions).
- **Navigation** : onglets HQ / MISSIONS / PLANNING / COMMS ; TEAM, FILES et paramètres en écrans secondaires (HQ, profil). Réalisé progressivement (le changement d'onglets intervient en Phase B pour MISSIONS, D pour PLANNING).
À chaque phase : TypeScript, lint, build, tests unitaires et e2e (dont MEMBERS et SKYLINE SOUND), vérification mobile 375 / 390 / 430 px, Preview Vercel.

## 5. Décisions nécessaires avant la Phase B
1. **Backend** : valider Supabase ? Quel projet : réactiver `JARVIS` (en pause), en créer un dédié SKYLINE, ou autre ? Acceptez-vous un éventuel coût (plan Pro) — sachant que le gratuit met le projet en pause quand il est inactif ?
2. **Connexion** : lien magique / code par e-mail pour les 3 comptes — quelles adresses e-mail ?
3. **Droits** : confirmer la matrice — Tom `admin` (tout, gestion des accès) ; Graw `lead` (crée, attribue à d'autres, suit toutes les missions créatives/digitales) ; Qafard `member` (crée pour lui-même, suit ses missions et celles des projets où il est membre). Graw voit-il **toutes** les missions comme Tom, ou seulement ses projets ?
4. **Missions existantes (V1)** : elles ne sont que dans les navigateurs ; repartir de zéro en V2 (recommandé) ?
5. **Fusion** : OK pour fusionner `staff-hq` et `staff-missions` dans `main` avant la V2, ou travailler uniquement sur la branche `feat/staff-hq-v2` ?
