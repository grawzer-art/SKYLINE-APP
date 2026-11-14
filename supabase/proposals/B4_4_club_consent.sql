-- ============================================================================
-- SKYLINE 2027 — B4.4 : CONSENTEMENT EXPLICITE avant publication dans l'annuaire CLUB, avec TRACE.
--
-- *** PROPOSITION — NON APPLIQUÉE (ni au projet partagé, ni au projet de test). ***
-- À appliquer APRÈS B4_2_member_signup, B4_3_club_profiles, B4_2b_club_traveler_gate et B4_2c_revoke_rls_auto_enable. Retour arrière : supabase/rollback/B4_4_club_consent_DOWN.sql.
--
--  * Publier son profil exige une CONFIRMATION explicite : le client envoie la version du texte de consentement qu'il a affichée ; le serveur la compare à la
--    version courante (`club_consent_version()`). Absente ou périmée ⇒ `consent_required`. Profil privé par défaut ; masquer reste TOUJOURS possible.
--  * Chaque CHANGEMENT d'état (publication / retrait) est inscrit dans un journal `club_consents` en ajout seul : utilisateur, action, version du texte, date.
--    Aucune politique RLS et aucun privilège de table : ni lecture, ni écriture directes (seule la fonction `get_my_club_consent()` rend SA dernière ligne).
--  * L'ancienne voie « set_my_club_visibility(boolean) » (sans consentement) est SUPPRIMÉE : elle ne peut plus servir à contourner la confirmation.
--  * AUCUN statut de voyageur vérifié n'est créé ou modifié ici (la table `traveler_reservations` n'est pas touchée) : la publication reste réservée aux voyageurs vérifiés (B4.2b).
-- ============================================================================

-- Journal des consentements (ajout seul : le client n'a aucun accès direct).
create table public.club_consents (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references public.accounts (id) on delete cascade,
  action          text not null check (action in ('publish', 'withdraw')),
  consent_version text not null check (char_length(consent_version) between 3 and 40),
  created_at      timestamptz not null default now()
);
create index club_consents_user_idx on public.club_consents (user_id, created_at desc);
alter table public.club_consents enable row level security;   -- AUCUNE politique : refus par défaut pour tout accès direct
revoke all on public.club_consents from anon, authenticated;

-- Version COURANTE du texte de consentement (source de vérité serveur ; le texte affiché porte la même version côté application).
create function public.club_consent_version() returns text language sql immutable set search_path = '' as $$ select 'club-annuaire-1'::text $$;

-- Publication (avec consentement) / retrait de SON profil. Une seule voie : l'ancienne fonction à un argument est supprimée.
drop function public.set_my_club_visibility(boolean);
create function public.set_my_club_visibility(p_visible boolean, p_consent_version text default null) returns boolean language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); prev boolean;
begin
  if me is null or not public.has_space('members') then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_visible is null then raise exception 'invalid_visibility'; end if;
  if p_visible then
    if not public.is_verified_traveler() then raise exception 'traveler_required' using errcode = '42501'; end if;
    if p_consent_version is distinct from public.club_consent_version() then raise exception 'consent_required' using errcode = '42501'; end if;
  end if;
  select visible into prev from public.club_profiles where user_id = me for update;
  if not found then raise exception 'no_profile'; end if;
  update public.club_profiles set visible = p_visible where user_id = me;
  if prev is distinct from p_visible then
    insert into public.club_consents (user_id, action, consent_version) values (me, case when p_visible then 'publish' else 'withdraw' end, public.club_consent_version());
  end if;
  return p_visible;
end $$;

-- Dernier consentement de SOI-MÊME (transparence : « publié le … »). Jamais celui d'un autre.
create function public.get_my_club_consent() returns table (action text, consent_version text, created_at timestamptz) language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.has_space('members') then raise exception 'forbidden' using errcode = '42501'; end if;
  return query select c.action, c.consent_version, c.created_at from public.club_consents c where c.user_id = auth.uid() order by c.id desc limit 1;
end $$;

-- Privilèges : réservés aux utilisateurs connectés (jamais `anon`), comme B4.3.
revoke execute on function public.set_my_club_visibility(boolean, text), public.get_my_club_consent(), public.club_consent_version() from public, anon;
grant execute on function public.set_my_club_visibility(boolean, text), public.get_my_club_consent(), public.club_consent_version() to authenticated;
