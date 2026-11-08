-- ============================================================================
-- SKYLINE 2027 — B4.2 : INSCRIPTION PUBLIQUE AUTONOME (membre gratuit) — séparée du statut « voyageur vérifié »
--
-- *** PROPOSITION — NON APPLIQUÉE. *** Hors de supabase/migrations/. Additive : 2 tables, 3 fonctions. Aucune table / fonction / politique B0, B3, B4.1 modifiée.
-- Prérequis : B0 (appliquée) ET B4.1 (appliquée sur le projet partagé : historique 20261107161509). NE réapplique PAS B4.1.
-- Indépendante de B4.3 (non appliquée sur la base réelle) : l'adaptation de B4.3 est dans B4_2b_club_traveler_gate.sql (à appliquer APRÈS B4.2 et B4.3).
--
-- DEUX NOTIONS STRICTEMENT SÉPARÉES
--  * MEMBRE GRATUIT : compte créé par inscription publique (e-mail confirmé par code). Obtient `space_access('members')` + un profil privé. Rien d'autre.
--  * VOYAGEUR VÉRIFIÉ : réservation confirmée PAR L'ÉQUIPE (`traveler_reservations`). Aucune fonction utilisateur ne peut l'écrire ; la liaison des
--    réservations aux comptes est hors B4.2. `is_verified_traveler()` est la seule source de vérité (pass, QR, communauté).
--
-- SÉCURITÉ DU « CLAIM » (`claim_member_account`) — la SEULE voie d'auto-attribution d'un accès `members`
--  * L'identité vient de auth.uid(). Aucun paramètre de rôle, d'espace ou d'identifiant. Les métadonnées utilisateur ne sont JAMAIS lues.
--  * Refus si : e-mail non confirmé · compte invité (invited_at) · anonyme · compte déjà doté d'un accès / rôle / fiche STAFF · compte déjà activé
--    ou modifié (décision d'un administrateur) · membre suspendu (jamais réactivé par ce chemin).
--  * Atomique : verrou de ligne sur le compte (concurrence) ; idempotent : second appel d'un membre actif → « already_member » sans rien modifier.
--  * N'accorde JAMAIS `staff`, `super_admin` ni aucune permission STAFF.
-- ============================================================================

-- Trace d'une inscription autonome (origine, version des CGU acceptée, attestation d'âge). Jamais écrite directement par un utilisateur.
create table public.member_accounts (
  user_id            uuid primary key references public.accounts (id) on delete cascade,
  source             text not null default 'self_signup' check (source = 'self_signup'),
  terms_version      text not null check (char_length(btrim(terms_version)) between 1 and 40 and terms_version !~ '[[:cntrl:]]'),
  adult_attested_at  timestamptz not null default now(),
  created_at         timestamptz not null default now()
);
alter table public.member_accounts enable row level security;
create policy member_accounts_select_own on public.member_accounts for select to authenticated using (user_id = auth.uid() or public.is_super_admin());

-- Réservations CONFIRMÉES par l'équipe (preuve côté serveur). Aucune écriture utilisateur ; la liaison est hors B4.2 (fonctions STAFF à venir).
create table public.traveler_reservations (
  user_id     uuid not null references public.accounts (id) on delete cascade,
  edition     text not null check (edition ~ '^[a-z0-9][a-z0-9-]{1,30}$'),
  status      text not null default 'verified' check (status = 'verified'),
  verified_by uuid references public.accounts (id) on delete set null,
  verified_at timestamptz not null default now(),
  primary key (user_id, edition)
);
alter table public.traveler_reservations enable row level security;
create policy traveler_reservations_select_own on public.traveler_reservations for select to authenticated using (user_id = auth.uid() or public.is_super_admin());

-- Voyageur vérifié : compte ACTIF avec accès « members » ET au moins une réservation confirmée par l'équipe.
create function public.is_verified_traveler() returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and public.has_space('members') and exists (select 1 from public.traveler_reservations t where t.user_id = auth.uid()) $$;
create function public.get_my_traveler_status() returns text language sql stable security definer set search_path = '' as $$
  select case when auth.uid() is null or not public.has_space('members') then 'none' when public.is_verified_traveler() then 'verified' else 'none' end $$;

-- ----------------------------------------------------------------------------
create function public.claim_member_account(p_first_name text, p_last_name text, p_display_name text, p_terms_version text, p_adult boolean)
returns table (outcome text)
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid(); u record; acc record;
  f text := btrim(coalesce(p_first_name, '')); l text := btrim(coalesce(p_last_name, '')); d text := btrim(coalesce(p_display_name, '')); tv text := btrim(coalesce(p_terms_version, ''));
begin
  if me is null then raise exception 'forbidden' using errcode = '42501'; end if;
  -- 1) Faits d'authentification (table gérée par Supabase Auth, jamais les métadonnées).
  select au.email_confirmed_at, au.invited_at, coalesce(au.is_anonymous, false) as anon into u from auth.users au where au.id = me;
  if not found then raise exception 'forbidden' using errcode = '42501'; end if;
  if u.email_confirmed_at is null then raise exception 'email_not_confirmed'; end if;
  if u.invited_at is not null or u.anon then raise exception 'not_eligible'; end if;
  -- 2) Verrou de ligne : deux appels simultanés du même compte sont sérialisés (le second voit le résultat du premier).
  select a.active, a.created_at, a.updated_at into acc from public.accounts a where a.id = me for update;
  if not found then raise exception 'no_account'; end if;
  -- 3) Déjà inscrit de façon autonome : idempotent si actif, refus définitif si suspendu / désactivé (aucune réactivation par ce chemin).
  if exists (select 1 from public.member_accounts m where m.user_id = me) then
    if acc.active and exists (select 1 from public.space_access s where s.user_id = me and s.space = 'members') then outcome := 'already_member'; return next; return; end if;
    raise exception 'suspended';
  end if;
  -- 4) Compte vierge uniquement : aucun accès, rôle, fiche STAFF ; jamais activé ni modifié par un administrateur.
  if acc.active or acc.updated_at <> acc.created_at
     or exists (select 1 from public.space_access s where s.user_id = me)
     or exists (select 1 from public.platform_roles r where r.user_id = me)
     or exists (select 1 from public.staff_roles r where r.user_id = me)
     or exists (select 1 from public.staff_profiles r where r.user_id = me)
     or exists (select 1 from public.participant_profiles r where r.user_id = me)
  then raise exception 'not_eligible'; end if;
  -- 5) Saisies (revalidées ici : le client n'est pas de confiance).
  if p_adult is distinct from true then raise exception 'adult_required'; end if;
  if tv = '' or char_length(tv) > 40 or tv ~ '[[:cntrl:]]' then raise exception 'terms_required'; end if;
  if f = '' or char_length(f) > 60 or f ~ '[[:cntrl:]]' then raise exception 'invalid_first_name'; end if;
  if l = '' or char_length(l) > 60 or l ~ '[[:cntrl:]]' then raise exception 'invalid_last_name'; end if;
  if d = '' or char_length(d) > 60 or d ~ '[[:cntrl:]]' then raise exception 'invalid_display_name'; end if;
  -- 6) Création atomique (une seule transaction : tout ou rien).
  insert into public.participant_profiles (user_id, first_name, last_name, display_name) values (me, f, l, d);
  insert into public.member_accounts (user_id, terms_version) values (me, tv);
  insert into public.space_access (user_id, space, granted_by) values (me, 'members', null);
  update public.accounts set active = true, display_name = d where id = me;
  outcome := 'created'; return next;
end $$;

-- ----------------------------------------------------------------------------
-- Privilèges : aucune écriture directe pour les utilisateurs ; fonctions réservées aux connectés (jamais `anon`).
revoke all on public.member_accounts, public.traveler_reservations from anon, authenticated;
grant select on public.member_accounts, public.traveler_reservations to authenticated;
revoke execute on function public.is_verified_traveler(), public.get_my_traveler_status(), public.claim_member_account(text, text, text, text, boolean) from public, anon;
grant execute on function public.is_verified_traveler(), public.get_my_traveler_status(), public.claim_member_account(text, text, text, text, boolean) to authenticated;
