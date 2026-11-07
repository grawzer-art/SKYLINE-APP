/* eslint-disable @typescript-eslint/no-explicit-any */
// B4.1 — Profils participants : RLS, droits, séparation des rôles, validation, métadonnées non fiables. Postgres local (B0 + proposition B4.1).
// Proposition : supabase/proposals/B4_1_participant_profiles.sql (NON appliquée à la base réelle). Deux jeux de privilèges par défaut (Supabase « large » / postgres).
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
const PROPOSAL = readFileSync("supabase/proposals/B4_1_participant_profiles.sql", "utf8");

for (const [scenario, defaults] of Object.entries(defaultsBy)) {
  const t = async (name: string, fn: () => Promise<void>) => { await fn(); n++; console.log("PASS", `[${scenario}]`, name); };
  const db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, raw_user_meta_data jsonb not null default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif((nullif(current_setting('request.jwt.claims', true), '')::jsonb) ->> 'sub', '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    ${defaults}
  `);
  for (const f of readdirSync("supabase/migrations").filter((x) => x.endsWith(".sql")).sort()) await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
  const catalog = async () => (await db.query<any>(`select p.proname, pg_get_function_identity_arguments(p.oid) args, p.oid::int oid, coalesce(p.proacl::text,'NULL') acl, md5(p.prosrc) src from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind = 'f' order by 1, 2`)).rows;
  const before = await catalog();
  await db.exec(PROPOSAL);

  const ids: Record<string, string> = {};
  const provision = async (slug: string, o: { platform?: string[]; spaces?: string[]; staff?: string[]; active?: boolean; meta?: object } = {}) => {
    ids[slug] = (await db.query<{ id: string }>(`insert into auth.users (email, raw_user_meta_data) values ($1, $2::jsonb) returning id`, [`${slug}@example.test`, JSON.stringify(o.meta ?? {})])).rows[0].id;
    if (o.active !== false && (o.spaces || o.platform || o.staff)) await db.query(`update public.accounts set active = true where id = $1`, [ids[slug]]);
    for (const s of o.spaces ?? []) await db.query(`insert into public.space_access (user_id, space) values ($1, $2)`, [ids[slug], s]);
    for (const r of o.platform ?? []) await db.query(`insert into public.platform_roles (user_id, role) values ($1, $2)`, [ids[slug], r]);
    for (const r of o.staff ?? []) await db.query(`insert into public.staff_roles (user_id, role) values ($1, $2)`, [ids[slug], r]);
    if ((o.spaces ?? []).includes("staff")) await db.query(`insert into public.staff_profiles (user_id, slug, function_title) values ($1, $2, 'F')`, [ids[slug], slug]);
  };
  await provision("alice", { spaces: ["members"] });
  await provision("bob", { spaces: ["members"] });
  await provision("tom", { spaces: ["staff"], staff: ["admin"] });                       // administrateur STAFF (pas super admin)
  await provision("graw", { platform: ["super_admin"], spaces: ["staff"] });             // super admin global
  await provision("inactive", { spaces: ["members"], active: false });
  await provision("norole", {});
  await provision("hacker", { meta: { role: "super_admin", roles: ["super_admin"], spaces: ["staff", "members"], is_admin: true, name: "Administrateur", app_role: "admin" } });

  let chain: Promise<unknown> = Promise.resolve();
  const serial = <T,>(fn: () => Promise<T>): Promise<T> => { const r = chain.then(fn, fn); chain = r.catch(() => undefined); return r; };
  const as = <T,>(who: string, fn: () => Promise<T>): Promise<T> => serial(async () => {
    if (who === "anon") await db.exec(`set role anon; select set_config('request.jwt.claims', '', false)`);
    else await db.exec(`set role authenticated; select set_config('request.jwt.claims', '{"sub":"${ids[who]}","role":"authenticated"}', false)`);
    try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claims', '', false)`); }
  });
  const q = (who: string, sql: string, p: unknown[] = []) => as(who, async () => (await db.query<any>(sql, p)).rows);
  const fails = async (who: string, sql: string, re: RegExp, p: unknown[] = []) => { let msg = ""; try { await q(who, sql, p); } catch (e) { msg = String((e as Error).message); } assert.match(msg, re, `attendu ${re} pour : ${sql.slice(0, 90)}`); };
  const up = (who: string, f = "Alice", l = "Martin", d = "Alice M.") => q(who, `select * from public.upsert_my_participant_profile($1, $2, $3)`, [f, l, d]);

  await t("migration B4.1 : s'applique sur B0 sans toucher une seule fonction existante (code, OID, droits identiques)", async () => {
    const after = await catalog(); const map = new Map(after.map((c) => [`${c.proname}(${c.args})`, c]));
    for (const b of before) assert.deepEqual(map.get(`${b.proname}(${b.args})`), b, `${b.proname} modifiée`);
    assert.deepEqual(after.filter((c) => !before.some((b) => b.proname === c.proname && b.args === c.args)).map((c) => c.proname), ["upsert_my_participant_profile"]);
  });
  await t("un participant crée puis relit SON profil (valeurs nettoyées) ; created_at stable, updated_at renouvelé", async () => {
    const r = (await up("alice", "  Alice ", " Martin", " Alice M. "))[0]; assert.deepEqual([r.user_id, r.first_name, r.last_name, r.display_name, r.avatar_path], [ids.alice, "Alice", "Martin", "Alice M.", null]);
    const mine = await q("alice", `select * from public.participant_profiles`); assert.equal(mine.length, 1); assert.equal(mine[0].display_name, "Alice M.");
    await db.exec(`update public.participant_profiles set updated_at = now() - interval '1 hour', created_at = now() - interval '2 hour'`);
    const r2 = (await up("alice", "Alice", "Martin", "Alice"))[0]; assert.equal(r2.display_name, "Alice"); assert.ok(r2.updated_at > r2.created_at && +r2.updated_at > Date.now() - 60_000);
    assert.ok(+r2.created_at < Date.now() - 3_000_000, "created_at inchangé");
    assert.equal((await q("alice", `select count(*)::int c from public.participant_profiles`))[0].c, 1);
  });
  await t("ISOLATION : un participant ne lit et ne modifie JAMAIS le profil d'un autre ; aucune écriture directe", async () => {
    await up("bob", "Bob", "Durand", "Bob");
    assert.deepEqual((await q("bob", `select display_name from public.participant_profiles`)).map((r) => r.display_name), ["Bob"]);
    assert.deepEqual(await q("bob", `select * from public.participant_profiles where user_id = $1`, [ids.alice]), []);
    for (const sql of [`update public.participant_profiles set display_name = 'Piraté'`, `delete from public.participant_profiles`, `truncate public.participant_profiles`, `insert into public.participant_profiles (user_id, first_name, last_name, display_name) values (gen_random_uuid(), 'X', 'Y', 'Z')`])
      await fails("bob", sql, /permission denied/);
    assert.equal((await db.query<any>(`select display_name from public.participant_profiles where user_id = $1`, [ids.alice])).rows[0].display_name, "Alice");
    const sig = (await db.query<any>(`select pg_get_function_arguments(oid) a from pg_proc where proname = 'upsert_my_participant_profile'`)).rows[0].a; assert.doesNotMatch(sig, /user|uuid|id/i, "aucun paramètre identifiant : on ne peut agir que sur soi-même");
  });
  await t("PERMISSIONS STAFF : un administrateur STAFF ne lit pas les profils participants ; le super admin les lit (autorisation explicite) sans pouvoir écrire", async () => {
    assert.deepEqual(await q("tom", `select * from public.participant_profiles`), []);
    assert.deepEqual((await q("graw", `select display_name from public.participant_profiles order by display_name`)).map((r) => r.display_name), ["Alice", "Bob"]);
    await fails("graw", `update public.participant_profiles set display_name = 'x'`, /permission denied/);
    await fails("tom", `select * from public.upsert_my_participant_profile('T', 'T', 'T')`, /forbidden/);                                      // sans accès participants : pas de profil
    await fails("graw", `select * from public.upsert_my_participant_profile('T', 'T', 'T')`, /forbidden/);
  });
  await t("REFUS : comptes inactifs, sans accès participants, anonymes — ni lecture, ni création", async () => {
    for (const w of ["inactive", "norole", "hacker"]) { await fails(w, `select * from public.upsert_my_participant_profile('A', 'B', 'C')`, /forbidden/); assert.deepEqual(await q(w, `select * from public.participant_profiles`), [], w); }
    await fails("anon", `select * from public.upsert_my_participant_profile('A', 'B', 'C')`, /permission denied/); await fails("anon", `select * from public.participant_profiles`, /permission denied/);
    await db.exec(`update public.accounts set active = false where id = '${ids.bob}'`);
    assert.deepEqual(await q("bob", `select * from public.participant_profiles`), []); await fails("bob", `select * from public.upsert_my_participant_profile('B', 'D', 'B')`, /forbidden/);
    await db.exec(`update public.accounts set active = true where id = '${ids.bob}'`);
  });
  await t("MÉTADONNÉES NON FIABLES : role / spaces / is_admin dans raw_user_meta_data ne donnent AUCUN droit (compte inactif, sans accès, sans rôle)", async () => {
    const a = (await db.query<any>(`select active from public.accounts where id = $1`, [ids.hacker])).rows[0]; assert.equal(a.active, false);
    for (const tb of ["platform_roles", "space_access", "staff_roles"]) assert.equal((await db.query<any>(`select count(*)::int c from public.${tb} where user_id = $1`, [ids.hacker])).rows[0].c, 0, tb);
    assert.equal((await q("hacker", `select public.is_super_admin() a, public.is_staff_member() b, public.has_space('members') c, public.has_space('staff') d`))[0].a, false);
    const f = (await q("hacker", `select public.has_space('members') c, public.has_space('staff') d, public.is_staff_member() b`))[0]; assert.deepEqual([f.c, f.d, f.b], [false, false, false]);
    // et un utilisateur ne peut pas modifier ses propres métadonnées pour s'octroyer un accès : la base ne lit jamais les métadonnées pour décider
    await db.exec(`update auth.users set raw_user_meta_data = '{"spaces":["members"],"role":"super_admin"}'::jsonb where id = '${ids.alice}'`);
    assert.equal((await q("alice", `select public.is_super_admin() s`))[0].s, false);
    assert.doesNotMatch(PROPOSAL.replace(/--[^\n]*/g, ""), /raw_user_meta_data|user_metadata|raw_app_meta_data/, "la proposition ne lit jamais les métadonnées");
  });
  await t("RÔLES SÉPARÉS : le profil n'a aucune colonne de rôle / d'accès ; l'écrire ne change aucun rôle ni accès", async () => {
    const cols = (await db.query<any>(`select column_name from information_schema.columns where table_schema = 'public' and table_name = 'participant_profiles' order by ordinal_position`)).rows.map((r) => r.column_name);
    assert.deepEqual(cols, ["user_id", "first_name", "last_name", "display_name", "avatar_path", "created_at", "updated_at"]);
    assert.ok(!cols.some((c) => /role|admin|space|access|permission|active/i.test(c)));
    const snap = async () => JSON.stringify([(await db.query<any>(`select * from public.platform_roles order by 1, 2`)).rows, (await db.query<any>(`select user_id, space from public.space_access order by 1, 2`)).rows, (await db.query<any>(`select user_id, role from public.staff_roles order by 1, 2`)).rows, (await db.query<any>(`select id, active from public.accounts order by 1`)).rows]);
    const s0 = await snap(); await up("alice", "Alice", "Martin", "Super Admin"); assert.equal(await snap(), s0);
    await fails("alice", `update public.accounts set active = true`, /permission denied|violates|column/); await fails("alice", `insert into public.space_access (user_id, space) values ($1, 'staff')`, /permission denied/, [ids.alice]);
  });
  await t("VALIDATION côté base : vide, trop long, caractères de contrôle refusés ; accents et espaces internes acceptés ; bornes 60", async () => {
    for (const [args, re] of [[["", "M", "D"], /invalid_first_name/], [["  ", "M", "D"], /invalid_first_name/], [["x".repeat(61), "M", "D"], /invalid_first_name/], [["A", "", "D"], /invalid_last_name/], [["A", "M\u0007", "D"], /invalid_last_name/], [["A", "M", ""], /invalid_display_name/], [["A", "M", "D\n"], /invalid_display_name/], [["A", "M", "y".repeat(61)], /invalid_display_name/], [[null, "M", "D"], /invalid_first_name/]] as const)
      await fails("alice", `select * from public.upsert_my_participant_profile($1, $2, $3)`, re, [...args]);
    const ok = (await up("alice", "Élodie-Anne", "de la Cruz", "Élo ✈ Ibiza"))[0]; assert.equal(ok.display_name, "Élo ✈ Ibiza");
    assert.equal((await up("alice", "x".repeat(60), "M", "y".repeat(60)))[0].first_name.length, 60);
    assert.equal((await q("alice", `select count(*)::int c from public.participant_profiles`))[0].c, 1, "les refus n'écrivent rien");
  });
  await t("AVATAR : chemin interne obligatoire, dans le dossier de l'utilisateur ; aucune URL externe (écriture directe superuser contrôlée)", async () => {
    const ok = `avatars/${ids.alice}/photo-1.png`; await db.exec(`update public.participant_profiles set avatar_path = '${ok}' where user_id = '${ids.alice}'`);
    for (const bad of ["https://evil.example/x.png", `avatars/${ids.bob}/photo.png`, "avatars/../x.png", `avatars/${ids.alice}/../x.png`, "x.png", `avatars/${ids.alice}/a b.png`, `avatars/${ids.alice}/${"x".repeat(90)}.png`]) {
      let msg = ""; try { await db.exec(`update public.participant_profiles set avatar_path = '${bad}' where user_id = '${ids.alice}'`); } catch (e) { msg = String((e as Error).message); } assert.match(msg, /check|violates/, bad);
    }
    assert.equal((await q("alice", `select avatar_path from public.participant_profiles`))[0].avatar_path, ok);
    assert.equal((await up("alice", "Alice", "Martin", "Alice"))[0].avatar_path, ok, "la mise à jour du profil ne touche pas l'avatar");
  });
  await t("PRIVILÈGES : anon = aucun droit ; authenticated = SELECT seul ; RLS active ; fonction : anon / PUBLIC jamais, authenticated oui", async () => {
    for (const [role, expect] of [["anon", []], ["authenticated", ["SELECT"]]] as const) { const got: string[] = []; for (const p of ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"]) if ((await db.query<any>(`select has_table_privilege($1, 'public.participant_profiles', $2) ok`, [role, p])).rows[0].ok) got.push(p); assert.deepEqual(got, expect, role); }
    assert.equal((await db.query<any>(`select relrowsecurity r from pg_class where relname = 'participant_profiles'`)).rows[0].r, true);
    const pol = (await db.query<any>(`select policyname from pg_policies where tablename = 'participant_profiles' order by 1`)).rows.map((r) => r.policyname); assert.deepEqual(pol, ["participant_profiles_select_admin", "participant_profiles_select_own"]);
    const f = (await db.query<any>(`select has_function_privilege('anon', oid, 'execute') a, has_function_privilege('authenticated', oid, 'execute') u, prosecdef d, proconfig c from pg_proc where proname = 'upsert_my_participant_profile'`)).rows[0]; assert.deepEqual([f.a, f.u, f.d], [false, true, true]); assert.match(String(f.c), /search_path=/);
    const pub = (await db.query<any>(`select p.proname from pg_proc p where p.proname = 'upsert_my_participant_profile' and exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where a.grantee = 0)`)).rows; assert.deepEqual(pub, []);
  });
  await t("CASCADE : la suppression d'un compte supprime son profil (droit à l'effacement) ; B0 inchangé (STAFF : politiques et accès conservés)", async () => {
    await db.exec(`delete from public.accounts where id = '${ids.bob}'`); assert.equal((await db.query<any>(`select count(*)::int c from public.participant_profiles where user_id = $1`, [ids.bob])).rows[0].c, 0);
    assert.equal((await q("tom", `select public.is_staff_coordinator() c`))[0].c, true); assert.equal((await q("graw", `select public.is_super_admin() c`))[0].c, true);
    assert.equal((await db.query<any>(`select count(*)::int c from pg_policies where tablename in ('accounts','space_access','platform_roles','staff_roles','staff_profiles','missions')`)).rows[0].c, 8);
  });
  await db.close();
}
console.log(`${n} tests PROFILS PARTICIPANTS (Postgres local) : OK`);
