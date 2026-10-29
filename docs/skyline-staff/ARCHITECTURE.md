# SKYLINE APP — Phase 1 : STAFF HQ

Branche `feat/staff-hq` (depuis `main`). Non fusionnée. SKYLINE SOUND, son lecteur persistant et l'app participant sont inchangés (retouches minimales : le masquage du chrome participant sur `/staff`, le sélecteur d'espace dans les profils).

## 1. Audit
- Next.js 16 App Router, `cacheComponents`, Tailwind v4. **Aucune authentification réelle** n'existait : l'état « membre » est local (localStorage), uniquement pour le prototype.
- Deux « coques » existantes : layout racine (`AppShell` : `/`, `/explore`, `/signal/**`) et `src/app/v3/layout.tsx` (`V3Shell`). `SoundProvider` (SKYLINE SOUND) est monté dans le layout racine : il reste actif sur `/staff` (le mini-lecteur se place au-dessus de la barre STAFF HQ, même hauteur de navigation).
- `src/proxy.ts` (ex-middleware) existait pour les 404 SIGNAL : il porte aussi le contrôle d'accès STAFF.
- Réutilisés : `Wordmark`, tokens/typographies, `lucide-react`, conventions de pages. Aucune URL existante modifiée.

## 2. Architecture
```
/                    MEMBERS (inchangé)            /v3/**  MEMBERS (inchangé)
/staff               STAFF HQ — HQ                 /staff/schedule   SCHEDULE
/staff/comms[/id]    COMMS (canaux)                /staff/team[/id]  TEAM (annuaire, fiches)
/staff/profile       profil + sélecteur d'espace   /staff/access     accès DÉMO (public)
/api/demo-session    session démo (cookie signé)
```
- Layout dédié `src/app/staff/layout.tsx` + `StaffShell` (en-tête SKYLINE + pastille STAFF HQ, 4 onglets HQ / Schedule / Comms / Team). Même identité (wordmark, palette, typographies), interface propre.
- Composants : `src/components/staff/*`. Données de démonstration : `src/data/staff.ts` (tout est fictif).

## 3. Rôles et sécurité
- **Rôles de sécurité** (`src/lib/auth/roles.ts`) : `participant`, `staff`, `admin` ; un compte en a plusieurs. STAFF HQ exige `staff` ou `admin`.
- **Fonctions du staff** (photographe, direction artistique, communication…) : type distinct `StaffFunction` dans `src/data/staff.ts`, **sans aucun effet sur les droits** ; les fiches affichent fonctions et rôles d'accès séparément.
- **Contrôle d'accès côté serveur** : `src/proxy.ts` vérifie, avant tout rendu, un cookie de session **signé (HMAC-SHA256), httpOnly, expirant** ; sans session → `/staff/access`, rôle insuffisant → refus. Aucun état React ni localStorage ne donne accès (testé).
- **Session de démonstration** (`/api/demo-session`) : 4 comptes fictifs (participant, staff, staff+participant, admin). **Active en local et sur les prévisualisations, désactivée par défaut sur la production Vercel** (`DEMO_AUTH=on` pour l'activer, `DEMO_AUTH=off` pour la couper). Définir `DEMO_SESSION_SECRET` ; le secret par défaut est public (dépôt) et n'est acceptable que pour la démo.
- **Sélecteur d'espace** (profil MEMBERS production, profil V3 et profil STAFF) : visible seulement pour un compte staff/admin ; il ne fait que naviguer (la session cookie est conservée). Le masquer n'est pas une protection : le serveur refuse l'URL.

## 4. Pour la production (non fait, à valider)
1. Authentification réelle serveur (sessions chiffrées ; fournisseur à choisir ; coût à valider) à la place de `src/lib/auth/token.ts` et de `/api/demo-session`, à supprimer.
2. Vérification de session dans **chaque** accès aux données (Data Access Layer / politiques RLS en base), en plus du proxy (défense en profondeur).
3. Base de données UE commune : `users`, `user_roles(user_id, role)`, `staff_profiles(user_id, functions[], responsibilities, contact_visibility)`, `schedule_items`, `announcements`, `channels`, `channel_members`, `messages` ; mêmes identités pour MEMBERS et STAFF.
4. Messagerie interne temps réel : non implémentée (interface « non connectée »).
5. Journal d'audit des accès staff, rotation des secrets, gestion des révocations.

## 5. Tests exécutés
tsc ✔ · lint ✔ · build ✔ · unitaires ✔ · e2e v3 / v3.2 / sound / pass ✔ (aucune régression SKYLINE SOUND) · **`tests/e2e-staff.cjs`** ✔ : redirections serveur sans session (7 pages), falsification (cookie inventé, charge utile modifiée, 3 segments, localStorage), rôles (participant refusé ; staff, staff+participant, admin acceptés), navigation 4 onglets, canaux (saisie inactive), annuaire/filtre/fiches (coordonnées seulement si autorisées), 404 sur identifiants inconnus, sélecteur d'espace (session conservée, invisible pour un participant), 375/390/430 px sans débordement, texte ≥ 11 px, cibles ≥ 40 px, et mode « production » (démo désactivée).
**Non testé** : iPhone réel, authentification réelle (inexistante).
