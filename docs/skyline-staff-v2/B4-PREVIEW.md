# B4.1 — Prévisualisation Vercel (comptes participants)

Branche `feat/b4-participant-foundations`. **Production inchangée** (`main` = `59284cd`, aucune modification). **Aucune migration appliquée** à Supabase, **aucun compte créé**, **aucun rôle modifié**.

## 1. Déploiement
Vercel construit automatiquement chaque branche poussée sur GitHub (Preview). Le commit `10ccb0b` a été construit avec succès (statuts GitHub « Vercel – skyline-app » et « Vercel – skyline-ap » : *Deployment has completed*).
- **URL stable de la branche (projet `skyline-app`)** : `https://skyline-app-git-feat-b4-participant-foundations-jarvis-1348.vercel.app` (adresse relevée dans le lien de retours Vercel du commit).
- Les Previews sont protégées par Vercel : se connecter au compte Vercel de l'équipe pour les ouvrir (ou utiliser un lien de partage).
- Un second projet Vercel (`skyline-ap`) construit aussi la branche ; le projet retenu est `skyline-app`.

## 2. Variables d'environnement (Vercel → Settings → Environment Variables → **Preview uniquement**, branche `feat/b4-participant-foundations` si le champ « Branch » est proposé ; jamais Production)
| Variable | Valeur | État | Rôle |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet SKYLINE-APP | déjà définie (Preview) — à vérifier | clients Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | clé **publique** | déjà définie (Preview) — à vérifier | clients Supabase (jamais `service_role`) |
| `PARTICIPANT_AUTH` | `supabase` | **MANQUANTE — à ajouter** | active /v3/login, /v3/account, l'identité réelle |
| `STAFF_AUTH_MODE` | `supabase` | selon l'état actuel de la Preview | STAFF HQ inchangé |
| `STAFF_DATA_SOURCE` | `db` ou absente | selon l'état actuel | STAFF HQ inchangé |
Aucune autre variable. **Après ajout, Redeploy** (Vercel applique les variables aux NOUVEAUX déploiements). Sans `PARTICIPANT_AUTH`, la Preview se comporte comme avant : `/v3/login` et `/v3/account` répondent 404.

## 3. Vérifications possibles AVANT toute migration et sans compte
Sans `PARTICIPANT_AUTH` : accueil de démonstration identique (identité de démonstration), profil identique, `/v3/login` → 404.
Avec `PARTICIPANT_AUTH=supabase` (visiteur non connecté) :
1. `/v3` : « Bienvenue à bord » + « Se connecter » (aucun nom inventé).
2. `/v3/login` : page de connexion (adresse e-mail → code). **Ne pas saisir d'adresse réelle** : un code serait envoyé.
3. `/v3/account` : redirige vers `/v3/login` (protection côté serveur).
4. `/v3/profile` : lien « Se connecter » ; `/v3/flight` : pass « Réservation à confirmer », aucune donnée de vol fictive ; `/v3` : « Date à confirmer » ; `/crew` : « Siège à confirmer ».
5. `/api/participant/me` : `{ "mode": "supabase", "status": "anonymous" }`.
6. STAFF HQ : connexion par code (comptes existants), pages Missions, accès inchangés.
## 4. Ce qui reste à faire après validation (non réalisé)
Appliquer la migration `supabase/proposals/B4_1_participant_profiles.sql`, préparer un compte participant (invitation + accès « members »), puis tester : connexion, profil, nom affiché sur l'accueil / le pass, déconnexion.
## 5. Retour arrière
Supprimer `PARTICIPANT_AUTH` (ou `off`) et redéployer : l'application participants redevient identique à `staff-preview`. Rien n'est à défaire côté base.
