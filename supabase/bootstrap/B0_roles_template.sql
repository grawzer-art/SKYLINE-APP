-- ============================================================================
-- SKYLINE APP — B0 : attribution INITIALE des trois comptes (à exécuter À LA MAIN, une seule fois)
-- Ce n'est PAS une migration : elle n'est jamais appliquée automatiquement.
--
-- Modèle d'accès (voir la migration 0100) :
--   GRAW   → rôle GLOBAL super_admin + accès à l'espace STAFF (coordination STAFF via son statut de super admin)
--   TOM    → accès STAFF + permission STAFF `admin`
--   QAFARD → accès STAFF + permission STAFF `member`
-- Aucun accès MEMBERS n'est attribué ici (aucun participant en B0). Pour cumuler plus tard : `manage_set_spaces`.
--
-- ATOMIQUE PAR CONSTRUCTION : tout le script est UN SEUL bloc DO (une seule instruction). Si une vérification échoue,
-- PostgreSQL annule automatiquement TOUTES les modifications du bloc : il n'y a ni COMMIT ni ROLLBACK à gérer à la main.
--
-- Prérequis : migrations 0100 / 0200 / 0300 appliquées ; les trois comptes existent déjà (Authentication → Users → Invite user).
-- À FAIRE : remplacer les trois adresses (lignes « v_… := »). Rien n'est inventé : tant qu'une adresse porte encore
--           le texte « REMPLACER », le script refuse de s'exécuter.
-- Ce script ne supprime AUCUNE donnée. Il peut être relancé sans effet si l'état est déjà correct.
-- ============================================================================

do $bootstrap$
declare
  -- ► À REMPLACER (adresses exactes des trois comptes) :
  v_graw   text := lower(btrim('REMPLACER-PAR-L-EMAIL-DE-GRAW'));
  v_tom    text := lower(btrim('REMPLACER-PAR-L-EMAIL-DE-TOM'));
  v_qafard text := lower(btrim('REMPLACER-PAR-L-EMAIL-DE-QAFARD'));
  -- Connexion UNIQUEMENT par code e-mail / lien magique : refuser un compte qui possède un mot de passe.
  v_require_passwordless boolean := true;

  -- slug, e-mail, nom affiché, fonction, rôle global ('' = aucun), permission STAFF ('' = aucune)
  v_spec  text[][];
  v_slug  text; v_email text; v_name text; v_title text; v_platform text; v_staff text;
  v_uid uuid; v_cnt int; v_u jsonb; v_other uuid;
  v_ids uuid[] := '{}';
begin
  v_spec := array[
    array['graw',   v_graw,   'Graw',   'Directeur Artistique & Digital', 'super_admin', ''],
    array['tom',    v_tom,    'Tom',    'Fondateur',                      '',            'admin'],
    array['qafard', v_qafard, 'Qafard', 'Photographe',                    '',            'member']
  ];

  -- 1. Adresses renseignées, valides et DISTINCTES --------------------------------------------------------------
  foreach v_email in array array[v_graw, v_tom, v_qafard] loop
    if v_email like '%remplacer%' then raise exception 'BOOTSTRAP ANNULÉ : une adresse n''a pas été remplacée (%).', v_email; end if;
    if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'BOOTSTRAP ANNULÉ : adresse invalide (%).', v_email; end if;
  end loop;
  if (select count(distinct e) from unnest(array[v_graw, v_tom, v_qafard]) e) <> 3 then
    raise exception 'BOOTSTRAP ANNULÉ : les trois adresses doivent être distinctes.';
  end if;

  -- 2. Pour chaque compte : existence UNIQUE, état sain, compte, absence de conflit ------------------------------
  for i in 1 .. 3 loop
    v_slug := v_spec[i][1]; v_email := v_spec[i][2]; v_name := v_spec[i][3]; v_title := v_spec[i][4]; v_platform := v_spec[i][5]; v_staff := v_spec[i][6];

    select count(*) into v_cnt from auth.users where lower(btrim(email)) = v_email;
    if v_cnt = 0 then raise exception 'BOOTSTRAP ANNULÉ : compte introuvable pour % (%). Créez-le d''abord (Authentication → Users → Invite user).', v_slug, v_email; end if;
    if v_cnt > 1 then raise exception 'BOOTSTRAP ANNULÉ : plusieurs comptes pour % (%).', v_slug, v_email; end if;
    select id, to_jsonb(u) into v_uid, v_u from auth.users u where lower(btrim(email)) = v_email;
    v_ids := v_ids || v_uid;

    if v_u ->> 'email_confirmed_at' is null then raise exception 'BOOTSTRAP ANNULÉ : l''adresse de % n''est pas confirmée.', v_slug; end if;
    if v_u ->> 'deleted_at' is not null then raise exception 'BOOTSTRAP ANNULÉ : le compte % est supprimé.', v_slug; end if;
    if v_u ->> 'banned_until' is not null and (v_u ->> 'banned_until')::timestamptz > now() then raise exception 'BOOTSTRAP ANNULÉ : le compte % est suspendu.', v_slug; end if;
    if coalesce((v_u ->> 'is_anonymous')::boolean, false) then raise exception 'BOOTSTRAP ANNULÉ : le compte % est anonyme.', v_slug; end if;
    if v_require_passwordless and coalesce(v_u ->> 'encrypted_password', '') <> '' then
      raise exception 'BOOTSTRAP ANNULÉ : le compte % possède un mot de passe. Connexion par code e-mail uniquement : supprimez ce compte et recréez-le via « Invite user » (sans mot de passe).', v_slug;
    end if;

    -- Compte global (créé par le déclencheur à la création ; recréé ici s'il manque), inactif tant que tout n'est pas validé.
    if not exists (select 1 from public.accounts where id = v_uid) then
      insert into public.accounts (id, display_name, active) values (v_uid, v_name, false);
    end if;
    -- Slug déjà pris par une AUTRE fiche STAFF ?
    select user_id into v_other from public.staff_profiles where slug = v_slug and user_id <> v_uid;
    if v_other is not null then raise exception 'BOOTSTRAP ANNULÉ : le slug « % » appartient déjà à un autre compte.', v_slug; end if;
    -- Rôles / permissions existants : aucun, ou exactement ceux attendus (relance sans effet). Tout autre = conflit.
    if exists (select 1 from public.platform_roles where user_id = v_uid and role::text <> v_platform) then
      raise exception 'BOOTSTRAP ANNULÉ : le compte % a déjà un rôle global différent de « % ».', v_slug, v_platform;
    end if;
    if exists (select 1 from public.staff_roles where user_id = v_uid and role::text <> v_staff) then
      raise exception 'BOOTSTRAP ANNULÉ : le compte % a déjà une permission STAFF différente de « % ».', v_slug, v_staff;
    end if;
  end loop;

  -- 3. Équipe active = ces trois comptes UNIQUEMENT --------------------------------------------------------------
  if exists (select 1 from public.space_access sa join public.accounts a on a.id = sa.user_id
             where sa.space = 'staff' and a.active and sa.user_id <> all (v_ids)) then
    raise exception 'BOOTSTRAP ANNULÉ : un autre compte actif possède déjà l''accès STAFF.';
  end if;
  if exists (select 1 from public.platform_roles where role = 'super_admin' and user_id <> all (v_ids)) then
    raise exception 'BOOTSTRAP ANNULÉ : un autre super_admin existe déjà.';
  end if;

  -- 4. Attribution (dans la même instruction : tout ou rien) ---------------------------------------------------------
  for i in 1 .. 3 loop
    select id into v_uid from auth.users where lower(btrim(email)) = v_spec[i][2];
    update public.accounts set display_name = v_spec[i][3], active = true where id = v_uid;
    insert into public.space_access (user_id, space) values (v_uid, 'staff') on conflict do nothing;
    if v_spec[i][5] <> '' then insert into public.platform_roles (user_id, role) values (v_uid, v_spec[i][5]::public.platform_role) on conflict do nothing; end if;
    if v_spec[i][6] <> '' then insert into public.staff_roles (user_id, role) values (v_uid, v_spec[i][6]::public.staff_role) on conflict do nothing; end if;
    insert into public.staff_profiles (user_id, slug, function_title) values (v_uid, v_spec[i][1], v_spec[i][4])
      on conflict (user_id) do update set slug = excluded.slug, function_title = excluded.function_title;
  end loop;

  -- 5. Vérification finale : sinon TOUT est annulé ------------------------------------------------------------------
  for i in 1 .. 3 loop
    select id into v_uid from auth.users where lower(btrim(email)) = v_spec[i][2];
    if not exists (select 1 from public.accounts where id = v_uid and active)
       or not exists (select 1 from public.space_access where user_id = v_uid and space = 'staff')
       or not exists (select 1 from public.staff_profiles where user_id = v_uid and slug = v_spec[i][1])
       or (select count(*) from public.platform_roles where user_id = v_uid and role::text = v_spec[i][5]) <> (case when v_spec[i][5] = '' then 0 else 1 end)
       or (select count(*) from public.platform_roles where user_id = v_uid) <> (case when v_spec[i][5] = '' then 0 else 1 end)
       or (select count(*) from public.staff_roles where user_id = v_uid and role::text = v_spec[i][6]) <> (case when v_spec[i][6] = '' then 0 else 1 end)
       or (select count(*) from public.staff_roles where user_id = v_uid) <> (case when v_spec[i][6] = '' then 0 else 1 end) then
      raise exception 'BOOTSTRAP ANNULÉ : contrôle final en échec pour %.', v_spec[i][1];
    end if;
  end loop;
  if (select count(*) from public.platform_roles) <> 1 or (select count(*) from public.staff_roles) <> 2
     or (select count(*) from public.space_access where space = 'staff') <> 3 then
    raise exception 'BOOTSTRAP ANNULÉ : les totaux (1 rôle global, 2 permissions STAFF, 3 accès STAFF) ne correspondent pas.';
  end if;

  raise notice 'BOOTSTRAP OK : graw=super_admin global + accès STAFF, tom=admin STAFF, qafard=member STAFF.';
end
$bootstrap$;

-- Contrôle visuel (lecture seule) : doit afficher exactement 3 lignes.
select sp.slug, a.display_name, sp.function_title, a.active,
       (select array_agg(pr.role) from public.platform_roles pr where pr.user_id = a.id) as role_global,
       (select array_agg(sa.space) from public.space_access sa where sa.user_id = a.id) as acces,
       (select array_agg(sr.role) from public.staff_roles sr where sr.user_id = a.id) as permissions_staff
from public.accounts a join public.staff_profiles sp on sp.user_id = a.id order by sp.slug;
