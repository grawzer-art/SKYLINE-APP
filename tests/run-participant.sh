#!/usr/bin/env bash
# E2E des comptes participants (B4.1) : construit l'application avec STAFF + Supabase branchés sur un FAUX serveur Supabase local (tests/mock-supabase.cjs, port 3199).
# Trois serveurs issus de la MÊME construction : A (PARTICIPANT_AUTH=supabase, 3105), B (désactivée, 3106), C (valeur invalide, 3107). Aucun vrai projet n'est contacté.
set -euo pipefail
export NEXT_DIST_DIR=.next-part STAFF_AUTH_MODE=supabase STAFF_DATA_SOURCE=db NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3199 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_test_key
unset PARTICIPANT_AUTH
rm -rf .next-part && npx next build >/tmp/build-part.log 2>&1 || { tail -20 /tmp/build-part.log; exit 1; }
for p in 3199 3105 3106 3107 3108 3109 3110; do fuser -k $p/tcp >/dev/null 2>&1 || true; done
(nohup node tests/mock-supabase.cjs >/tmp/mock-supabase.log 2>&1 &)
(PARTICIPANT_AUTH=supabase nohup npx next start -p 3105 >/tmp/next-part-a.log 2>&1 &)
(nohup npx next start -p 3106 >/tmp/next-part-off.log 2>&1 &)
(PARTICIPANT_AUTH=bogus nohup npx next start -p 3107 >/tmp/next-part-bad.log 2>&1 &)
SIGNUP_ENV="PARTICIPANT_AUTH=supabase PARTICIPANT_SIGNUP=on PARTICIPANT_TERMS_VERSION=cgu-test-1 PARTICIPANT_TERMS_URL=/legal/cgu"
(env $SIGNUP_ENV PARTICIPANT_CAPTCHA_PROVIDER=none nohup npx next start -p 3108 >/tmp/next-part-signup.log 2>&1 &)
(env $SIGNUP_ENV nohup npx next start -p 3109 >/tmp/next-part-signup-bad.log 2>&1 &)
(env $SIGNUP_ENV PARTICIPANT_CAPTCHA_PROVIDER=turnstile PARTICIPANT_CAPTCHA_SITE_KEY=test_site_key_0001 nohup npx next start -p 3110 >/tmp/next-part-signup-cap.log 2>&1 &)
sleep 8
set +e
PART_A=http://localhost:3105 PART_OFF=http://localhost:3106 PART_BAD=http://localhost:3107 MOCK=http://127.0.0.1:3199 node tests/e2e-participant.cjs; code=$?
if [ "${SKIP_CLUB:-0}" != 1 ]; then PART_A=http://localhost:3105 PART_OFF=http://localhost:3106 MOCK=http://127.0.0.1:3199 node tests/e2e-club.cjs || code=$?; fi
if [ "${SKIP_CLUB:-0}" != 1 ]; then PART_A=http://localhost:3105 SIGNUP_ON=http://localhost:3108 SIGNUP_BAD=http://localhost:3109 SIGNUP_CAP=http://localhost:3110 MOCK=http://127.0.0.1:3199 node tests/e2e-signup.cjs || code=$?; fi
for p in 3199 3105 3106 3107 3108 3109 3110; do fuser -k $p/tcp >/dev/null 2>&1 || true; done
exit $code
