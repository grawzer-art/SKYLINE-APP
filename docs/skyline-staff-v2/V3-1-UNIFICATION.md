# Sprint V3.1 — unification et fiabilisation

SKYLINE V3 (`/v3`) est l'application participants de référence.

## Navigation
Quatre onglets, source unique `src/components/layout/nav-items.ts` : HOME `/v3` (actif seulement sur l'accueil exact), MY FLIGHT, EXPLORE, CLUB.
Anciennes adresses → redirections uniques (table `legacyRedirects`, testée sans chaîne ni boucle) : `/flight`, `/pass` → `/v3/flight` ; `/explore` → `/v3/explore` ; `/club`, `/crew` → `/v3/club` ; `/more` → `/v3` ; `/v3/explore/radio/*` → `/v3/explore/sound`.
« / » est traitée par `src/proxy.ts` : choix de l'espace (`/start`) puis STAFF mémorisé (`/staff`) inchangés, sinon `/v3` (requête conservée). `/v3/*`, `/auth/*`, `/staff/*`, `/signal/*`, `/start` ne sont jamais redirigés.

## Ce qui est « vrai » (src/lib/experience)
`resolveExperience` est l'unique source. Surfaces : **account** (authentification active : données du serveur), **open** (authentification désactivée : application sans comptes), **review** (revue locale), **loading**.
- Réservation « vérifiée » : uniquement la preuve du serveur (`get_my_traveler_status`). Un état local (phase, réservation, voyage, consentements) est ignoré hors revue.
- Phase : « avant » tant que `eventConfirmation.dates` est faux. Aucun compte à rebours sur une date non confirmée (« Dates à confirmer »).
- Pass : « Réservation à confirmer » / « Réservation vérifiée » (preuve serveur). **Aucun QR dans aucun état** : il exigera un jeton signé côté serveur, pas encore émis.

## Mode revue interne (prototype complet) — LOCAL UNIQUEMENT
Conditions cumulatives vérifiées côté serveur : `SKYLINE_REVIEW_MODE=on`, aucune variable `VERCEL` / `VERCEL_ENV`, requête vers `localhost` / `127.0.0.1` / `[::1]` (un `x-forwarded-host` public est refusé). Impossible sur Preview comme sur Production, même avec la variable. Il active : pastille de phase, feuille « Simuler », données de démonstration, plan des écrans et wireframes (404 sinon). Lancer : `SKYLINE_REVIEW_MODE=on npx next start -p 3100`.

## Tests
`npm run test:unit` (experience, navigation) · `bash tests/run-participant.sh` (inclut `e2e-v31.cjs` : redirections, navigation, anonyme, membre sans réservation, voyageur vérifié simulé par le faux serveur, revue locale/Preview/Production) · `bash tests/run-review.sh` (suites du prototype en mode revue).
