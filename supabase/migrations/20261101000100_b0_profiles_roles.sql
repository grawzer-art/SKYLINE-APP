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
