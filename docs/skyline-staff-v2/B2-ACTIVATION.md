# STAFF HQ V2 — Procédure d'activation (Preview) : comptes réels Graw, Tom, Qafard + missions partagées

> **Rien de ce document n'a été exécuté.** Aucun compte créé, aucun rôle attribué, aucune variable Vercel modifiée, aucun déploiement manuel. Chaque étape ci-dessous est à lancer **après votre accord explicite**.
> Périmètre : **Preview uniquement** (branche `staff-preview`). Jamais la production, jamais `main`.

## 0. État de départ (vérifié)
- Supabase **SKYLINE-APP** (org SKYLINE, Irlande, `nyneujukydxjvbwcoste`) : les 3 migrations B0 sont appliquées, 10 tables avec RLS, 12 politiques, 0 fonction exécutable par `anon`, 23 par `authenticated`. **0 utilisateur, 0 compte, 0 rôle.**
- Code : B2 (missions via Supabase) dans `staff-preview`. Par défaut (aucune variable `STAFF_*`) : **démonstration locale, comportement inchangé**.
- Garde-fou B2 : une configuration incorrecte ne bascule jamais en silence vers le local → **503 « Configuration invalide »** (voir `B2-SYNC.md` §1).

## 1. Deux décisions à prendre AVANT de commencer (bloquantes)
### 1.1 Envoi des e-mails de connexion (SMTP) — pas d'accès DNS pour l'instant
La connexion se fait par **code à 6 chiffres reçu par e-mail** (aucun mot de passe). L'envoi **intégré** de Supabase est limité (très peu d'e-mails par heure, et, selon la politique actuelle de Supabase, réservé aux adresses des membres de l'organisation Supabase — à vérifier dans le tableau de bord). Options :
| Option | Principe | Limite |
|---|---|---|
| **A. Membres de l'organisation Supabase** | Ajouter Tom et Qafard comme membres de l'org SKYLINE (rôle le plus restreint possible) : l'envoi intégré leur est alors permis | Donne un accès au tableau de bord Supabase : **à éviter** pour la sécurité |
| **B. SMTP personnalisé sans DNS** | Un compte e-mail existant (iCloud / Gmail) avec **mot de passe d'application** ; ou un service gratuit à « expéditeur unique » vérifié par clic | Expéditeur non personnalisé ; quotas ; ne **jamais** coller le mot de passe dans le chat (saisie directe dans Supabase) |
| **C. Attendre l'accès DNS** | SMTP propre au domaine SKYLINE | Repousse l'activation |
**Recommandation : B** (mot de passe d'application saisi uniquement dans Supabase → Authentication → SMTP), **C** pour le long terme. Aucun service payant sans votre accord. **Ne contournez pas** les confirmations d'adresse.

### 1.2 Accès des testeurs à la Preview Vercel
Les déploiements Preview sont probablement protégés (page « You Need Access », vue sur votre téléphone). Tom et Qafard doivent pouvoir ouvrir l'adresse :
- soit en les ajoutant à l'équipe Vercel (si le plan le permet),
- soit via un **lien de partage** généré par Vercel pour la Preview,
- soit en réglant la protection de la Preview (choix à vous ; STAFF reste protégé par Supabase dans tous les cas).
Adresse stable de la branche : celle du déploiement `staff-preview` (Vercel → skyline-app → Deployments → Domains), notée `<ADRESSE>` ci-dessous.

## 2. Étape 1 — Réglages d'authentification Supabase (manuel, ~10 min)
Tableau de bord → projet SKYLINE-APP → **Authentication** (les libellés peuvent évoluer) :
1. **Providers → Email** : activé ; « Confirm email » **activé** ; **inscriptions publiques désactivées** (« Allow new users to sign up » = off) ; mots de passe : ne pas en créer.
2. **URL Configuration** : *Site URL* = `<ADRESSE>` ; *Redirect URLs* = **une seule** entrée exacte `<ADRESSE>/auth/callback` (aucun joker).
3. **Emails → Templates** (« Magic Link », « Confirm signup », « Invite user ») : inclure le code `{{ .Token }}` ; expiration 900 s, longueur 6. (Corps proposé dans `B0-FOUNDATION.md` §6.)
4. **SMTP** : selon la décision 1.1.
Vérification : relire chaque réglage à l'écran. Je ne peux pas les lire avec mes outils.

## 3. Étape 2 — Création des trois comptes (sans mot de passe)
**Authentication → Users → Invite user**, une fois par adresse (Graw, Tom, Qafard). Chaque personne ouvre son e-mail d'invitation **une fois** (confirmation de l'adresse). Rien d'autre.
Contrôle **lecture seule** (SQL Editor, ou je le lance avec votre accord) — doit renvoyer **3 lignes, `confirme = true`, `a_un_mot_de_passe = false`** :
```sql
select email, email_confirmed_at is not null as confirme, coalesce(encrypted_password,'') <> '' as a_un_mot_de_passe from auth.users order by email;
select display_name, active from public.accounts order by 1;   -- 3 comptes, tous active = false (invités = inactifs, sans accès)
```
Arrêt si une ligne a `a_un_mot_de_passe = true`, ou si le nombre n'est pas 3.

## 4. Étape 3 — Rôles (script atomique `supabase/bootstrap/B0_roles_template.sql`)
Attribution : **Graw** = super admin global + accès STAFF ; **Tom** = accès STAFF + `admin` ; **Qafard** = accès STAFF + `member`. Fiches d'annuaire (slugs `graw`, `tom`, `qafard`), activation des 3 comptes.
- Les **trois adresses réelles** sont à fournir au moment de l'exécution ; elles ne seront **jamais** écrites dans le dépôt.
- Le script est **atomique** : si un compte est introuvable, en double, non confirmé, avec mot de passe… il s'annule **entièrement** (« BOOTSTRAP ANNULÉ : … », aucune modification).
- Exécution : par vous dans le SQL Editor, ou par moi **après votre accord écrit** et après vous avoir montré le script rempli.
Résultat attendu : `BOOTSTRAP OK`, puis 3 lignes — graw (`{super_admin}`, accès `{staff}`), qafard (`{staff}`, `{member}`), tom (`{staff}`, `{admin}`).
Vérifications après : `1, 2, 3, 0` (rôles globaux, permissions STAFF, accès STAFF, accès MEMBERS) et 3 comptes actifs (requêtes dans `B0-FOUNDATION.md` §6, étape 10).

## 5. Étape 4 — Variables Vercel (Preview uniquement)
Vercel → skyline-app → Settings → Environment Variables. **Environnement : Preview, branche `staff-preview` si le réglage « Branch » est proposé. Jamais Production.**
| Variable | Valeur | Remarque |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | déjà définie (Preview) | vérifier : `https://nyneujukydxjvbwcoste.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | déjà définie (Preview) | clé **publique** uniquement ; jamais `service_role` |
| `STAFF_AUTH_MODE` | `supabase` | à ajouter |
| `STAFF_DATA_SOURCE` | `db` | à ajouter **en même temps** que la précédente |
Ensuite : **Redeploy** du dernier déploiement de `staff-preview` (les variables `NEXT_PUBLIC_*` sont figées à la construction). Ordre sûr : ajouter les deux variables → redéployer → tester.
Pièges (volontairement bruyants) : `STAFF_DATA_SOURCE=db` **sans** `STAFF_AUTH_MODE=supabase`, ou URL/clé absentes, ou faute de frappe → page **503 « Configuration invalide »** avec la cause. C'est le comportement voulu : corriger la variable, redéployer.

## 6. Étape 5 — Test avec les trois comptes réels (iPhone, Safari)
Données de test : titres préfixés **« [Test] »**, à supprimer à la fin (Tom ou Graw peuvent supprimer).
| # | Qui | Action | Attendu |
|---|---|---|---|
| 1 | chacun | Ouvrir `<ADRESSE>/staff/missions` → e-mail → code | Connexion ; bandeau bleu « Missions partagées · base de l'équipe » |
| 2 | sans connexion | Même adresse en navigation privée | Redirigé vers `/staff/login`, aucune mission |
| 3 | Graw | Créer « [Test] Repérage » pour Qafard, validation par Tom | La mission apparaît ; historique « Graw a créé la mission » |
| 4 | Qafard | Ouvre la liste | Ne voit **que** ses missions ; pas de bascule « Toutes » |
| 5 | Qafard | Démarrer → Envoyer en validation | Statuts mis à jour ; **aucun** bouton « Terminée » |
| 6 | Tom | « Valider · terminée » | Statut « Terminée », historique « a validé » |
| 7 | Qafard | Créer « [Test] Idée » **pour Tom** | Message « Proposition… » ; Qafard reste responsable |
| 8 | Tom | Approuver la proposition | « Décision enregistrée. » ; Tom responsable ; Qafard n'a aucun bouton Approuver |
| 9 | Tom + Graw | Ouvrir la même mission, tous deux « Modifier les informations » ; l'un enregistre, puis l'autre | « Conflit de modification » + Recharger ; ses saisies sont conservées |
| 10 | Qafard | Commenter une mission ; Tom lit | Commentaire visible avec l'auteur |
| 11 | Qafard | Tenter de supprimer | Aucun bouton « Supprimer » (réservé aux administrateurs) |
| 12 | Tom | Archiver puis supprimer une mission de test | Disparaît de la liste (confirmation demandée) |
| 13 | n'importe qui | Mode avion → « Actualiser » | Bandeau « Actualisation impossible » (données conservées) ; retour réseau → « Actualiser » |
| 14 | tous | Champs de saisie sur iPhone | Pas de zoom automatique ; boutons faciles à toucher |
| 15 | chacun | Se déconnecter (profil) puis rouvrir `/staff` | Redemande la connexion |
| 16 | n'importe qui | Application participants (`/`, Explorer, SIGNAL…) | Fonctionne comme avant |
Arrêt immédiat et retour arrière si : un compte voit des missions qui ne le concernent pas, un bouton interdit apparaît **et fonctionne**, ou une erreur « Action non autorisée » apparaît pour une action normale.

## 7. Retour arrière (sans perte)
1. Vercel Preview : supprimer `STAFF_DATA_SOURCE` **et** `STAFF_AUTH_MODE` (ou `STAFF_DATA_SOURCE=local`) → Redeploy : retour à la démonstration locale. Les missions restent dans la base.
2. Couper un accès : désactiver le compte (`public.accounts.active = false`) via une fonction `manage_*` ou le SQL Editor — avec votre accord.
3. Supprimer les missions de test : bouton Supprimer (Tom/Graw).
Aucune migration n'est à défaire.

## 8. Ce qui reste hors périmètre
Projets (nécessitent une migration à valider), annuaire / planning / messages / annonces encore locaux (B3), temps réel, SMTP du domaine SKYLINE (accès DNS).
