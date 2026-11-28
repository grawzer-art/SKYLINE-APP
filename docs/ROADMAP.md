# ROADMAP

Phases décidées par GRAW (2026-11-24). Une phase n'est « terminée » qu'avec preuve de test.

1. **Audit de l'existant** — fait (voir `INFRASTRUCTURE.md`, `PROJECT_STATUS.md`).
2. **SMTP, CAPTCHA, authentification, inscription publique** — code prêt ; reste la configuration externe (Brevo, Turnstile, CGU, variables Vercel).
3. **Validation réelle des parcours CLUB / MEMBRES** sur Preview TEST avec comptes réels, puis dossier de mise en production (`APPROVALS.md`).
4. **Automatisation GitHub** — CI (`.github/workflows/ci.yml`), Dependabot, modèles d'issues ; reste : rapports de test, préparation des versions.
5. **Système de validation** — demandes via Issues « Demande de validation » ; approbation par commentaire de GRAW sur l'issue.
6. **SKYLINE CONTROL** — après 2 et 3 seulement : espace privé distinct de STAFF HQ, données réelles ou « indisponible ».
7. **Surveillance** — échecs de déploiement, authentification, e-mails, dépendances ; correctifs sur branches dédiées, jamais directement en production.
