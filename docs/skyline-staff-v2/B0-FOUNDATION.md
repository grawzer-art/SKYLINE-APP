# SKYLINE APP — B0 : fondation (Supabase, authentification, modèle d'accès GLOBAL, migrations, RLS)

Branche de travail `feat/staff-v2-b0-foundation` ; **branche de prévisualisation stable `staff-preview`** (même commit). **Aucune migration n'a été exécutée sur Supabase.** Rien n'est fusionné dans `main`. MEMBERS et SKYLINE SOUND ne sont pas modifiés. Revue SQL complète (texte intégral des migrations) : `B0-SQL-REVIEW.md`.

## 0. Modèle d'accès (GRAW super admin GLOBAL de SKYLINE APP)
Trois notions distinctes et cumulables (détail : `B0-SQL-REVIEW.md` §1) :
- **rôle global** (`platform_roles` : `super_admin` = GRAW) : administre comptes, invitations, activations, accès et rôles de **tous** les espaces ;
- **accès par espace** (`space_access` : `staff`, `members`, cumulables) ;
- **permissions STAFF HQ** (`staff_roles` : `admin` = TOM, `member` = QAFARD), uniquement avec l'accès `staff`.
Tables : `accounts` (identité globale) · `platform_roles` · `space_access` · `staff_roles` · `staff_profiles` (annuaire STAFF) · `projects` · `project_members` · `missions` · `mission_events` · `mission_comments` — **10 tables, toutes avec RLS**.
Équipe de B0 : GRAW = rôle global + accès `staff` ; TOM = accès `staff` + `admin` ; QAFARD = accès `staff` + `member`. Aucun accès `members` n'est attribué en B0. Un futur participant MEMBERS = un compte avec l'accès `members` seul : **aucune** donnée STAFF ne lui est accessible (testé). Les écrans MEMBERS ne sont pas modifiés ; l'administration globale (interface) n'est pas développée.

## 1. Décisions appliquées
| Décision | Où c'est appliqué |
|---|---|
| GRAW `super_admin` GLOBAL : seul à gérer comptes, invitations, désactivations, accès et rôles (tous espaces) | fonctions `manage_*` · `canManageAccounts` · RLS `platform_roles` |
| TOM `admin` STAFF : missions, projets, plannings, validations ; pas les comptes ni les permissions | `is_staff_coordinator()` · tests : Tom refusé sur `manage_*` |
| QAFARD `member` : crée ses missions, gère les siennes, **propose** une mission pour un autre | `create_mission` / `assign_mission` (proposition) · `resolve_assignment` (coordinateur) |
| Validateur désigné par mission : GRAW ou TOM ; GRAW garde un droit global | `validator_id` = coordinateur STAFF, jamais le responsable |
| STAFF HQ privé, authentification obligatoire, RLS en base | proxy + `getUser()` + compte actif + accès `staff` ; RLS refus par défaut |
| Projet Vercel `skyline-app`, adresse stable via `staff-preview` | §3 |
| Comptes par « Invite user », sans mot de passe | §4 |
| Données de démonstration non supprimées | rien n'est supprimé ; elles restent dans leur stockage historique (§7) |

## 2. Ce qui est dans le code
- **Clients Supabase** (`src/lib/supabase/`) : navigateur (clé publique seulement), serveur (cookies httpOnly, `getUser()`), rafraîchissement de session dans le proxy. `service_role` jamais utilisée.
- **Mode** (`src/lib/staff/mode.ts`) : `STAFF_AUTH_MODE=supabase` **et** URL + clé publique ⇒ mode Supabase ; sinon **mode démonstration** (inchangé).
- **Connexion** : `/staff/login` (code à 6 chiffres, valable aussi dans la PWA iPhone ; lien magique en secours), `/auth/callback`, `/auth/signout` (POST), `/api/staff/session`.
- **Isolation** (`src/proxy.ts`) : en mode Supabase, session vérifiée auprès de Supabase + compte **actif** + accès **`staff`** + fiche d'annuaire, sinon redirection ; le mode démo est fermé.
- **Accès** (`src/lib/auth/roles.ts`) : `platform` / `spaces` / `staff` (miroir de la base) ; fonctions professionnelles à part (`src/data/staff.ts`).

## 3. Preview stable — état vérifié
- Branche `staff-preview` = commit `346dec9` (identique à `feat/staff-v2-b0-foundation`).
- **Confirmé par GitHub / Vercel** : le déploiement du projet **`skyline-app`** pour ce commit a le statut « Deployment has completed » (réussi). Lien d'inspection Vercel (connexion requise) : `https://vercel.com/jarvis-1348/skyline-app/4aFjAR5Gh5kFbHyH27FoRZ5UKwQ6`. Le projet `skyline-ap` a aussi déployé (non retenu).
- **Adresse stable `skyline-app`** : `https://skyline-app-git-staff-preview-jarvis-1348.vercel.app`. La règle de nommage `<projet>-git-<branche>-jarvis-1348.vercel.app` est **confirmée par des données Vercel réelles** (alias `skyline-app-git-feat-skyline-sound-…` lu dans le commentaire Vercel de la PR, et alias `skyline-ap-git-staff-preview-jarvis-1348.vercel.app` lu dans le lien de retour d'expérience du contrôle Vercel de ce commit). L'alias exact de `skyline-app` n'a toutefois **pas pu être ouvert** depuis l'environnement de développement (réseau externe bloqué) : le confirmer en 10 secondes dans *Vercel → skyline-app → Deployments → déploiement de `staff-preview` → Domains*, et vérifier que la « protection des déploiements » de Vercel ne bloque pas l'accès (connexion Vercel demandée = protection active).

## 4. Connexion : redirections et mots de passe
**Redirections.** Une **seule URL de retour : `https://<adresse stable>/auth/callback`, exacte, sans paramètre** (la destination demandée est mémorisée 15 min dans un cookie, validée côté serveur : jamais d'URL externe). Le **code à 6 chiffres** n'a besoin d'aucune redirection ; seul le lien magique en utilise une. Un lien ouvert depuis un domaine non autorisé retombe sur *Site URL* (le code reste utilisable). Je n'ai pas pu consulter la documentation Supabase en ligne : **vérifiez le comportement des redirections dans Authentication → URL Configuration**.
**Configuration minimale** : *Site URL* = l'adresse stable ; *Redirect URLs* = **une seule entrée exacte** `https://<adresse stable>/auth/callback` — **pas de joker**, pas de `localhost`, pas l'autre projet, pas de déploiements à adresse aléatoire. La production s'ajoutera plus tard, en entrée exacte, après validation.
**Mots de passe.** L'application ne propose, n'appelle et ne contient **aucune connexion par mot de passe, inscription ni API d'administration** (garde-fou automatique `tests/no-password.test.mts`). Limite connue : à ma connaissance, Supabase ne permet pas de désactiver séparément l'API « mot de passe » tant que le fournisseur E-mail est actif ; la protection est de **ne créer aucun mot de passe** :
- comptes créés par **« Invite user »** (aucun mot de passe) ; « Create new user » exige un mot de passe : **à éviter** ;
- le script d'attribution **refuse** tout compte qui possède un mot de passe ;
- une requête de contrôle en lecture seule est fournie (étape 8).
*Point à vérifier au premier essai* : la connexion par code d'un compte invité mais jamais connecté. Chaque personne ouvre une fois le lien d'invitation (cela confirme l'adresse) ; sinon le script signale « adresse non confirmée » sans rien modifier.

## 5. Migrations SQL (non exécutées) et script de rôles
Noms exacts, à exécuter **dans cet ordre, un fichier à la fois** :
1. `supabase/migrations/20261101000100_b0_accounts_access.sql` — types `platform_role`, `staff_role`, `app_space` ; tables `accounts`, `platform_roles`, `space_access`, `staff_roles`, `staff_profiles` ; invitation → compte **inactif sans rien** ; aides d'accès ; `manage_*` (super admin global) ; `list_team()`.
2. `supabase/migrations/20261101000200_b0_missions.sql` — `projects`, `project_members`, `missions`, `mission_events`, `mission_comments` et les fonctions d'écriture des missions.
3. `supabase/migrations/20261101000300_b0_rls_policies.sql` — privilèges et **12 politiques RLS**, filets de sécurité.
Non destructives (création uniquement : aucun `drop`, `truncate`, `delete`, aucune donnée insérée).
**Script de rôles global** `supabase/bootstrap/B0_roles_template.sql` (manuel, jamais automatique) : **un seul bloc atomique**. Il attribue : GRAW → rôle global `super_admin` + accès `staff` ; TOM → accès `staff` + `admin` ; QAFARD → accès `staff` + `member`. Il vérifie avant d'agir les trois comptes (existence unique, adresse confirmée, ni supprimé ni suspendu, **sans mot de passe**), l'absence de doublons et de conflits (slug, rôle global, permission STAFF, autre compte actif avec l'accès STAFF, autre super admin), refuse de s'exécuter tant qu'une adresse porte « REMPLACER », puis contrôle le résultat : en cas d'échec **tout est annulé automatiquement** (aucun COMMIT/ROLLBACK manuel).

## 6. Étapes manuelles dans Supabase — dans cet ordre exact
> Projet `SKYLINE-APP`. **Ne rien exécuter avant la validation finale de la revue SQL.**
1. **Confirmer l'adresse stable** (§3) : ouvrir *Vercel → skyline-app → Deployments → déploiement de `staff-preview` → Domains*, noter l'adresse exacte (appelée `<ADRESSE>` ci-dessous).
2. **Authentication → Sign In / Providers → Email** : fournisseur activé, « Confirm email » activé, **« Allow new users to sign up » désactivé** ; expiration du code 900 s, longueur 6.
3. **Authentication → URL Configuration** : *Site URL* = `<ADRESSE>` ; *Redirect URLs* = l'unique entrée exacte `<ADRESSE>/auth/callback` (aucun joker).
4. **Authentication → Emails → Templates → « Magic Link »** : objet « Votre code de connexion SKYLINE » ; corps `<p>Votre code de connexion : <strong style="font-size:24px">{{ .Token }}</strong></p><p>Il expire dans 15 minutes. Vous pouvez aussi <a href="{{ .ConfirmationURL }}">ouvrir ce lien</a>.</p>`. Même ajout du code dans « Confirm signup » et « Invite user ».
5. **Authentication → SMTP Settings** : expéditeur personnalisé (l'envoi intégré est limité à quelques e-mails par heure ; offres gratuites possibles ; aucun service payant sans votre accord).
6. **SQL Editor** : exécuter `…0100_b0_accounts_access.sql`, puis `…0200_b0_missions.sql`, puis `…0300_b0_rls_policies.sql`.
7. **Vérifications SQL après les migrations (lecture seule)** — chaque résultat doit correspondre exactement, sinon s'arrêter :
   - *Tables et RLS* : `select c.relname as table_name, c.relrowsecurity as rls from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' order by 1;` → **10 lignes, `rls = true` partout** : `accounts, mission_comments, mission_events, missions, platform_roles, project_members, projects, space_access, staff_profiles, staff_roles`.
   - *Politiques* : `select tablename, count(*) from pg_policies where schemaname = 'public' group by 1 order by 1;` → **12 au total** : `accounts 2, staff_profiles 2`, les 8 autres tables **1** chacune.
   - *Fonctions exécutables par l'anonyme* : `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prokind = 'f' and has_function_privilege('anon', p.oid, 'execute');` → **0 ligne**.
   - *Fonctions exécutables par un utilisateur connecté* : même requête avec `'authenticated'` → **23 lignes** exactement (liste dans `B0-SQL-REVIEW.md` §5) ; `is_staff_user`, `is_validator_user`, `handle_new_user`, `touch_updated_at` **ne doivent pas y figurer**.
   - *Écritures directes* : `select table_name, privilege_type from information_schema.role_table_grants where grantee in ('authenticated','anon') and table_schema = 'public' and privilege_type in ('INSERT','DELETE','TRUNCATE');` → **0 ligne** ; `select table_name from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public';` → **0 ligne**.
   - *Colonnes modifiables* : `select table_name, column_name from information_schema.column_privileges where grantee = 'authenticated' and table_schema = 'public' and privilege_type = 'UPDATE' order by 1, 2;` → **3 lignes** : `accounts.display_name`, `staff_profiles.email_pro`, `staff_profiles.phone_pro`.
   - *Advisors* (Security) : aucune erreur « RLS disabled » ; des avertissements « SECURITY DEFINER exécutable » sont attendus (voir la revue).
8. **Authentication → Users → Invite user** : inviter les trois adresses (sans mot de passe). Chaque personne ouvre **une fois** l'e-mail d'invitation (confirme l'adresse ; la page atteinte ensuite peut être ignorée). Puis (lecture seule) : `select email, email_confirmed_at is not null as confirme, coalesce(encrypted_password,'') <> '' as a_un_mot_de_passe from auth.users order by email;` → **3 lignes, confirme = true, a_un_mot_de_passe = false**. Sinon s'arrêter.
9. **SQL Editor — script de rôles global** : ouvrir `supabase/bootstrap/B0_roles_template.sql`, remplacer les **trois** adresses (lignes `v_graw`, `v_tom`, `v_qafard`), exécuter. Résultat attendu : message `BOOTSTRAP OK` puis **3 lignes** — `graw` (`role_global` = `{super_admin}`, `acces` = `{staff}`, `permissions_staff` vide), `qafard` (`{staff}`, `{member}`), `tom` (`{staff}`, `{admin}`). Toute erreur « BOOTSTRAP ANNULÉ : … » signifie qu'**aucune** modification n'a été faite : corriger la cause et relancer.
10. **Vérifications après le script (lecture seule)** : `select (select count(*) from public.platform_roles) as roles_globaux, (select count(*) from public.staff_roles) as permissions_staff, (select count(*) from public.space_access where space = 'staff') as acces_staff, (select count(*) from public.space_access where space = 'members') as acces_members;` → **1, 2, 3, 0**. Et `select display_name, active from public.accounts order by 1;` → **3 comptes actifs** (Graw, Qafard, Tom) et aucun autre actif.
11. **Vercel → Settings → Environment Variables → Preview uniquement** : `STAFF_AUTH_MODE=supabase`. **Rien en Production.** Redéployer `staff-preview`.
12. **Essai sur `<ADRESSE>`** : `/staff` → saisie de l'e-mail → code → HQ, pour chacun des trois comptes. Vérifier : bandeau « Données locales · non partagées » ; adresse inconnue : aucun e-mail et aucun indice ; compte désactivé par GRAW : refus immédiat.
13. (Plus tard) Plan gratuit : pause après environ une semaine d'inactivité → surveillance ou passage payant **après validation**.

## 7. STAFF HQ en mode Supabase tant que les écrans sont locaux (comportement confirmé)
| Élément | Réel (base / serveur) | Local (cet appareil) |
|---|---|---|
| Connexion, identité, rôle global, accès, permissions, accès à `/staff/**` | **oui** | — |
| Missions, planning (Schedule), messages (Comms), annonces, équipe affichée | non | **oui — données de démonstration** |
Garde-fous contre toute confusion (testés) :
- **Bandeau permanent** en haut de chaque écran STAFF : « Données locales · non partagées — … ni partagées avec l'équipe ni enregistrées dans la base » ; la page MISSIONS le répète (« pour votre compte uniquement »).
- **Stockage local séparé par compte** en mode Supabase (clé `…:db:<membre>`) : un autre compte sur le même appareil **ne voit pas** les missions locales d'un autre ; elles ne sont jamais mélangées aux données de démonstration.
- **Les données de démonstration existantes ne sont ni supprimées ni modifiées** ; elles restent dans leur clé historique, invisibles en mode Supabase.
- **Aucun chargeur d'exemples** en mode Supabase (aucune donnée fictive injectée sous un compte réel).
- Se déconnecter n'efface pas les données locales (non chiffrées, sur l'appareil) : bouton « Effacer mes missions locales ».
En mode démonstration (sans variable d'activation), rien ne change.

## 8. Tests exécutés (sur `346dec9`)
`npm run test:rls` : **29 tests** de migrations / RLS (dont participants, cumul d'accès, super admin sans accès STAFF) + **15 tests** du script de rôles (PGlite, hors réseau) · `npm run test:auth` : mode Supabase (URL factice) : isolation, falsification, formulaire, bandeau et stockage local séparé · unitaires (règles de missions, accès, redirections, garde-fou « sans mot de passe ») · e2e MEMBERS / SKYLINE SOUND / STAFF / MISSIONS · typecheck, lint, build. **Limites** : PGlite simule Supabase (rôles, `auth.uid()`) ; aucune connexion à votre projet réel n'a été testée ; l'envoi des e-mails et l'iPhone/PWA restent à vérifier sur la Preview. Les valeurs attendues du §6 (étapes 7 et 10) ont été calculées en exécutant les trois migrations sur ce Postgres de test.
