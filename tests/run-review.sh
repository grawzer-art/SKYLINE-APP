#!/usr/bin/env bash
# Suites E2E du PROTOTYPE (mode revue LOCAL) : construit l'application SANS Supabase puis la sert sur le port 3100 avec SKYLINE_REVIEW_MODE=on.
# Le mode revue n'existe qu'ici : hors Vercel, adresse localhost, sans relais. Il est impossible en prévisualisation / production (voir src/lib/experience/reviewMode.ts).
set -uo pipefail
unset NEXT_DIST_DIR STAFF_AUTH_MODE STAFF_DATA_SOURCE NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY PARTICIPANT_AUTH PARTICIPANT_SIGNUP VERCEL VERCEL_ENV
rm -rf .next && npx next build >/tmp/build-review.log 2>&1 || { tail -20 /tmp/build-review.log; exit 1; }
fuser -k 3100/tcp >/dev/null 2>&1 || true
(SKYLINE_REVIEW_MODE=on nohup npx next start -p 3100 >/tmp/next-review.log 2>&1 &)
sleep 6; code=0
for s in ${SUITES:-e2e-v3 e2e-v32 e2e-sound e2e-pass e2e-staff e2e-missions}; do node tests/$s.cjs > /tmp/$s.log 2>&1 || code=$?; echo "$s exit=$? pass=$(grep -c '^PASS' /tmp/$s.log) fail=$(grep -c '^FAIL' /tmp/$s.log)"; done
fuser -k 3100/tcp >/dev/null 2>&1 || true
exit $code
