# SKYLINE 2027 — Matrice technique et feuille de route (après Sprint 01)

Légende : ✅ **Connecté** = code + données réelles (Supabase) · 🟡 **Prêt, non activé** = code et SQL écrits et testés localement, mais migration non appliquée / fonction fermée par configuration · 🎭 **Simulé** = interface alimentée par des données de démonstration ou un état local, **ne pas présenter comme opérationnel** · ⛔ **Manquant**.

## A. État réel, fonction par fonction
| Fonction | État | Détail vérifié | Ce qui manque |
|---|---|---|---|
| Connexion STAFF HQ (code e-mail) | ✅ | Supabase Auth, proxy serveur, rôles B0 (`space_access`, `staff_roles`) appliqués au projet partagé | Journal d'audit des connexions, politique de session, double facteur |
| Missions STAFF | ✅ (si `STAFF_DATA_SOURCE=db`) | Fonctions SQL, RLS, versionnage ; attribution directe appliquée en base | Agenda / notifications STAFF (proposition B3 à rebaser) |
| Annuaire d'équipe, canaux, planning, profil STAFF | 🎭 | Données statiques `src/data/staff.ts` (seules les missions lisent la base) | Branchement `list_team` / tables planning & canaux |
| Administration des comptes (invitation, activation, accès, rôles) | ✅ côté SQL, ⛔ interface | Fonctions `manage_*` réservées au super admin | Écran d'administration (aujourd'hui SQL Editor / RPC) |
| Connexion participants (code e-mail) | 🟡 | Code + proxy prêts ; ouverte seulement avec `PARTICIPANT_AUTH=supabase` (variable à poser sur la Preview) ; B4.1 appliquée | Aucune variable Preview posée |
| Identité privée (prénom, nom, nom affiché) | ✅ | `participant_profiles` appliquée, 1 profil en base | Export / suppression (voir E) |
| Inscription publique (B4.2) | 🟡 | `/v3/signup`, finalisation, claim atomique, versions de CGU contrôlées serveur ; **fermée** (`PARTICIPANT_SIGNUP=off`) ; SQL non appliqué | Projet de test, CAPTCHA, SMTP, CGU réelles |
| Statut « voyageur vérifié » | 🟡 (structure) / ⛔ (alimentation) | `traveler_reservations` + `is_verified_traveler()` ; **aucune fonction n'écrit dedans** | Liaison réservation ↔ compte (Sprint 03) |
| Profil CLUB (pseudo, ville, bio, goûts, visibilité) | 🟡 | B4.3 : UI + services + SQL testés ; non appliqué | Application sur le projet de test |
| Photos de profil | 🟡 | Bucket privé, compression navigateur, URL signées ; non appliqué | Nettoyage des orphelins, modération |
| Annuaire CLUB (profils publiés) | 🟡 | Profils réels uniquement ; réservé aux voyageurs vérifiés (B4.2b) | Dépend du statut voyageur |
| Demandes de contact, messagerie, signalement, blocage | 🎭 | État local `useProto` (localStorage) + membres fictifs ; en mode réel l'écran affiche « Bientôt disponible » | Tout le backend (tables, RLS, temps réel, modération) |
| Souvenirs, activation communauté (18+, charte) | 🎭 | État local | Backend + consentements enregistrés |
| Accueil, My Flight, phases Avant/Pendant/Après | 🎭 | `src/data/demo.ts` ; `eventConfirmation` tout à `false` ⇒ « À confirmer » | Édition 2027 réelle (dates, programme, vols, hôtels) |
| Pass / QR | 🎭 / ⛔ | Emplacement du QR **vide** « à la confirmation » ; aucun QR généré, aucune bibliothèque QR | Émission signée côté serveur (Sprint 04) |
| Réservations & édition 2027 | ⛔ | Seule la table `traveler_reservations` (preuve minimale) ; l'état « confirmé » du prototype est un interrupteur local | Modèle `editions`, `reservations`, import, liaison |
| Billet ↔ compte | ⛔ | — | Code de rattachement, vérification STAFF |
| Vérification à l'entrée (scan STAFF) | ⛔ | — | Page de scan, journal, mode hors ligne |
| Notifications (e-mail, push, in-app) | 🎭 | Réglages locaux dans Profil ; aucun envoi | Fournisseur, modèles, préférences, file d'envoi |
| Confidentialité : export / suppression | 🎭 | Textes « En production : … » dans Profil, aucune action | Procédures et jobs (Sprint 08) |
| SIGNAL (récits), EXPLORE, SOUND | 🎭 / ✅ partiel | Contenus statiques ; lecteur SoundCloud = service externe réel ; radio du prototype simulée | CMS / source de contenu |
| i18n FR/EN | ✅ | Dictionnaires et test de parité ; nouveaux écrans CLUB/inscription : français (EN partiel) | Parité EN complète |
| Observabilité, sauvegardes, CI | ⛔ | Tests locaux uniquement | GitHub Actions, journalisation, PITR, alertes |

## B. Feuille de route technique (sans refonte visuelle)
**Sprint 02 — Environnement de test + application contrôlée.** Créer le projet de test (voir `SUPABASE-TEST-ENV.md`), appliquer la chaîne, régler Auth / SMTP / CAPTCHA, variables Vercel Preview, E2E réels, concurrence du claim, Auth Hook contre les inscriptions par mot de passe, CI GitHub Actions (build, tsc, eslint, SQL, E2E). *Sortie : inscription + connexion STAFF validées sur le projet de test, `verify.sql` vert.*

**Sprint 03 — Réservations & édition 2027 (modèle serveur).** Tables `editions`, `reservations` (référence, statut, source, un seul propriétaire), journal d'import ; import CSV par le super admin (validation, aperçu, idempotent) ; **rattachement** : code à usage unique (haché, expirant, limité en essais) envoyé à l'adresse de la réservation, ou liaison manuelle par STAFF habilité ; fonction STAFF qui alimente `traveler_reservations` ; l'état « confirmé » de l'interface lit ce statut. Aucun paiement (hors périmètre). *Décision requise : source de vérité des réservations (billetterie externe ?).*

**Sprint 04 — Pass / QR sécurisé.** Table `passes` ; jeton **signé côté serveur** (clé HMAC/EdDSA en variable serveur, jamais dans Git), identifiant opaque + nonce + expiration courte, rotation, révocation ; émission seulement si `is_verified_traveler()` et réservation valide ; rendu QR côté client à partir du jeton ; mode capture d'écran / hors ligne défini ; portefeuille Apple/Google ensuite. *Test : aucun QR sans preuve serveur (déjà gardé par test statique).*

**Sprint 05 — Vérification STAFF (scan).** Permission STAFF dédiée (`gate`), page de scan mobile, vérification de signature côté serveur, `scan_events` en ajout seul, détection de double passage, file hors ligne avec réconciliation, limitation de débit.

**Sprint 06 — CLUB complet.** Appliquer B4.3/B4.2b ; demandes de contact, conversations, signalement, blocage, modération STAFF, temps réel, quotas serveur, remplacement de `useProto` ; suppression des membres fictifs.

**Sprint 07 — Notifications.** Fournisseur e-mail transactionnel (SMTP déjà configuré), Web Push (VAPID) et in-app, préférences par canal, désabonnement, file d'envoi idempotente, intégration de B3 (agenda STAFF).

**Sprint 08 — Confidentialité & données.** Export des données personnelles (job asynchrone, lien signé expirant), suppression / anonymisation (profil, CLUB, avatars, conversations ; conservation légale des réservations), registre des consentements, durées de conservation, page confidentialité, politique cookies, procédure de violation.

**Transversal.** Rate limiting en bordure (Vercel WAF), journaux et alertes, sauvegardes / PITR et exercice de restauration, rotation des secrets, revue des dépendances, accessibilité, parité EN.

## C. Checklist — actions nécessitant VOTRE autorisation
| # | Action | Où | Pourquoi / risque |
|---|---|---|---|
| 1 | Créer le projet Supabase de test | Supabase | Isolation (recommandé) |
| 2 | Appliquer la chaîne B4.2 → B4.3 → B4.2b → B4.2c **sur le projet de test** | Test | Jamais sur le partagé sans accord distinct |
| 3 | Appliquer B4.2c (`rls_auto_enable`) sur le **partagé** | Partagé | Advisor 0028 ; après validation sur le test |
| 4 | Appliquer B4.2 (+B4.3/B4.2b) sur le **partagé** | Partagé | Après sauvegarde, hors usage STAFF, plan de retour |
| 5 | Réglages Auth : inscriptions, confirmation e-mail, CAPTCHA (clé secrète), SMTP, limites, expiration OTP, redirections, mots de passe compromis | Supabase (test d'abord) | Réglages **globaux** au projet |
| 6 | Poser les variables Vercel Preview (`PARTICIPANT_*`, clés du projet de test) | Vercel | N'affecte que la Preview ; redéploiement nécessaire |
| 7 | Fournir version / URL des CGU et charte, âge minimum, durée de conservation | Vous | Textes juridiques hors code |
| 8 | Enregistrer la version de CGU (`manage_register_terms_version`) | Test puis partagé | Sans version, aucun claim ne passe |
| 9 | Activer `PARTICIPANT_SIGNUP=on` | Vercel Preview | Ouverture publique de test ; jamais Production sans décision |
| 10 | Politique de création des comptes : **Invite user uniquement** | Équipe | Risque résiduel n°1 (comptes « Add user ») |
| 11 | Source de vérité des réservations / billetterie | Vous | Conditionne le Sprint 03 |
| 12 | Choix du fournisseur CAPTCHA, SMTP, e-mail transactionnel, push | Vous | Coûts et conformité |
| 13 | Conservation des preuves de consentement (IP / user-agent ?) | Vous / DPO | RGPD |
| 14 | Merge `main` / `staff-preview`, déploiement Production | Vous | **Non engagé** |

## D. Principes maintenus
Aucune fonctionnalité simulée n'est présentée comme opérationnelle (l'interface réelle affiche « Bientôt disponible » / « À confirmer »). Aucun QR, pass ou statut de réservation confirmé sans preuve côté serveur. Aucun secret dans Git. Design existant préservé (aucune refonte avant la fin des fondations).
