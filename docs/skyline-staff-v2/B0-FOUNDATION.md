# STAFF HQ V2 — B0 : fondation (Supabase, authentification, rôles, migrations, RLS)

Branche `feat/staff-v2-b0-foundation` (depuis `feat/staff-hq-v2`). **Aucune migration n'a été exécutée sur Supabase.** Rien n'est fusionné dans `main`. MEMBERS et SKYLINE SOUND ne sont pas modifiés.

## 1. Décisions appliquées
| Décision | Où c'est appliqué |
|---|---|
| GRAW `super_admin` : seul à gérer comptes, invitations, désactivations, rôles | fonctions `manage_*` (super admin uniquement) · `canManageAccounts` · RLS `user_roles` |
| TOM `admin` : missions, projets, plannings, validations ; pas les comptes ni les permissions | `is_coordinator()` · tests : Tom refusé sur `manage_*` |
| QAFARD `member` : crée ses missions, gère les siennes, **propose** une mission pour un autre (attribution validée par un admin) | `create_mission` / `assign_mission` (proposition) · `resolve_assignment` (admin) |
| Validateur désigné par mission, GRAW ou TOM ; GRAW garde un droit global | `validator_id` (doit être admin / super_admin, jamais le responsable) ; super admin = coordinateur |
| STAFF HQ privé, authentification obligatoire, RLS en base | proxy + `getUser()` + profil actif + rôle ; RLS refus par défaut |
| Données de démonstration non supprimées | rien n'est supprimé : missions locales, `src/data/staff.ts` et comptes démo conservés (mode démonstration par défaut) |

## 2. Ce qui est dans le code
- **Clients Supabase** (`src/lib/supabase/`) : `client.ts` (navigateur, clé publique seulement), `server.ts` (cookies httpOnly, `getUser()`), `proxy.ts` (rafraîchissement de session). Aucune clé secrète, `service_role` jamais utilisée.
- **Mode** (`src/lib/staff/mode.ts`) : `STAFF_AUTH_MODE=supabase` **et** les deux variables publiques ⇒ mode Supabase. Sinon **mode démonstration** (comportement actuel). Les deux variables seules ne changent rien : l'activation est explicite.
- **Authentification par e-mail** : `/staff/login` (code à 6 chiffres, aussi valable dans la PWA iPhone ; lien magique en secours), `/auth/callback` (échange du code, redirection STAFF interne uniquement), `/auth/signout` (POST), `/api/staff/session` (identité pour l'interface). `shouldCreateUser: false` : personne ne peut créer de compte ; messages neutres (n'indiquent pas si une adresse existe).
- **Isolation** (`src/proxy.ts`) : en mode Supabase, chaque requête `/staff/**` exige une session vérifiée auprès de Supabase, un profil **actif** et un **rôle** ; sinon redirection vers la connexion. Le mode démo (cookie signé) est **fermé** en mode Supabase.
- **Rôles** (`src/lib/auth/roles.ts`) : `super_admin`, `admin`, `member` (+ `participant` pour la démo) ; fonctions professionnelles séparées (`src/data/staff.ts`).
- **Règles métier** (`src/domain/missions.ts`) : propositions d'attribution, validateurs administrateurs, archivage, normalisation des missions V1 (sans perte). L'interface MISSIONS reste inchangée (stockage local) ; le branchement sur la base est la Phase B.

## 3. Migrations SQL (non exécutées) — `supabase/migrations/`
1. `20261101000100_b0_profiles_roles.sql` — type `app_role`, tables `profiles` et `user_roles`, invitation → profil **inactif sans rôle**, fonctions d'aide (`has_role`, `is_coordinator`, …), gestion des comptes **super admin seulement** (`manage_set_roles`, `manage_set_active`, `manage_update_profile`, protection du dernier super admin), annuaire `list_team()`.
2. `20261101000200_b0_missions.sql` — `projects`, `project_members`, `missions` (contraintes : validateur ≠ responsable, proposition valide, longueurs), `mission_events` (historique, ajout seulement), `mission_comments`, et les **seules fonctions d'écriture** : `create_mission`, `update_mission` (verrou de version), `set_mission_status`, `assign_mission`, `resolve_assignment`, `add_mission_comment`, `archive_mission`, `delete_mission` (admins).
3. `20261101000300_b0_rls_policies.sql` — privilèges et politiques : `anon` sans aucun droit ; `authenticated` en **lecture seule** selon les politiques (aucun INSERT/UPDATE/DELETE direct sur missions, historique, commentaires, rôles) ; chacun ne modifie que `display_name`, `email_pro`, `phone_pro` de son profil ; filet pour les futures fonctions.
Toutes sont **non destructives** (création uniquement : aucun `drop`, `truncate`, `delete`, aucune donnée insérée). `supabase/bootstrap/B0_roles_template.sql` (manuel, jamais automatique) attribue les rôles initiaux **avec des adresses à remplacer** : rien n'est inventé.

## 4. Étapes manuelles dans Supabase — dans cet ordre exact
> Projet `SKYLINE-APP` (organisation SKYLINE, région Irlande). **Ne rien exécuter avant d'avoir validé le contenu des 3 migrations.**
1. **Authentication → Sign In / Providers → Email** : activer le fournisseur E-mail, garder « Confirm email » activé, **désactiver « Allow new users to sign up »**. Régler l'expiration du code à 900 s et la longueur à 6 si l'option est proposée.
2. **Authentication → URL Configuration** : *Site URL* = l'adresse stable du site (prévisualisation pour l'instant ; production à confirmer). *Redirect URLs* : `https://skyline-app-git-*-jarvis-1348.vercel.app/**`, `https://skyline-ap-git-*-jarvis-1348.vercel.app/**`, `http://localhost:3100/**`, `http://localhost:3000/**`.
3. **Authentication → Emails → Templates → « Magic Link »** : objet « Votre code de connexion SKYLINE STAFF HQ » ; corps `<p>Votre code de connexion : <strong style="font-size:24px">{{ .Token }}</strong></p><p>Il expire dans 15 minutes. Vous pouvez aussi <a href="{{ .ConfirmationURL }}">ouvrir ce lien</a>.</p>` (le code est indispensable pour la PWA iPhone).
4. **Authentication → SMTP Settings** : configurer un expéditeur personnalisé (l'envoi intégré est limité à quelques e-mails par heure, insuffisant ; plusieurs offres SMTP gratuites existent — **aucun service payant sans votre accord**).
5. **SQL Editor** : exécuter, **dans cet ordre et un fichier à la fois**, `…0100_b0_profiles_roles.sql`, puis `…0200_b0_missions.sql`, puis `…0300_b0_rls_policies.sql`. Vérifier : *Database → Tables* : 7 tables toutes avec « RLS enabled » ; *Advisors → Security* : aucune erreur « RLS disabled ».
6. **Authentication → Users** : créer les trois comptes avec leurs vraies adresses : *Add user → Create new user*, cocher **Auto Confirm User** (un mot de passe aléatoire est exigé par le formulaire : le générer avec un gestionnaire de mots de passe et **ne jamais l'utiliser ni le conserver** — la connexion se fait uniquement par code e-mail). Chaque création crée un profil **inactif sans rôle**.
7. **SQL Editor** : ouvrir `supabase/bootstrap/B0_roles_template.sql`, **remplacer les trois adresses**, exécuter. La requête de contrôle doit afficher exactement 3 lignes : `graw` (super_admin), `tom` (admin), `qafard` (member). Sinon exécuter `rollback;` et corriger.
8. **Vercel → Settings → Environment Variables → Preview uniquement** : ajouter `STAFF_AUTH_MODE` = `supabase`. Ne rien ajouter en Production. Redéployer la prévisualisation de la branche.
9. **Test sur la prévisualisation** : ouvrir `/staff` → connexion → code reçu par e-mail → HQ. Contrôles : un compte inconnu ne reçoit rien et aucun message ne le révèle ; Qafard n'a aucun accès aux comptes ; un compte désactivé (par GRAW) est refusé immédiatement.
10. (Plus tard) Plan gratuit : un projet inactif est mis en pause après environ une semaine ; prévoir une surveillance ou un passage payant **après validation**.

## 5. Tests exécutés
- `npm run test:rls` : **24 tests** des migrations et de la RLS sur un vrai Postgres (PGlite, hors réseau) : refus par défaut, anonyme sans aucun accès, invité inactif sans accès, rôles (GRAW seul gère les comptes ; Tom et Qafard refusés), dernier super admin protégé, profil limité aux champs autorisés, aucune écriture directe, création/proposition/approbation, validateurs, statuts (le responsable ne termine jamais), visibilité (membre / projet / coordinateurs), verrou de version, commentaires, archivage, suppression, historique non modifiable, désactivation immédiate, aucune fonction exécutable par l'anonyme. Ils ont révélé **3 bugs SQL corrigés** (slug majuscules, concaténation de tableau, annuaire).
- `npm run test:auth` : **mode Supabase** construit avec une URL factice : redirections, falsification (cookies, jetons de démo, JWT inventé), formulaire de connexion avec réponses Supabase simulées, mobiles 375/390/430.
- Unitaires (règles, rôles, redirections), e2e MEMBERS / SKYLINE SOUND / STAFF / MISSIONS : tous verts.
**Limites** : PGlite simule Supabase (rôles, `auth.uid()`), il n'est pas Supabase lui-même ; aucune connexion réelle à votre projet n'a été testée (mon environnement n'y accède pas) ; l'envoi réel des e-mails et le comportement iPhone/PWA restent à vérifier sur la prévisualisation après les étapes 1 à 9.

## 6. Ce qui n'est PAS fait (Phase B et suivantes)
Branchement des écrans MISSIONS / HQ / PLANNING / COMMS sur la base (les écrans utilisent encore les données locales et le message « enregistré sur cet appareil »), invitations depuis l'application (exigerait une clé serveur secrète, volontairement absente), projets, planning, messagerie, fichiers.
