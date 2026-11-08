# Sprint technique 01 — Rapport d'audit

Branche `feat/b4-2-member-signup`. Aucune migration appliquée, aucun réglage Auth modifié, aucune inscription activée. Les lectures du projet partagé `nyneujukydxjvbwcoste` ont été faites en **lecture seule** (8 nov. 2026).

## 1. `useEmailCodeLogin` — gestion des erreurs Supabase

**Défauts constatés (avant correction)**
| Cas | Comportement d'origine | Gravité |
|---|---|---|
| `signInWithOtp` renvoie une erreur autre que 429 (500, réseau, CAPTCHA refusé, adresse invalide, SMTP) | L'interface passait à l'étape « code » et affichait « Si ce compte existe, un code vient d'être envoyé » | **Haute** : faux message d'envoi, utilisateur bloqué sans explication |
| `verifyOtp` renvoie une erreur (500, réseau, 429) | Toujours « Code invalide ou expiré » | Moyenne : panne présentée comme faute de l'utilisateur |
| Inscription : « inscriptions désactivées » (422) | Message d'envoi | Haute |

**Correction** (`src/lib/auth/otpErrors.ts`, logique pure, + hook)
- Seules deux issues donnent l'étape « code » : succès, ou erreur de la **classe neutre** (compte inconnu, compte banni, et — en connexion uniquement — « signups not allowed » que Supabase renvoie pour une adresse inconnue quand la création est interdite). Elles affichent exactement le message neutre existant : une adresse inconnue et une adresse connue sont indiscernables (testé en E2E).
- Toute autre erreur reste sur l'étape e-mail avec un message explicite : limitation de débit (+ délai), CAPTCHA, adresse invalide, indisponibilité (5xx, SMTP, hook), réseau, inconnu. Aucun texte brut du serveur n'est affiché. Le jeton CAPTCHA (usage unique) est renouvelé après chaque tentative.
- Vérification du code : « Code invalide ou expiré » uniquement pour un vrai refus ; 429, 5xx et réseau ont leurs messages.
- En inscription, « inscriptions désactivées » = état global du projet (message dédié « L'inscription n'est pas disponible »), pas une information sur un compte.
- Tests : `tests/otp-errors.test.mts` (7), E2E `tests/e2e-signup.cjs` section « Erreurs Supabase » (connexion participants, connexion STAFF, inscription, vérification).

## 2. Finalisation : vérifiable techniquement vs déclaration
| Élément | Nature | Contrôle |
|---|---|---|
| Propriété de l'adresse e-mail | **Vérifiable** | `auth.users.email_confirmed_at` (posé par Supabase après le code) lu par `claim_member_account` |
| Identité de la requête | **Vérifiable** | `auth.uid()` ; aucun identifiant, rôle ou espace en paramètre |
| État du compte (invité, anonyme, déjà doté d'accès, activé/modifié par un admin, suspendu) | **Vérifiable** | Lecture sous verrou de ligne dans la fonction |
| Version des CGU acceptée | **Vérifiable (corrigé)** | Avant : texte libre ≤ 40 car. accepté. Maintenant : doit exister dans `terms_versions` et ne pas être retirée ; seul un super admin enregistre / retire (`manage_register_terms_version`, `manage_retire_terms_version`) ; une version publiée n'est jamais réécrite |
| Horodatages | **Vérifiable** | `now()` serveur |
| Âge | **Déclaration** | La case « j'atteste » n'est pas vérifiable. La base enregistre l'âge minimum **de la version** (`attested_min_age`, défini côté serveur), jamais une valeur du client |
| Prénom / nom | **Déclaration** | Seul le format est validé (longueur, caractères de contrôle). Aucune vérification d'identité |
| Consentement | **Déclaration + preuve de dépôt** | Case cochée + version + date serveur. Preuve du consentement, pas de la lecture ; ni IP ni user-agent conservés (choix RGPD à confirmer) |
| Métadonnées client (`user_metadata`, `options.data`) | **Jamais utilisées** | Garde-fou de test sur le code et sur le SQL ; test « hacker » avec `{role: super_admin, spaces:[staff]}` |
| Anti-robot | **Vérifiable seulement si configuré** | Le jeton est vérifié par Supabase Auth (réglage global, à activer par vous) ; l'application refuse l'ouverture sans CAPTCHA configuré, et `none` est interdit en Preview / Production |

**Risques résiduels**
1. Un utilisateur créé via « Add user » du tableau de bord Supabase n'a pas `invited_at` : il serait éligible au claim `members` (jamais `staff`). → Créer les comptes **uniquement par « Invite user »**, et attribuer l'accès avant que la personne ne se connecte.
2. Si « Allow new users to sign up » est activé, `POST /auth/v1/signup` (mot de passe) reste utilisable directement : un compte à mot de passe, e-mail confirmé, pourrait réclamer `members`. Équivalent en droits au parcours OTP, mais contraire à la politique « sans mot de passe ». → Activer la protection contre les mots de passe compromis, et prévoir un Auth Hook `before user created` (Sprint 02).
3. L'âge et les noms restent déclaratifs.

## 3. Audit SECURITY DEFINER / privilèges / RLS

**Projet partagé réel (lecture seule)** : 29 fonctions dans `public`, dont 28 SECURITY DEFINER ; **toutes** fixent `search_path` (vide, sauf `rls_auto_enable` : `pg_catalog`). 11 tables, **RLS activée partout**, `anon` sans aucun privilège, `authenticated` en `SELECT` seul (écritures via fonctions). 14 politiques : 12 `SELECT`, 2 `UPDATE` « sur soi » (`accounts`, `staff_profiles`). Fonctions internes (`is_staff_user`, `is_validator_user`, `handle_new_user`, `touch_updated_at`) non exécutables par `authenticated`.

**Constats de l'advisor Supabase**
| Constat | Analyse | Action |
|---|---|---|
| 0028 `rls_auto_enable()` exécutable par **anon** | Fonction d'événement installée par Supabase, laissée intacte par B0. Retourne `event_trigger` (appel REST sans effet), mais exposition injustifiée | Proposition `B4_2c_revoke_rls_auto_enable.sql` (non appliquée) — **à valider sur le projet de test d'abord** |
| 0029 25 fonctions SECURITY DEFINER exécutables par `authenticated` | **Intentionnel** : RPC métier (missions, `manage_*`, profil) et assistants de RLS (`has_space`, `is_super_admin`… doivent être exécutables pour évaluer les politiques). Chacune revérifie `auth.uid()` | Aucune (exceptions documentées) |
| Protection contre les mots de passe compromis désactivée | Sans objet en OTP seul, **pertinent** si l'inscription est ouverte (risque résiduel 2) | À activer avec l'ouverture |

**Chaîne complète sur Postgres local** (`tests/security-audit.test.mts`, deux jeux de privilèges par défaut Supabase) : toutes les fonctions fixent `search_path` ; aucune n'est exécutable par `anon`/`public` ; toute table a la RLS ; `authenticated` n'a aucun droit d'écriture sur table (colonnes B0 documentées seulement : `accounts.display_name`, `staff_profiles.email_pro/phone_pro`) ; aucune politique d'écriture hors les deux « sur soi » ; aucune politique ouverte ; un membre ne lit que ses lignes.

**Claim : idempotence, concurrence, suspension**
- Idempotent : second appel d'un membre actif → `already_member`, sans écriture (testé, y compris 3 appels simultanés).
- Concurrence : verrou `FOR UPDATE` sur la ligne du compte ⇒ sérialisation par compte ; la contrainte `PRIMARY KEY` de `member_accounts` est un second filet. **Limite honnête** : PGlite n'a qu'une connexion, la simultanéité réelle (deux connexions) est à valider sur le projet de test (Sprint 02, script de charge inclus dans la checklist).
- Suspension : `manage_set_account_active(false)` ⇒ plus d'accès `members` ni `staff` ; le claim répond `suspended` en boucle et ne réactive jamais ; la réactivation par le super admin restaure l'état exact (testé).

**Non-régression** (même fichier) : une batterie (indicateurs d'accès, comptages visibles par compte, `list_team`, profil, écritures, `manage_*`, `create_mission`) est exécutée pour un super admin, un admin STAFF, un membre STAFF, un membre existant (invité, avec profil) et un compte désactivé **avant puis après** l'application de toute la chaîne : résultats identiques. Le catalogue des fonctions et les politiques existantes sont comparés par empreinte : aucune modification. Le claim refuse membres existants, STAFF et super admin sans rien écrire.

## 4. Dérive dépôt / base
La migration `direct_staff_mission_assignment` (20261107123121) est appliquée sur le projet partagé mais absente du dépôt. Une **copie de référence** (export lecture seule) est ajoutée dans `supabase/preview/shared-db-drift/` (hors `supabase/migrations/`, jamais à réappliquer). Les migrations B0 du dépôt contiennent leurs commentaires, la base les versions dépouillées : les empreintes ne sont donc pas comparables, seule l'équivalence fonctionnelle l'est (vérifiée par `verify.sql`).

## 5. Ce qui n'a PAS été fait (volontairement)
Aucune migration, aucun réglage Auth/SMTP/CAPTCHA, aucun secret, aucune activation de `PARTICIPANT_SIGNUP`, aucun déploiement, aucun merge.
