# STAFF HQ V2 — B0 : revue de sécurité des migrations SQL

**Statut : NON EXÉCUTÉES.** Ce document contient (1) la revue des permissions, des fonctions `SECURITY DEFINER` et des politiques RLS, puis (2) le texte COMPLET des trois migrations et du script d'attribution des rôles. Les fichiers sources sont dans `supabase/migrations/` et `supabase/bootstrap/`.

## 1. Principes
1. **Refus par défaut.** RLS activée sur les 7 tables ; `anon` n'a aucun privilège ; aucune politique d'écriture.
2. **Écritures uniquement par fonctions** `SECURITY DEFINER` qui revérifient identité, profil actif, rôle et règles métier (miroir de `src/domain/missions.ts`). Les utilisateurs n'ont **aucun** `INSERT` / `UPDATE` / `DELETE` direct sur `missions`, `mission_events`, `mission_comments`, `user_roles`.
3. **Comptes séparés des droits** : un compte invité naît **inactif et sans rôle** ; seul le super admin active et attribue (fonctions `manage_*`). Rôles applicatifs ≠ fonction professionnelle (libellé).
4. **Historique non modifiable** : ajout seulement, aucune politique ni privilège de modification.
5. **Aucune donnée insérée** par les migrations ; aucune instruction destructive (`drop`, `truncate`, `delete`).

## 2. Privilèges sur les tables (après les 3 migrations)
| Table | `anon` | `authenticated` |
|---|---|---|
| `profiles` | aucun | SELECT (RLS) ; UPDATE limité aux colonnes `display_name`, `email_pro`, `phone_pro` (RLS : sa propre ligne, compte actif) |
| `user_roles` | aucun | SELECT (RLS) uniquement |
| `projects`, `project_members` | aucun | SELECT (RLS) uniquement |
| `missions`, `mission_events`, `mission_comments` | aucun | SELECT (RLS) uniquement |
`service_role` (clé secrète, **non utilisée par l'application**) contourne la RLS par conception Supabase : elle ne doit jamais figurer dans le code client ni dans les variables `NEXT_PUBLIC_*`.

## 3. Politiques RLS
| Table | Politique | Qui peut lire / écrire |
|---|---|---|
| `profiles` | `profiles_select` | sa propre ligne ; les profils actifs pour tout membre actif ; tout pour le super admin |
| `profiles` | `profiles_update_own` | sa propre ligne si actif ; `with check (id = auth.uid())` + privilèges de colonnes (ni `active`, ni `slug`, ni fonction, ni rôles) |
| `user_roles` | `user_roles_select` | ses propres rôles ; tous pour le super admin |
| `projects` | `projects_select` | coordinateurs (admin, super admin), propriétaire, membres du projet |
| `project_members` | `project_members_select` | coordinateurs, soi-même, membres du même projet |
| `missions` | `missions_select` | membre actif ET (coordinateur OU créateur / responsable / validateur / proposé OU membre du projet) |
| `mission_events`, `mission_comments` | `*_select` | si la mission est visible (`can_view_mission`) |
Aucune politique `INSERT` / `UPDATE` / `DELETE` sur ces tables (hors `profiles_update_own`).

## 4. Inventaire des fonctions `SECURITY DEFINER` (toutes avec `search_path = ''`, objets qualifiés)
| Fonction | Exécutable par | Pourquoi DEFINER | Contrôles internes |
|---|---|---|---|
| `has_role`, `is_active_member`, `is_coordinator`, `is_super_admin` | utilisateurs connectés | lire `user_roles` sans récursion de RLS | rôle lu pour `auth.uid()` ; **faux si profil inactif** |
| `is_project_member(uuid)` | utilisateurs connectés | éviter la récursion sur `project_members` | appartenance de `auth.uid()` |
| `can_view_mission(uuid)` | utilisateurs connectés | utilisée par les politiques d'historique / commentaires | membre actif + règle de visibilité |
| `list_team()` | utilisateurs connectés | annuaire (profils actifs + rôles) | **vide** si l'appelant n'est pas membre actif |
| `manage_set_roles`, `manage_set_active`, `manage_update_profile` | utilisateurs connectés, mais **super admin uniquement** | modifier rôles / activation | `is_super_admin()` sinon `42501` ; **dernier super admin protégé** |
| `create_mission`, `update_mission`, `set_mission_status`, `assign_mission`, `resolve_assignment`, `add_mission_comment`, `archive_mission`, `delete_mission` | utilisateurs connectés | seules voies d'écriture (historique écrit dans la même transaction) | `auth.uid()` non nul, membre actif, règles de rôle/statut/validateur, verrou `for update`, verrou de version (`update_mission`) |
| `current_roles`, `is_active_user`, `is_validator_user` | **personne** (usage interne) | aides internes | `EXECUTE` **retiré explicitement** à `authenticated` (Supabase l'accorde par défaut : le test de la liste exacte l'a révélé) |
| `handle_new_user` (déclencheur sur `auth.users`) | système (EXECUTE retiré aux utilisateurs) | créer le profil à l'invitation | crée un profil **inactif sans rôle** ; slug unique |
`touch_updated_at` est une fonction de déclencheur sans privilège particulier. Aucune fonction n'est exécutable par `anon` (testé) ; **la liste des fonctions exécutables par `authenticated` est vérifiée par un test (liste exacte, 18 fonctions)** ; les futures fonctions du schéma public n'auront **aucun** `EXECUTE` par défaut (`alter default privileges`), à accorder explicitement.

## 5. Droits par rôle (appliqués par la base)
| Action | GRAW `super_admin` | TOM `admin` | QAFARD `member` |
|---|---|---|---|
| Comptes, invitations, activation, rôles | **oui** | non | non |
| Voir toutes les missions / projets | oui | oui | non (ses missions, celles de ses projets) |
| Créer une mission pour soi | oui | oui | oui |
| Attribuer à un autre | direct | direct | **proposition** à valider par un admin |
| Approuver / refuser une attribution | oui | oui | non |
| Valider (terminée) / renvoyer | oui (droit global) | oui | seulement si désigné validateur (impossible : validateur = admin) |
| Passer « terminée » | oui | oui | **jamais** |
| Modifier / archiver | oui | oui | ses propres missions |
| Supprimer définitivement | oui | oui | non |
Le validateur d'une mission est désigné (GRAW ou TOM) et ne peut pas être le responsable.

## 6. Points d'attention connus
- Les fonctions `SECURITY DEFINER` s'exécutent avec les droits du propriétaire (contournent la RLS) : la sécurité repose sur leurs contrôles internes, relus et testés (26 tests RLS, dont rôles refusés, compte désactivé, dernier super admin, liste EXACTE des fonctions exécutables).
- Les conseillers Supabase (« Security Advisor ») signaleront probablement des **avertissements** « fonction SECURITY DEFINER exécutable par authenticated » : **attendus et voulus** ici (chaque fonction vérifie l'appelant). Aucune erreur « RLS disabled » ne doit apparaître.
- Les profils actifs sont lisibles par tout membre actif, y compris `email_pro` et `phone_pro` (annuaire d'équipe) : à ne renseigner que si cela convient.
- Pas encore de journal d'audit dédié (l'historique des missions existe) ni de création de projets par l'interface (réservé à la Phase B).
- Suppression définitive des missions réservée aux admins ; l'archivage est la voie normale.
- Tests : Postgres réel via PGlite (rôles et `auth.uid()` Supabase simulés) ; ils ne remplacent pas une vérification sur votre projet réel après application (Advisors + connexion d'un compte de chaque rôle).

## 7. Texte complet des migrations

### `supabase/migrations/20261101000100_b0_profiles_roles.sql`

```sql
-- ============================================================================
-- STAFF HQ V2 — B0.1 : profils et rôles
-- Migration NON destructive (création uniquement). Rien n'est supprimé, aucune donnée n'est insérée.
-- Rôles de sécurité : super_admin (GRAW), admin (TOM), member (QAFARD). La fonction professionnelle
-- (Fondateur, Photographe…) est un simple libellé d'affichage : elle ne donne AUCUN droit.
-- Principe : tout est REFUSÉ par défaut (RLS activée, aucun droit pour `anon`).
-- ============================================================================

create type public.app_role as enum ('super_admin', 'admin', 'member');

create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  slug           text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,30}$'),
  display_name   text not null check (char_length(btrim(display_name)) between 1 and 60),
  function_title text check (function_title is null or char_length(function_title) <= 80),
  email_pro      text check (email_pro is null or char_length(email_pro) <= 120),
  phone_pro      text check (phone_pro is null or char_length(phone_pro) <= 40),
  -- Un compte invité est INACTIF et SANS RÔLE tant que le super admin ne l'a pas activé.
  active         boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.user_roles (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       public.app_role not null,
  granted_by uuid references public.profiles (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

alter table public.profiles   enable row level security;
alter table public.user_roles enable row level security;

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;

create trigger profiles_touch before update on public.profiles
for each row execute function public.touch_updated_at();

-- Invitation (Auth → Invite user) : crée un profil INACTIF, sans rôle.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare base text; candidate text; n int := 0;
begin
  base := regexp_replace(lower(split_part(coalesce(new.email, 'user'), '@', 1)), '[^a-z0-9]+', '-', 'g');
  base := left(btrim(base, '-'), 24);
  if char_length(base) < 2 then base := 'user'; end if;
  candidate := base;
  while exists (select 1 from public.profiles where slug = candidate) loop
    n := n + 1; candidate := base || '-' || n;
  end loop;
  insert into public.profiles (id, slug, display_name, active)
  values (new.id, candidate, coalesce(nullif(btrim(new.raw_user_meta_data ->> 'name'), ''), candidate), false);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- Aides (utilisées par la RLS)
-- SECURITY DEFINER : lisent les rôles sans déclencher la RLS (évite la récursion). Retournent FAUX si le profil est inactif.
create or replace function public.current_roles() returns public.app_role[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(ur.role), '{}'::public.app_role[])
  from public.user_roles ur join public.profiles p on p.id = ur.user_id
  where ur.user_id = auth.uid() and p.active
$$;
create or replace function public.has_role(r public.app_role) returns boolean
language sql stable security definer set search_path = '' as $$ select r = any (public.current_roles()) $$;
create or replace function public.is_active_member() returns boolean
language sql stable security definer set search_path = '' as $$ select cardinality(public.current_roles()) > 0 $$;
create or replace function public.is_coordinator() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role('admin') or public.has_role('super_admin') $$;
create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = '' as $$ select public.has_role('super_admin') $$;
create or replace function public.is_active_user(u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = u and p.active
                 and exists (select 1 from public.user_roles ur where ur.user_id = u)) $$;
create or replace function public.is_validator_user(u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p join public.user_roles ur on ur.user_id = p.id
                 where p.id = u and p.active and ur.role in ('admin', 'super_admin')) $$;

-- ---------------------------------------------------------------- Gestion des comptes : SUPER ADMIN UNIQUEMENT
-- (Tom, `admin`, ne gère NI les comptes NI les permissions.)
create or replace function public.manage_set_roles(p_user uuid, p_roles public.app_role[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_super_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles where id = p_user) then raise exception 'unknown_user'; end if;
  if exists (select 1 from public.user_roles where user_id = p_user and role = 'super_admin')
     and not ('super_admin' = any (coalesce(p_roles, '{}')))
     and (select count(*) from public.user_roles ur join public.profiles p on p.id = ur.user_id
          where ur.role = 'super_admin' and p.active) <= 1
  then raise exception 'last_super_admin'; end if;
  delete from public.user_roles where user_id = p_user;
  insert into public.user_roles (user_id, role, granted_by)
  select p_user, r, auth.uid() from unnest(coalesce(p_roles, '{}')) as r;
end $$;

create or replace function public.manage_set_active(p_user uuid, p_active boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_super_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if not p_active and exists (select 1 from public.user_roles where user_id = p_user and role = 'super_admin')
     and (select count(*) from public.user_roles ur join public.profiles p on p.id = ur.user_id
          where ur.role = 'super_admin' and p.active) <= 1
  then raise exception 'last_super_admin'; end if;
  update public.profiles set active = p_active where id = p_user;
end $$;

create or replace function public.manage_update_profile(p_user uuid, p_display_name text, p_function_title text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_super_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.profiles set display_name = coalesce(nullif(btrim(p_display_name), ''), display_name), function_title = p_function_title where id = p_user;
end $$;

-- Annuaire de l'équipe : membres ACTIFS et leurs rôles (lecture réservée aux membres actifs).
create or replace function public.list_team()
returns table (id uuid, slug text, display_name text, function_title text, roles public.app_role[])
language sql stable security definer set search_path = '' as $$
  select p.id, p.slug, p.display_name, p.function_title,
         coalesce((select array_agg(ur.role order by ur.role) from public.user_roles ur where ur.user_id = p.id), '{}'::public.app_role[])
  from public.profiles p
  where public.is_active_member() and public.is_active_user(p.id)
  order by p.display_name
$$;

-- ---------------------------------------------------------------- Droits d'exécution : jamais pour l'anonyme
revoke execute on all functions in schema public from public, anon;
-- Fonctions appelées DEPUIS les politiques RLS ou par l'interface : exécutables par les utilisateurs connectés.
grant execute on function public.has_role(public.app_role), public.is_active_member(), public.is_coordinator(),
  public.is_super_admin(), public.list_team(),
  public.manage_set_roles(uuid, public.app_role[]), public.manage_set_active(uuid, boolean), public.manage_update_profile(uuid, text, text)
  to authenticated;
-- NON exécutables par les utilisateurs (usage interne par d'autres fonctions SECURITY DEFINER / déclencheurs uniquement) :
--   current_roles(), is_active_user(uuid), is_validator_user(uuid)  → évite de laisser sonder les rôles d'un identifiant quelconque.
-- (Supabase accorde par défaut EXECUTE à `authenticated` sur les nouvelles fonctions : il faut donc le retirer EXPLICITEMENT.)
revoke execute on function public.current_roles(), public.is_active_user(uuid), public.is_validator_user(uuid),
  public.handle_new_user(), public.touch_updated_at() from authenticated;
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
  owner_id    uuid references public.profiles (id) on delete set null,
  archived_at timestamptz,
  created_at  timestamptz not null default now()
);
create table public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  primary key (project_id, user_id)
);

create table public.missions (
  id                   uuid primary key default gen_random_uuid(),
  title                text not null check (char_length(btrim(title)) between 1 and 120),
  description          text not null default '' check (char_length(description) <= 500),
  creator_id           uuid not null references public.profiles (id),
  assignee_id          uuid not null references public.profiles (id),
  -- Attribution PROPOSÉE par un membre pour un autre : sans effet tant qu'un admin ne l'a pas approuvée.
  proposed_assignee_id uuid references public.profiles (id),
  -- Validateur désigné : un administrateur (GRAW ou TOM). GRAW garde un droit d'intervention global.
  validator_id         uuid not null references public.profiles (id),
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
  actor_id    uuid not null references public.profiles (id),
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
  author_id  uuid not null references public.profiles (id),
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

-- ---------------------------------------------------------------- Visibilité d'une mission
create or replace function public.can_view_mission(p_mission uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_active_member() and exists (
    select 1 from public.missions m
    where m.id = p_mission and (
      public.is_coordinator()
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
  if me is null or not public.is_active_member() then raise exception 'forbidden' using errcode = '42501'; end if;
  coord := public.is_coordinator();
  if btrim(coalesce(p_title, '')) = '' or char_length(btrim(p_title)) > 120 then raise exception 'invalid_title'; end if;
  if char_length(coalesce(p_description, '')) > 500 then raise exception 'invalid_description'; end if;
  if not public.is_active_user(p_assignee) then raise exception 'invalid_assignee'; end if;
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
  if me is null or not public.is_active_member() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into m from public.missions where id = p_id for update;
  if not found or not public.can_view_mission(p_id) then raise exception 'not_found'; end if;
  if m.archived_at is not null then raise exception 'archived'; end if;
  if not (public.is_coordinator() or m.creator_id = me) then raise exception 'forbidden' using errcode = '42501'; end if;
  if m.version <> p_expected_version then raise exception 'version_conflict'; end if;
  if btrim(coalesce(p_title, '')) = '' or char_length(btrim(p_title)) > 120 then raise exception 'invalid_title'; end if;
  if char_length(coalesce(p_description, '')) > 500 then raise exception 'invalid_description'; end if;
  if not public.is_validator_user(p_validator) then raise exception 'invalid_validator'; end if;
  if p_validator = m.assignee_id or p_validator = m.proposed_assignee_id then raise exception 'validator_conflict'; end if;
  if p_project is not null and not (public.is_coordinator() or public.is_project_member(p_project))
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
  if me is null or not public.is_active_member() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into m from public.missions where id = p_id for update;
  if not found or not public.can_view_mission(p_id) then raise exception 'not_found'; end if;
  if m.archived_at is not null then raise exception 'archived'; end if;
  if p_to = m.status then raise exception 'same_status'; end if;
  old := m.status;
  if public.is_coordinator() then ok := true;
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
  if me is null or not public.is_active_member() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into m from public.missions where id = p_id for update;
  if not found or not public.can_view_mission(p_id) then raise exception 'not_found'; end if;
  if m.archived_at is not null then raise exception 'archived'; end if;
  if not public.is_active_user(p_assignee) then raise exception 'invalid_assignee'; end if;
  if p_assignee = m.assignee_id then raise exception 'same_assignee'; end if;
  if p_assignee = m.validator_id then raise exception 'validator_conflict'; end if;
  if public.is_coordinator() then
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
  if me is null or not public.is_coordinator() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into m from public.missions where id = p_id for update;
  if not found then raise exception 'not_found'; end if;
  if m.archived_at is not null then raise exception 'archived'; end if;
  proposed := m.proposed_assignee_id;
  if proposed is null then raise exception 'no_pending_assignment'; end if;
  if p_approve then
    if proposed = m.validator_id then raise exception 'validator_conflict'; end if;
    if not public.is_active_user(proposed) then raise exception 'invalid_assignee'; end if;
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
  if me is null or not public.is_active_member() or not public.can_view_mission(p_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  if btrim(coalesce(p_body, '')) = '' or char_length(btrim(p_body)) > 1000 then raise exception 'invalid_comment'; end if;
  insert into public.mission_comments (mission_id, author_id, body) values (p_id, me, btrim(p_body)) returning * into c;
  return c;
end $$;

create or replace function public.archive_mission(p_id uuid) returns public.missions
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); m public.missions;
begin
  if me is null or not public.is_active_member() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into m from public.missions where id = p_id for update;
  if not found or not public.can_view_mission(p_id) then raise exception 'not_found'; end if;
  if not (public.is_coordinator() or m.creator_id = me) then raise exception 'forbidden' using errcode = '42501'; end if;
  if m.archived_at is not null then raise exception 'archived'; end if;
  update public.missions set archived_at = now(), version = version + 1, updated_at = now() where id = p_id returning * into m;
  insert into public.mission_events (mission_id, actor_id, kind) values (p_id, me, 'archived');
  return m;
end $$;

-- Suppression DÉFINITIVE (avec son historique et ses commentaires) : admin et super admin uniquement. Préférer l'archivage.
create or replace function public.delete_mission(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_coordinator() then raise exception 'forbidden' using errcode = '42501'; end if;
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

revoke all on public.profiles, public.user_roles, public.projects, public.project_members,
              public.missions, public.mission_events, public.mission_comments from anon, authenticated;
grant select on public.profiles, public.user_roles, public.projects, public.project_members,
                public.missions, public.mission_events, public.mission_comments to authenticated;
-- Chacun ne peut modifier que SES informations personnelles (jamais `active`, `slug`, la fonction ni les rôles).
grant update (display_name, email_pro, phone_pro) on public.profiles to authenticated;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or (active and public.is_active_member()) or public.is_super_admin());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid() and active) with check (id = auth.uid());

-- user_roles : chacun lit ses propres rôles ; le super admin lit tout. Aucune écriture directe (voir manage_set_roles).
create policy user_roles_select on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_super_admin());

-- projects / project_members : coordinateurs, propriétaire et membres du projet.
create policy projects_select on public.projects for select to authenticated
  using (public.is_active_member() and (public.is_coordinator() or owner_id = auth.uid() or public.is_project_member(id)));
create policy project_members_select on public.project_members for select to authenticated
  using (public.is_active_member() and (public.is_coordinator() or user_id = auth.uid() or public.is_project_member(project_id)));

-- missions : coordinateurs (admin, super_admin) = tout ; sinon créateur, responsable, validateur, proposé ou membre du projet.
create policy missions_select on public.missions for select to authenticated
  using (public.is_active_member() and (public.is_coordinator()
         or auth.uid() in (creator_id, assignee_id, validator_id) or proposed_assignee_id = auth.uid()
         or (project_id is not null and public.is_project_member(project_id))));

create policy mission_events_select on public.mission_events for select to authenticated using (public.can_view_mission(mission_id));
create policy mission_comments_select on public.mission_comments for select to authenticated using (public.can_view_mission(mission_id));

-- Filet de sécurité : les FUTURES fonctions du schéma public ne sont jamais exécutables par l'anonyme par défaut.
revoke execute on all functions in schema public from public, anon;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated; -- futures fonctions : droits à accorder explicitement
```

## 8. Script d'attribution initiale des rôles (manuel, un seul bloc atomique)

`supabase/bootstrap/B0_roles_template.sql` — à exécuter **après** les migrations et la création des trois comptes ; remplacer les trois adresses. Un seul bloc `DO` : toute vérification qui échoue annule automatiquement l'ensemble (aucun COMMIT / ROLLBACK manuel).

```sql
-- ============================================================================
-- STAFF HQ V2 — B0 : attribution INITIALE des trois comptes (à exécuter À LA MAIN, une seule fois)
-- Ce n'est PAS une migration : elle n'est jamais appliquée automatiquement.
--
-- ATOMIQUE PAR CONSTRUCTION : tout le script est UN SEUL bloc DO (une seule instruction). Si une vérification échoue,
-- PostgreSQL annule automatiquement TOUTES les modifications du bloc : il n'y a ni COMMIT ni ROLLBACK à gérer à la main.
--
-- Prérequis : migrations 0100 / 0200 / 0300 appliquées ; les trois comptes existent déjà (Authentication → Users).
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

  v_spec  text[][] := null;
  v_slug  text; v_email text; v_name text; v_title text; v_role public.app_role;
  v_uid uuid; v_cnt int; v_u jsonb; v_other uuid;
  v_ids uuid[] := '{}';
begin
  v_spec := array[
    array['graw',   v_graw,   'Graw',   'Directeur Artistique & Digital', 'super_admin'],
    array['tom',    v_tom,    'Tom',    'Fondateur',                      'admin'],
    array['qafard', v_qafard, 'Qafard', 'Photographe',                    'member']
  ];

  -- 1. Adresses renseignées, valides et DISTINCTES --------------------------------------------------------------
  foreach v_email in array array[v_graw, v_tom, v_qafard] loop
    if v_email like '%remplacer%' then raise exception 'BOOTSTRAP ANNULÉ : une adresse n''a pas été remplacée (%).', v_email; end if;
    if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'BOOTSTRAP ANNULÉ : adresse invalide (%).', v_email; end if;
  end loop;
  if (select count(distinct e) from unnest(array[v_graw, v_tom, v_qafard]) e) <> 3 then
    raise exception 'BOOTSTRAP ANNULÉ : les trois adresses doivent être distinctes.';
  end if;

  -- 2. Pour chaque compte : existence UNIQUE, état sain, profil, absence de conflit ------------------------------
  for i in 1 .. 3 loop
    v_slug := v_spec[i][1]; v_email := v_spec[i][2]; v_name := v_spec[i][3]; v_title := v_spec[i][4]; v_role := v_spec[i][5]::public.app_role;

    select count(*) into v_cnt from auth.users where lower(btrim(email)) = v_email;
    if v_cnt = 0 then raise exception 'BOOTSTRAP ANNULÉ : compte introuvable pour % (%). Créez-le d''abord dans Authentication → Users.', v_slug, v_email; end if;
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

    -- Profil (créé par le déclencheur à la création du compte ; recréé ici s'il manque).
    if not exists (select 1 from public.profiles where id = v_uid) then
      insert into public.profiles (id, slug, display_name, active) values (v_uid, 'tmp-' || left(replace(v_uid::text, '-', ''), 12), v_name, false);
    end if;
    -- Slug déjà pris par un AUTRE compte ?
    select id into v_other from public.profiles where slug = v_slug and id <> v_uid;
    if v_other is not null then raise exception 'BOOTSTRAP ANNULÉ : le slug « % » appartient déjà à un autre compte.', v_slug; end if;
    -- Rôles existants : aucun, ou exactement le rôle attendu (relance sans effet). Tout autre rôle = conflit.
    if exists (select 1 from public.user_roles where user_id = v_uid and role <> v_role) then
      raise exception 'BOOTSTRAP ANNULÉ : le compte % a déjà un rôle différent de %.', v_slug, v_role;
    end if;
  end loop;

  -- 3. Aucun AUTRE compte actif avec un rôle (équipe active = ces trois comptes uniquement) -------------------------
  if exists (select 1 from public.user_roles ur join public.profiles p on p.id = ur.user_id where p.active and ur.user_id <> all (v_ids)) then
    raise exception 'BOOTSTRAP ANNULÉ : un autre compte actif possède déjà un rôle STAFF.';
  end if;
  if exists (select 1 from public.user_roles where role = 'super_admin' and user_id <> all (v_ids)) then
    raise exception 'BOOTSTRAP ANNULÉ : un autre super_admin existe déjà.';
  end if;

  -- 4. Attribution (dans la même instruction : tout ou rien) ---------------------------------------------------------
  for i in 1 .. 3 loop
    select id into v_uid from auth.users where lower(btrim(email)) = v_spec[i][2];
    update public.profiles set slug = v_spec[i][1], display_name = v_spec[i][3], function_title = v_spec[i][4], active = true where id = v_uid;
    insert into public.user_roles (user_id, role) values (v_uid, v_spec[i][5]::public.app_role) on conflict do nothing;
  end loop;

  -- 5. Vérification finale : exactement 3 comptes actifs avec le rôle attendu, sinon TOUT est annulé ------------------
  for i in 1 .. 3 loop
    if (select count(*) from public.profiles p join public.user_roles ur on ur.user_id = p.id
        where p.slug = v_spec[i][1] and p.active and ur.role = v_spec[i][5]::public.app_role) <> 1
       or (select count(*) from public.user_roles ur join public.profiles p on p.id = ur.user_id where p.slug = v_spec[i][1]) <> 1 then
      raise exception 'BOOTSTRAP ANNULÉ : contrôle final en échec pour %.', v_spec[i][1];
    end if;
  end loop;
  if (select count(*) from public.user_roles) <> 3 then raise exception 'BOOTSTRAP ANNULÉ : le nombre total de rôles n''est pas 3.'; end if;

  raise notice 'BOOTSTRAP OK : graw=super_admin, tom=admin, qafard=member.';
end
$bootstrap$;

-- Contrôle visuel (lecture seule) : doit afficher exactement 3 lignes.
select p.slug, p.display_name, p.function_title, p.active, array_agg(ur.role) as roles
from public.profiles p left join public.user_roles ur on ur.user_id = p.id
group by p.id order by p.slug;
```
