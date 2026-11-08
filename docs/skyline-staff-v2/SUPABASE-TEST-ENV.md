# Environnement Supabase de TEST isolé — stratégie

**Principe : jamais d'essai d'inscription publique, de CAPTCHA, de SMTP ou de migration B4.x sur le projet partagé `nyneujukydxjvbwcoste`** (il porte STAFF HQ en usage réel). Tout est rejoué sur un projet dédié, reconstruit depuis le dépôt. **Aucun secret dans Git** : les clés vivent dans Supabase (secrets du projet) et dans Vercel (variables Preview), jamais dans un fichier versionné.

## 1. Choix de l'isolation
| Option | Avantages | Limites | Décision |
|---|---|---|---|
| **A. Projet Supabase séparé « skyline-test »** (recommandé) | Isolation totale (Auth, SMTP, CAPTCHA, utilisateurs, stockage) ; réglages Auth indépendants ; destruction possible | Un projet de plus (gratuit ou minimal) ; à reconstruire par la chaîne | **Retenu** |
| B. Supabase Branching | Branche éphémère par PR | Offre payante ; les réglages Auth globaux et l'historique de migrations réel (dérive) compliquent la reproductibilité ; migrations de `supabase/migrations/` seulement (les B4.x sont des propositions) | Écarté pour l'instant |
| C. Base locale Docker (`supabase start`) | Gratuit, rapide | N'exerce ni le SMTP réel, ni le CAPTCHA, ni les URL de redirection | Complément (développeurs), pas suffisant |

## 2. Schéma et migrations — chaîne reproductible
`supabase/preview/manifest.json` liste **dans l'ordre** les 9 étapes avec empreinte SHA-256 et l'état du projet partagé :
1. B0 (3 fichiers) — appliqué au partagé · 2. `shared-db-drift/…direct_staff_mission_assignment` (export de ce qui est en base mais absent du dépôt) — appliqué · 3. B4.1 — appliqué · 4. **B4.2**, B4.3, B4.2b, B4.2c — **non appliqués au partagé**.

Garde-fous automatiques : `tests/preview-manifest.test.mts` (empreintes à jour, chaîne appliquée sur un Postgres vierge, `verify.sql` tout vert) et `tests/security-audit.test.mts`. Après toute modification d'un SQL : `npm run preview:manifest`.

Application sur le projet de test (après votre autorisation) : SQL Editor ou `apply_migration`, **étape par étape dans l'ordre**, puis coller `supabase/preview/verify.sql` : chaque ligne doit afficher `ok = true`. Enregistrer ensuite la version de CGU (`select public.manage_register_terms_version('<version>', 18)` en tant que super admin).

Comptes de test : créer 1 super admin, 1 admin STAFF, 1 membre STAFF, 1 membre invité, **uniquement via « Invite user »**, puis leur donner leurs accès via `manage_set_*` / SQL Editor. Aucune donnée du projet partagé n'est copiée (pas de vraies adresses).

## 3. Configuration Auth du projet de test (à faire par vous)
- **Allow new users to sign up** : ON (test seulement). **Confirm email** : ON.
- **Site URL** : l'URL Preview stable. **Redirect URLs** : liste explicite `https://<preview-stable>/auth/callback` ; pour les URL Preview éphémères de Vercel, un motif restreint à votre équipe (`https://*-<équipe>.vercel.app/auth/callback`) — jamais `**` ni Production.
- **OTP** : longueur 6, expiration ≤ 600 s. **Limites de débit** : abaisser e-mails/h, vérifications OTP/IP.
- **Protection contre les mots de passe compromis** : ON (l'API `/signup` par mot de passe ne peut pas être fermée séparément). Piste : Auth Hook `before user created` (Sprint 02).
- **CAPTCHA** : fournisseur Turnstile (ou hCaptcha) ; **clé secrète saisie dans Supabase** ; clés de test publiques de Cloudflare (`1x00000000000000000000AA` passe toujours) pour la CI, clés réelles pour la Preview.
- **SMTP personnalisé** : fournisseur transactionnel (domaine expéditeur authentifié SPF/DKIM/DMARC) ; boîte de réception de test (alias ou service de capture type Mailpit/Mailosaur) ; modèle OTP contenant `{{ .Token }}` ; adresses d'expédition distinctes du Production.

## 4. Variables Vercel (portée **Preview uniquement**, restreintes à la branche de test)
`NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (projet **de test**, clé *publishable* — jamais `service_role`), `STAFF_AUTH_MODE=supabase`, `STAFF_DATA_SOURCE=db` si on teste STAFF, `PARTICIPANT_AUTH=supabase`, `PARTICIPANT_SIGNUP=on`, `PARTICIPANT_TERMS_VERSION`, `PARTICIPANT_TERMS_URL`, `PARTICIPANT_CHARTER_URL`, `PARTICIPANT_MIN_AGE`, `PARTICIPANT_CAPTCHA_PROVIDER=turnstile|hcaptcha`, `PARTICIPANT_CAPTCHA_SITE_KEY` (publique). **Production : aucune de ces variables n'est modifiée.** Les variables d'environnement ne s'appliquent qu'aux **nouveaux** déploiements : redéployer après modification. `PARTICIPANT_CAPTCHA_PROVIDER=none` est refusé par l'application en Preview comme en Production.

## 5. Tests sur le projet de test
Parcours E2E réels (boîte de capture) : inscription, lien magique → finalisation, connexion STAFF, suspension. **Test de concurrence du claim** : lancer simultanément N appels REST `claim_member_account` avec le même jeton (script `curl`/`xargs -P`) ⇒ exactement un `created`, les autres `already_member`. Contrôle `verify.sql`, advisors de sécurité sans nouveau constat, journaux Auth.

## 6. Retour arrière
- **Application** : `PARTICIPANT_SIGNUP=off` (effet à la requête suivante) puis redéploiement ; Production inchangée par construction.
- **Auth** : désactiver « Allow new users to sign up », retirer la clé CAPTCHA.
- **Base de test** : projet jetable — le détruire et le reconstruire par la chaîne. Les migrations B4.x sont additives : leur retrait ne touche aucune table B0 (`drop function … ; drop table member_accounts, traveler_reservations, terms_versions, club_profiles …` en ordre inverse, jamais sur le projet partagé sans autorisation).
- **Si une migration devait un jour être appliquée au partagé** : sauvegarde (PITR / dump) préalable, application hors heures d'usage STAFF, `verify.sql` immédiat, plan de retour inverse rédigé avant.

## 7. Critères de sortie du projet de test
Chaîne appliquée, `verify.sql` vert, advisors sans régression, E2E réels verts, concurrence du claim validée, boîte de réception reçue < 1 min, retour arrière répété une fois.
