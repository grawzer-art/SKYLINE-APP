# B4.4 — Dossier d'exécution unique (base de TEST) — consentement CLUB, comptes fictifs, annuaire

> **Statut : PRÉPARÉ, NON EXÉCUTÉ.** Aucune migration n'a été lancée. Une seule validation est demandée pour la séquence E1 → E7 ci-dessous, avec points d'arrêt automatiques.
> Périmètre : **uniquement** le projet Supabase `SKYLINE-TEST`. Jamais la base partagée, STAFF HQ, `main`, la production, ni la configuration Vercel.

## 1. Projet de test et isolation

| | SKYLINE-TEST (cible) | SKYLINE-APP (partagé — hors périmètre) |
|---|---|---|
| Identifiant | `tbjzzrlidtkclvhwudhb` | `nyneujukydxjvbwcoste` |
| URL | https://tbjzzrlidtkclvhwudhb.supabase.co | https://nyneujukydxjvbwcoste.supabase.co |
| Création | 7 nov. 2026 | 29 oct. 2026 |
| Comptes d'authentification | 0 | 4 (3 STAFF, 1 participant) |
| Migrations | 9 (versions du 8 nov. 2026) | 5 (B0, dérive, B4.1) |

Chaque appel distant de la séquence cible **explicitement** `tbjzzrlidtkclvhwudhb` ; aucun appel n'est fait avec l'autre identifiant.

## 2. État exact des migrations déjà appliquées (TEST)

`20261108021139 b0_accounts_access` · `…142 b0_missions` · `…145 b0_rls_policies` · `…150 direct_staff_mission_assignment_test_replay` · `…153 b4_1_participant_profiles` ·
`…156 b4_2_member_signup` · `…159 b4_3_club_profiles` · `…202 b4_2b_club_traveler_gate` · `…205 b4_2c_revoke_rls_auto_enable`.

**Option A retenue (B4.2 → B4.2c non rejouées).** Vérifiée en lecture seule le jour de la préparation avec `supabase/test-env/precheck_before_b44.sql` : **GLOBAL = tout ok** —
42 fonctions publiques identiques au dépôt (empreinte du code), 0 en trop / manquante, 0 table sans RLS, 0 fonction exécutable par `anon`, aucun accès direct à `club_profiles`, aucune écriture
possible sur `traveler_reservations`, bucket `club-avatars` privé, B4.4 absente, 0 compte, 0 réservation, 0 profil CLUB. L'état réel est donc **conforme au plan**.
Le script est régénéré par `supabase/test-env/generate.mts` ; un test du dépôt échoue s'il n'est pas à jour.

## 3. B4.4 — SQL et effets

Fichier : `supabase/proposals/B4_4_club_consent.sql` (retour arrière : `supabase/rollback/B4_4_club_consent_DOWN.sql`).

| Objet | Effet |
|---|---|
| table `club_consents` (ajout seul) | utilisateur, action (`publish` / `withdraw`), version du texte, date. RLS activée, **aucune politique**, aucun privilège pour `anon` / `authenticated`. Supprimée avec le compte (cascade). |
| `club_consent_version()` | version courante du texte : `club-annuaire-1` (source de vérité serveur) |
| `set_my_club_visibility(visible, consent_version)` | **remplace** l'ancienne fonction à un argument (supprimée : plus de contournement). Publier exige : accès « participants », **voyageur vérifié**, version courante du consentement. Retirer : toujours possible. Journalise chaque changement d'état. |
| `get_my_club_consent()` | renvoie la dernière trace de **soi-même** uniquement |
| inchangés | `traveler_reservations` (aucun statut créé ni modifié), `club_profiles`, annuaire, photos, STAFF |

Aucun statut « voyageur vérifié » n'est créé, déduit ou accordé par B4.4.

## 4. Texte de consentement (version `club-annuaire-1`) — à valider

> **Publier mon profil CLUB**
> Les autres voyageurs vérifiés ayant publié leur profil pourront voir votre pseudo, votre photo, votre ville, votre bio et vos goûts musicaux. Jamais votre e-mail ni votre nom.
> Vous pouvez retirer votre profil à tout moment. Nous conservons la date et la version de ce consentement.
> **[Publier mon profil]** **[Annuler]**

Anglais (affiché seulement si le sélecteur de langue est réactivé) : voir `src/components/participant/ClubConsentSheet.tsx`. Toute modification du texte impose une **nouvelle version**
(`club-annuaire-2`) côté serveur ET application ; un client ancien serait alors refusé (`consent_required`).
Comportement : l'interrupteur « Visible par les membres » et le bouton « Publier mon profil » de l'annuaire **ouvrent** cette confirmation ; rien n'est exposé avant « Publier mon profil ».
Après publication : « Consentement donné le … » est affiché. Le retrait est immédiat, sans confirmation.

## 5. Authentification et comptes de test

- **Connexion participants** : code à 6 chiffres envoyé par e-mail ; **elle ne crée jamais de compte** (seuls les comptes existants se connectent). Pas de mot de passe dans l'application.
- **Comptes fictifs (3) + visiteur** : *membre sans réservation* ; *voyageur vérifié 1* ; *voyageur vérifié 2* (deux voyageurs sont nécessaires : l'annuaire exige d'avoir publié le sien) ; le *visiteur* est simplement un navigateur non connecté.
- **Création (vous, tableau de bord de TEST)** : Authentication → Users → *Add user* → adresse de test, *Auto Confirm User*, mot de passe aléatoire jamais utilisé. Aucun droit d'administration Supabase.
- **Attribution des droits (moi, SQL, après votre accord)** : `supabase/test-env/seed_test_accounts.sql` — refuse tout compte absent, de l'équipe (STAFF / rôle de plateforme) ou déjà vérifié ; ajoute l'accès « participants » ;
  insère **à la main** la réservation fictive `test-fictif` pour les deux voyageurs uniquement. Aucun vrai participant, aucun membre de l'équipe.
- **E-mails de connexion (vérifié)** : la configuration d'envoi ne peut pas être lue par moi (ni par SQL, ni par l'API disponible) ; aucun journal d'authentification n'existe encore (aucun trafic). La documentation Supabase indique que le service
  **intégré** n'envoie qu'aux adresses des **membres de l'organisation** (autres adresses : erreur `email_address_not_authorized`) et limite le débit. **Conséquence** : tant que TEST n'a pas de SMTP personnalisé, Tom et Qafard ne
  recevront pas de code, sauf à les ajouter à l'organisation (accès au tableau de bord : **refusé par principe**). **Action vous** : Authentication → SMTP Settings de TEST (SMTP personnalisé actif ?). Sinon : configurer un SMTP dédié à TEST
  (Resend, aujourd'hui en pause) — décision et secret à votre charge, jamais dans le chat ni le dépôt.

## 6. Tests de sécurité et de non-régression

**Déjà exécutés en local (Postgres, deux jeux de privilèges Supabase) — tous verts :**
- `tests/club-consent.test.mts` : 16 contrôles (consentement absent/périmé/falsifié refusé, trace, retrait, journal inaccessible y compris `anon`, isolation, aucun statut vérifié automatique pour l'équipe / un compte connecté / un suspendu, retour arrière exact, rejeu) — mutation vérifiée.
- `tests/test-env-kit.test.mts` : 13 contrôles — les scripts de ce dossier eux-mêmes (précontrôle, postcontrôle, amorçage et ses garde-fous, isolation 22 vérifications, désamorçage).
- Suite `npm run test:rls` (RLS, profils CLUB, services CLUB, inscription, audit de sécurité, manifeste, bootstrap, droits effectifs, missions, identité, profils participants).
- Application : `tests/club-service.test.mts` (service réel contre Postgres, consentement inclus) ; `tests/e2e-club.cjs` (confirmation, annulation, trace, retrait) sur le simulateur.

**Exécutés à distance (TEST) pendant la séquence :** précontrôle, postcontrôle, `get_advisors` (sécurité), contrôle d'isolation en conditions réelles (22 vérifications, **entièrement annulé** : il se termine par une exception, rien n'est conservé).

## 7. Séquence d'exécution et points d'arrêt (une seule validation)

| # | Opération | Écrit ? | ARRÊT si… | Retour arrière |
|---|---|---|---|---|
| E1 | Précontrôle `precheck_before_b44.sql` (relu juste avant) | non | `GLOBAL` ≠ ok (l'état réel a changé) | — |
| E2 | Appliquer `B4_4_club_consent.sql` sur `tbjzzrlidtkclvhwudhb` | DDL (TEST) | erreur de migration (état revérifié, rien n'est supposé) | `B4_4_club_consent_DOWN.sql` |
| E3 | Postcontrôle `postcheck_after_b44.sql` | non | `GLOBAL` ≠ ok | DOWN |
| E4 | `get_advisors` sécurité (TEST) | non | nouvelle alerte liée à B4.4 | DOWN |
| E5 | **Après** création des 3 comptes par vous : amorçage `seed_test_accounts.sql` (3 adresses) | données (TEST) | message `SEED_REFUSED`, compte absent / équipe | `unseed_test_accounts.sql` |
| E6 | Contrôle d'isolation `live_isolation_check.sql` | non (annulé) | résultat ≠ `ISOLATION_OK` (22/22) | unseed + DOWN |
| E7 | Rapport final + consignes Vercel (variables de la branche) + proposition de pousser la branche pour le test iPhone | non | — | — |

E1 à E4 peuvent s'enchaîner sans vos comptes ; E5 à E6 attendent les trois comptes (et, pour Tom et Qafard, l'envoi d'e-mails). Un rapport est remis après chaque étape.
Aucune étape ne touche l'autre projet, STAFF HQ, `main`, la production ou Vercel.

## 8. Déploiement applicatif (hors séquence, après votre accord)

Le code (confirmation, trace affichée, service) est prêt sur la branche locale `feat/b4-4-club-consent`. **Ordre impératif** : appliquer B4.4 sur TEST **avant** de déployer ce code (l'application envoie `p_consent_version` ; sans B4.4, la publication échouerait).
Variables de la Preview de la branche (vous, Vercel) : `PARTICIPANT_AUTH=supabase`, `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` de **TEST** (clé publique uniquement, jamais `service_role`), puis redéploiement.
Effet de bord : STAFF HQ sur cette Preview pointerait vers la base de test (vide) : à ne pas utiliser pour STAFF.
