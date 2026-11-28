# APPROVALS — opérations nécessitant une validation de GRAW

## Toujours soumises à validation
Publication officielle en production · migration de la base de production · modification importante de la direction artistique · modification des règles d'accès ou de confidentialité (RLS, consentement, statut voyageur) · suppression de données · changement d'infrastructure majeur · dépenses et abonnements · toute modification de `main`, de STAFF HQ ou des variables de production.

## Autorisé sans validation (périmètre de développement)
Analyse, code, correctifs, branches, commits, push sur branches de développement, PR, tests, audits, mises à jour compatibles de dépendances, migrations **non destructives sur SKYLINE-TEST uniquement**, déploiements Preview, documentation.

## Procédure
1. L'agent ouvre une **Issue « Demande de validation »** (modèle fourni) liée à une version (commit) et un environnement précis.
2. GRAW répond par commentaire **APPROUVER** ou **REFUSER** (depuis l'iPhone via l'app GitHub). Seul le compte du propriétaire du dépôt fait foi.
3. L'agent n'exécute que l'opération décrite, sur la version décrite, puis consigne le résultat dans l'issue et `HANDOFF.md`.
4. Une approbation ne vaut que pour cette opération ; toute modification du plan l'annule.

## Contenu d'une demande
Action · objectif · impact · risques · tests effectués · plan de retour arrière · décision attendue.

## Avant toute mise en production (liste de contrôle)
Dépendances communes avec STAFF HQ · RLS · impacts sur comptes STAFF · migrations existantes · sauvegarde adaptée · retour arrière · tests de non-régression · projet Vercel et base Supabase ciblés identifiés par leur identifiant.
