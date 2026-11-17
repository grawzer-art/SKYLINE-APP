-- SKYLINE-TEST UNIQUEMENT — AUTO-TEST DE L'INSCRIPTION AUTONOME, ENTIÈREMENT ANNULÉ (B4.2 + B4.4 + B4.5 requis). Jamais sur la production.
-- Crée dans une transaction une version de CGU et deux comptes fictifs NON invités (e-mail confirmé), exerce claim_member_account + ensure_my_club_profile + règles d'accès,
-- puis lève une exception finale : RIEN n'est conservé. Résultat lu dans le message d'erreur « SIGNUP_OK [...] » (ou SIGNUP_FAIL).
-- Dernière exécution : SKYLINE-TEST, 14/14 SIGNUP_OK, base vierge ensuite (0 compte, 0 CGU, 0 profil, 0 réservation).
begin;
insert into public.terms_versions (version, min_age) values ('cgu-test-1', 18);
insert into auth.users (id, aud, role, email, email_confirmed_at) values (gen_random_uuid(), 'authenticated', 'authenticated', 'zz-signup-test@exemple.invalid', now()), (gen_random_uuid(), 'authenticated', 'authenticated', 'zz-signup-test2@exemple.invalid', now());
do $t$
declare a uuid; b uuid; r jsonb := '[]'::jsonb; t record; val text; err text; good boolean; failed int := 0;
begin
  select id into a from auth.users where email = 'zz-signup-test@exemple.invalid'; select id into b from auth.users where email = 'zz-signup-test2@exemple.invalid';
  for t in select * from (values
    (1, 'avant inscription : aucun accès (ensure refusé)', 'a', 'authenticated', 'select public.ensure_my_club_profile()::text', 'err:forbidden'),
    (2, 'inscription : claim_member_account (adulte + CGU enregistrées)', 'a', 'authenticated', $q$select outcome from public.claim_member_account('Test','Fictif','Léa Test','cgu-test-1', true)$q$, 'ok:created'),
    (3, 'inscription sans attestation de majorité : refusée', 'b', 'authenticated', $q$select outcome from public.claim_member_account('Test','Deux','Bob Test','cgu-test-1', false)$q$, 'err:adult_required'),
    (4, 'inscription avec version de CGU non enregistrée : refusée', 'b', 'authenticated', $q$select outcome from public.claim_member_account('Test','Deux','Bob Test','cgu-inconnue', true)$q$, 'err:terms_version_invalid'),
    (5, 'profil CLUB automatique : créé', 'a', 'authenticated', 'select public.ensure_my_club_profile()::text', 'ok:true'),
    (6, 'profil CLUB automatique : idempotent', 'a', 'authenticated', 'select public.ensure_my_club_profile()::text', 'ok:false'),
    (7, 'profil lu : pseudo dérivé, PRIVÉ', 'a', 'authenticated', 'select pseudo || '':'' || visible::text from public.get_my_club_profile()', 'ok:Léa Test:false'),
    (8, 'statut : membre CLUB, pas voyageur vérifié', 'a', 'authenticated', 'select public.is_verified_traveler()::text', 'ok:false'),
    (9, 'publication refusée (non vérifié), même avec consentement', 'a', 'authenticated', $q$select public.set_my_club_visibility(true, 'club-annuaire-1')::text$q$, 'err:traveler_required'),
    (10, 'annuaire fermé pour un simple membre', 'a', 'authenticated', 'select count(*)::text from public.list_club_directory()', 'err:traveler_required'),
    (11, 'compte non inscrit : aucune création de profil pour lui', 'b', 'authenticated', 'select public.ensure_my_club_profile()::text', 'err:forbidden'),
    (12, 'visiteur : ensure_my_club_profile refusé', null, 'anon', 'select public.ensure_my_club_profile()::text', 'err:permission denied'),
    (13, 'données privées : lecture directe des profils CLUB interdite', 'a', 'authenticated', 'select count(*)::text from public.club_profiles', 'err:permission denied'),
    (14, 'journal de consentement : vide (rien publié)', 'a', 'authenticated', 'select count(*)::text from public.get_my_club_consent()', 'ok:0')
  ) as x(n, label, who, role, stmt, expect) order by n loop
    perform set_config('request.jwt.claims', case when t.who is null then '' else json_build_object('sub', case t.who when 'a' then a else b end, 'role', t.role)::text end, true);
    execute format('set local role %I', t.role);
    begin execute t.stmt into val; err := null; exception when others then err := sqlerrm; val := null; end;
    execute 'reset role';
    good := case when t.expect like 'ok:%' then err is null and val = substr(t.expect, 4) else err is not null and position(substr(t.expect, 5) in err) > 0 end;
    if not good then failed := failed + 1; end if;
    r := r || jsonb_build_object('n', t.n, 'ok', good, 'label', t.label, 'obtenu', coalesce(val, left(err, 70)));
  end loop;
  raise exception '% %', case when failed = 0 then 'SIGNUP_OK' else 'SIGNUP_FAIL(' || failed || ')' end, r::text;
end $t$;
