-- ============================================================================
-- SKYLINE 2027 — B4.1 : profil PARTICIPANT rattaché à l'identifiant Supabase Auth
--
-- *** PROPOSITION — NON APPLIQUÉE. *** Ce fichier est volontairement HORS de supabase/migrations/ : il ne peut pas être appliqué par erreur.
-- À appliquer seulement après validation explicite. Non destructif (une table, deux déclencheurs / fonctions ; aucune donnée existante touchée).
-- Indépendante de B3 : ne dépend QUE du modèle d'accès B0 (accounts, space_access, fonctions has_space / is_super_admin / touch_updated_at).
-- Validée sur un Postgres local (tests/participant-profiles.test.mts).
--
-- PRINCIPES
--  * RÔLES ET PERMISSIONS SÉPARÉS : le profil ne contient AUCUNE colonne de rôle ni d'accès. Les accès restent dans B0 (`space_access`, `platform_roles`,
--    `staff_roles`), gérés uniquement par le super admin. Les métadonnées modifiables par l'utilisateur (`raw_user_meta_data`) ne donnent JAMAIS de droit.
--  * UN participant ne lit et ne modifie QUE SON profil. Aucun accès aux profils des autres participants. Le super admin (rôle global B0) peut les LIRE
--    (autorisation explicite, support / gestion des comptes) ; un administrateur STAFF (Tom) NE le peut PAS.
--  * Écriture UNIQUEMENT par la fonction `upsert_my_participant_profile` (aucun INSERT / UPDATE / DELETE direct pour les utilisateurs) : l'identifiant
--    n'est JAMAIS un paramètre (toujours auth.uid()), les valeurs sont validées côté base.
--  * Refus par défaut : RLS activée, aucun droit pour `anon`.
-- ============================================================================

create table public.participant_profiles (
  user_id      uuid primary key references public.accounts (id) on delete cascade,
  first_name   text not null check (char_length(btrim(first_name)) between 1 and 60 and first_name !~ '[[:cntrl:]]'),
  last_name    text not null check (char_length(btrim(last_name))  between 1 and 60 and last_name  !~ '[[:cntrl:]]'),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 60 and display_name !~ '[[:cntrl:]]'),
  -- Avatar facultatif : CHEMIN dans un futur stockage (jamais une URL externe : pas de pixel espion), obligatoirement dans le dossier de l'utilisateur.
  avatar_path  text check (avatar_path is null or (avatar_path ~ '^avatars/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9._-]{1,80}$'
                                                   and avatar_path like 'avatars/' || user_id::text || '/%')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.participant_profiles enable row level security;

create trigger participant_profiles_touch before update on public.participant_profiles
for each row execute function public.touch_updated_at();

-- Lecture : SON profil (compte actif avec accès participants) ; le super admin lit tout (autorisation explicite).
create policy participant_profiles_select_own on public.participant_profiles for select to authenticated
  using (user_id = auth.uid() and public.has_space('members'));
create policy participant_profiles_select_admin on public.participant_profiles for select to authenticated
  using (public.is_super_admin());

-- Création / mise à jour de SON profil. Aucun paramètre « utilisateur » : on ne peut agir que sur soi-même.
create function public.upsert_my_participant_profile(p_first_name text, p_last_name text, p_display_name text)
returns public.participant_profiles
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); r public.participant_profiles;
begin
  if me is null or not public.has_space('members') then raise exception 'forbidden' using errcode = '42501'; end if;
  if btrim(coalesce(p_first_name, '')) = '' or char_length(btrim(p_first_name)) > 60 or p_first_name ~ '[[:cntrl:]]' then raise exception 'invalid_first_name'; end if;
  if btrim(coalesce(p_last_name, ''))  = '' or char_length(btrim(p_last_name))  > 60 or p_last_name  ~ '[[:cntrl:]]' then raise exception 'invalid_last_name'; end if;
  if btrim(coalesce(p_display_name, '')) = '' or char_length(btrim(p_display_name)) > 60 or p_display_name ~ '[[:cntrl:]]' then raise exception 'invalid_display_name'; end if;
  insert into public.participant_profiles (user_id, first_name, last_name, display_name)
  values (me, btrim(p_first_name), btrim(p_last_name), btrim(p_display_name))
  on conflict (user_id) do update set first_name = excluded.first_name, last_name = excluded.last_name, display_name = excluded.display_name
  returning * into r;
  return r;
end $$;

-- Privilèges : lecture seule pour les utilisateurs connectés (filtrée par la RLS) ; jamais rien pour `anon`.
revoke all on public.participant_profiles from anon, authenticated;
grant select on public.participant_profiles to authenticated;
-- Droits d'exécution explicites (les privilèges par défaut de Supabase peuvent accorder EXECUTE : on révoque pour `public` et `anon`).
revoke execute on function public.upsert_my_participant_profile(text, text, text) from public, anon;
grant execute on function public.upsert_my_participant_profile(text, text, text) to authenticated;
