#!/usr/bin/env bash
# Suites E2E du PROTOTYPE (mode revue LOCAL) : construit l'application SANS Supabase puis la sert sur le port 3100 avec SKYLINE_REVIEW_MODE=on.
# Le mode revue n'existe qu'ici : hors Vercel, adresse localhost, sans relais. Il est impossible en prévisualisation / production (voir src/lib/experience/reviewMode.ts).
set -uo pipefail
unset NEXT_DIST_DIR STAFF_AUTH_MODE STAFF_DATA_SOURCE NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY PARTICIPANT_AUTH PARTICIPANT_SIGNUP VERCEL VERCEL_ENV
# Les contenus de démonstration (Signaux fictifs, outils SOUND) sont décidés AU BUILD (pages prérendues) : la construction de revue doit porter SKYLINE_REVIEW_MODE=on.
rm -rf .next && SKYLINE_REVIEW_MODE=on npx next build >/tmp/build-review.log 2>&1 || { tail -20 /tmp/build-review.log; exit 1; }
for i in 1 2 3; do fuser -k 3100/tcp >/dev/null 2>&1 || true; sleep 1; done
(SKYLINE_REVIEW_MODE=on nohup npx next start -p 3100 >/tmp/next-review.log 2>&1 &)
# Hébergeur simulé (démo STAFF réservée au local) : Production, Preview + DEMO_AUTH=on, VERCEL seul + DEMO_AUTH=on.
for p in 3101 3102 3103; do fuser -k $p/tcp >/dev/null 2>&1 || true; done
(VERCEL_ENV=production nohup npx next start -p 3101 >/tmp/next-host-prod.log 2>&1 &)
(VERCEL_ENV=preview DEMO_AUTH=on nohup npx next start -p 3102 >/tmp/next-host-prev.log 2>&1 &)
(VERCEL=1 DEMO_AUTH=on nohup npx next start -p 3103 >/tmp/next-host-vercel.log 2>&1 &)
until curl -s -o /dev/null localhost:3100/api/review-mode; do sleep 1; done; code=0
for s in ${SUITES:-e2e-v3 e2e-v32 e2e-sound e2e-pass e2e-staff e2e-missions}; do BASE_PROD=http://localhost:3101 BASE_PREVIEW=http://localhost:3102 BASE_VERCEL=http://localhost:3103 node tests/$s.cjs > /tmp/$s.log 2>&1; rc=$?; [ $rc -ne 0 ] && code=$rc; echo "$s exit=$rc pass=$(grep -c '^PASS' /tmp/$s.log) fail=$(grep -c '^FAIL' /tmp/$s.log)"; done
for p in 3100 3101 3102 3103; do fuser -k $p/tcp >/dev/null 2>&1 || true; done
exit $code
