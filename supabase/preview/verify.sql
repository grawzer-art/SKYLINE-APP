-- ============================================================================
-- VÉRIFICATION EN LECTURE SEULE d'un projet Supabase de TEST après application de la chaîne (supabase/preview/manifest.json).
-- À coller dans le SQL Editor du projet de TEST (jamais besoin d'écriture). Chaque ligne doit afficher ok = true.
-- Le même fichier est exécuté par tests/preview-manifest.test.mts sur Postgres local.
-- ============================================================================
select 'rls_enabled_on_all_public_tables' as check_name, coalesce(bool_and(c.relrowsecurity), false) as ok from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
union all select 'anon_has_no_table_privileges', not exists (select 1 from information_schema.role_table_grants g where g.table_schema = 'public' and g.grantee = 'anon')
union all select 'authenticated_has_no_write_table_privileges', not exists (select 1 from information_schema.role_table_grants g where g.table_schema = 'public' and g.grantee = 'authenticated' and g.privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'))
union all select 'security_definer_functions_pin_search_path', not exists (select 1 from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prosecdef and coalesce(p.proconfig::text, '') not like '%search_path%')
union all select 'no_public_function_executable_by_anon', not exists (select 1 from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind = 'f' and has_function_privilege('anon', p.oid, 'execute'))
union all select 'b4_functions_present (14)', (select count(*) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('claim_member_account','is_verified_traveler','get_my_traveler_status','manage_register_terms_version','manage_retire_terms_version','get_my_club_profile','upsert_my_club_profile','set_my_club_visibility','set_my_club_avatar','list_club_directory','get_club_member','club_avatar_readable','club_owner_is_member','club_genres_ok')) = 14
union all select 'club_avatars_bucket_is_private', coalesce((select not b.public from storage.buckets b where b.id = 'club-avatars'), false)
union all select 'no_signup_yet_member_accounts_empty (neuf)', not exists (select 1 from public.member_accounts)
union all select 'no_terms_version_registered_yet (neuf)', not exists (select 1 from public.terms_versions)
order by 1;
