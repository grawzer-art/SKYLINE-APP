# INFRASTRUCTURE — cartographie des services (sans secrets)

Dernière vérification : 2026-11-26 par Claude Code. « Non vérifié » = aucun accès depuis l'environnement de l'agent (à confirmer par GRAW ou ChatGPT).

| Service | Identifiant / cible | Rôle | État vérifié |
|---|---|---|---|
| GitHub | `grawzer-art/skyline-app` (public) | Source de vérité, PR, Issues | Accès REST de dépôt OK ; API Actions et GraphQL bloquées ; `main` non protégée ; pas de workflow avant `.github/workflows/ci.yml` |
| Vercel | projets `skyline-app` et `skyline-ap` (équipe `jarvis-1348`) | Hébergement ; une Preview par push, dans **les deux** projets | Constructions réussies sur les derniers pushs ; **variables Preview, portée par branche, projet STAFF HQ : non vérifiés** |
| Supabase production | `nyneujukydxjvbwcoste` (SKYLINE-APP) | Base partagée STAFF HQ / production | **Jamais modifiée par les agents** |
| Supabase TEST | `tbjzzrlidtkclvhwudhb` (SKYLINE-TEST, eu-west-1) | Seule base autorisée pour migrations et essais | Migrations B0, B4.1, B4.2, B4.3, B4.2b, B4.2c, B4.5 enregistrées ; B4.4 appliquée à la main (SQL Editor) ; voir `PROJECT_STATUS.md` |
| Domaine | `skyline-event.fr` (OVH) | Domaine public | Non vérifié (DNS, SPF/DKIM/DMARC pour l'envoi d'e-mails) |
| Brevo | e-mails transactionnels (SMTP) | Envoi des codes OTP | **Non vérifié** : configuration SMTP de TEST illisible depuis l'agent |
| Cloudflare Turnstile | site `skyline-test` à créer/vérifier | CAPTCHA d'inscription | **Non vérifié** ; secret à saisir uniquement dans Supabase (Authentication → Attack Protection) |

## Variables d'application (noms uniquement)
`PARTICIPANT_AUTH`, `PARTICIPANT_SIGNUP`, `PARTICIPANT_TERMS_VERSION`, `PARTICIPANT_TERMS_URL`, `PARTICIPANT_MIN_AGE`, `PARTICIPANT_CAPTCHA_PROVIDER`, `PARTICIPANT_CAPTCHA_SITE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `STAFF_AUTH_MODE`, `STAFF_DATA_SOURCE`, `SKYLINE_REVIEW_MODE`, `SKYLINE_DEMO_BUILD`. Valeurs : dans Vercel, jamais dans le dépôt. Les variables du Preview de test doivent être limitées à la branche de test (jamais « All Preview Branches »).

## Règles d'isolation
- L'inscription publique exige CAPTCHA réel (`none` est refusé sur tout déploiement Vercel par `src/lib/participant/signupConfig.ts`).
- Une Preview qui pointe vers TEST ne doit pas servir à STAFF HQ.
- Les secrets (SMTP Brevo, secret Turnstile, `service_role`) ne sont saisis que dans les consoles des services concernés.
