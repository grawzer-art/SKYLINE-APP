/* eslint-disable @typescript-eslint/no-explicit-any */
// Sprint 01 — Audit de sécurité Postgres : invariants SECURITY DEFINER / privilèges / RLS sur la chaîne COMPLÈTE (B0 → B4.1 → B4.2 → B4.3 → B4.2b → B4.2c),
// et NON-RÉGRESSION des membres existants et des comptes STAFF légitimes (comportement identique avant / après les propositions). Postgres local, deux jeux de privilèges.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

let n = 0; const defaultsBy: Record<string, string> = {
  large: `alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
          alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
          alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;`,
  postgres: `alter default privileges in schema public grant truncate, references, trigger on tables to anon, authenticated, service_role;
             alter default privileges in schema public revoke execute on functions from public;
             alter default privileges in schema public grant usage, select, update on sequences to anon, authenticated, service_role;`,
};
const P = (f: string) => readFileSync(`supabase/proposals/${f}`, "utf8");
const CHAIN = ["B4_2_member_signup.sql", "B4_3_club_profiles.sql", "B4_2b_club_traveler_gate.sql", "B4_2c_revoke_rls_auto_enable.sql"];

for (const [scenario, defaults] of Object.entries(defaultsBy)) {
  const t = async (name: string, fn: () => Promise<void>) => { await fn(); n++; console.log("PASS", `[${scenario}]`, name); };
  const db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; create schema storage;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, raw_user_meta_data jsonb not null default '{}'::jsonb,
      email_confirmed_at timestamptz, invited_at timestamptz, is_anonymous boolean not null default false);
    create function auth.uid() returns uuid language sql stable as $$ select nullif((nullif(current_setting('request.jwt.claims', true), '')::jsonb) ->> 'sub', '')::uuid $$;
    create table storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid);
    alter table storage.objects enable row level security;
    grant usage on schema public, auth, storage to anon, authenticated, service_role; grant all on storage.objects, storage.buckets to authenticated;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    ${defaults}
  `);
  for (const f of readdirSync("supabase/migrations").filter((x) => x.endsWith(".sql")).sort()) await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
  await db.exec(P("B4_1_participant_profiles.sql"));                                  // = état réel du projet partagé (B0 + B4.1)
  // Fonction de déclencheur d'événement installée par Supabase (reproduite : exécutable par anon / authenticated, comme sur le projet réel).
  await db.exec(`create function public.rls_auto_enable() returns void language plpgsql security definer set search_path = pg_catalog as $$ begin null; end $$;
                 grant execute on function public.rls_auto_enable() to anon, authenticated;`);

  const ids: Record<string, string> = {};
  const mk = async (slug: string, o: { invited?: boolean; spaces?: string[]; staff?: string[]; platform?: string[]; active?: boolean } = {}) => {
    ids[slug] = (await db.query<{ id: string }>(`insert into auth.users (email, email_confirmed_at, invited_at) values ($1, now(), $2) returning id`, [`${slug}@example.test`, o.invited === false ? null : new Date().toISOString()])).rows[0].id;
    if (o.active !== false) await db.query(`update public.accounts set active = true where id = $1`, [ids[slug]]);
    for (const s of o.spaces ?? []) await db.query(`insert into public.space_access (user_id, space) values ($1, $2)`, [ids[slug], s]);
    for (const r of o.platform ?? []) await db.query(`insert into public.platform_roles (user_id, role) values ($1, $2)`, [ids[slug], r]);
    for (const r of o.staff ?? []) await db.query(`insert into public.staff_roles (user_id, role) values ($1, $2)`, [ids[slug], r]);
    if ((o.spaces ?? []).includes("staff")) await db.query(`insert into public.staff_profiles (user_id, slug, function_title) values ($1, $2, 'F')`, [ids[slug], slug]);
  };
  await mk("root", { spaces: ["staff", "members"], platform: ["super_admin"] }); await mk("tom", { spaces: ["staff"], staff: ["admin"] }); await mk("qafard", { spaces: ["staff"], staff: ["member"] });
  await mk("member", { spaces: ["members"] }); await mk("dormant", { spaces: ["members"], active: false });                      // membre existant (invité) / compte désactivé
  const as = async <T,>(who: string | null, fn: () => Promise<T>, role = "authenticated"): Promise<T> => {
    await db.exec(`set role ${role}; select set_config('request.jwt.claims', '${who ? `{"sub":"${ids[who]}","role":"${role}"}` : ""}', false)`);
    try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claims', '', false)`); }
  };
  const q = (who: string, sql: string, args: unknown[] = []) => as(who, async () => { try { return { ok: true, rows: (await db.query<any>(sql, args)).rows }; } catch (e: any) { return { ok: false, code: e.code as string, msg: String(e.message).split("\n")[0] }; } });
  // Un membre existant a déjà son profil privé (B4.1 appliquée sur le projet réel).
  assert.ok((await q("member", `select * from public.upsert_my_participant_profile('Mia','Roux','Mia R.')`)).ok);

  // ---- Batterie de comportements : exécutée AVANT et APRÈS les propositions, résultats comparés ----
  const battery = async () => {
    const out: Record<string, unknown> = {};
    for (const who of ["root", "tom", "qafard", "member", "dormant"]) {
      out[who] = {
        flags: (await q(who, `select public.is_account_active() a, public.has_space('members') m, public.has_space('staff') s, public.is_staff_member() sm, public.is_staff_coordinator() sc, public.is_super_admin() sa`)).rows,
        counts: (await q(who, `select (select count(*) from public.accounts)::int accounts, (select count(*) from public.space_access)::int space_access, (select count(*) from public.platform_roles)::int platform_roles, (select count(*) from public.staff_roles)::int staff_roles,
                               (select count(*) from public.staff_profiles)::int staff_profiles, (select count(*) from public.missions)::int missions, (select count(*) from public.participant_profiles)::int participant_profiles`)).rows,
        team: await (async () => { const r = await q(who, `select count(*)::int c from public.list_team()`); return r.ok ? r.rows : "refused"; })(),
        profile: (await q(who, `select first_name, display_name from public.participant_profiles`)).rows ?? "refused",
        upsert: await (async () => { const r = await q(who, `select display_name from public.upsert_my_participant_profile('Test','User','Tester')`); return r.ok ? "ok" : r.msg; })(),
        manage: await (async () => { const r = await q(who, `select public.manage_set_account_active($1, true)`, [ids.dormant]); return r.ok ? "ok" : r.msg; })(),
      };
    }
    return out;
  };
  const created = await q("tom", `select status::text from public.create_mission('Brief','', $1, $2, null, 'normal', 'todo', null)`, [ids.tom, ids.root]); assert.ok(created.ok);   // une mission existe déjà
  await db.query(`update public.accounts set active = false where id = $1`, [ids.dormant]);                                          // le test « manage » a pu le réactiver
  await battery(); await db.query(`update public.accounts set active = false where id = $1`, [ids.dormant]);          // premier passage : stabilise l'état (les profils créés par la batterie)
  const before = await battery(); await db.query(`update public.accounts set active = false where id = $1`, [ids.dormant]);
  const catBefore = (await db.query<any>(`select p.proname, pg_get_function_identity_arguments(p.oid) args, coalesce(p.proacl::text,'NULL') acl, md5(p.prosrc) src from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind = 'f' and p.proname <> 'rls_auto_enable' order by 1, 2`)).rows;
  const polBefore = (await db.query<any>(`select tablename, policyname, cmd, md5(coalesce(qual,'')||coalesce(with_check,'')) m from pg_policies where schemaname = 'public' order by 1, 2`)).rows;
  for (const f of CHAIN) await db.exec(P(f));
  await db.query(`update public.accounts set active = false where id = $1`, [ids.dormant]);

  await t("NON-RÉGRESSION : membres existants, STAFF (admin / membre), super admin, compte désactivé — comportement IDENTIQUE avant / après toute la chaîne de propositions", async () => {
    const after = await battery(); assert.deepEqual(after, before);
    const catAfter = (await db.query<any>(`select p.proname, pg_get_function_identity_arguments(p.oid) args, coalesce(p.proacl::text,'NULL') acl, md5(p.prosrc) src from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind = 'f' and p.proname <> 'rls_auto_enable' order by 1, 2`)).rows;
    const map = new Map(catAfter.map((c: any) => [`${c.proname}(${c.args})`, c])); for (const b of catBefore) assert.deepEqual(map.get(`${b.proname}(${b.args})`), b, `${b.proname} modifiée`);
    const polAfter = (await db.query<any>(`select tablename, policyname, cmd, md5(coalesce(qual,'')||coalesce(with_check,'')) m from pg_policies where schemaname = 'public' order by 1, 2`)).rows;
    for (const b of polBefore) assert.deepEqual(polAfter.find((p: any) => p.tablename === b.tablename && p.policyname === b.policyname), b, `politique ${b.policyname} modifiée`);
    for (const who of ["member", "root", "tom"]) { const r = await q(who, `select public.claim_member_account('A','B','C','x', true)`); assert.ok(!r.ok && /not_eligible|terms_version_invalid/.test(r.msg ?? ""), who); }   // le claim ne touche pas aux comptes existants
    assert.deepEqual((await db.query<any>(`select count(*)::int c from public.member_accounts`)).rows, [{ c: 0 }]);
  });
  await t("SECURITY DEFINER : toutes les fonctions du projet fixent search_path (vide ou pg_catalog) ; aucune n'est exécutable par anon / public", async () => {
    const fns = (await db.query<any>(`select p.proname, p.prosecdef, coalesce(p.proconfig::text,'') cfg, has_function_privilege('anon', p.oid, 'execute') anon, has_function_privilege('public', p.oid, 'execute') pub from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'`)).rows;
    assert.ok(fns.length >= 40);
    for (const f of fns) { if (f.prosecdef) assert.match(f.cfg, /search_path/, `${f.proname} : search_path non fixé`); assert.equal(f.anon, false, `${f.proname} exécutable par anon`); assert.equal(f.pub, false, `${f.proname} exécutable par public`); }
  });
  await t("PRIVILÈGES : fonctions internes non exécutables par les utilisateurs ; rls_auto_enable révoquée (B4.2c) ; aucune fonction nouvelle ne prend d'identifiant de compte en paramètre (sauf manage_*)", async () => {
    for (const f of ["is_staff_user(uuid)", "is_validator_user(uuid)", "handle_new_user()", "touch_updated_at()", "rls_auto_enable()"]) assert.equal((await db.query<any>(`select has_function_privilege('authenticated', $1::regprocedure, 'execute') x`, [`public.${f}`])).rows[0].x, false, f);
    const risky = (await db.query<any>(`select p.proname, pg_get_function_arguments(p.oid) a from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('claim_member_account','get_my_traveler_status','is_verified_traveler','get_my_club_profile','upsert_my_club_profile','set_my_club_visibility','set_my_club_avatar','list_club_directory','get_club_member')`)).rows;
    assert.equal(risky.length, 9); for (const r of risky) assert.doesNotMatch(r.a, /\buser|\buid|owner|role|space/i, `${r.proname}(${r.a})`);
  });
  await t("RLS : toutes les tables du schéma public ont la RLS ; authenticated = SELECT seulement (sauf colonnes B0 documentées) ; anon = rien ; aucune politique d'écriture", async () => {
    const tabs = (await db.query<any>(`select c.relname, c.relrowsecurity from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'`)).rows; assert.ok(tabs.length >= 15);
    for (const x of tabs) assert.equal(x.relrowsecurity, true, `${x.relname} sans RLS`);
    for (const x of tabs) for (const priv of ["INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"]) assert.equal((await db.query<any>(`select has_table_privilege('authenticated', $1::regclass, $2) p`, [`public.${x.relname}`, priv])).rows[0].p, false, `${x.relname} ${priv} (authenticated)`);
    for (const x of tabs) for (const priv of ["SELECT", "INSERT", "UPDATE", "DELETE"]) assert.equal((await db.query<any>(`select has_table_privilege('anon', $1::regclass, $2) p`, [`public.${x.relname}`, priv])).rows[0].p, false, `${x.relname} ${priv} (anon)`);
    const cols = (await db.query<any>(`select table_name, column_name from information_schema.column_privileges where grantee = 'authenticated' and table_schema = 'public' and privilege_type in ('UPDATE','INSERT') order by 1, 2`)).rows;
    assert.deepEqual(cols.map((c: any) => `${c.table_name}.${c.column_name}`), ["accounts.display_name", "staff_profiles.email_pro", "staff_profiles.phone_pro"]);
    const pol = (await db.query<any>(`select tablename, policyname, cmd, roles::text r, qual from pg_policies where schemaname = 'public'`)).rows;
    for (const p of pol) { assert.ok(["SELECT", "UPDATE"].includes(p.cmd), `${p.policyname} ${p.cmd}`); assert.match(p.r, /authenticated/); assert.notEqual((p.qual ?? "").trim(), "true", `${p.policyname} : politique ouverte`); assert.ok(p.qual, `${p.policyname}`); }
    assert.deepEqual(pol.filter((p: any) => p.cmd === "UPDATE").map((p: any) => p.policyname).sort(), ["accounts_update_own", "staff_profiles_update_own"]);
  });
  await t("RLS : un membre inscrit / existant ne lit que SES lignes dans toute table du schéma public (aucune fuite entre comptes)", async () => {
    await db.exec(`update public.accounts set active = true where id = '${ids.dormant}'`);
    for (const who of ["member", "dormant"]) for (const tb of ["accounts", "space_access", "platform_roles", "staff_roles", "participant_profiles", "member_accounts", "traveler_reservations"]) {
      const r = await q(who, `select user_id${tb === "accounts" ? "" : ""} from public.${tb === "accounts" ? "accounts" : tb}`.replace("select user_id from public.accounts", "select id as user_id from public.accounts")); assert.ok(r.ok, `${who}.${tb}`);
      for (const row of r.rows ?? []) assert.equal(row.user_id, ids[who], `${who} lit une ligne de ${tb} qui n'est pas la sienne`);
    }
    for (const tb of ["missions", "projects", "mission_events", "mission_comments", "staff_profiles", "club_profiles", "terms_versions"]) { const r = await q("member", `select * from public.${tb}`); assert.ok(!r.ok || r.rows.length === 0, `member lit ${tb}`); }
    await db.exec(`update public.accounts set active = false where id = '${ids.dormant}'`);
  });
  await t("SUSPENSION & ACCÈS STAFF : un compte désactivé perd tout accès (members et staff) ; la réactivation par le super admin restaure l'état exact ; le claim ne peut ni réactiver ni élever", async () => {
    await db.exec(`insert into auth.users (id, email, email_confirmed_at) values (gen_random_uuid(), 'newcomer@example.test', now())`); ids.newcomer = (await db.query<any>(`select id from auth.users where email = 'newcomer@example.test'`)).rows[0].id;
    assert.ok((await q("root", `select public.manage_register_terms_version('v1', 18)`)).ok);
    assert.ok((await q("newcomer", `select * from public.claim_member_account('Nina','Roy','Nina','v1', true)`)).ok);
    assert.ok((await q("root", `select public.manage_set_account_active($1, false)`, [ids.newcomer])).ok);
    const gone = (await q("newcomer", `select public.has_space('members') m, public.is_staff_member() s`)).rows; assert.deepEqual(gone, [{ m: false, s: false }]);
    for (let i = 0; i < 3; i++) { const r = await q("newcomer", `select * from public.claim_member_account('Nina','Roy','Nina','v1', true)`); assert.ok(!r.ok && /suspended/.test(r.msg ?? "")); }
    assert.ok((await q("root", `select public.manage_set_account_active($1, true)`, [ids.newcomer])).ok);
    assert.deepEqual((await q("newcomer", `select public.has_space('members') m, public.has_space('staff') st, public.is_staff_member() s`)).rows, [{ m: true, st: false, s: false }]);
    assert.ok((await q("tom", `select count(*) from public.list_team()`)).ok); assert.ok(!(await q("tom", `select public.manage_set_account_active($1, false)`, [ids.newcomer])).ok);       // un admin STAFF ne gère pas les comptes
  });
  await db.close();
}
console.log(`${n} tests AUDIT SÉCURITÉ (Postgres local) : OK`);
