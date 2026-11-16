-- ============================================================================
-- SKYLINE-TEST UNIQUEMENT — AUTO-TEST DE BOUT EN BOUT, ENTIÈREMENT ANNULÉ.
-- Crée trois comptes fictifs DANS une transaction, les amorce (voyageurs vérifiés fictifs « test-fictif »), exécute les 22 contrôles de live_isolation_check.sql,
-- puis lève une exception finale : RIEN n'est conservé (vérifié : 0 compte, 0 réservation, 0 profil, 0 consentement après exécution).
-- Résultat : message d'erreur « ISOLATION_OK [...] » (ou ISOLATION_FAIL). N'exige AUCUN compte existant. Jamais sur la base de production.
-- Dernière exécution : SKYLINE-TEST (tbjzzrlidtkclvhwudhb), 22/22 ISOLATION_OK, base vierge ensuite.
-- ============================================================================
begin;
insert into auth.users (id, aud, role, email, email_confirmed_at) values (gen_random_uuid(), 'authenticated', 'authenticated', 'zz-mbr-test@exemple.invalid', now()), (gen_random_uuid(), 'authenticated', 'authenticated', 'zz-v1-test@exemple.invalid', now()), (gen_random_uuid(), 'authenticated', 'authenticated', 'zz-v2-test@exemple.invalid', now());
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
  member_email text := 'zz-mbr-test@exemple.invalid';
  trav1_email  text := 'zz-v1-test@exemple.invalid';
  trav2_email  text := 'zz-v2-test@exemple.invalid';
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

-- ============================================================================
-- SKYLINE-TEST — CONTRÔLE D'ISOLATION EN CONDITIONS RÉELLES (après B4.4 et l'amorçage). TOUT EST ANNULÉ : le bloc se termine par une exception, donc aucune ligne n'est conservée.
-- Le résultat est lu dans le message d'erreur : « ISOLATION_OK … » ou « ISOLATION_FAIL … » (liste JSON des contrôles). Utilise les 3 comptes fictifs, dans l'ordre : membre, voyageur 1, voyageur 2.
-- ============================================================================
do $iso$
declare
  m uuid; a uuid; b uuid; r jsonb := '[]'::jsonb; t record; val text; err text; good boolean; failed int := 0;
begin
  select u.id into m from auth.users u join public.space_access s on s.user_id = u.id and s.space = 'members' where not exists (select 1 from public.traveler_reservations x where x.user_id = u.id and x.edition = 'test-fictif') order by u.email limit 1;
  select string_agg(u.id::text, ',' order by u.email) into val from auth.users u join public.traveler_reservations x on x.user_id = u.id and x.edition = 'test-fictif';
  a := split_part(val, ',', 1)::uuid; b := split_part(val, ',', 2)::uuid;
  if m is null or a is null or b is null then raise exception 'ISOLATION_FAIL : comptes fictifs non amorcés'; end if;
  for t in select * from (values
    (1,  'membre : crée son profil CLUB (privé)',                  'm', 'authenticated', 'select count(*)::text from public.upsert_my_club_profile(''Membre Test'', ''Paris'', '''', array[]::text[])', 'ok:1'),
    (2,  'voyageur 1 : crée son profil CLUB',                       'a', 'authenticated', 'select count(*)::text from public.upsert_my_club_profile(''Voyageur A'', ''Lyon'', '''', array[]::text[])', 'ok:1'),
    (3,  'voyageur 2 : crée son profil CLUB',                       'b', 'authenticated', 'select count(*)::text from public.upsert_my_club_profile(''Voyageur B'', ''Lille'', '''', array[]::text[])', 'ok:1'),
    (4,  'membre sans réservation : publication refusée même avec consentement', 'm', 'authenticated', 'select public.set_my_club_visibility(true, ''club-annuaire-1'')::text', 'err:traveler_required'),
    (5,  'voyageur : publication sans consentement refusée',        'a', 'authenticated', 'select public.set_my_club_visibility(true)::text', 'err:consent_required'),
    (6,  'voyageur : version de consentement périmée refusée',      'a', 'authenticated', 'select public.set_my_club_visibility(true, ''club-annuaire-0'')::text', 'err:consent_required'),
    (7,  'voyageur 1 : publication avec consentement',              'a', 'authenticated', 'select public.set_my_club_visibility(true, ''club-annuaire-1'')::text', 'ok:true'),
    (8,  'voyageur 2 : publication avec consentement',              'b', 'authenticated', 'select public.set_my_club_visibility(true, ''club-annuaire-1'')::text', 'ok:true'),
    (9,  'voyageur 1 voit UNIQUEMENT l''autre voyageur publié',     'a', 'authenticated', 'select coalesce(string_agg(pseudo, '',''), '''') from public.list_club_directory()', 'ok:Voyageur B'),
    (10, 'membre sans réservation : annuaire fermé',                'm', 'authenticated', 'select count(*)::text from public.list_club_directory()', 'err:traveler_required'),
    (11, 'journal de consentement : lecture directe interdite',     'a', 'authenticated', 'select count(*)::text from public.club_consents', 'err:permission denied'),
    (12, 'trace de consentement : la sienne seulement',             'a', 'authenticated', 'select action || '':'' || consent_version from public.get_my_club_consent()', 'ok:publish:club-annuaire-1'),
    (13, 'réservations : chacun ne voit que la sienne',             'b', 'authenticated', 'select count(*)::text from public.traveler_reservations', 'ok:1'),
    (14, 'réservations : aucune auto-attribution',                  'b', 'authenticated', format('insert into public.traveler_reservations (user_id, edition) values (%L, ''x-2027'')', m), 'err:'),
    (15, 'profils privés : chacun ne voit que le sien',             'a', 'authenticated', 'select count(*)::text from public.participant_profiles', 'ok:1'),
    (16, 'statut voyageur : membre = faux',                         'm', 'authenticated', 'select public.is_verified_traveler()::text', 'ok:false'),
    (17, 'statut voyageur : voyageur = vrai',                       'a', 'authenticated', 'select public.is_verified_traveler()::text', 'ok:true'),
    (18, 'retrait : toujours possible',                             'a', 'authenticated', 'select public.set_my_club_visibility(false)::text', 'ok:false'),
    (19, 'après retrait : plus visible par l''autre',               'b', 'authenticated', 'select count(*)::text from public.list_club_directory()', 'ok:0'),
    (20, 'visiteur (anon) : trace inaccessible',                    null, 'anon',          'select public.get_my_club_consent()::text', 'err:permission denied'),
    (21, 'visiteur (anon) : profils CLUB inaccessibles',            null, 'anon',          'select count(*)::text from public.club_profiles', 'err:permission denied'),
    (22, 'visiteur (anon) : annuaire inaccessible',                 null, 'anon',          'select count(*)::text from public.list_club_directory()', 'err:permission denied')
  ) as x(n, label, who, role, stmt, expect) order by n loop
    perform set_config('request.jwt.claims', case when t.who is null then '' else json_build_object('sub', case t.who when 'm' then m when 'a' then a else b end, 'role', t.role)::text end, true);
    execute format('set local role %I', t.role);
    begin execute t.stmt into val; err := null; exception when others then err := sqlerrm; val := null; end;
    execute 'reset role';
    good := case when t.expect like 'ok:%' then err is null and val = substr(t.expect, 4) else err is not null and (length(t.expect) = 4 or position(substr(t.expect, 5) in err) > 0) end;
    if not good then failed := failed + 1; end if;
    r := r || jsonb_build_object('n', t.n, 'ok', good, 'label', t.label, 'obtenu', coalesce(val, left(err, 60)));
  end loop;
  raise exception '% %', case when failed = 0 then 'ISOLATION_OK' else 'ISOLATION_FAIL(' || failed || ')' end, r::text;
end
$iso$;
