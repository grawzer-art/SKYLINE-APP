#!/usr/bin/env bash
# E2E de la VALIDATION DE CONFIGURATION (aucun repli silencieux). Utilise la construction par défaut (.next) : les variables STAFF_* sont lues à l'exécution.
# Quatre serveurs : A (db sans auth Supabase), B (auth Supabase sans URL/clé), C (valeur inconnue), D (local explicite). Aucun accès réseau externe.
set -uo pipefail
for p in 3111 3112 3113 3114; do fuser -k $p/tcp >/dev/null 2>&1 || true; done
unset STAFF_AUTH_MODE STAFF_DATA_SOURCE NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
(STAFF_DATA_SOURCE=db nohup npx next start -p 3111 >/tmp/cfg-a.log 2>&1 &)
(STAFF_AUTH_MODE=supabase nohup npx next start -p 3112 >/tmp/cfg-b.log 2>&1 &)
(STAFF_DATA_SOURCE=database nohup npx next start -p 3113 >/tmp/cfg-c.log 2>&1 &)
(STAFF_DATA_SOURCE=local nohup npx next start -p 3114 >/tmp/cfg-d.log 2>&1 &)
sleep 7
CFG_A=http://localhost:3111 CFG_B=http://localhost:3112 CFG_C=http://localhost:3113 CFG_D=http://localhost:3114 node tests/e2e-config.cjs; code=$?
for p in 3111 3112 3113 3114; do fuser -k $p/tcp >/dev/null 2>&1 || true; done
exit $code
