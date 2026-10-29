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
