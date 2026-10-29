# SKYLINE APP — B0 : revue de sécurité des migrations SQL (modèle d'accès GLOBAL)

**Statut : NON EXÉCUTÉES.** Ce document contient (1) la revue des permissions, des fonctions `SECURITY DEFINER` et des politiques RLS, puis (2) le texte COMPLET des trois migrations et du script d'attribution des rôles. Sources : `supabase/migrations/` et `supabase/bootstrap/`.

## 1. Modèle : trois notions distinctes, cumulables
| Notion | Table | Valeurs | Qui l'accorde | Sens |
|---|---|---|---|---|
| **Rôle global de plateforme** | `platform_roles` | `super_admin` | super admin | Propriétaire de SKYLINE APP (**GRAW**). Administre comptes, invitations, activations, accès et rôles de **tous** les espaces. N'est **pas**, à lui seul, une permission STAFF. |
| **Accès par espace** | `space_access` | `staff`, `members` | super admin | Quel(s) espace(s) le compte peut ouvrir. **Cumulable** (un compte peut avoir les deux). |
| **Permissions STAFF HQ** | `staff_roles` | `admin` (**TOM**), `member` (**QAFARD**) | super admin | Droits **dans** STAFF HQ. N'existent que pour un compte ayant l'accès `staff` (clé étrangère composite ; retirer l'accès supprime ces permissions). |
| Identité globale | `accounts` | `active` | invitation / super admin | Un compte invité naît **inactif**, sans rien. Désactiver = perte immédiate de tout accès. |
| Fiche d'annuaire STAFF | `staff_profiles` | slug, fonction, contacts pro | super admin (+ contacts : soi-même) | Données **propres à STAFF** : jamais visibles d'un participant. |
Équipe de B0 : **GRAW** = `super_admin` global + accès `staff` (coordonne STAFF par son statut de super admin) ; **TOM** = accès `staff` + `admin` ; **QAFARD** = accès `staff` + `member`. Aucun accès `members` n'est attribué en B0 ; l'ajouter à un compte = `manage_set_spaces` (cumul possible sans rien changer d'autre).
**Règle de cloisonnement :** toute politique ou fonction STAFF exige `is_staff_member()` / `is_staff_coordinator()` (qui exigent l'accès `staff`). Un participant (accès `members` seul, même actif) n'est **jamais** membre STAFF. Les futures données MEMBERS auront leurs **propres tables et politiques** fondées sur `has_space('members')`, sans réutiliser celles de STAFF.

## 2. Principes
1. **Refus par défaut** : RLS sur les 10 tables ; `anon` sans aucun privilège ; aucune politique d'écriture sauf `UPDATE` de ses propres champs personnels.
2. **Écritures uniquement par fonctions** `SECURITY DEFINER` qui revérifient identité, compte actif, accès, rôle et règles (miroir de `src/domain/missions.ts`). **Aucun** `INSERT` / `UPDATE` / `DELETE` direct pour les utilisateurs sur comptes, rôles, accès, fiches, missions, historique, commentaires.
3. **Administration** (comptes, accès, rôles) : **super admin global uniquement** (`manage_*`). **Tom (`admin` STAFF) n'a aucun droit sur les comptes ni les permissions.**
4. **Historique non modifiable**, aucune donnée insérée, aucune instruction destructive dans les migrations.

## 3. Privilèges sur les tables
| Table | `anon` | `authenticated` |
|---|---|---|
| `accounts` | aucun | SELECT (RLS) ; UPDATE de `display_name` seulement (sa propre ligne, compte actif) |
| `platform_roles`, `space_access`, `staff_roles` | aucun | SELECT (RLS) seulement |
| `staff_profiles` | aucun | SELECT (RLS) ; UPDATE de `email_pro`, `phone_pro` seulement (sa propre fiche, membre STAFF) |
| `projects`, `project_members`, `missions`, `mission_events`, `mission_comments` | aucun | SELECT (RLS) seulement |
`service_role` (clé secrète, **non utilisée par l'application**) contourne la RLS par conception Supabase : jamais dans le code client ni dans `NEXT_PUBLIC_*`.

## 4. Politiques RLS
| Table | Qui lit |
|---|---|
| `accounts` | soi-même ; le super admin lit tout. **Un participant ne voit aucun autre compte.** |
| `platform_roles`, `space_access`, `staff_roles` | ses propres lignes ; le super admin lit tout. L'annuaire passe par `list_team()` (membres STAFF). |
| `staff_profiles` | sa propre fiche ; le super admin ; les membres STAFF (`can_view_staff_profile`). **Jamais un participant.** |
| `projects`, `project_members` | membres STAFF : coordinateurs, propriétaire, membres du projet |
| `missions` | membre STAFF ET (coordinateur OU créateur / responsable / validateur / proposé OU membre du projet) |
| `mission_events`, `mission_comments` | si la mission est visible (`can_view_mission`, réservée aux membres STAFF) |
**Vérification demandée — futurs participants :** les politiques actuelles n'accordent **rien** à un compte `members` : testé sur un participant actif (aucun annuaire, aucune fiche STAFF, aucun autre compte, aucun accès/rôle d'autrui, aucune mission, aucun projet, aucune action) et même s'il est ajouté par erreur à un projet.

## 5. Inventaire des fonctions `SECURITY DEFINER` (toutes avec `search_path = ''`, objets qualifiés)
| Fonction | Exécutable par | Pourquoi DEFINER | Contrôles internes |
|---|---|---|---|
| `is_account_active`, `is_super_admin`, `has_space(space)` | connectés | lire les tables d'accès sans récursion RLS | concernent `auth.uid()` ; **faux si le compte est inactif** |
| `is_staff_member`, `is_staff_coordinator` | connectés | idem | exigent l'accès `staff` ; coordination = `admin` ou super admin avec accès `staff` |
| `can_view_staff_profile(uuid)` | connectés | utilisée par la politique des fiches | **faux pour tout non-membre STAFF, quel que soit l'argument** (aucun sondage) |
| `list_team()` | connectés | annuaire | **vide** si l'appelant n'est pas membre STAFF |
| `manage_set_account_active`, `manage_set_platform_roles`, `manage_set_spaces`, `manage_set_staff_roles`, `manage_upsert_staff_profile`, `manage_update_account` | connectés, mais **super admin global uniquement** | administration des comptes et accès | `is_super_admin()` sinon `42501` ; **dernier super admin protégé** ; permissions STAFF exigent l'accès `staff` |
| `is_project_member`, `can_view_mission` | connectés | éviter la récursion / politiques d'historique | membre STAFF + règle de visibilité |
| `create_mission`, `update_mission`, `set_mission_status`, `assign_mission`, `resolve_assignment`, `add_mission_comment`, `archive_mission`, `delete_mission` | connectés | seules voies d'écriture des missions (historique dans la même transaction) | compte actif + membre STAFF, règles de statut / validateur / attribution, verrou `for update`, verrou de version |
| `is_staff_user(uuid)`, `is_validator_user(uuid)` | **personne** (interne) | aides sur d'autres identifiants | `EXECUTE` **retiré explicitement** à `authenticated` (Supabase l'accorde par défaut) |
| `handle_new_user` (déclencheur sur `auth.users`) | système | créer le compte à l'invitation | compte **inactif, sans rôle ni accès** |
`touch_updated_at` : déclencheur sans privilège particulier. **La liste des fonctions exécutables par `authenticated` est vérifiée par un test (23 fonctions)** ; aucune n'est exécutable par `anon` ; les futures fonctions n'auront aucun `EXECUTE` par défaut.
*Constat des tests :* une première version appelait une fonction interne depuis une politique (exécutée avec les droits de l'appelant) : refus « permission denied ». Corrigé avec `can_view_staff_profile`, qui ne divulgue rien.

## 6. Droits par rôle (appliqués par la base)
| Action | GRAW `super_admin` global (+ accès staff) | TOM `admin` STAFF | QAFARD `member` STAFF | Participant (`members`) |
|---|---|---|---|---|
| Comptes, invitations, activation, accès, rôles | **oui** | non | non | non |
| Annuaire STAFF, fiches, missions, projets | oui | oui | selon visibilité | **non** |
| Toutes les missions | oui | oui | non (ses missions / projets) | non |
| Attribuer à un autre | direct | direct | proposition (validée par un coordinateur) | non |
| Approuver une attribution / valider / renvoyer | oui | oui | non | non |
| Passer « terminée » | oui | oui | jamais | non |
| Supprimer définitivement | oui | oui | non | non |
Le validateur d'une mission est un coordinateur STAFF (GRAW ou TOM), jamais le responsable.

## 7. Points d'attention connus
- Les fonctions `SECURITY DEFINER` contournent la RLS : la sécurité repose sur leurs contrôles internes, relus et testés (29 tests RLS).
- Le « Security Advisor » de Supabase signalera probablement des **avertissements** « fonction SECURITY DEFINER exécutable par authenticated » : **attendus** ici (chaque fonction vérifie l'appelant). Aucune erreur « RLS disabled » ne doit apparaître.
- Un super admin **sans** accès `staff` administre les comptes mais n'est pas membre STAFF ; il peut s'accorder l'accès (administration globale). La connexion STAFF exige l'accès `staff` ET une fiche d'annuaire (slug).
- Les fiches STAFF actives sont lisibles par tous les membres STAFF (y compris `email_pro` / `phone_pro`) : à ne renseigner que si cela convient.
- Pas de journal d'audit dédié (l'historique des missions existe) ni de gestion des projets par l'interface (Phase B). L'administration globale (interface) n'est **pas** développée en B0.
- Tests : Postgres réel via PGlite (`auth.uid()` et rôles simulés) ; à confirmer sur votre projet (Advisors + connexion d'un compte de chaque type).

## 8. Texte complet des migrations

### `supabase/migrations/20261101000100_b0_accounts_access.sql`

```sql
-- ============================================================================
-- SKYLINE APP — B0.1 : comptes, rôle GLOBAL, accès par espace, permissions STAFF HQ
-- Migration NON destructive (création uniquement). Rien n'est supprimé, aucune donnée n'est insérée.
--
-- TROIS NOTIONS DISTINCTES (jamais mélangées) :
--   1. RÔLE GLOBAL DE PLATEFORME (`platform_roles`) : `super_admin` = propriétaire de SKYLINE APP (GRAW). Administre les comptes,
--      invitations, activations, accès et rôles de TOUS les espaces. Ce n'est pas une permission STAFF HQ à lui seul.
--   2. ACCÈS PAR ESPACE (`space_access`) : `staff` (STAFF HQ) et/ou `members` (participants MEMBERS). Un compte peut CUMULER plusieurs accès.
--   3. PERMISSIONS STAFF HQ (`staff_roles`) : `admin` (TOM) ou `member` (QAFARD). N'existent QUE pour un compte ayant l'accès `staff`
--      (clé étrangère composite : retirer l'accès `staff` supprime ces permissions).
-- Un participant (accès `members` seul) n'a AUCUN droit STAFF : ni annuaire, ni missions, ni profils STAFF, ni comptes des autres.
-- Les futures données MEMBERS devront avoir leurs propres tables et politiques (`has_space('members')`), jamais celles de STAFF.
-- Principe : tout est REFUSÉ par défaut (RLS activée, aucun droit pour `anon`).
-- ============================================================================

create type public.platform_role as enum ('super_admin');
create type public.staff_role    as enum ('admin', 'member');
create type public.app_space     as enum ('staff', 'members');

-- Identité GLOBALE (tous espaces). Un compte invité naît INACTIF, sans rôle global ni accès.
create table public.accounts (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 60),
  active       boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.platform_roles (
  user_id    uuid not null references public.accounts (id) on delete cascade,
  role       public.platform_role not null,
  granted_by uuid references public.accounts (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.space_access (
  user_id    uuid not null references public.accounts (id) on delete cascade,
  space      public.app_space not null,
  granted_by uuid references public.accounts (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, space)
);

-- Permissions STAFF HQ : uniquement pour un compte ayant l'accès `staff` (clé composite, suppression en cascade).
create table public.staff_roles (
  user_id    uuid not null,
  role       public.staff_role not null,
  space      public.app_space not null default 'staff' check (space = 'staff'),
  granted_by uuid references public.accounts (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role),
  foreign key (user_id, space) references public.space_access (user_id, space) on delete cascade
);

-- Fiche d'annuaire STAFF (données propres à STAFF HQ, séparées de l'identité globale).
create table public.staff_profiles (
  user_id        uuid primary key references public.accounts (id) on delete cascade,
  slug           text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,30}$'),
  function_title text check (function_title is null or char_length(function_title) <= 80),
  email_pro      text check (email_pro is null or char_length(email_pro) <= 120),
  phone_pro      text check (phone_pro is null or char_length(phone_pro) <= 40),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.accounts       enable row level security;
alter table public.platform_roles enable row level security;
alter table public.space_access   enable row level security;
alter table public.staff_roles    enable row level security;
alter table public.staff_profiles enable row level security;

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger accounts_touch       before update on public.accounts       for each row execute function public.touch_updated_at();
create trigger staff_profiles_touch before update on public.staff_profiles for each row execute function public.touch_updated_at();

-- Invitation (Auth → Invite user) : crée un compte INACTIF, sans rôle global, sans aucun accès.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.accounts (id, display_name, active)
  values (new.id, left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'name'), ''), nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Compte'), 60), false);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- Aides (utilisées par la RLS)
-- SECURITY DEFINER : lisent les tables d'accès sans déclencher la RLS (évite la récursion). Toutes exigent un compte ACTIF.
create or replace function public.is_account_active() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.accounts a where a.id = auth.uid() and a.active) $$;
create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_account_active() and exists (select 1 from public.platform_roles pr where pr.user_id = auth.uid() and pr.role = 'super_admin') $$;
create or replace function public.has_space(s public.app_space) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_account_active() and exists (select 1 from public.space_access sa where sa.user_id = auth.uid() and sa.space = s) $$;
-- Membre de STAFF HQ : accès `staff` ET (permission STAFF OU super admin). Un participant n'en est JAMAIS un.
create or replace function public.is_staff_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_space('staff') and (public.is_super_admin() or exists (select 1 from public.staff_roles sr where sr.user_id = auth.uid())) $$;
-- Coordination STAFF HQ (toutes les missions, attributions, validations) : permission `admin`, ou super admin ayant l'accès `staff`.
create or replace function public.is_staff_coordinator() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_space('staff') and (public.is_super_admin() or exists (select 1 from public.staff_roles sr where sr.user_id = auth.uid() and sr.role = 'admin')) $$;
-- Usage INTERNE (autres utilisateurs) : compte actif + accès staff + permission staff ou super admin.
create or replace function public.is_staff_user(u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.accounts a join public.space_access sa on sa.user_id = a.id and sa.space = 'staff'
                 where a.id = u and a.active
                   and (exists (select 1 from public.staff_roles sr where sr.user_id = u)
                        or exists (select 1 from public.platform_roles pr where pr.user_id = u and pr.role = 'super_admin'))) $$;
-- Visibilité d'une fiche STAFF : réservée aux membres STAFF (faux pour tout autre appelant, quel que soit `u` : aucun sondage possible).
create or replace function public.can_view_staff_profile(u uuid) returns boolean
language sql stable security definer set search_path = '' as $$ select public.is_staff_member() and public.is_staff_user(u) $$;
create or replace function public.is_validator_user(u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_staff_user(u) and (exists (select 1 from public.staff_roles sr where sr.user_id = u and sr.role = 'admin')
                                      or exists (select 1 from public.platform_roles pr where pr.user_id = u and pr.role = 'super_admin')) $$;

-- ---------------------------------------------------------------- Administration des comptes : SUPER ADMIN GLOBAL UNIQUEMENT
-- (Tom, `admin` STAFF, ne gère NI les comptes NI les accès NI les rôles.)
create or replace function public.manage_set_account_active(p_user uuid, p_active boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_super_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.accounts where id = p_user) then raise exception 'unknown_user'; end if;
  if not p_active and exists (select 1 from public.platform_roles where user_id = p_user and role = 'super_admin')
     and (select count(*) from public.platform_roles pr join public.accounts a on a.id = pr.user_id where pr.role = 'super_admin' and a.active) <= 1
  then raise exception 'last_super_admin'; end if;
  update public.accounts set active = p_active where id = p_user;
end $$;

create or replace function public.manage_set_platform_roles(p_user uuid, p_roles public.platform_role[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_super_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.accounts where id = p_user) then raise exception 'unknown_user'; end if;
  if exists (select 1 from public.platform_roles where user_id = p_user and role = 'super_admin')
     and not ('super_admin' = any (coalesce(p_roles, '{}')))
     and (select count(*) from public.platform_roles pr join public.accounts a on a.id = pr.user_id where pr.role = 'super_admin' and a.active) <= 1
  then raise exception 'last_super_admin'; end if;
  delete from public.platform_roles where user_id = p_user;
  insert into public.platform_roles (user_id, role, granted_by) select p_user, r, auth.uid() from unnest(coalesce(p_roles, '{}')) as r;
end $$;

-- Accès par espace (staff, members, ou les deux). Retirer `staff` supprime aussi les permissions STAFF du compte (cascade).
create or replace function public.manage_set_spaces(p_user uuid, p_spaces public.app_space[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_super_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.accounts where id = p_user) then raise exception 'unknown_user'; end if;
  delete from public.space_access where user_id = p_user and not (space = any (coalesce(p_spaces, '{}')));
  insert into public.space_access (user_id, space, granted_by) select p_user, s, auth.uid() from unnest(coalesce(p_spaces, '{}')) as s on conflict do nothing;
end $$;

-- Permissions STAFF HQ : le compte doit déjà avoir l'accès `staff`.
create or replace function public.manage_set_staff_roles(p_user uuid, p_roles public.staff_role[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_super_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.space_access where user_id = p_user and space = 'staff') then raise exception 'no_staff_access'; end if;
  delete from public.staff_roles where user_id = p_user;
  insert into public.staff_roles (user_id, role, granted_by) select p_user, r, auth.uid() from unnest(coalesce(p_roles, '{}')) as r;
end $$;

create or replace function public.manage_upsert_staff_profile(p_user uuid, p_slug text, p_function_title text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_super_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.space_access where user_id = p_user and space = 'staff') then raise exception 'no_staff_access'; end if;
  insert into public.staff_profiles (user_id, slug, function_title) values (p_user, p_slug, p_function_title)
  on conflict (user_id) do update set slug = excluded.slug, function_title = excluded.function_title;
end $$;

create or replace function public.manage_update_account(p_user uuid, p_display_name text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_super_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.accounts set display_name = coalesce(nullif(left(btrim(p_display_name), 60), ''), display_name) where id = p_user;
end $$;

-- Annuaire STAFF : membres STAFF actifs avec leur fiche et leurs rôles. Vide pour tout compte qui n'est pas membre STAFF (ex. participant).
create or replace function public.list_team()
returns table (id uuid, slug text, display_name text, function_title text, platform_roles public.platform_role[], staff_roles public.staff_role[])
language sql stable security definer set search_path = '' as $$
  select a.id, sp.slug, a.display_name, sp.function_title,
         coalesce((select array_agg(pr.role order by pr.role) from public.platform_roles pr where pr.user_id = a.id), '{}'::public.platform_role[]),
         coalesce((select array_agg(sr.role order by sr.role) from public.staff_roles sr where sr.user_id = a.id), '{}'::public.staff_role[])
  from public.accounts a join public.staff_profiles sp on sp.user_id = a.id
  where public.is_staff_member() and public.is_staff_user(a.id)
  order by a.display_name
$$;

-- ---------------------------------------------------------------- Droits d'exécution : jamais pour l'anonyme
revoke execute on all functions in schema public from public, anon;
grant execute on function public.is_account_active(), public.is_super_admin(), public.has_space(public.app_space),
  public.is_staff_member(), public.is_staff_coordinator(), public.can_view_staff_profile(uuid), public.list_team(),
  public.manage_set_account_active(uuid, boolean), public.manage_set_platform_roles(uuid, public.platform_role[]),
  public.manage_set_spaces(uuid, public.app_space[]), public.manage_set_staff_roles(uuid, public.staff_role[]),
  public.manage_upsert_staff_profile(uuid, text, text), public.manage_update_account(uuid, text)
  to authenticated;
-- NON exécutables par les utilisateurs (usage interne par d'autres fonctions SECURITY DEFINER / déclencheurs) :
--   is_staff_user(uuid), is_validator_user(uuid) → évite de laisser sonder les accès d'un identifiant quelconque.
-- (Supabase accorde par défaut EXECUTE à `authenticated` sur les nouvelles fonctions : il faut donc le retirer EXPLICITEMENT.)
revoke execute on function public.is_staff_user(uuid), public.is_validator_user(uuid), public.handle_new_user(), public.touch_updated_at() from authenticated;
```

### `supabase/migrations/20261101000200_b0_missions.sql`

```sql
-- ============================================================================
-- STAFF HQ V2 — B0.2 : projets et missions
-- Migration NON destructive (création uniquement). Aucune donnée insérée.
-- Écritures : UNIQUEMENT via les fonctions ci-dessous (pas de INSERT/UPDATE/DELETE direct pour les utilisateurs).
-- Les règles reprennent src/domain/missions.ts ; la base est la source de vérité.
-- ============================================================================

create type public.mission_status   as enum ('todo', 'in_progress', 'review', 'done');
create type public.mission_priority as enum ('normal', 'high', 'urgent');

create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 80),
  description text not null default '' check (char_length(description) <= 500),
  owner_id    uuid references public.accounts (id) on delete set null,
  archived_at timestamptz,
  created_at  timestamptz not null default now()
);
create table public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id    uuid not null references public.accounts (id) on delete cascade,
  primary key (project_id, user_id)
);

create table public.missions (
  id                   uuid primary key default gen_random_uuid(),
  title                text not null check (char_length(btrim(title)) between 1 and 120),
  description          text not null default '' check (char_length(description) <= 500),
  creator_id           uuid not null references public.accounts (id),
  assignee_id          uuid not null references public.accounts (id),
  -- Attribution PROPOSÉE par un membre pour un autre : sans effet tant qu'un admin ne l'a pas approuvée.
  proposed_assignee_id uuid references public.accounts (id),
  -- Validateur désigné : un administrateur (GRAW ou TOM). GRAW garde un droit d'intervention global.
  validator_id         uuid not null references public.accounts (id),
  project_id           uuid references public.projects (id) on delete set null,
  priority             public.mission_priority not null default 'normal',
  status               public.mission_status not null default 'todo',
  due_date             date,
  archived_at          timestamptz,
  version              integer not null default 1,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint missions_validator_not_assignee check (validator_id <> assignee_id),
  constraint missions_proposed_valid check (proposed_assignee_id is null or (proposed_assignee_id <> assignee_id and proposed_assignee_id <> validator_id))
);
create index missions_assignee_idx  on public.missions (assignee_id);
create index missions_creator_idx   on public.missions (creator_id);
create index missions_validator_idx on public.missions (validator_id);
create index missions_status_idx    on public.missions (status) where archived_at is null;
create index missions_due_idx       on public.missions (due_date) where archived_at is null;
create index missions_project_idx   on public.missions (project_id);

-- Historique : ajout seulement (aucune politique de modification ni de suppression).
create table public.mission_events (
  id          bigint generated always as identity primary key,
  mission_id  uuid not null references public.missions (id) on delete cascade,
  at          timestamptz not null default now(),
  actor_id    uuid not null references public.accounts (id),
  kind        text not null check (kind in ('created', 'edited', 'status', 'validated', 'returned', 'assignment_proposed',
                                            'assignment_approved', 'assignment_rejected', 'reassigned', 'archived')),
  from_status public.mission_status,
  to_status   public.mission_status,
  note        text check (note is null or char_length(note) <= 200)
);
create index mission_events_mission_idx on public.mission_events (mission_id, at);

create table public.mission_comments (
  id         uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions (id) on delete cascade,
  author_id  uuid not null references public.accounts (id),
  body       text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index mission_comments_mission_idx on public.mission_comments (mission_id, created_at);

alter table public.projects         enable row level security;
alter table public.project_members  enable row level security;
alter table public.missions         enable row level security;
alter table public.mission_events   enable row level security;
alter table public.mission_comments enable row level security;

-- Appartenance à un projet (SECURITY DEFINER : évite la récursion de la RLS sur project_members).
create or replace function public.is_project_member(p_project uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.project_members pm where pm.project_id = p_project and pm.user_id = auth.uid()) $$;

-- ---------------------------------------------------------------- Visibilité d'une mission (membres STAFF uniquement : un participant ne voit JAMAIS une mission)
create or replace function public.can_view_mission(p_mission uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_staff_member() and exists (
    select 1 from public.missions m
    where m.id = p_mission and (
      public.is_staff_coordinator()
      or auth.uid() in (m.creator_id, m.assignee_id, m.validator_id)
      or m.proposed_assignee_id = auth.uid()
      or (m.project_id is not null and public.is_project_member(m.project_id))
    ))
$$;

-- ---------------------------------------------------------------- Écritures contrôlées
create or replace function public.create_mission(
  p_title text, p_description text, p_assignee uuid, p_validator uuid, p_due date,
  p_priority public.mission_priority default 'normal', p_status public.mission_status default 'todo', p_project uuid default null
) returns public.missions
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); coord boolean; eff uuid; proposed uuid; m public.missions;
begin
  if me is null or not public.is_staff_member() then raise exception 'forbidden' using errcode = '42501'; end if;
  coord := public.is_staff_coordinator();
  if btrim(coalesce(p_title, '')) = '' or char_length(btrim(p_title)) > 120 then raise exception 'invalid_title'; end if;
  if char_length(coalesce(p_description, '')) > 500 then raise exception 'invalid_description'; end if;
  if not public.is_staff_user(p_assignee) then raise exception 'invalid_assignee'; end if;
  if not public.is_validator_user(p_validator) then raise exception 'invalid_validator'; end if;
  if p_status = 'done' and not coord then raise exception 'forbidden_status' using errcode = '42501'; end if;
  if p_assignee <> me and not coord then eff := me; proposed := p_assignee; else eff := p_assignee; proposed := null; end if;
  if p_validator = eff or p_validator = proposed then raise exception 'validator_conflict'; end if;
  if p_project is not null and not (coord or public.is_project_member(p_project))
  then raise exception 'forbidden_project' using errcode = '42501'; end if;

  insert into public.missions (title, description, creator_id, assignee_id, proposed_assignee_id, validator_id, project_id, priority, status, due_date)
  values (btrim(p_title), btrim(coalesce(p_description, '')), me, eff, proposed, p_validator, p_project, p_priority, p_status, p_due)
  returning * into m;
  insert into public.mission_events (mission_id, actor_id, kind) values (m.id, me, 'created');
  if proposed is not null then
    insert into public.mission_events (mission_id, actor_id, kind, note) values (m.id, me, 'assignment_proposed', proposed::text);
  end if;
  return m;
end $$;

create or replace function public.update_mission(
  p_id uuid, p_expected_version integer, p_title text, p_description text, p_validator uuid,
  p_due date, p_priority public.mission_priority, p_project uuid default null
) returns public.missions
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); m public.missions; changed text[] := '{}';
begin
  if me is null or not public.is_staff_member() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into m from public.missions where id = p_id for update;
  if not found or not public.can_view_mission(p_id) then raise exception 'not_found'; end if;
  if m.archived_at is not null then raise exception 'archived'; end if;
  if not (public.is_staff_coordinator() or m.creator_id = me) then raise exception 'forbidden' using errcode = '42501'; end if;
  if m.version <> p_expected_version then raise exception 'version_conflict'; end if;
  if btrim(coalesce(p_title, '')) = '' or char_length(btrim(p_title)) > 120 then raise exception 'invalid_title'; end if;
  if char_length(coalesce(p_description, '')) > 500 then raise exception 'invalid_description'; end if;
  if not public.is_validator_user(p_validator) then raise exception 'invalid_validator'; end if;
  if p_validator = m.assignee_id or p_validator = m.proposed_assignee_id then raise exception 'validator_conflict'; end if;
  if p_project is not null and not (public.is_staff_coordinator() or public.is_project_member(p_project))
  then raise exception 'forbidden_project' using errcode = '42501'; end if;
  if btrim(p_title) <> m.title then changed := array_append(changed, 'title'); end if;
  if btrim(coalesce(p_description, '')) <> m.description then changed := array_append(changed, 'description'); end if;
  if p_validator <> m.validator_id then changed := array_append(changed, 'validatorId'); end if;
  if p_due is distinct from m.due_date then changed := array_append(changed, 'dueDate'); end if;
  if p_priority <> m.priority then changed := array_append(changed, 'priority'); end if;
  if p_project is distinct from m.project_id then changed := array_append(changed, 'project'); end if;
  if cardinality(changed) = 0 then return m; end if;
  update public.missions set title = btrim(p_title), description = btrim(coalesce(p_description, '')), validator_id = p_validator,
         due_date = p_due, priority = p_priority, project_id = p_project, version = version + 1, updated_at = now()
  where id = p_id returning * into m;
  insert into public.mission_events (mission_id, actor_id, kind, note) values (p_id, me, 'edited', array_to_string(changed, ', '));
  return m;
end $$;

create or replace function public.set_mission_status(p_id uuid, p_to public.mission_status, p_note text default null) returns public.missions
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); m public.missions; old public.mission_status; ok boolean := false; k text := 'status'; n text := nullif(left(btrim(coalesce(p_note, '')), 200), '');
begin
  if me is null or not public.is_staff_member() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into m from public.missions where id = p_id for update;
  if not found or not public.can_view_mission(p_id) then raise exception 'not_found'; end if;
  if m.archived_at is not null then raise exception 'archived'; end if;
  if p_to = m.status then raise exception 'same_status'; end if;
  old := m.status;
  if public.is_staff_coordinator() then ok := true;
  else
    -- Validateur désigné : valider (terminée) ou renvoyer en cours, uniquement depuis « en validation ».
    if m.validator_id = me and old = 'review' and p_to in ('done', 'in_progress') then ok := true; end if;
    -- Responsable : jamais « terminée » (seule la validation clôt une mission).
    if m.assignee_id = me and (
         (old = 'todo' and p_to = 'in_progress')
      or (old = 'in_progress' and p_to in ('todo', 'review'))
      or (old = 'review' and p_to = 'in_progress')) then ok := true; end if;
  end if;
  if not ok then raise exception 'forbidden_transition' using errcode = '42501'; end if;
  if old = 'review' and p_to = 'done' then k := 'validated';
  elsif old = 'review' and p_to = 'in_progress' and m.validator_id = me then k := 'returned'; end if;
  update public.missions set status = p_to, version = version + 1, updated_at = now() where id = p_id returning * into m;
  insert into public.mission_events (mission_id, actor_id, kind, from_status, to_status, note) values (p_id, me, k, old, p_to, n);
  return m;
end $$;

-- Attribuer / réattribuer. Admin : effet immédiat. Créateur ou responsable (member) : PROPOSITION à valider par un admin.
create or replace function public.assign_mission(p_id uuid, p_assignee uuid) returns public.missions
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); m public.missions;
begin
  if me is null or not public.is_staff_member() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into m from public.missions where id = p_id for update;
  if not found or not public.can_view_mission(p_id) then raise exception 'not_found'; end if;
  if m.archived_at is not null then raise exception 'archived'; end if;
  if not public.is_staff_user(p_assignee) then raise exception 'invalid_assignee'; end if;
  if p_assignee = m.assignee_id then raise exception 'same_assignee'; end if;
  if p_assignee = m.validator_id then raise exception 'validator_conflict'; end if;
  if public.is_staff_coordinator() then
    update public.missions set assignee_id = p_assignee, proposed_assignee_id = null, version = version + 1, updated_at = now() where id = p_id returning * into m;
    insert into public.mission_events (mission_id, actor_id, kind, note) values (p_id, me, 'reassigned', p_assignee::text);
  elsif m.creator_id = me or m.assignee_id = me then
    update public.missions set proposed_assignee_id = p_assignee, version = version + 1, updated_at = now() where id = p_id returning * into m;
    insert into public.mission_events (mission_id, actor_id, kind, note) values (p_id, me, 'assignment_proposed', p_assignee::text);
  else raise exception 'forbidden' using errcode = '42501'; end if;
  return m;
end $$;

-- Approuver ou refuser une proposition d'attribution : admin et super admin uniquement.
create or replace function public.resolve_assignment(p_id uuid, p_approve boolean, p_note text default null) returns public.missions
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); m public.missions; proposed uuid; n text := nullif(left(btrim(coalesce(p_note, '')), 200), '');
begin
  if me is null or not public.is_staff_coordinator() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into m from public.missions where id = p_id for update;
  if not found then raise exception 'not_found'; end if;
  if m.archived_at is not null then raise exception 'archived'; end if;
  proposed := m.proposed_assignee_id;
  if proposed is null then raise exception 'no_pending_assignment'; end if;
  if p_approve then
    if proposed = m.validator_id then raise exception 'validator_conflict'; end if;
    if not public.is_staff_user(proposed) then raise exception 'invalid_assignee'; end if;
    update public.missions set assignee_id = proposed, proposed_assignee_id = null, version = version + 1, updated_at = now() where id = p_id returning * into m;
    insert into public.mission_events (mission_id, actor_id, kind, note) values (p_id, me, 'assignment_approved', coalesce(n, proposed::text));
  else
    update public.missions set proposed_assignee_id = null, version = version + 1, updated_at = now() where id = p_id returning * into m;
    insert into public.mission_events (mission_id, actor_id, kind, note) values (p_id, me, 'assignment_rejected', coalesce(n, proposed::text));
  end if;
  return m;
end $$;

create or replace function public.add_mission_comment(p_id uuid, p_body text) returns public.mission_comments
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); c public.mission_comments;
begin
  if me is null or not public.is_staff_member() or not public.can_view_mission(p_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  if btrim(coalesce(p_body, '')) = '' or char_length(btrim(p_body)) > 1000 then raise exception 'invalid_comment'; end if;
  insert into public.mission_comments (mission_id, author_id, body) values (p_id, me, btrim(p_body)) returning * into c;
  return c;
end $$;

create or replace function public.archive_mission(p_id uuid) returns public.missions
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); m public.missions;
begin
  if me is null or not public.is_staff_member() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into m from public.missions where id = p_id for update;
  if not found or not public.can_view_mission(p_id) then raise exception 'not_found'; end if;
  if not (public.is_staff_coordinator() or m.creator_id = me) then raise exception 'forbidden' using errcode = '42501'; end if;
  if m.archived_at is not null then raise exception 'archived'; end if;
  update public.missions set archived_at = now(), version = version + 1, updated_at = now() where id = p_id returning * into m;
  insert into public.mission_events (mission_id, actor_id, kind) values (p_id, me, 'archived');
  return m;
end $$;

-- Suppression DÉFINITIVE (avec son historique et ses commentaires) : admin et super admin uniquement. Préférer l'archivage.
create or replace function public.delete_mission(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_staff_coordinator() then raise exception 'forbidden' using errcode = '42501'; end if;
  delete from public.missions where id = p_id;
  if not found then raise exception 'not_found'; end if;
end $$;

-- ---------------------------------------------------------------- Droits d'exécution : jamais pour l'anonyme
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.is_project_member(uuid), public.can_view_mission(uuid),
  public.create_mission(text, text, uuid, uuid, date, public.mission_priority, public.mission_status, uuid),
  public.update_mission(uuid, integer, text, text, uuid, date, public.mission_priority, uuid),
  public.set_mission_status(uuid, public.mission_status, text),
  public.assign_mission(uuid, uuid), public.resolve_assignment(uuid, boolean, text),
  public.add_mission_comment(uuid, text), public.archive_mission(uuid), public.delete_mission(uuid)
  to authenticated;
```

### `supabase/migrations/20261101000300_b0_rls_policies.sql`

```sql
-- ============================================================================
-- STAFF HQ V2 — B0.3 : politiques RLS et privilèges
-- Migration NON destructive. Principe : REFUS PAR DÉFAUT.
--  - `anon` : aucun droit sur aucune table.
--  - `authenticated` : lecture seulement (selon les politiques) ; les écritures passent par les fonctions SECURITY DEFINER.
--  - Aucune politique INSERT / UPDATE / DELETE sur missions, historique, commentaires, rôles.
-- ============================================================================

revoke all on public.accounts, public.platform_roles, public.space_access, public.staff_roles, public.staff_profiles,
              public.projects, public.project_members, public.missions, public.mission_events, public.mission_comments from anon, authenticated;
grant select on public.accounts, public.platform_roles, public.space_access, public.staff_roles, public.staff_profiles,
                public.projects, public.project_members, public.missions, public.mission_events, public.mission_comments to authenticated;
-- Chacun ne peut modifier que SES informations personnelles (jamais `active`, ni accès, ni rôles, ni slug, ni fonction).
grant update (display_name) on public.accounts to authenticated;
grant update (email_pro, phone_pro) on public.staff_profiles to authenticated;

-- accounts : IDENTITÉ GLOBALE. Chacun ne lit que son propre compte ; le super admin lit tout. Un participant ne voit AUCUN autre compte.
create policy accounts_select on public.accounts for select to authenticated
  using (id = auth.uid() or public.is_super_admin());
create policy accounts_update_own on public.accounts for update to authenticated
  using (id = auth.uid() and active) with check (id = auth.uid());

-- platform_roles / space_access / staff_roles : chacun lit ses propres lignes ; le super admin lit tout. Aucune écriture directe (fonctions manage_*).
-- L'annuaire des rôles passe par list_team() (réservé aux membres STAFF) : un membre STAFF ne lit pas directement les accès des autres.
create policy platform_roles_select on public.platform_roles for select to authenticated using (user_id = auth.uid() or public.is_super_admin());
create policy space_access_select   on public.space_access   for select to authenticated using (user_id = auth.uid() or public.is_super_admin());
create policy staff_roles_select    on public.staff_roles    for select to authenticated using (user_id = auth.uid() or public.is_super_admin());

-- staff_profiles : DONNÉES STAFF (fonction, coordonnées pro). Lisibles par les membres STAFF et le super admin ; JAMAIS par un participant.
create policy staff_profiles_select on public.staff_profiles for select to authenticated
  using (user_id = auth.uid() or public.is_super_admin() or public.can_view_staff_profile(user_id));
create policy staff_profiles_update_own on public.staff_profiles for update to authenticated
  using (user_id = auth.uid() and public.is_staff_member()) with check (user_id = auth.uid());

-- projects / project_members : coordinateurs STAFF, propriétaire et membres du projet.
create policy projects_select on public.projects for select to authenticated
  using (public.is_staff_member() and (public.is_staff_coordinator() or owner_id = auth.uid() or public.is_project_member(id)));
create policy project_members_select on public.project_members for select to authenticated
  using (public.is_staff_member() and (public.is_staff_coordinator() or user_id = auth.uid() or public.is_project_member(project_id)));

-- missions : coordinateurs STAFF (admin, super admin) = tout ; sinon créateur, responsable, validateur, proposé ou membre du projet.
create policy missions_select on public.missions for select to authenticated
  using (public.is_staff_member() and (public.is_staff_coordinator()
         or auth.uid() in (creator_id, assignee_id, validator_id) or proposed_assignee_id = auth.uid()
         or (project_id is not null and public.is_project_member(project_id))));

create policy mission_events_select on public.mission_events for select to authenticated using (public.can_view_mission(mission_id));
create policy mission_comments_select on public.mission_comments for select to authenticated using (public.can_view_mission(mission_id));

-- Filet de sécurité : les FUTURES fonctions du schéma public ne sont jamais exécutables par l'anonyme par défaut.
revoke execute on all functions in schema public from public, anon;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated; -- futures fonctions : droits à accorder explicitement
```

## 9. Script d'attribution initiale (manuel, un seul bloc atomique)

`supabase/bootstrap/B0_roles_template.sql` — après les migrations et la création des comptes ; remplacer les trois adresses. Toute vérification qui échoue annule automatiquement l'ensemble.

```sql
-- ============================================================================
-- SKYLINE APP — B0 : attribution INITIALE des trois comptes (à exécuter À LA MAIN, une seule fois)
-- Ce n'est PAS une migration : elle n'est jamais appliquée automatiquement.
--
-- Modèle d'accès (voir la migration 0100) :
--   GRAW   → rôle GLOBAL super_admin + accès à l'espace STAFF (coordination STAFF via son statut de super admin)
--   TOM    → accès STAFF + permission STAFF `admin`
--   QAFARD → accès STAFF + permission STAFF `member`
-- Aucun accès MEMBERS n'est attribué ici (aucun participant en B0). Pour cumuler plus tard : `manage_set_spaces`.
--
-- ATOMIQUE PAR CONSTRUCTION : tout le script est UN SEUL bloc DO (une seule instruction). Si une vérification échoue,
-- PostgreSQL annule automatiquement TOUTES les modifications du bloc : il n'y a ni COMMIT ni ROLLBACK à gérer à la main.
--
-- Prérequis : migrations 0100 / 0200 / 0300 appliquées ; les trois comptes existent déjà (Authentication → Users → Invite user).
-- À FAIRE : remplacer les trois adresses (lignes « v_… := »). Rien n'est inventé : tant qu'une adresse porte encore
--           le texte « REMPLACER », le script refuse de s'exécuter.
-- Ce script ne supprime AUCUNE donnée. Il peut être relancé sans effet si l'état est déjà correct.
-- ============================================================================

do $bootstrap$
declare
  -- ► À REMPLACER (adresses exactes des trois comptes) :
  v_graw   text := lower(btrim('REMPLACER-PAR-L-EMAIL-DE-GRAW'));
  v_tom    text := lower(btrim('REMPLACER-PAR-L-EMAIL-DE-TOM'));
  v_qafard text := lower(btrim('REMPLACER-PAR-L-EMAIL-DE-QAFARD'));
  -- Connexion UNIQUEMENT par code e-mail / lien magique : refuser un compte qui possède un mot de passe.
  v_require_passwordless boolean := true;

  -- slug, e-mail, nom affiché, fonction, rôle global ('' = aucun), permission STAFF ('' = aucune)
  v_spec  text[][];
  v_slug  text; v_email text; v_name text; v_title text; v_platform text; v_staff text;
  v_uid uuid; v_cnt int; v_u jsonb; v_other uuid;
  v_ids uuid[] := '{}';
begin
  v_spec := array[
    array['graw',   v_graw,   'Graw',   'Directeur Artistique & Digital', 'super_admin', ''],
    array['tom',    v_tom,    'Tom',    'Fondateur',                      '',            'admin'],
    array['qafard', v_qafard, 'Qafard', 'Photographe',                    '',            'member']
  ];

  -- 1. Adresses renseignées, valides et DISTINCTES --------------------------------------------------------------
  foreach v_email in array array[v_graw, v_tom, v_qafard] loop
    if v_email like '%remplacer%' then raise exception 'BOOTSTRAP ANNULÉ : une adresse n''a pas été remplacée (%).', v_email; end if;
    if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'BOOTSTRAP ANNULÉ : adresse invalide (%).', v_email; end if;
  end loop;
  if (select count(distinct e) from unnest(array[v_graw, v_tom, v_qafard]) e) <> 3 then
    raise exception 'BOOTSTRAP ANNULÉ : les trois adresses doivent être distinctes.';
  end if;

  -- 2. Pour chaque compte : existence UNIQUE, état sain, compte, absence de conflit ------------------------------
  for i in 1 .. 3 loop
    v_slug := v_spec[i][1]; v_email := v_spec[i][2]; v_name := v_spec[i][3]; v_title := v_spec[i][4]; v_platform := v_spec[i][5]; v_staff := v_spec[i][6];

    select count(*) into v_cnt from auth.users where lower(btrim(email)) = v_email;
    if v_cnt = 0 then raise exception 'BOOTSTRAP ANNULÉ : compte introuvable pour % (%). Créez-le d''abord (Authentication → Users → Invite user).', v_slug, v_email; end if;
    if v_cnt > 1 then raise exception 'BOOTSTRAP ANNULÉ : plusieurs comptes pour % (%).', v_slug, v_email; end if;
    select id, to_jsonb(u) into v_uid, v_u from auth.users u where lower(btrim(email)) = v_email;
    v_ids := v_ids || v_uid;

    if v_u ->> 'email_confirmed_at' is null then raise exception 'BOOTSTRAP ANNULÉ : l''adresse de % n''est pas confirmée.', v_slug; end if;
    if v_u ->> 'deleted_at' is not null then raise exception 'BOOTSTRAP ANNULÉ : le compte % est supprimé.', v_slug; end if;
    if v_u ->> 'banned_until' is not null and (v_u ->> 'banned_until')::timestamptz > now() then raise exception 'BOOTSTRAP ANNULÉ : le compte % est suspendu.', v_slug; end if;
    if coalesce((v_u ->> 'is_anonymous')::boolean, false) then raise exception 'BOOTSTRAP ANNULÉ : le compte % est anonyme.', v_slug; end if;
    if v_require_passwordless and coalesce(v_u ->> 'encrypted_password', '') <> '' then
      raise exception 'BOOTSTRAP ANNULÉ : le compte % possède un mot de passe. Connexion par code e-mail uniquement : supprimez ce compte et recréez-le via « Invite user » (sans mot de passe).', v_slug;
    end if;

    -- Compte global (créé par le déclencheur à la création ; recréé ici s'il manque), inactif tant que tout n'est pas validé.
    if not exists (select 1 from public.accounts where id = v_uid) then
      insert into public.accounts (id, display_name, active) values (v_uid, v_name, false);
    end if;
    -- Slug déjà pris par une AUTRE fiche STAFF ?
    select user_id into v_other from public.staff_profiles where slug = v_slug and user_id <> v_uid;
    if v_other is not null then raise exception 'BOOTSTRAP ANNULÉ : le slug « % » appartient déjà à un autre compte.', v_slug; end if;
    -- Rôles / permissions existants : aucun, ou exactement ceux attendus (relance sans effet). Tout autre = conflit.
    if exists (select 1 from public.platform_roles where user_id = v_uid and role::text <> v_platform) then
      raise exception 'BOOTSTRAP ANNULÉ : le compte % a déjà un rôle global différent de « % ».', v_slug, v_platform;
    end if;
    if exists (select 1 from public.staff_roles where user_id = v_uid and role::text <> v_staff) then
      raise exception 'BOOTSTRAP ANNULÉ : le compte % a déjà une permission STAFF différente de « % ».', v_slug, v_staff;
    end if;
  end loop;

  -- 3. Équipe active = ces trois comptes UNIQUEMENT --------------------------------------------------------------
  if exists (select 1 from public.space_access sa join public.accounts a on a.id = sa.user_id
             where sa.space = 'staff' and a.active and sa.user_id <> all (v_ids)) then
    raise exception 'BOOTSTRAP ANNULÉ : un autre compte actif possède déjà l''accès STAFF.';
  end if;
  if exists (select 1 from public.platform_roles where role = 'super_admin' and user_id <> all (v_ids)) then
    raise exception 'BOOTSTRAP ANNULÉ : un autre super_admin existe déjà.';
  end if;

  -- 4. Attribution (dans la même instruction : tout ou rien) ---------------------------------------------------------
  for i in 1 .. 3 loop
    select id into v_uid from auth.users where lower(btrim(email)) = v_spec[i][2];
    update public.accounts set display_name = v_spec[i][3], active = true where id = v_uid;
    insert into public.space_access (user_id, space) values (v_uid, 'staff') on conflict do nothing;
    if v_spec[i][5] <> '' then insert into public.platform_roles (user_id, role) values (v_uid, v_spec[i][5]::public.platform_role) on conflict do nothing; end if;
    if v_spec[i][6] <> '' then insert into public.staff_roles (user_id, role) values (v_uid, v_spec[i][6]::public.staff_role) on conflict do nothing; end if;
    insert into public.staff_profiles (user_id, slug, function_title) values (v_uid, v_spec[i][1], v_spec[i][4])
      on conflict (user_id) do update set slug = excluded.slug, function_title = excluded.function_title;
  end loop;

  -- 5. Vérification finale : sinon TOUT est annulé ------------------------------------------------------------------
  for i in 1 .. 3 loop
    select id into v_uid from auth.users where lower(btrim(email)) = v_spec[i][2];
    if not exists (select 1 from public.accounts where id = v_uid and active)
       or not exists (select 1 from public.space_access where user_id = v_uid and space = 'staff')
       or not exists (select 1 from public.staff_profiles where user_id = v_uid and slug = v_spec[i][1])
       or (select count(*) from public.platform_roles where user_id = v_uid and role::text = v_spec[i][5]) <> (case when v_spec[i][5] = '' then 0 else 1 end)
       or (select count(*) from public.platform_roles where user_id = v_uid) <> (case when v_spec[i][5] = '' then 0 else 1 end)
       or (select count(*) from public.staff_roles where user_id = v_uid and role::text = v_spec[i][6]) <> (case when v_spec[i][6] = '' then 0 else 1 end)
       or (select count(*) from public.staff_roles where user_id = v_uid) <> (case when v_spec[i][6] = '' then 0 else 1 end) then
      raise exception 'BOOTSTRAP ANNULÉ : contrôle final en échec pour %.', v_spec[i][1];
    end if;
  end loop;
  if (select count(*) from public.platform_roles) <> 1 or (select count(*) from public.staff_roles) <> 2
     or (select count(*) from public.space_access where space = 'staff') <> 3 then
    raise exception 'BOOTSTRAP ANNULÉ : les totaux (1 rôle global, 2 permissions STAFF, 3 accès STAFF) ne correspondent pas.';
  end if;

  raise notice 'BOOTSTRAP OK : graw=super_admin global + accès STAFF, tom=admin STAFF, qafard=member STAFF.';
end
$bootstrap$;

-- Contrôle visuel (lecture seule) : doit afficher exactement 3 lignes.
select sp.slug, a.display_name, sp.function_title, a.active,
       (select array_agg(pr.role) from public.platform_roles pr where pr.user_id = a.id) as role_global,
       (select array_agg(sa.space) from public.space_access sa where sa.user_id = a.id) as acces,
       (select array_agg(sr.role) from public.staff_roles sr where sr.user_id = a.id) as permissions_staff
from public.accounts a join public.staff_profiles sp on sp.user_id = a.id order by sp.slug;
```
