# SKYLINE APP — règles communes (ChatGPT, Claude Code, toute personne)

GitHub (`grawzer-art/skyline-app`) est la **source de vérité**. Aucun agent ne communique directement avec un autre : tout passe par ce dépôt (docs/, Issues, Pull Requests).

## Organisation
- **GRAW** : direction artistique, vision produit, validations importantes (voir `docs/APPROVALS.md`).
- **ChatGPT** : pilotage technique, coordination, contrôle qualité, analyse des résultats.
- **Claude Code** : développement, tests, corrections, déploiements Preview, documentation.

## Reprendre le travail (obligatoire, dans cet ordre)
1. `docs/HANDOFF.md` (dernier état transmis) → 2. `docs/PROJECT_STATUS.md` → 3. `docs/ROADMAP.md` → 4. Issues et PR ouvertes.
En fin de session : mettre à jour `HANDOFF.md` et `PROJECT_STATUS.md` dans le même commit que le travail.

## Règles non négociables
- **Jamais de secret** (clé `service_role`, SMTP, Turnstile secret, tokens) dans le code, les commits, les logs, les issues ou le navigateur. Seules les clés *publiques* (`NEXT_PUBLIC_*`, clé publishable) sont tolérées côté client.
- **Ne jamais modifier** sans validation explicite (`docs/APPROVALS.md`) : `main`, la base Supabase de production `nyneujukydxjvbwcoste`, STAFF HQ, les déploiements et variables de production.
- **Migrations** : proposées dans `supabase/proposals/` avec retour arrière dans `supabase/rollback/` et tests locaux (PGlite) ; appliquées d'abord et uniquement sur SKYLINE-TEST `tbjzzrlidtkclvhwudhb` ; vérifier l'identifiant du projet avant toute écriture.
- **RLS, confidentialité, consentement** (`club-annuaire-1`) : toute modification de ces règles exige une validation. Le statut « voyageur vérifié » ne s'attribue jamais depuis l'application ni automatiquement.
- **Aucune donnée fictive présentée comme réelle** ; états vides honnêtes (« à confirmer »).
- **Protections d'inscription** (CAPTCHA, CGU, majorité, limites d'envoi) : jamais désactivées pour faciliter un test.
- Ne jamais contourner un mécanisme d'approbation imposé par un outil.

## Qualité avant tout push
`npx tsc --noEmit`, `npm run lint`, `npm run test:rls`, `bash tests/run-participant.sh`, `next build`. La CI GitHub (`.github/workflows/ci.yml`) rejoue ces contrôles.

## Branches et conflits
- Une branche par sujet (`feat/…`, `fix/…`, `chore/…`) ; PR vers la branche de développement courante, jamais directement vers `main`.
- Avant de travailler : `git fetch` puis lire `HANDOFF.md`. Un seul agent à la fois par branche (indiquer « en cours » dans `HANDOFF.md`).
- Messages de commit en français, sans identifiant de modèle.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
