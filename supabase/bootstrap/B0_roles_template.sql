-- ============================================================================
-- STAFF HQ V2 — B0 : attribution INITIALE des trois comptes (à exécuter À LA MAIN, une seule fois)
-- Ce n'est PAS une migration : elle n'est jamais appliquée automatiquement.
--
-- ATOMIQUE PAR CONSTRUCTION : tout le script est UN SEUL bloc DO (une seule instruction). Si une vérification échoue,
-- PostgreSQL annule automatiquement TOUTES les modifications du bloc : il n'y a ni COMMIT ni ROLLBACK à gérer à la main.
--
-- Prérequis : migrations 0100 / 0200 / 0300 appliquées ; les trois comptes existent déjà (Authentication → Users).
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

  v_spec  text[][] := null;
  v_slug  text; v_email text; v_name text; v_title text; v_role public.app_role;
  v_uid uuid; v_cnt int; v_u jsonb; v_other uuid;
  v_ids uuid[] := '{}';
begin
  v_spec := array[
    array['graw',   v_graw,   'Graw',   'Directeur Artistique & Digital', 'super_admin'],
    array['tom',    v_tom,    'Tom',    'Fondateur',                      'admin'],
    array['qafard', v_qafard, 'Qafard', 'Photographe',                    'member']
  ];

  -- 1. Adresses renseignées, valides et DISTINCTES --------------------------------------------------------------
  foreach v_email in array array[v_graw, v_tom, v_qafard] loop
    if v_email like '%remplacer%' then raise exception 'BOOTSTRAP ANNULÉ : une adresse n''a pas été remplacée (%).', v_email; end if;
    if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'BOOTSTRAP ANNULÉ : adresse invalide (%).', v_email; end if;
  end loop;
  if (select count(distinct e) from unnest(array[v_graw, v_tom, v_qafard]) e) <> 3 then
    raise exception 'BOOTSTRAP ANNULÉ : les trois adresses doivent être distinctes.';
  end if;

  -- 2. Pour chaque compte : existence UNIQUE, état sain, profil, absence de conflit ------------------------------
  for i in 1 .. 3 loop
    v_slug := v_spec[i][1]; v_email := v_spec[i][2]; v_name := v_spec[i][3]; v_title := v_spec[i][4]; v_role := v_spec[i][5]::public.app_role;

    select count(*) into v_cnt from auth.users where lower(btrim(email)) = v_email;
    if v_cnt = 0 then raise exception 'BOOTSTRAP ANNULÉ : compte introuvable pour % (%). Créez-le d''abord dans Authentication → Users.', v_slug, v_email; end if;
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

    -- Profil (créé par le déclencheur à la création du compte ; recréé ici s'il manque).
    if not exists (select 1 from public.profiles where id = v_uid) then
      insert into public.profiles (id, slug, display_name, active) values (v_uid, 'tmp-' || left(replace(v_uid::text, '-', ''), 12), v_name, false);
    end if;
    -- Slug déjà pris par un AUTRE compte ?
    select id into v_other from public.profiles where slug = v_slug and id <> v_uid;
    if v_other is not null then raise exception 'BOOTSTRAP ANNULÉ : le slug « % » appartient déjà à un autre compte.', v_slug; end if;
    -- Rôles existants : aucun, ou exactement le rôle attendu (relance sans effet). Tout autre rôle = conflit.
    if exists (select 1 from public.user_roles where user_id = v_uid and role <> v_role) then
      raise exception 'BOOTSTRAP ANNULÉ : le compte % a déjà un rôle différent de %.', v_slug, v_role;
    end if;
  end loop;

  -- 3. Aucun AUTRE compte actif avec un rôle (équipe active = ces trois comptes uniquement) -------------------------
  if exists (select 1 from public.user_roles ur join public.profiles p on p.id = ur.user_id where p.active and ur.user_id <> all (v_ids)) then
    raise exception 'BOOTSTRAP ANNULÉ : un autre compte actif possède déjà un rôle STAFF.';
  end if;
  if exists (select 1 from public.user_roles where role = 'super_admin' and user_id <> all (v_ids)) then
    raise exception 'BOOTSTRAP ANNULÉ : un autre super_admin existe déjà.';
  end if;

  -- 4. Attribution (dans la même instruction : tout ou rien) ---------------------------------------------------------
  for i in 1 .. 3 loop
    select id into v_uid from auth.users where lower(btrim(email)) = v_spec[i][2];
    update public.profiles set slug = v_spec[i][1], display_name = v_spec[i][3], function_title = v_spec[i][4], active = true where id = v_uid;
    insert into public.user_roles (user_id, role) values (v_uid, v_spec[i][5]::public.app_role) on conflict do nothing;
  end loop;

  -- 5. Vérification finale : exactement 3 comptes actifs avec le rôle attendu, sinon TOUT est annulé ------------------
  for i in 1 .. 3 loop
    if (select count(*) from public.profiles p join public.user_roles ur on ur.user_id = p.id
        where p.slug = v_spec[i][1] and p.active and ur.role = v_spec[i][5]::public.app_role) <> 1
       or (select count(*) from public.user_roles ur join public.profiles p on p.id = ur.user_id where p.slug = v_spec[i][1]) <> 1 then
      raise exception 'BOOTSTRAP ANNULÉ : contrôle final en échec pour %.', v_spec[i][1];
    end if;
  end loop;
  if (select count(*) from public.user_roles) <> 3 then raise exception 'BOOTSTRAP ANNULÉ : le nombre total de rôles n''est pas 3.'; end if;

  raise notice 'BOOTSTRAP OK : graw=super_admin, tom=admin, qafard=member.';
end
$bootstrap$;

-- Contrôle visuel (lecture seule) : doit afficher exactement 3 lignes.
select p.slug, p.display_name, p.function_title, p.active, array_agg(ur.role) as roles
from public.profiles p left join public.user_roles ur on ur.user_id = p.id
group by p.id order by p.slug;
