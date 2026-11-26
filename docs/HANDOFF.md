# HANDOFF — transmission entre agents

## Dernier état (2026-11-26, Claude Code)
- Branche de coordination : `chore/agent-coordination` (docs + CI + modèles), issue de `feat/b4-4-club-consent` (`2033090`). Rien de poussé sur `main`.
- Le clone local de l'agent a été réinitialisé sur `main` : toujours repartir de `origin/<branche>`.
- Accès de l'agent : Supabase TEST (SQL/migrations/logs via MCP) ; `gh` REST de dépôt ; **aucun** accès Vercel, Brevo, Cloudflare, API Actions, GraphQL.
- Supabase TEST était « possibly not accessible » à plusieurs appels le 2026-11-26 : revérifier avant toute écriture.

## Prochaines actions
1. (ChatGPT/GRAW) Vérifier et renseigner dans `INFRASTRUCTURE.md` : SMTP Brevo de TEST, modèles d'e-mail avec `{{ .Token }}`, URL de redirection Auth, Turnstile, variables Vercel de la branche, projet utilisé par STAFF HQ.
2. (GRAW) Enregistrer la version CGU sur TEST (une ligne SQL, voir `PROJECT_STATUS.md`).
3. (Claude) Quand 1 et 2 sont faits : activer `PARTICIPANT_SIGNUP` sur la Preview de la branche, valider les parcours réels (phase 3), préparer le dossier de production.
4. (Claude) Compléter la CI (rapports, préparation de versions) ; ouvrir les Issues de suivi.

## Dette connue (STAFF, non touchée par l'agent)
`tests/missions.test.mts` échoue sur `main` comme sur la branche : il décrit l'ancien flux « proposition d'attribution » alors que `src/domain/missions.ts` (commit `0cdaf39`, 2026-11-07) permet l'attribution directe. Décision STAFF à confirmer (mettre le test à jour **ou** rétablir le flux) ; la CI l'exécute en étape non bloquante pour que l'écart reste visible.

## Verrou
Aucun agent n'a de travail « en cours » sur une branche à cet instant.
