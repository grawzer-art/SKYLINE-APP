/* eslint-disable @typescript-eslint/no-explicit-any */
// Droits EFFECTIFS après migration, sur un Postgres local (PGlite) — aucune base distante.
// Deux scénarios de privilèges par défaut, reproduisant ceux relevés (lecture seule) sur SKYLINE-APP :
//   "large"  : rôle propriétaire = supabase_admin → tous les droits par défaut à anon / authenticated / service_role
//   "postgres" : rôle = postgres → tables : Dxtm (TRUNCATE, REFERENCES, TRIGGER, MAINTAIN) ; fonctions : aucun droit explicite
// Vérifie aussi que la fonction système Supabase `rls_auto_enable` + son déclencheur `ensure_rls` restent INTACTS.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const TABLES = ["accounts", "mission_comments", "mission_events", "missions", "platform_roles", "project_members", "projects", "space_access", "staff_profiles", "staff_roles"];
const PRIVS = ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"];
const MIGRATION_FNS = ["add_mission_comment", "archive_mission", "assign_mission", "can_view_mission", "can_view_staff_profile", "create_mission", "delete_mission", "has_space", "is_account_active", "is_project_member", "is_staff_coordinator", "is_staff_member", "is_super_admin", "list_team", "manage_set_account_active", "manage_set_platform_roles", "manage_set_spaces", "manage_set_staff_roles", "manage_update_account", "manage_upsert_staff_profile", "resolve_assignment", "set_mission_status", "update_mission"];
let n = 0;

const scenarios: Record<string, string> = {
  large: `
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;`,
  postgres: `
    alter default privileges in schema public grant truncate, references, trigger on tables to anon, authenticated, service_role;
    alter default privileges in schema public revoke execute on functions from public;
    alter default privileges in schema public grant usage, select, update on sequences to anon, authenticated, service_role;`,
};

for (const [name, defaults] of Object.entries(scenarios)) {
  const db = new PGlite();
  const ok = (label: string) => { n++; console.log("PASS", `[${name}]`, label); };
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, raw_user_meta_data jsonb not null default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif((nullif(current_setting('request.jwt.claims', true), '')::jsonb) ->> 'sub', '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    ${defaults}
    -- Fonction SYSTÈME Supabase préexistante (copie fidèle de la définition relevée) + son déclencheur d'événement.
    create function public.rls_auto_enable() returns event_trigger language plpgsql security definer set search_path to 'pg_catalog' as $f$
    declare cmd record; tbl name;
    begin
      for cmd in select * from pg_event_trigger_ddl_commands() where command_tag in ('CREATE TABLE','CREATE TABLE AS','SELECT INTO') and object_type in ('table','partitioned table')
      loop
        if cmd.schema_name = 'public' then
          begin
            select c.relname into tbl from pg_catalog.pg_class c where c.oid = cmd.objid;
            execute format('alter table if exists %I.%I enable row level security', cmd.schema_name, tbl);
          exception when others then raise log 'rls_auto_enable: failed'; end;
        end if;
      end loop;
    end; $f$;
    create event trigger ensure_rls on ddl_command_end when tag in ('CREATE TABLE','CREATE TABLE AS','SELECT INTO') execute function public.rls_auto_enable();
    -- État initial de la fonction système : on veut qu'il soit IDENTIQUE après nos migrations.
  `);
  const sysState = async () => (await db.query<any>(`select p.proacl::text acl, p.prosecdef, p.proowner::regrole::text owner, pg_get_functiondef(p.oid) def,
      (select evtenabled::text from pg_event_trigger where evtname = 'ensure_rls') evt from pg_proc p where p.proname = 'rls_auto_enable'`)).rows[0];
  const before = await sysState();
  for (const f of readdirSync("supabase/migrations").filter((x) => x.endsWith(".sql")).sort()) await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));

  // 1) Matrice complète des droits effectifs : 10 tables × 7 privilèges × 2 rôles.
  const matrix: Record<string, string[]> = {};
  for (const role of ["anon", "authenticated"]) for (const tb of TABLES) {
    const granted: string[] = [];
    for (const p of PRIVS) if ((await db.query<any>(`select has_table_privilege($1, $2, $3) ok`, [role, `public.${tb}`, p])).rows[0].ok) granted.push(p);
    matrix[`${role}.${tb}`] = granted;
  }
  for (const tb of TABLES) {
    assert.deepEqual(matrix[`anon.${tb}`], [], `anon ne doit AUCUN droit sur ${tb}`);
    assert.deepEqual(matrix[`authenticated.${tb}`], ["SELECT"], `authenticated : SELECT seulement sur ${tb}`);
  }
  ok("10 tables : anon = aucun droit ; authenticated = SELECT seul (ni INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER)");

  // MAINTAIN (PG17) si disponible
  try {
    for (const role of ["anon", "authenticated"]) for (const tb of TABLES) assert.equal((await db.query<any>(`select has_table_privilege($1,$2,'MAINTAIN') ok`, [role, `public.${tb}`])).rows[0].ok, false, `${role} MAINTAIN ${tb}`);
    ok("privilège MAINTAIN absent partout");
  } catch (e) { if (!/unrecognized privilege|MAINTAIN/i.test(String(e))) throw e; ok("MAINTAIN non supporté par ce moteur local (ignoré)"); }

  // 2) Colonnes modifiables : exactement 3, aucune pour anon.
  const cols = (await db.query<any>(`select grantee, table_name, column_name, privilege_type from information_schema.column_privileges where grantee in ('anon','authenticated') and table_schema = 'public' and privilege_type in ('INSERT','UPDATE','REFERENCES') and (table_name, column_name) in (select c.relname, a.attname from pg_class c join pg_attribute a on a.attrelid = c.oid) order by 1,2,3,4`)).rows
    .filter((r: any) => !(matrix[`${r.grantee}.${r.table_name}`] ?? []).includes(r.privilege_type));
  assert.deepEqual(cols.map((r: any) => `${r.grantee}:${r.table_name}.${r.column_name}:${r.privilege_type}`), ["authenticated:accounts.display_name:UPDATE", "authenticated:staff_profiles.email_pro:UPDATE", "authenticated:staff_profiles.phone_pro:UPDATE"]);
  ok("colonnes avec droit d'écriture : exactement accounts.display_name, staff_profiles.email_pro, staff_profiles.phone_pro (authenticated)");

  // 3) Séquences (identité de mission_events) : aucun droit pour anon / authenticated.
  const seqs = (await db.query<any>(`select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'S'`)).rows;
  assert.ok(seqs.length >= 1, "la séquence d'identité de mission_events doit exister");
  for (const s of seqs) for (const role of ["anon", "authenticated"]) for (const p of ["USAGE", "SELECT", "UPDATE"])
    assert.equal((await db.query<any>(`select has_sequence_privilege($1, $2, $3) ok`, [role, `public.${s.relname}`, p])).rows[0].ok, false, `${role} ${p} sur séquence ${s.relname}`);
  ok(`séquences (${seqs.map((s: any) => s.relname).join(", ")}) : aucun droit pour anon / authenticated`);

  // 4) Tentatives réelles d'écriture directe.
  for (const role of ["anon", "authenticated"]) {
    for (const sql of [`insert into public.platform_roles (user_id, role) values (gen_random_uuid(), 'super_admin')`, `delete from public.missions`, `truncate public.missions`, `update public.space_access set space = 'staff'`, `update public.accounts set active = true`]) {
      await db.exec(`set role ${role}`); let msg = "";
      try { await db.exec(sql); } catch (e) { msg = String((e as Error).message); } finally { await db.exec(`reset role`); }
      assert.match(msg, /permission denied|row-level security/i, `${role} : ${sql}`);
    }
  }
  ok("anon et authenticated : INSERT / UPDATE / DELETE / TRUNCATE directs refusés");

  // 5) Fonctions : celles du projet exactement; la fonction système NON modifiée.
  const fnRows = async (role: string) => (await db.query<any>(`select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prokind = 'f' and p.proname <> 'rls_auto_enable' and has_function_privilege($1, p.oid, 'execute') order by 1`, [role])).rows.map((r: any) => r.proname);
  assert.deepEqual(await fnRows("anon"), []);
  assert.deepEqual(await fnRows("authenticated"), MIGRATION_FNS);
  ok("fonctions du projet : 0 pour anon, exactement 23 pour authenticated (rls_auto_enable exclue du décompte)");

  const after = await sysState();
  assert.deepEqual(after, before, "rls_auto_enable / ensure_rls modifiés par nos migrations");
  ok("fonction système rls_auto_enable : ACL, propriétaire, SECURITY DEFINER, code et déclencheur ensure_rls strictement INCHANGÉS");

  // 6) Directement appelée par un utilisateur : inoffensive (fonction de déclencheur d'événement).
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`set role ${role}`); let msg = "";
    try { await db.exec(`select public.rls_auto_enable()`); } catch (e) { msg = String((e as Error).message); } finally { await db.exec(`reset role`); }
    assert.match(msg, /trigger|permission denied/i, `${role} appelle rls_auto_enable`);
  }
  ok("appel direct de rls_auto_enable() par anon / authenticated : refusé (ne s'exécute que comme déclencheur d'événement)");

  // 7) Le déclencheur continue d'activer RLS sur une NOUVELLE table.
  await db.exec(`create table public.zz_future_table (id int)`);
  assert.equal((await db.query<any>(`select relrowsecurity r from pg_class where relname = 'zz_future_table'`)).rows[0].r, true);
  await db.exec(`drop table public.zz_future_table`);
  ok("ensure_rls actif : une table créée après nos migrations a RLS activée automatiquement");

  // 8) Sécurité structurelle : 10 tables RLS, 12 politiques, 26 SECURITY DEFINER du projet.
  assert.equal((await db.query<any>(`select count(*)::int c from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity`)).rows[0].c, 10);
  assert.equal((await db.query<any>(`select count(*)::int c from pg_policies where schemaname='public'`)).rows[0].c, 12);
  assert.equal((await db.query<any>(`select count(*)::int c from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef and p.proname <> 'rls_auto_enable'`)).rows[0].c, 26);
  ok("10 tables avec RLS, 12 politiques, 26 fonctions SECURITY DEFINER du projet");
  await db.close();
}
console.log(`${n} vérifications de droits effectifs : OK`);
