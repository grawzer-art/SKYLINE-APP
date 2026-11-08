-- ============================================================================
-- SKYLINE 2027 — B4.2b : annuaire et contacts CLUB réservés aux VOYAGEURS VÉRIFIÉS (adaptation de B4.3)
--
-- *** PROPOSITION — NON APPLIQUÉE. *** À appliquer APRÈS B4_2_member_signup.sql ET B4_3_club_profiles.sql (B4.3 n'est PAS appliquée sur la base réelle
-- à ce jour : vérifier l'historique des migrations avant d'appliquer). Ne remplace que 4 fonctions de B4.3 (create or replace), sans changer leurs privilèges.
--  * Un membre gratuit peut créer son profil CLUB, mais il reste PRIVÉ : le publier exige d'être voyageur vérifié.
--  * L'annuaire et les fiches : réservés aux voyageurs vérifiés, qui n'y voient que des voyageurs vérifiés ayant publié.
--  * Si une réservation disparaît, le profil cesse immédiatement d'apparaître (le propriétaire est revérifié à chaque lecture).
-- ============================================================================
create or replace function public.club_owner_is_member(uid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.accounts a join public.space_access sa on sa.user_id = a.id and sa.space = 'members'
                 join public.traveler_reservations t on t.user_id = a.id where a.id = uid and a.active) $$;

create or replace function public.set_my_club_visibility(p_visible boolean) returns boolean language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); n int;
begin
  if me is null or not public.has_space('members') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_visible is null then raise exception 'invalid_visibility'; end if;
  if p_visible and not public.is_verified_traveler() then raise exception 'traveler_required' using errcode = '42501'; end if;
  update public.club_profiles set visible = p_visible where user_id = me; get diagnostics n = row_count;
  if n = 0 then raise exception 'no_profile'; end if;
  return p_visible;
end $$;

create or replace function public.list_club_directory(p_text text default null, p_city text default null, p_limit int default 24, p_offset int default 0)
returns table (public_id uuid, pseudo text, city text, bio text, genres text[], avatar_path text)
language plpgsql stable security definer set search_path = '' as $$
declare me uuid := auth.uid(); q text := nullif(btrim(coalesce(p_text, '')), '');
begin
  if me is null or not public.has_space('members') then raise exception 'forbidden' using errcode = '42501'; end if;
  if not public.is_verified_traveler() then raise exception 'traveler_required' using errcode = '42501'; end if;
  if not exists (select 1 from public.club_profiles m where m.user_id = me and m.visible) then raise exception 'reciprocity_required' using errcode = '42501'; end if;
  return query select p.public_id, p.pseudo, p.city, p.bio, p.genres, p.avatar_path from public.club_profiles p
    where p.visible and p.user_id <> me and public.club_owner_is_member(p.user_id)
      and (q is null or p.pseudo ilike '%' || replace(replace(q, '%', ''), '_', '') || '%')
      and (nullif(p_city, '') is null or p.city = p_city)
    order by lower(p.pseudo), p.public_id limit least(greatest(coalesce(p_limit, 24), 1), 50) offset greatest(coalesce(p_offset, 0), 0);
end $$;

create or replace function public.get_club_member(p_public_id uuid)
returns table (public_id uuid, pseudo text, city text, bio text, genres text[], avatar_path text)
language plpgsql stable security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null or not public.has_space('members') then raise exception 'forbidden' using errcode = '42501'; end if;
  if not public.is_verified_traveler() then raise exception 'traveler_required' using errcode = '42501'; end if;
  if not exists (select 1 from public.club_profiles m where m.user_id = me and m.visible) then raise exception 'reciprocity_required' using errcode = '42501'; end if;
  return query select p.public_id, p.pseudo, p.city, p.bio, p.genres, p.avatar_path from public.club_profiles p
    where p.public_id = p_public_id and p.visible and p.user_id <> me and public.club_owner_is_member(p.user_id);
end $$;
