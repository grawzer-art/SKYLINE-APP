# SKYLINE APP — B0 : fondation (Supabase, authentification, modèle d'accès GLOBAL, migrations, RLS)

Branche `feat/staff-v2-b0-foundation`. **Aucune migration n'a été exécutée sur Supabase.** Rien n'est fusionné dans `main`. MEMBERS et SKYLINE SOUND ne sont pas modifiés. Revue SQL complète : `B0-SQL-REVIEW.md`.

## 0. Modèle d'accès (mise à jour : GRAW super admin GLOBAL de SKYLINE APP)
Trois notions distinctes et cumulables (détail : `B0-SQL-REVIEW.md` §1) : **rôle global** (`super_admin` = GRAW, administre les comptes de tous les espaces) · **accès par espace** (`staff`, `members`, cumulables) · **permissions STAFF HQ** (`admin` = TOM, `member` = QAFARD, uniquement avec l'accès `staff`). La base contient désormais : `accounts` (identité globale), `platform_roles`, `space_access`, `staff_roles`, `staff_profiles` (annuaire STAFF). Un futur participant MEMBERS = un compte avec l'accès `members` : **aucune** donnée STAFF (annuaire, fiches, comptes, missions, projets) ne lui est accessible (testé). Les écrans MEMBERS actuels ne sont pas modifiés ; l'administration globale n'est pas développée.

## 1. Décisions appliquées
| Décision | Où c'est appliqué |
|---|---|
| GRAW `super_admin` GLOBAL : seul à gérer comptes, invitations, désactivations, accès et rôles (tous espaces) | fonctions `manage_*` · `canManageAccounts` · RLS `platform_roles` |
| TOM `admin` STAFF : missions, projets, plannings, validations ; pas les comptes ni les permissions | `is_staff_coordinator()` · tests : Tom refusé sur `manage_*` |
| QAFARD `member` : crée ses missions, gère les siennes, **propose** une mission pour un autre | `create_mission` / `assign_mission` (proposition) · `resolve_assignment` (admin) |
| Validateur désigné par mission, GRAW ou TOM ; GRAW garde un droit global | `validator_id` (admin / super admin, jamais le responsable) |
| STAFF HQ privé, authentification obligatoire, RLS en base | proxy + `getUser()` + profil actif + rôle ; RLS refus par défaut |
| Données de démonstration non supprimées | rien n'est supprimé ; elles restent dans leur stockage historique (voir §6) |

## 2. Ce qui est dans le code
- **Clients Supabase** (`src/lib/supabase/`) : navigateur (clé publique seulement), serveur (cookies httpOnly, `getUser()`), rafraîchissement de session dans le proxy. `service_role` jamais utilisée.
- **Mode** (`src/lib/staff/mode.ts`) : `STAFF_AUTH_MODE=supabase` **et** URL + clé publique ⇒ mode Supabase ; sinon **mode démonstration** (inchangé).
- **Connexion** : `/staff/login` (code à 6 chiffres, valable aussi dans la PWA iPhone ; lien magique en secours), `/auth/callback`, `/auth/signout` (POST), `/api/staff/session`.
- **Isolation** (`src/proxy.ts`) : en mode Supabase, session vérifiée auprès de Supabase + profil **actif** + **rôle**, sinon redirection ; le mode démo est fermé.
- **Rôles** : `super_admin`, `admin`, `member` (+ `participant`, démo) ; fonctions professionnelles à part.

## 3. Connexion : redirections et mots de passe (vérifié)
**Redirections.** L'application n'utilise qu'**une seule URL de retour : `https://<site>/auth/callback`, exacte, sans paramètre** (la destination demandée est mémorisée 15 min dans un cookie, validée côté serveur : jamais d'URL externe). Le **code à 6 chiffres** n'a besoin d'aucune redirection ; seul le lien magique en utilise une. Un lien ouvert depuis un autre domaine que ceux autorisés retombe sur *Site URL* (le code reste utilisable). Je n'ai pas pu consulter la documentation Supabase en ligne : le comportement exact des motifs de redirection est celui que je connais ; **vérifiez-le dans Authentication → URL Configuration**.
**Configuration minimale pour une Preview stable** (à choisir ensemble, voir §7) :
- un **seul** projet Vercel retenu (il y en a deux : `skyline-app` et `skyline-ap`) et **une adresse stable** : l'alias de branche `https://<projet>-git-<branche>-jarvis-1348.vercel.app` (ne change pas à chaque déploiement), de préférence d'une branche dédiée `staff-preview` ;
- *Site URL* = cette adresse ;
- *Redirect URLs* = **une seule entrée exacte** : `https://<cette adresse>/auth/callback` — **pas de joker**, pas de `localhost`, pas d'autre projet, pas de déploiements à adresse aléatoire. La production sera ajoutée **plus tard**, en entrée exacte, après validation.
**Mots de passe.** L'application ne propose, n'appelle et ne contient **aucune connexion par mot de passe, inscription ni API d'administration** (garde-fou automatique `tests/no-password.test.mts`). Limite connue : à ma connaissance, Supabase ne permet pas de désactiver séparément l'API « mot de passe » tant que le fournisseur E-mail est actif ; la protection est donc de **ne créer aucun mot de passe** :
- les comptes se créent par **« Invite user »** (aucun mot de passe) ; le formulaire « Create new user » du tableau de bord exige un mot de passe : **à éviter** ;
- le script d'attribution des rôles **refuse** tout compte qui possède un mot de passe ;
- une requête de contrôle en lecture seule est fournie (étape 8).
*Point à vérifier lors du premier essai* : la connexion par code d'un compte invité mais jamais connecté. Le plan prévoit que chaque personne ouvre une fois le lien d'invitation (cela confirme l'adresse) ; si ce n'est pas suffisant, le script le signalera (« adresse non confirmée »), sans rien modifier.

## 4. Migrations SQL (non exécutées) — détail et revue dans `B0-SQL-REVIEW.md`
`20261101000100_b0_profiles_roles.sql` · `20261101000200_b0_missions.sql` · `20261101000300_b0_rls_policies.sql`. Non destructives (création uniquement). Script manuel `supabase/bootstrap/B0_roles_template.sql` : **un seul bloc atomique** ; vérifie les trois comptes (existence unique, adresse confirmée, ni supprimé ni suspendu, **sans mot de passe**), l'absence de doublons ou de conflits (slug, rôles, autre compte actif, autre super admin), refuse de s'exécuter tant qu'une adresse porte « REMPLACER », puis attribue les rôles et contrôle le résultat : en cas d'échec, tout est **annulé automatiquement** (aucun COMMIT/ROLLBACK manuel).

## 5. Étapes manuelles dans Supabase — dans cet ordre exact
> Projet `SKYLINE-APP`. **Ne rien exécuter avant la validation finale de la revue SQL.**
1. **Projet Vercel `skyline-app`, adresse stable de la branche `staff-preview`** : `https://skyline-app-git-staff-preview-jarvis-1348.vercel.app` (décidé).
2. **Authentication → Sign In / Providers → Email** : fournisseur activé, « Confirm email » activé, **« Allow new users to sign up » désactivé** ; expiration du code 900 s, longueur 6.
3. **Authentication → URL Configuration** : *Site URL* = adresse stable ; *Redirect URLs* = l'unique entrée exacte `…/auth/callback` (aucun joker).
4. **Authentication → Emails → Templates → « Magic Link »** : objet « Votre code de connexion SKYLINE STAFF HQ » ; corps `<p>Votre code de connexion : <strong style="font-size:24px">{{ .Token }}</strong></p><p>Il expire dans 15 minutes. Vous pouvez aussi <a href="{{ .ConfirmationURL }}">ouvrir ce lien</a>.</p>`. Même ajout du code dans « Confirm signup » et « Invite user ».
5. **Authentication → SMTP Settings** : expéditeur personnalisé (l'envoi intégré est limité à quelques e-mails par heure ; offres gratuites possibles ; aucun service payant sans votre accord).
6. **SQL Editor** : exécuter `…0100`, puis `…0200`, puis `…0300`, un fichier à la fois. Contrôler : *Database → Tables* : 7 tables « RLS enabled » ; *Advisors → Security* : aucune erreur « RLS disabled » (des avertissements « SECURITY DEFINER exécutable » sont attendus, voir la revue).
7. **Authentication → Users → Invite user** : inviter les trois adresses (sans mot de passe). Chaque personne ouvre **une fois** l'e-mail d'invitation (confirme l'adresse ; la page atteinte ensuite peut être ignorée).
8. **SQL Editor (lecture seule)** : `select email, email_confirmed_at is not null as confirme, coalesce(encrypted_password,'') <> '' as a_un_mot_de_passe from auth.users order by email;` → **3 lignes, confirme = true, a_un_mot_de_passe = false**. Sinon s'arrêter.
9. **SQL Editor** : ouvrir `supabase/bootstrap/B0_roles_template.sql`, remplacer les trois adresses, exécuter. Résultat attendu : `BOOTSTRAP OK` puis 3 lignes (`graw` : rôle global super_admin + accès staff ; `qafard` : member ; `tom` : admin). Toute erreur « BOOTSTRAP ANNULÉ : … » signifie qu'**aucune** modification n'a été faite : corriger la cause et relancer.
10. **Vercel → Environment Variables → Preview uniquement** : `STAFF_AUTH_MODE=supabase`. Rien en Production. Redéployer.
11. **Essai** (adresse stable) : `/staff` → saisie de l'e-mail → code → HQ. Vérifier : bandeau « Données locales · non partagées » ; compte inconnu : aucun e-mail et aucun indice ; compte désactivé par GRAW : refus immédiat.
12. (Plus tard) Plan gratuit : pause après environ une semaine d'inactivité → surveillance ou passage payant **après validation**.

## 6. STAFF HQ en mode Supabase tant que les écrans sont locaux (comportement confirmé)
| Élément | Réel (base / serveur) | Local (cet appareil) |
|---|---|---|
| Connexion, identité, rôles, accès à `/staff/**` | **oui** | — |
| Missions, planning (Schedule), messages (Comms), annonces, équipe affichée | non | **oui — données de démonstration** |
Garde-fous contre toute confusion (testés) :
- **Bandeau permanent** en haut de chaque écran STAFF : « Données locales · non partagées — … ni partagées avec l'équipe ni enregistrées dans la base » ; la page MISSIONS le répète (« pour votre compte uniquement »).
- **Stockage local séparé par compte** en mode Supabase (clé `…:db:<membre>`) : un autre compte sur le même appareil **ne voit pas** les missions locales d'un autre ; elles ne sont jamais mélangées aux données de démonstration.
- **Les données de démonstration existantes ne sont ni supprimées ni modifiées** ; elles restent dans leur clé historique, invisibles en mode Supabase.
- **Aucun chargeur d'exemples** en mode Supabase (aucune donnée fictive injectée sous un compte réel).
- Se déconnecter n'efface pas les données locales (elles restent sur l'appareil, non chiffrées) : bouton « Effacer mes missions locales ».
En mode démonstration (sans variable d'activation), rien ne change.

## 7. Décisions attendues
1. **Projet Vercel et adresse stable** : `skyline-app` ou `skyline-ap` ? Créer une branche dédiée `staff-preview` (adresse stable) ou utiliser l'alias de `feat/staff-v2-b0-foundation` ?
2. Créer les comptes par **« Invite user »** (recommandé) : confirmé ?
3. Validation finale de la revue SQL (`B0-SQL-REVIEW.md`).

## 8. Tests exécutés
`npm run test:rls` : **29 tests** de migrations / RLS (dont participants, cumul d'accès, super admin sans accès STAFF) + **15 tests** du script d'attribution (PGlite, hors réseau) · `npm run test:auth` : mode Supabase (URL factice) : isolation, falsification, formulaire, bandeau et stockage local séparé · unitaires (dont garde-fou « sans mot de passe », redirections) · e2e MEMBERS / SKYLINE SOUND / STAFF / MISSIONS. **Limites** : PGlite simule Supabase ; aucune connexion à votre projet réel n'a été testée ; l'envoi des e-mails et l'iPhone/PWA restent à vérifier sur la Preview.
