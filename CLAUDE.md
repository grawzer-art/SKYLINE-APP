# CLAUDE.md — instructions spécifiques à Claude Code

Lire d'abord `AGENTS.md` (règles communes), puis `docs/HANDOFF.md`.

## Environnement cloud
- Le clone local peut être **réinitialisé** (retour sur `main`) : la vérité est sur GitHub. Récupérer la branche de travail avec `git fetch` puis `git checkout -b <branche> origin/<branche>`.
- Pas d'accès réseau à Vercel, Brevo, Cloudflare, ni à l'API de gestion Supabase. Accès disponibles : Supabase (outils MCP : SQL, migrations, logs, conseillers) et `gh` limité à l'API REST de dépôt (pas de GraphQL, pas d'API Actions).
- `mcp__Supabase__apply_migration` exige une approbation dans l'interface ; sans elle l'appel expire sans rien écrire. Ne jamais contourner : demander l'application manuelle dans le SQL Editor de SKYLINE-TEST.
- Le build Next.js peut afficher une recommandation de mise à jour de sécurité : appliquer la dernière version corrigée compatible, rejouer les tests.

## Habitudes
- Tests E2E : `bash tests/run-participant.sh` (simulateur Supabase local `tests/mock-supabase.cjs`, aucun vrai projet). Le build modifie `tsconfig.json` : `git checkout tsconfig.json` avant de committer.
- Contrôles de base : `supabase/test-env/` (precheck/postcheck, auto-tests annulés `live_*_rolled_back.sql`). Les empreintes ignorent les retours chariot.
- Ne jamais pousser sur une branche sans que ce soit dans le périmètre autorisé (`docs/APPROVALS.md`). Rapports : une seule synthèse concise par session, mise à jour de `HANDOFF.md`.
