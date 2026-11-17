-- ============================================================================
-- SKYLINE 2027 — B4.5 : CRÉATION AUTOMATIQUE du profil CLUB personnel (privé) après l'inscription autonome.
--
-- *** PROPOSITION — NON APPLIQUÉE. *** À appliquer APRÈS B4_4_club_consent. Retour arrière : supabase/rollback/B4_5_club_profile_auto_DOWN.sql.
--
--  * `ensure_my_club_profile()` : crée, pour SOI-MÊME uniquement, un profil CLUB PRIVÉ (visible = false) si aucun n'existe. Idempotent : ne modifie jamais un profil existant.
--  * Pseudo initial dérivé du nom affiché choisi à l'inscription (caractères autorisés seulement, 2 à 24) ; sinon « Membre ». Modifiable ensuite (upsert_my_club_profile).
--  * AUCUNE publication, AUCUN consentement, AUCUN statut de voyageur vérifié n'est créé ici : le profil reste privé tant que la personne ne le publie pas elle-même
--    (consentement club-annuaire-1 + voyageur vérifié exigés par set_my_club_visibility, inchangée).
--  * Réservé aux membres actifs (accès « members ») ; jamais exécutable par `anon`. Ne lit ni e-mail ni métadonnées utilisateur.
-- ============================================================================
create function public.ensure_my_club_profile() returns boolean language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); d text; p text;
begin
  if me is null or not public.has_space('members') then raise exception 'forbidden' using errcode = '42501'; end if;
  if exists (select 1 from public.club_profiles c where c.user_id = me) then return false; end if;
  select pp.display_name into d from public.participant_profiles pp where pp.user_id = me;
  p := btrim(left(btrim(regexp_replace(coalesce(d, ''), '[^[:alnum:] ._''-]', '', 'g')), 24));
  if char_length(p) < 2 then p := 'Membre'; end if;
  insert into public.club_profiles (user_id, pseudo) values (me, p) on conflict (user_id) do nothing;
  return found;
end $$;

revoke execute on function public.ensure_my_club_profile() from public, anon;
grant execute on function public.ensure_my_club_profile() to authenticated;
