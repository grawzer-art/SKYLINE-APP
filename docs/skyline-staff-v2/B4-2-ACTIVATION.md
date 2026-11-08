# B4.2 — Inscription publique autonome : préparation et activation

**État par défaut : FERMÉE.** `PARTICIPANT_SIGNUP` absente ou `off` ⇒ `/v3/signup` et `/v3/signup/complete` répondent 404, aucun lien « Créer un compte », la connexion STAFF et la connexion participants ne créent jamais de compte (`shouldCreateUser: false`).

## État réel vérifié (lecture seule, projet partagé `nyneujukydxjvbwcoste`, 8 nov. 2026)
Migrations : `b0_accounts_access`, `b0_missions`, `b0_rls_policies`, `direct_staff_mission_assignment`, **`b4_1_participant_profiles` (20261107161509)**. Tables : `participant_profiles` présente ; `club_profiles`, bucket `club-avatars`, `member_accounts`, `traveler_reservations` **absents**. 4 comptes (dont 1 membre). Déclencheur `on_auth_user_created` présent. **B4.1 n'est pas réappliquée.**

## Migrations proposées (NON appliquées) — `supabase/proposals/`
| Fichier | Contenu | Prérequis |
|---|---|---|
| `B4_2_member_signup.sql` | `member_accounts`, `traveler_reservations`, `claim_member_account`, `is_verified_traveler`, `get_my_traveler_status` | B0 + B4.1 (déjà en base) |
| `B4_3_club_profiles.sql` | profil CLUB + bucket privé (B4.3) | B0 — **pas encore appliquée** |
| `B4_2b_club_traveler_gate.sql` | réserve publication / annuaire CLUB aux voyageurs vérifiés (4 `create or replace`) | B4.2 **et** B4.3 appliquées |

Ordre : **B4.2 → (B4.3 → B4.2b)**. B4.2 seule suffit pour l'inscription ; B4.3/B4.2b ne sont nécessaires que pour le CLUB. Tester d'abord sur une **branche Supabase / projet de Preview**, pas sur le projet partagé avec STAFF.

## Variables d'environnement (Preview uniquement, jamais Production avant validation)
`PARTICIPANT_AUTH=supabase` · `PARTICIPANT_SIGNUP=on` · `PARTICIPANT_TERMS_VERSION` · `PARTICIPANT_TERMS_URL` · `PARTICIPANT_CHARTER_URL` (facultative) · `PARTICIPANT_MIN_AGE` (18) · `PARTICIPANT_CAPTCHA_PROVIDER=turnstile|hcaptcha` · `PARTICIPANT_CAPTCHA_SITE_KEY` (publique). Une configuration incomplète affiche une erreur 503 explicite (jamais d'ouverture silencieuse). Les **textes** CGU / charte ne sont pas dans le code : seules leur version et leur adresse sont configurées ; la version est enregistrée à l'inscription (`member_accounts.terms_version`).

## Réglages Supabase Auth (À FAIRE PAR VOUS — non modifiés)
Sur le projet de Preview d'abord :
1. **Allow new users to sign up** : activé (nécessaire à `shouldCreateUser: true`). Réglage GLOBAL du projet : sur le projet partagé, il concerne aussi STAFF — d'où le projet/branche de Preview.
2. **Confirm email** : activé (le claim exige `email_confirmed_at`).
3. **CAPTCHA protection** : activer, fournisseur + **clé secrète** saisie dans Supabase (jamais dans le dépôt ni Vercel public). Sans cela le jeton envoyé n'est pas vérifié.
4. **SMTP personnalisé** (le service e-mail intégré est limité à quelques messages par heure) ; expéditeur et domaine authentifiés (SPF/DKIM).
5. **Limites de débit** : e-mails/h, vérifications OTP par IP, durée de validité de l'OTP (≤ 10 min recommandé), longueur du code.
6. **Modèle d'e-mail « Magic Link / OTP »** : inclure `{{ .Token }}` (code) et le lien ; les URL de retour restent `…/auth/callback` (inchangées).

## Vérifications en Preview
Inscription complète par code ; lien magique → `/v3/signup/complete` ; profil et statut « Compte membre · réservation non vérifiée » ; pass « à confirmer » sans QR ; CLUB : profil privé, publication refusée sans réservation vérifiée ; `/staff` inaccessible ; connexion STAFF sans création de compte ; suspension (`manage_set_account_active(.., false)`) non réactivable par l'inscription.

## Retour arrière
Mettre `PARTICIPANT_SIGNUP=off` (effet immédiat à la requête suivante) et désactiver « Allow new users to sign up ». Les tables B4.2 sont additives : aucune suppression nécessaire.

## Hors B4.2
Liaison réservation → compte (fonctions STAFF écrivant `traveler_reservations`), QR/pass délivrés, suppression/export RGPD, modération des noms affichés, messagerie CLUB.
