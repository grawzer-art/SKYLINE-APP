-- ============================================================================
-- SKYLINE 2027 — RETOUR ARRIÈRE de B4.4 (rétablit l'état B4.2b : publication sans confirmation, sans journal).
-- Effet : le JOURNAL DE CONSENTEMENT EST SUPPRIMÉ (les profils déjà publiés restent publiés : `visible` n'est pas modifié).
-- À n'utiliser que sur le projet de test, ou après décision explicite.
-- ============================================================================
drop function public.get_my_club_consent();
drop function public.set_my_club_visibility(boolean, text);
drop function public.club_consent_version();
drop table public.club_consents;

-- Fonction B4.2b d'origine (copie conforme de B4_2b_club_traveler_gate.sql).
create function public.set_my_club_visibility(p_visible boolean) returns boolean language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); n int;
begin
  if me is null or not public.has_space('members') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_visible is null then raise exception 'invalid_visibility'; end if;
  if p_visible and not public.is_verified_traveler() then raise exception 'traveler_required' using errcode = '42501'; end if;
  update public.club_profiles set visible = p_visible where user_id = me; get diagnostics n = row_count;
  if n = 0 then raise exception 'no_profile'; end if;
  return p_visible;
end $$;
revoke execute on function public.set_my_club_visibility(boolean) from public, anon;
grant execute on function public.set_my_club_visibility(boolean) to authenticated;
