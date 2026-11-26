# PROJECT_STATUS — état réel du projet

Mis à jour : 2026-11-26 · branche de développement : `feat/b4-4-club-consent` (dernier commit applicatif `2033090`) · `main` = `59284cd` (inchangée).

## Opérationnel et prouvé par des tests
- Navigation HOME / MY FLIGHT / EXPLORE / CLUB (états vides honnêtes, aucune donnée inventée).
- Connexion par code e-mail (sans mot de passe), session, déconnexion — sur simulateur local (490 contrôles E2E, 0 échec).
- Inscription autonome (code OTP, CGU, attestation de majorité, CAPTCHA) — sur simulateur ; **désactivée tant que la configuration externe n'est pas complète**.
- Profil CLUB créé automatiquement et **privé** (B4.5), modifiable, photo (stockage privé, URL signées), persistance.
- Consentement explicite `club-annuaire-1` + trace (B4.4) ; retrait toujours possible ; annuaire réservé aux voyageurs vérifiés ayant publié (réciprocité).
- Preuves sur **SKYLINE-TEST réel** (transactions annulées) : 22/22 isolation (`live_selftest_rolled_back.sql`), 14/14 inscription (`live_signup_selftest_rolled_back.sql`), postcheck B4.4 15/15.
- Sécurité : Next.js 16.4.6 (faille 16.3.0–16.4.4 corrigée) ; typage 0 erreur, lint 0 erreur.

## Non fonctionnel ou bloqué (action externe requise)
| Blocage | Qui | Détail |
|---|---|---|
| SMTP Brevo sur TEST non vérifié | GRAW/ChatGPT | Sans SMTP personnalisé, seuls les membres de l'organisation Supabase reçoivent un code |
| Modèles d'e-mail (`{{ .Token }}`) non vérifiés | GRAW/ChatGPT | « Confirm signup » et « Magic Link » |
| Turnstile : site, clé publique, secret Supabase | GRAW | Secret jamais hors Supabase |
| CGU : version `cgu-test-1` absente de TEST (0 version) | à appliquer | `insert into public.terms_versions (version, min_age) values ('cgu-test-1', 18);` |
| Variables Vercel de la branche (inscription) | GRAW/ChatGPT | Voir `INFRASTRUCTURE.md` ; redéploiement requis |
| Accès Supabase TEST intermittent | — | « Database is possibly not accessible » observé le 2026-11-26 ; à revérifier |
| `apply_migration` expire sans approbation UI | GRAW | Ne rien contourner ; application manuelle possible |

## Hors périmètre actuel
Production (migrations B4.x non appliquées sur `nyneujukydxjvbwcoste`), STAFF HQ, SKYLINE CONTROL, V3.2 étape 3 (EXPLORE, avatar, compte), droits des archives photo et de la playlist SoundCloud, voyageur vérifié réel (attribution manuelle côté base uniquement).
