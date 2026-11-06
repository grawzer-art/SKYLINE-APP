#!/usr/bin/env bash
# E2E du mode « base de données » : construit une copie de l'application avec STAFF_AUTH_MODE=supabase + STAFF_DATA_SOURCE=db, branchée sur un FAUX serveur
# Supabase local (tests/mock-supabase.cjs, port 3199). Aucun vrai projet n'est contacté, aucune écriture réelle. Application sur le port 3103.
set -euo pipefail
export NEXT_DIST_DIR=.next-db STAFF_AUTH_MODE=supabase STAFF_DATA_SOURCE=db NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3199 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_test_key
rm -rf .next-db && npx next build >/tmp/build-db.log 2>&1 || { tail -20 /tmp/build-db.log; exit 1; }
fuser -k 3199/tcp 3103/tcp >/dev/null 2>&1 || true
(nohup node tests/mock-supabase.cjs >/tmp/mock-supabase.log 2>&1 &)
(nohup npx next start -p 3103 >/tmp/next-db.log 2>&1 &) ; sleep 6
set +e
BASE_DB=http://localhost:3103 MOCK=http://127.0.0.1:3199 node tests/e2e-db.cjs; code=$?
fuser -k 3199/tcp 3103/tcp >/dev/null 2>&1 || true
exit $code
