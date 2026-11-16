-- SKYLINE-TEST — CONTRÔLE APRÈS B4.4 (état attendu : B0 → B4.2c + B4.4). LECTURE SEULE. Généré par supabase/test-env/generate.mts (ne pas modifier à la main : le test du dépôt vérifie qu'il est à jour).
-- (Les empreintes ignorent les retours chariot CR : un copier-coller depuis un iPhone ou Windows convertit les fins de ligne sans changer le code.)
-- Chaque ligne : contrôle, valeur attendue, valeur réelle, ok. La dernière ligne « GLOBAL » doit être ok = true ; sinon : ARRÊT, ne rien exécuter.
with fp(f, src) as (values
    ('add_mission_comment(p_id uuid, p_body text)', '25218afcfa5c82fa28a8cfd5f06719e6'),
    ('archive_mission(p_id uuid)', '579909e43b2b521e0810f5cdd9978a18'),
    ('assign_mission(p_id uuid, p_assignee uuid)', '9d517354cb9675902f7a9bdf6ba2bdec'),
    ('can_view_mission(p_mission uuid)', 'bf9d5e1dea93ce786d649600cde05530'),
    ('can_view_staff_profile(u uuid)', 'af7aa733bd32b8d882fd3331d41f1aa6'),
    ('claim_member_account(p_first_name text, p_last_name text, p_display_name text, p_terms_version text, p_adult boolean)', 'b861ef7efe9e2b2a2b0814d0e3f55242'),
    ('club_avatar_readable(obj_name text)', '79735cc55956b93ff9e93191e7514f91'),
    ('club_consent_version()', '6d5dd3f42d11bd562e081498dacadfa9'),
    ('club_genres_ok(g text[])', 'bc6e08730d31770b8a0f6719a1a0c79d'),
    ('club_owner_is_member(uid uuid)', '85206db700bb7181ab85b58c6d409e5c'),
    ('create_mission(p_title text, p_description text, p_assignee uuid, p_validator uuid, p_due date, p_priority mission_priority, p_status mission_status, p_project uuid)', '119cb4bdca59f715c3fb56301396b7df'),
    ('delete_mission(p_id uuid)', '3ec08afa14a8740756444f10fe1ff0da'),
    ('get_club_member(p_public_id uuid)', 'd6a923f0ef8e5efaa6943a279bcefc17'),
    ('get_my_club_consent()', '3c2e0ba08d01a55eec87d5505941ea97'),
    ('get_my_club_profile()', '3a9dccbc0a44881a910f76497970b57f'),
    ('get_my_traveler_status()', '61240ad35bd98d91d433a033409bbdf9'),
    ('handle_new_user()', '46f8dd61d7ecbcd6a74d70ce278aa490'),
    ('has_space(s app_space)', 'd496ca1541a9b594e44aacc13481b728'),
    ('is_account_active()', '2723b06b7c3c6733499f2b6cb0274f37'),
    ('is_project_member(p_project uuid)', '018eb33484b54fdf475d425fc099b739'),
    ('is_staff_coordinator()', '74114e83b98136dcf1ec96256cda5db4'),
    ('is_staff_member()', '7b156e26886ef40806e746992dfd86da'),
    ('is_staff_user(u uuid)', '2cffed50c991b59ba78add3e71f177b0'),
    ('is_super_admin()', '6a9f6b91486a7a8e8e540590892af949'),
    ('is_validator_user(u uuid)', '83d90976eb1507ad4bbe3602abc9b9d0'),
    ('is_verified_traveler()', '985073652b199f166b79a0dbcd54ddfb'),
    ('list_club_directory(p_text text, p_city text, p_limit integer, p_offset integer)', '6485548230d8d5568265150bed6beb0a'),
    ('list_team()', '811cf90d40c100396dfcc07139243146'),
    ('manage_register_terms_version(p_version text, p_min_age integer)', '1b921049c4412d035277ec0b9c97f060'),
    ('manage_retire_terms_version(p_version text)', '48455d1f584b35357338fe4ab9c56c18'),
    ('manage_set_account_active(p_user uuid, p_active boolean)', '7d76ab5dcd4f643c2077f9eeac966ab8'),
    ('manage_set_platform_roles(p_user uuid, p_roles platform_role[])', '3cb13c61e04d8afebb3a9a4e3ca94049'),
    ('manage_set_spaces(p_user uuid, p_spaces app_space[])', 'f663cdc0eb44d7b23310df295b8724fc'),
    ('manage_set_staff_roles(p_user uuid, p_roles staff_role[])', 'f20f69466ff92437750bee31e11bb8d2'),
    ('manage_update_account(p_user uuid, p_display_name text)', '71622679a5c590b68483a3947fa17903'),
    ('manage_upsert_staff_profile(p_user uuid, p_slug text, p_function_title text)', 'd7808015b7e69ead1850365a2e896b62'),
    ('resolve_assignment(p_id uuid, p_approve boolean, p_note text)', '6aaecab132a89cc4257811c8cc2eba83'),
    ('set_mission_status(p_id uuid, p_to mission_status, p_note text)', '3106d5951ea1e5623b8d79c7ff934079'),
    ('set_my_club_avatar(p_path text)', '738a623281ee5ec78eac4efdd2b8f04e'),
    ('set_my_club_visibility(p_visible boolean, p_consent_version text)', '8f1b7aec700405f50e3681a2400e841b'),
    ('touch_updated_at()', 'b3eadeda82f2c43bf8e450434ea42a7a'),
    ('update_mission(p_id uuid, p_expected_version integer, p_title text, p_description text, p_validator uuid, p_due date, p_priority mission_priority, p_project uuid)', 'bcca6641fa7c923c1e913fe7f0c73cbb'),
    ('upsert_my_club_profile(p_pseudo text, p_city text, p_bio text, p_genres text[])', 'de313b8885f3191e12d8945f0890a1a1'),
    ('upsert_my_participant_profile(p_first_name text, p_last_name text, p_display_name text)', '9b9105dfe4affe712c9d24fe7f860b3f')
), actual as (
  select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' f, md5(replace(p.prosrc, chr(13), '')) src from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'
), checks(c, e, a) as (
  select 'fonctions publiques identiques au dépôt (empreinte du code)', (select count(*) from fp)::text, (select count(*) from fp join actual using (f, src))::text
  union all select 'fonctions publiques en trop ou manquantes', '0', ((select count(*) from actual x where not exists (select 1 from fp where fp.f = x.f)) + (select count(*) from fp where not exists (select 1 from actual x where x.f = fp.f)))::text
  union all select 'tables publiques sans RLS', '0', (select count(*) from pg_tables where schemaname = 'public' and not rowsecurity)::text
  union all select 'fonctions publiques exécutables par anon', '0', (select count(*) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind = 'f' and has_function_privilege('anon', p.oid, 'execute'))::text
  union all select 'accès directs anon/authenticated à club_profiles', '0', (select count(*) from (values ('anon'), ('authenticated')) r(role), (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) p(priv) where has_table_privilege(r.role, 'public.club_profiles', p.priv))::text
  union all select 'écritures anon/authenticated sur traveler_reservations', '0', (select count(*) from (values ('anon'), ('authenticated')) r(role), (values ('INSERT'), ('UPDATE'), ('DELETE')) p(priv) where has_table_privilege(r.role, 'public.traveler_reservations', p.priv))::text
  union all select 'bucket de photos privé', 'club-avatars:privé', (select coalesce(string_agg(id || ':' || case when public then 'public' else 'privé' end, ','), 'absent') from storage.buckets where id = 'club-avatars')
  union all select 'journal club_consents : RLS activée', 'true', (select coalesce(bool_and(c.relrowsecurity)::text, 'absente') from pg_class c where c.oid = to_regclass('public.club_consents'))
  union all select 'journal club_consents : accès directs anon/authenticated', '0', (select count(*) from (values ('anon'), ('authenticated')) r(role), (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) p(priv) where has_table_privilege(r.role, 'public.club_consents', p.priv))::text
  union all select 'journal club_consents : politiques RLS', '0', (select count(*) from pg_policies where schemaname = 'public' and tablename = 'club_consents')::text
  union all select 'ancienne publication sans consentement supprimée', '0', (select count(*) from pg_proc where proname = 'set_my_club_visibility' and pronamespace = 'public'::regnamespace and pronargs = 1)::text
  union all select 'nouvelles fonctions exécutables par authenticated', '3', (select count(*) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('set_my_club_visibility', 'get_my_club_consent', 'club_consent_version') and has_function_privilege('authenticated', p.oid, 'execute'))::text
  union all select 'version courante du texte de consentement', 'club-annuaire-1', public.club_consent_version()
  union all select 'réservations de voyageurs inchangées (avant amorçage)', '0', (select count(*) from public.traveler_reservations)::text
  union all select 'journal de consentement vide (avant tout usage)', '0', (select count(*) from public.club_consents)::text
)
select c as controle, e as attendu, a as reel, (e = a) as ok from checks
union all select 'GLOBAL', 'tout ok', case when bool_and(e = a) then 'tout ok' else 'ÉCART : ARRÊT' end, bool_and(e = a) from checks;
