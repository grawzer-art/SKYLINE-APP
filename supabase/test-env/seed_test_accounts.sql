-- ============================================================================
-- SKYLINE-TEST UNIQUEMENT — Amorçage de 3 COMPTES FICTIFS (jamais de vrais participants). NON EXÉCUTÉ.
--
-- Prérequis : les 3 comptes existent déjà dans Authentication → Users de la base de TEST (créés par le propriétaire du projet, adresse confirmée, sans droit d'administration).
--   1. membre sans réservation  → accès « participants », AUCUN statut voyageur
--   2. voyageur vérifié (1)     → accès « participants » + réservation fictive « test-fictif » insérée à la main
--   3. voyageur vérifié (2)     → idem (deux voyageurs sont nécessaires pour tester l'annuaire : réciprocité)
-- Le « visiteur » n'est pas un compte : c'est un utilisateur non connecté.
--
-- GARDE-FOUS : refuse tout compte absent, désactivé par erreur, membre de l'équipe (STAFF / rôle de plateforme) ou déjà vérifié ; refuse d'être rejoué sur autre chose que ces
-- trois adresses ; la réservation porte l'édition « test-fictif » (reconnaissable, jamais « ibiza-2027 »).
-- ============================================================================
do $seed$
declare
  member_email text := 'REMPLACER-membre-sans-reservation@exemple.invalid';
  trav1_email  text := 'REMPLACER-voyageur-1@exemple.invalid';
  trav2_email  text := 'REMPLACER-voyageur-2@exemple.invalid';
  e text; uid uuid; uids uuid[] := '{}'; i int := 0;
begin
  if member_email like 'REMPLACER%' or trav1_email like 'REMPLACER%' or trav2_email like 'REMPLACER%' then raise exception 'SEED_REFUSED : adresses de test non renseignées'; end if;
  if (select count(distinct lower(x)) from unnest(array[member_email, trav1_email, trav2_email]) x) <> 3 then raise exception 'SEED_REFUSED : trois adresses distinctes exigées'; end if;
  foreach e in array array[member_email, trav1_email, trav2_email] loop
    i := i + 1;
    select id into uid from auth.users where lower(email) = lower(e);
    if not found then raise exception 'SEED_REFUSED : compte % introuvable dans Authentication → Users', i; end if;
    if exists (select 1 from public.space_access s where s.user_id = uid and s.space = 'staff')
       or exists (select 1 from public.platform_roles r where r.user_id = uid) or exists (select 1 from public.staff_roles r where r.user_id = uid)
       then raise exception 'SEED_REFUSED : le compte % appartient à l''équipe : aucun statut vérifié artificiel pour l''équipe', i; end if;
    if exists (select 1 from public.traveler_reservations t where t.user_id = uid) then raise exception 'SEED_REFUSED : le compte % a déjà un statut vérifié', i; end if;
    uids := uids || uid;
  end loop;
  for i in 1..3 loop
    update public.accounts set active = true where id = uids[i];
    insert into public.space_access (user_id, space) values (uids[i], 'members') on conflict do nothing;
    insert into public.participant_profiles (user_id, first_name, last_name, display_name)
      values (uids[i], 'Test', case i when 1 then 'Membre' when 2 then 'Voyageur Un' else 'Voyageur Deux' end, case i when 1 then 'Membre Test' when 2 then 'Voyageur Test 1' else 'Voyageur Test 2' end) on conflict do nothing;
  end loop;
  -- SEULE attribution du statut vérifié : explicite, manuelle, deux comptes fictifs nommés ci-dessus.
  insert into public.traveler_reservations (user_id, edition, verified_by) values (uids[2], 'test-fictif', null), (uids[3], 'test-fictif', null);
end
$seed$;
select lower(u.email) as compte_fictif,
       (select string_agg(s.space::text, ',') from public.space_access s where s.user_id = u.id) as espaces,
       exists (select 1 from public.traveler_reservations t where t.user_id = u.id) as voyageur_verifie
from auth.users u order by 1;
