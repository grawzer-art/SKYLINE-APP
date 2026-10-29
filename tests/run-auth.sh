#!/usr/bin/env bash
# Construit une SECONDE copie de l'application en mode Supabase (URL factice, clé factice) et lance tests/e2e-auth.cjs.
# Prérequis : le serveur de démonstration tourne déjà sur le port 3100 (npx next start -p 3100).
set -euo pipefail
export NEXT_DIST_DIR=.next-supa STAFF_AUTH_MODE=supabase NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_test_key
rm -rf .next-supa && npx next build >/tmp/build-supa.log 2>&1 || { tail -20 /tmp/build-supa.log; exit 1; }
fuser -k 3102/tcp >/dev/null 2>&1 || true
(nohup npx next start -p 3102 >/tmp/next-supa.log 2>&1 &) ; sleep 5
unset NEXT_DIST_DIR STAFF_AUTH_MODE NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
BASE_SUPA=http://localhost:3102 node tests/e2e-auth.cjs; code=$?
fuser -k 3102/tcp >/dev/null 2>&1 || true
exit $code
