-- ============================================================================
-- SKYLINE 2027 — B4.3 : profil COMMUNAUTAIRE « CLUB » (distinct de l'identité privée B4.1)
--
-- *** PROPOSITION — NON APPLIQUÉE. *** Fichier volontairement HORS de supabase/migrations/. À appliquer seulement après validation explicite.
-- Non destructif : une table, un identifiant public, des fonctions, un bucket de stockage privé. Dépend de B0 (accounts, space_access, has_space,
-- touch_updated_at). Ne dépend PAS de B4.1 : les deux structures sont indépendantes (aucune clé étrangère entre elles, aucune colonne commune).
-- Validée sur un Postgres local (tests/club-profiles.test.mts), avec deux jeux de privilèges par défaut Supabase.
--
-- PRINCIPES
--  * SÉPARATION IDENTITÉ / COMMUNAUTÉ : `participant_profiles` (privé : prénom, nom légal) et `club_profiles` (pseudo, ville, bio, goûts, photo) sont deux
--    tables sans lien de contenu. Le profil CLUB ne contient NI e-mail, NI nom légal, NI réservation, NI rôle.
--  * VISIBILITÉ DÉSACTIVÉE PAR DÉFAUT (`visible = false`). Un profil n'apparaît chez les autres QUE si son propriétaire l'a publié volontairement.
--  * AUCUN accès direct à la table pour les utilisateurs (ni SELECT, ni écriture) : tout passe par des fonctions SECURITY DEFINER qui dérivent
--    l'identité de auth.uid() (jamais un paramètre). Les autres membres reçoivent un IDENTIFIANT PUBLIC aléatoire (`public_id`), jamais le `user_id`
--    d'authentification, et seulement les champs publics.
--  * Réciprocité : on ne consulte l'annuaire que si SON propre profil est publié.
--  * Photos : bucket PRIVÉ `club-avatars`, 512 Ko max, JPEG / WebP uniquement ; écriture dans SON dossier `<user_id>/…` ; lecture = propriétaire ou
--    membre actif consultant un profil publié (URL signées de courte durée côté application).
-- ============================================================================

create table public.club_profiles (
  user_id    uuid primary key references public.accounts (id) on delete cascade,
  public_id  uuid not null unique default gen_random_uuid(),
  pseudo     text not null check (char_length(btrim(pseudo)) between 2 and 24 and pseudo ~ '^[[:alnum:] ._''-]+$'),
  city       text check (city is null or (char_length(btrim(city)) between 1 and 40 and city !~ '[[:cntrl:]]')),
  bio        text not null default '' check (char_length(bio) <= 140 and bio !~ '[[:cntrl:]]'),
  genres     text[] not null default '{}' check (cardinality(genres) <= 5),
  -- Photo facultative : chemin d'objet dans le bucket `club-avatars`, obligatoirement dans le dossier du propriétaire (jamais une URL externe).
  avatar_path text check (avatar_path is null or (avatar_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9._-]{1,80}$'
                                                  and avatar_path like user_id::text || '/%')),
  visible    boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.club_profiles enable row level security;   -- AUCUNE politique : refus par défaut pour tout accès direct
create trigger club_profiles_touch before update on public.club_profiles for each row execute function public.touch_updated_at();

-- Validation commune des goûts musicaux (5 max, 1–30 caractères, sans caractère de contrôle).
create function public.club_genres_ok(g text[]) returns boolean language sql immutable set search_path = '' as $$
  select g is not null and cardinality(g) <= 5 and not exists (select 1 from unnest(g) x where x is null or char_length(btrim(x)) not between 1 and 30 or x ~ '[[:cntrl:]]') $$;
alter table public.club_profiles add constraint club_profiles_genres_ok check (public.club_genres_ok(genres));

-- Un compte est « membre actif » : compte actif ET accès participants (indépendant de l'appelant : sert à filtrer les propriétaires publiés).
create function public.club_owner_is_member(uid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.accounts a join public.space_access sa on sa.user_id = a.id and sa.space = 'members' where a.id = uid and a.active) $$;

-- Lecture de SON profil (null si aucun).
create function public.get_my_club_profile()
returns table (pseudo text, city text, bio text, genres text[], avatar_path text, visible boolean, created_at timestamptz, updated_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.has_space('members') then raise exception 'forbidden' using errcode = '42501'; end if;
  return query select p.pseudo, p.city, p.bio, p.genres, p.avatar_path, p.visible, p.created_at, p.updated_at from public.club_profiles p where p.user_id = auth.uid();
end $$;

-- Création / modification de SON profil. NE TOUCHE NI à la visibilité NI à la photo (fonctions dédiées). Un nouveau profil est PRIVÉ.
create function public.upsert_my_club_profile(p_pseudo text, p_city text, p_bio text, p_genres text[])
returns table (pseudo text, city text, bio text, genres text[], avatar_path text, visible boolean)
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); c text := nullif(btrim(coalesce(p_city, '')), ''); b text := btrim(coalesce(p_bio, '')); g text[] := coalesce(p_genres, '{}');
begin
  if me is null or not public.has_space('members') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_pseudo is null or char_length(btrim(p_pseudo)) not between 2 and 24 or btrim(p_pseudo) !~ '^[[:alnum:] ._''-]+$' then raise exception 'invalid_pseudo'; end if;
  if c is not null and (char_length(c) > 40 or c ~ '[[:cntrl:]]') then raise exception 'invalid_city'; end if;
  if char_length(b) > 140 or b ~ '[[:cntrl:]]' then raise exception 'invalid_bio'; end if;
  if not public.club_genres_ok(g) then raise exception 'invalid_genres'; end if;
  insert into public.club_profiles as cp (user_id, pseudo, city, bio, genres) values (me, btrim(p_pseudo), c, b, g)
  on conflict (user_id) do update set pseudo = excluded.pseudo, city = excluded.city, bio = excluded.bio, genres = excluded.genres;
  return query select cp.pseudo, cp.city, cp.bio, cp.genres, cp.avatar_path, cp.visible from public.club_profiles cp where cp.user_id = me;
end $$;

-- Publier / masquer SON profil. Impossible sans profil existant.
create function public.set_my_club_visibility(p_visible boolean) returns boolean language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); n int;
begin
  if me is null or not public.has_space('members') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_visible is null then raise exception 'invalid_visibility'; end if;
  update public.club_profiles set visible = p_visible where user_id = me; get diagnostics n = row_count;
  if n = 0 then raise exception 'no_profile'; end if;
  return p_visible;
end $$;

-- Enregistrer (ou retirer avec null) la photo de SON profil : le chemin doit être dans SON dossier.
create function public.set_my_club_avatar(p_path text) returns text language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); n int;
begin
  if me is null or not public.has_space('members') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_path is not null and (p_path not like me::text || '/%' or p_path !~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,80}$') then raise exception 'invalid_avatar'; end if;
  update public.club_profiles set avatar_path = p_path where user_id = me; get diagnostics n = row_count;
  if n = 0 then raise exception 'no_profile'; end if;
  return p_path;
end $$;

-- Annuaire : profils PUBLIÉS des autres membres actifs (champs publics + identifiant public). Réservé à qui a publié le sien (réciprocité).
create function public.list_club_directory(p_text text default null, p_city text default null, p_limit int default 24, p_offset int default 0)
returns table (public_id uuid, pseudo text, city text, bio text, genres text[], avatar_path text)
language plpgsql stable security definer set search_path = '' as $$
declare me uuid := auth.uid(); q text := nullif(btrim(coalesce(p_text, '')), '');
begin
  if me is null or not public.has_space('members') then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.club_profiles m where m.user_id = me and m.visible) then raise exception 'reciprocity_required' using errcode = '42501'; end if;
  return query select p.public_id, p.pseudo, p.city, p.bio, p.genres, p.avatar_path from public.club_profiles p
    where p.visible and p.user_id <> me and public.club_owner_is_member(p.user_id)
      and (q is null or p.pseudo ilike '%' || replace(replace(q, '%', ''), '_', '') || '%')
      and (nullif(p_city, '') is null or p.city = p_city)
    order by lower(p.pseudo), p.public_id limit least(greatest(coalesce(p_limit, 24), 1), 50) offset greatest(coalesce(p_offset, 0), 0);
end $$;

-- Fiche d'UN profil publié (même règles).
create function public.get_club_member(p_public_id uuid)
returns table (public_id uuid, pseudo text, city text, bio text, genres text[], avatar_path text)
language plpgsql stable security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null or not public.has_space('members') then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.club_profiles m where m.user_id = me and m.visible) then raise exception 'reciprocity_required' using errcode = '42501'; end if;
  return query select p.public_id, p.pseudo, p.city, p.bio, p.genres, p.avatar_path from public.club_profiles p
    where p.public_id = p_public_id and p.visible and p.user_id <> me and public.club_owner_is_member(p.user_id);
end $$;

-- Lecture d'une photo : propriétaire, ou membre actif qui a publié le sien et consulte une photo de profil publié (utilisée par la politique de stockage).
create function public.club_avatar_readable(obj_name text) returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and public.has_space('members') and (
    obj_name like auth.uid()::text || '/%'
    or (exists (select 1 from public.club_profiles m where m.user_id = auth.uid() and m.visible)
        and exists (select 1 from public.club_profiles p where p.avatar_path = obj_name and p.visible and public.club_owner_is_member(p.user_id)))) $$;

-- Privilèges : aucun accès direct à la table ; fonctions réservées aux utilisateurs connectés (jamais `anon`).
revoke all on public.club_profiles from anon, authenticated;
revoke execute on function public.get_my_club_profile(), public.upsert_my_club_profile(text, text, text, text[]), public.set_my_club_visibility(boolean),
  public.set_my_club_avatar(text), public.list_club_directory(text, text, int, int), public.get_club_member(uuid), public.club_avatar_readable(text),
  public.club_owner_is_member(uuid), public.club_genres_ok(text[]) from public, anon;
grant execute on function public.get_my_club_profile(), public.upsert_my_club_profile(text, text, text, text[]), public.set_my_club_visibility(boolean),
  public.set_my_club_avatar(text), public.list_club_directory(text, text, int, int), public.get_club_member(uuid), public.club_avatar_readable(text) to authenticated;
grant execute on function public.club_owner_is_member(uuid), public.club_genres_ok(text[]) to authenticated;   -- appelées par les politiques / contraintes

-- ----------------------------------------------------------------------------
-- STOCKAGE DES PHOTOS : bucket PRIVÉ (jamais d'URL publique permanente).
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('club-avatars', 'club-avatars', false, 524288, array['image/jpeg', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 524288, allowed_mime_types = array['image/jpeg', 'image/webp'];

create policy club_avatars_read on storage.objects for select to authenticated
  using (bucket_id = 'club-avatars' and public.club_avatar_readable(name));
create policy club_avatars_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'club-avatars' and public.has_space('members') and name like auth.uid()::text || '/%' and name ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,80}$');
create policy club_avatars_update on storage.objects for update to authenticated
  using (bucket_id = 'club-avatars' and public.has_space('members') and name like auth.uid()::text || '/%')
  with check (bucket_id = 'club-avatars' and name like auth.uid()::text || '/%');
create policy club_avatars_delete on storage.objects for delete to authenticated
  using (bucket_id = 'club-avatars' and public.has_space('members') and name like auth.uid()::text || '/%');
