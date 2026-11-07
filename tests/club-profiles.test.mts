/* eslint-disable @typescript-eslint/no-explicit-any */
// B4.3 — Profils CLUB : séparation identité / communauté, visibilité (OFF par défaut), champs publics uniquement, RLS, stockage des photos, non-régression B0/B4.1.
// Proposition : supabase/proposals/B4_3_club_profiles.sql (NON appliquée à la base réelle). Postgres local, deux jeux de privilèges par défaut Supabase.
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
const PROPOSAL = readFileSync("supabase/proposals/B4_3_club_profiles.sql", "utf8");
const B41 = readFileSync("supabase/proposals/B4_1_participant_profiles.sql", "utf8");

for (const [scenario, defaults] of Object.entries(defaultsBy)) {
  const t = async (name: string, fn: () => Promise<void>) => { await fn(); n++; console.log("PASS", `[${scenario}]`, name); };
  const db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; create schema storage;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, raw_user_meta_data jsonb not null default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif((nullif(current_setting('request.jwt.claims', true), '')::jsonb) ->> 'sub', '')::uuid $$;
    create table storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid);
    alter table storage.objects enable row level security;
    grant usage on schema public, auth, storage to anon, authenticated, service_role; grant all on storage.objects, storage.buckets to authenticated;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    ${defaults}
  `);
  for (const f of readdirSync("supabase/migrations").filter((x) => x.endsWith(".sql")).sort()) await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
  await db.exec(B41);
  const catalog = async () => (await db.query<any>(`select p.proname, pg_get_function_identity_arguments(p.oid) args, coalesce(p.proacl::text,'NULL') acl, md5(p.prosrc) src from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind = 'f' order by 1, 2`)).rows;
  const before = await catalog();
  const policiesBefore = (await db.query<any>(`select tablename, policyname from pg_policies where schemaname = 'public' order by 1, 2`)).rows;
  await db.exec(PROPOSAL);

  const ids: Record<string, string> = {};
  const provision = async (slug: string, o: { spaces?: string[]; staff?: string[]; platform?: string[]; active?: boolean } = {}) => {
    ids[slug] = (await db.query<{ id: string }>(`insert into auth.users (email) values ($1) returning id`, [`${slug}@example.test`])).rows[0].id;
    if (o.active !== false && (o.spaces || o.platform)) await db.query(`update public.accounts set active = true where id = $1`, [ids[slug]]);
    for (const s of o.spaces ?? []) await db.query(`insert into public.space_access (user_id, space) values ($1, $2)`, [ids[slug], s]);
    for (const r of o.platform ?? []) await db.query(`insert into public.platform_roles (user_id, role) values ($1, $2)`, [ids[slug], r]);
    for (const r of o.staff ?? []) await db.query(`insert into public.staff_roles (user_id, role) values ($1, $2)`, [ids[slug], r]);
    if ((o.spaces ?? []).includes("staff")) await db.query(`insert into public.staff_profiles (user_id, slug, function_title) values ($1, $2, 'F')`, [ids[slug], slug]);
  };
  await provision("alice", { spaces: ["members"] }); await provision("bob", { spaces: ["members"] }); await provision("carol", { spaces: ["members"] });
  await provision("tom", { spaces: ["staff"], staff: ["admin"] }); await provision("root", { spaces: ["staff", "members"], platform: ["super_admin"] });
  await provision("off", { spaces: ["members"], active: false });
  const as = async <T,>(who: string | null, fn: () => Promise<T>, role = "authenticated"): Promise<T> => {
    await db.exec(`set role ${role}; select set_config('request.jwt.claims', '${who ? `{"sub":"${ids[who]}","role":"${role}"}` : ""}', false)`);
    try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claims', '', false)`); }
  };
  const call = (who: string | null, sql: string, args: unknown[] = [], role = "authenticated") => as(who, async () => { try { return { ok: true as const, rows: (await db.query<any>(sql, args)).rows }; } catch (e: any) { return { ok: false as const, msg: String(e.message), code: e.code as string | undefined }; } }, role);
  const up = (who: string, p: string, c: string | null, b = "", g: string[] = []) => call(who, `select * from public.upsert_my_club_profile($1,$2,$3,$4)`, [p, c, b, g]);
  const setVis = (who: string, v: boolean) => call(who, `select public.set_my_club_visibility($1) r`, [v]);
  const dir = (who: string, text: string | null = null, city: string | null = null) => call(who, `select * from public.list_club_directory($1,$2)`, [text, city]);

  await t("séparation : le profil CLUB n'a AUCUNE colonne d'identité légale, d'e-mail, de réservation ni de rôle ; table sans accès direct", async () => {
    const cols = (await db.query<any>(`select column_name from information_schema.columns where table_name = 'club_profiles' and table_schema = 'public'`)).rows.map((r) => r.column_name).sort();
    assert.deepEqual(cols, ["avatar_path", "bio", "city", "created_at", "genres", "pseudo", "public_id", "updated_at", "user_id", "visible"]);
    for (const w of ["alice", "root", "tom"]) { const r = await call(w, `select * from public.club_profiles`); assert.ok(!r.ok && r.code === "42501", w); }
    assert.ok(!(await call(null, `select * from public.club_profiles`, [], "anon")).ok);
    for (const sql of [`insert into public.club_profiles (user_id, pseudo) values ('${ids.alice}', 'Hack')`, `update public.club_profiles set visible = true`, `delete from public.club_profiles`]) assert.ok(!(await call("alice", sql)).ok, sql);
  });
  await t("création : un profil neuf est PRIVÉ (visible = false) ; lecture de SON profil ; valeurs nettoyées", async () => {
    assert.deepEqual((await call("alice", `select * from public.get_my_club_profile()`)), { ok: true, rows: [] });
    const r = await up("alice", " Lia ", " Paris ", " House lover ", ["House", "Techno"]); assert.ok(r.ok); assert.deepEqual([r.rows[0].pseudo, r.rows[0].city, r.rows[0].bio, r.rows[0].genres, r.rows[0].visible, r.rows[0].avatar_path], ["Lia", "Paris", "House lover", ["House", "Techno"], false, null]);
    const me = await call("alice", `select * from public.get_my_club_profile()`); assert.ok(me.ok && me.rows[0].pseudo === "Lia" && me.rows[0].visible === false);
    assert.ok(Object.keys(me.ok ? me.rows[0] : {}).every((k) => !/user_id|public_id|email|first|last|role/.test(k)));
  });
  await t("modification : met à jour pseudo / ville / bio / goûts SANS toucher à la visibilité ; ville facultative", async () => {
    assert.ok((await setVis("alice", true)).ok);
    const r = await up("alice", "Lia B", null, "Nouvelle bio", ["Disco"]); assert.ok(r.ok && r.rows[0].visible === true && r.rows[0].city === null && r.rows[0].bio === "Nouvelle bio");
    assert.ok((await setVis("alice", false)).ok);
  });
  await t("validation côté base : pseudo, ville, bio, goûts invalides refusés (messages stables)", async () => {
    const bad = async (args: [string, string | null, string, string[]], msg: string) => { const r = await up("bob", ...args); assert.ok(!r.ok && r.msg.includes(msg), `${msg} / ${JSON.stringify(args)}`); };
    await bad(["", "Paris", "", []], "invalid_pseudo"); await bad(["x", null, "", []], "invalid_pseudo"); await bad(["a".repeat(25), null, "", []], "invalid_pseudo"); await bad(["me@x.fr", null, "", []], "invalid_pseudo"); await bad(["ok\nok", null, "", []], "invalid_pseudo");
    await bad(["Bob", "v".repeat(41), "", []], "invalid_city"); await bad(["Bob", null, "b".repeat(141), []], "invalid_bio"); await bad(["Bob", null, "a\u0007b", []], "invalid_bio");
    await bad(["Bob", null, "", ["a", "b", "c", "d", "e", "f"]], "invalid_genres"); await bad(["Bob", null, "", ["x".repeat(31)]], "invalid_genres"); await bad(["Bob", null, "", [""]], "invalid_genres");
    assert.deepEqual(await call("bob", `select * from public.get_my_club_profile()`), { ok: true, rows: [] });
  });
  await t("visibilité : impossible sans profil ; publier / masquer ; valeur nulle refusée", async () => {
    const r = await setVis("bob", true); assert.ok(!r.ok && r.msg.includes("no_profile"));
    assert.ok(!(await call("alice", `select public.set_my_club_visibility(null)`)).ok);
  });
  await t("PUBLICATION VOLONTAIRE : un profil privé est introuvable par les autres ; publié, seuls les champs publics sont servis (pas de user_id, e-mail, nom légal)", async () => {
    assert.ok((await up("bob", "Bobby", "Lyon", "Salut", ["Techno"])).ok); assert.ok((await up("carol", "Caro", "Lille", "", ["House"])).ok);
    assert.ok((await setVis("alice", true)).ok); assert.ok((await setVis("carol", true)).ok);
    await db.query(`select 1`);                                                          // Bob n'a PAS publié
    const d = await dir("carol"); assert.ok(d.ok); assert.deepEqual(d.rows.map((r) => r.pseudo), ["Lia B"]);                      // Bob (privé) absent ; Carol ne se voit pas
    assert.deepEqual(Object.keys(d.rows[0]).sort(), ["avatar_path", "bio", "city", "genres", "pseudo", "public_id"]);
    const txt = JSON.stringify(d.rows); for (const s of Object.values(ids)) assert.ok(!txt.includes(s)); assert.doesNotMatch(txt, /example\.test/);
    assert.ok((await setVis("bob", true)).ok); const d2 = await dir("alice"); assert.ok(d2.ok); assert.deepEqual(d2.rows.map((r) => r.pseudo), ["Bobby", "Caro"]);
    assert.ok((await setVis("bob", false)).ok); const d3 = await dir("alice"); assert.ok(d3.ok && d3.rows.length === 1 && d3.rows[0].pseudo === "Caro");   // masquer retire immédiatement
  });
  await t("RÉCIPROCITÉ : sans profil publié, l'annuaire et les fiches sont fermés ; profil inexistant / privé / propre → vide", async () => {
    const r = await dir("bob"); assert.ok(!r.ok && r.msg.includes("reciprocity_required"));
    const pid = (await db.query<any>(`select public_id from public.club_profiles where user_id = $1`, [ids.carol])).rows[0].public_id;
    const bobPid = (await db.query<any>(`select public_id from public.club_profiles where user_id = $1`, [ids.bob])).rows[0].public_id;
    assert.ok(!(await call("bob", `select * from public.get_club_member($1)`, [pid])).ok);
    const ok = await call("alice", `select * from public.get_club_member($1)`, [pid]); assert.ok(ok.ok && ok.rows[0].pseudo === "Caro");
    assert.deepEqual(await call("alice", `select * from public.get_club_member($1)`, [bobPid]), { ok: true, rows: [] });            // Bob est privé
    const own = (await db.query<any>(`select public_id from public.club_profiles where user_id = $1`, [ids.alice])).rows[0].public_id;
    assert.deepEqual(await call("alice", `select * from public.get_club_member($1)`, [own]), { ok: true, rows: [] });
  });
  await t("recherche : texte et ville ; caractères joker neutralisés ; limite bornée", async () => {
    const a = await dir("alice", "car"); assert.ok(a.ok && a.rows.length === 1); const b = await dir("alice", "%"); assert.ok(b.ok && b.rows.length === 1);
    const c = await dir("alice", null, "Paris"); assert.ok(c.ok && c.rows.length === 0); const d = await dir("alice", null, "Lille"); assert.ok(d.ok && d.rows.length === 1);
    const e = await call("alice", `select * from public.list_club_directory(null, null, 100000, -5)`); assert.ok(e.ok);
  });
  await t("accès : compte inactif, STAFF seul, super admin sans profil, anonyme → aucun accès ; propriétaire désactivé → profil retiré de l'annuaire", async () => {
    for (const w of ["off", "tom"]) for (const sql of [`select * from public.get_my_club_profile()`, `select * from public.list_club_directory()`, `select public.set_my_club_visibility(true)`]) { const r = await call(w, sql); assert.ok(!r.ok && r.code === "42501", `${w} ${sql}`); }
    assert.ok(!(await up("tom", "Tom", null)).ok); assert.ok(!(await up("off", "Off", null)).ok);
    const anon = await call(null, `select * from public.list_club_directory()`, [], "anon"); assert.ok(!anon.ok);
    assert.ok(!(await call(null, `select * from public.upsert_my_club_profile('x','','',array[]::text[])`, [], "anon")).ok);
    const r = await dir("root"); assert.ok(!r.ok);                                                                      // le super admin n'a pas de passe-droit
    await db.query(`update public.accounts set active = false where id = $1`, [ids.carol]);
    const d = await dir("alice"); assert.ok(d.ok && d.rows.length === 0); await db.query(`update public.accounts set active = true where id = $1`, [ids.carol]);
  });
  await t("ISOLATION : l'identité vient de la session — aucun paramètre ne permet d'agir sur un autre compte ; les profils privés B4.1 ne sont pas mélangés", async () => {
    assert.ok((await call("alice", `select public.upsert_my_participant_profile('Anne','Lemaire','Annie') r`)).ok);
    const mine = await call("alice", `select * from public.get_my_club_profile()`); assert.ok(mine.ok && mine.rows[0].pseudo === "Lia B");
    const d = await dir("carol"); assert.doesNotMatch(JSON.stringify(d), /Anne|Lemaire|Annie/);
    const fns = (await db.query<any>(`select proname, pg_get_function_arguments(oid) a from pg_proc where proname in ('get_my_club_profile','upsert_my_club_profile','set_my_club_visibility','set_my_club_avatar')`)).rows;
    for (const f of fns) assert.doesNotMatch(f.a, /user|uid|owner/i, f.proname);
  });
  await t("photo : chemin dans SON dossier uniquement (fonction) ; retrait possible ; sans profil refusé", async () => {
    const p = `${ids.alice}/avatar-1.jpg`; const r = await call("alice", `select public.set_my_club_avatar($1) r`, [p]); assert.ok(r.ok);
    for (const bad of [`${ids.bob}/avatar.jpg`, `${ids.alice}/../${ids.bob}/a.jpg`, "https://evil.example/a.jpg", `${ids.alice}/a b.jpg`, "x.jpg"]) assert.ok(!(await call("alice", `select public.set_my_club_avatar($1)`, [bad])).ok, bad);
    assert.ok((await call("alice", `select public.set_my_club_avatar(null) r`)).ok); assert.ok((await call("alice", `select public.set_my_club_avatar($1) r`, [p])).ok);
    const dd = await dir("carol"); assert.ok(dd.ok && dd.rows[0].avatar_path === p);
  });
  await t("STOCKAGE : bucket privé (512 Ko, JPEG/WebP) ; écriture dans son dossier seulement ; lecture = propriétaire OU photo d'un profil publié (lecteur ayant publié)", async () => {
    const b = (await db.query<any>(`select * from storage.buckets where id = 'club-avatars'`)).rows[0]; assert.deepEqual([b.public, Number(b.file_size_limit), b.allowed_mime_types], [false, 524288, ["image/jpeg", "image/webp"]]);
    const put = (who: string, name: string, bucket = "club-avatars") => call(who, `insert into storage.objects (bucket_id, name, owner) values ($1, $2, auth.uid()) returning name`, [bucket, name]);
    assert.ok((await put("alice", `${ids.alice}/avatar-1.jpg`)).ok); assert.ok((await put("bob", `${ids.bob}/avatar-b.jpg`)).ok);
    for (const [w, name] of [["bob", `${ids.alice}/evil.jpg`], ["alice", `${ids.bob}/evil.jpg`], ["alice", `${ids.alice}/a/b.jpg`], ["off", `${ids.off}/a.jpg`], ["tom", `${ids.tom}/a.jpg`]] as const) assert.ok(!(await put(w, name)).ok, `${w} ${name}`);
    assert.ok(!(await put("alice", `${ids.alice}/other.jpg`, "other-bucket")).ok);
    const list = (w: string | null, name: string, role = "authenticated") => call(w, `select name from storage.objects where bucket_id = 'club-avatars' and name = $1`, [name], role);
    assert.equal((await list("alice", `${ids.alice}/avatar-1.jpg`)).rows?.length, 1);                                    // propriétaire
    assert.equal((await list("carol", `${ids.alice}/avatar-1.jpg`)).rows?.length, 1);                                    // profil publié, lecteur ayant publié
    assert.equal((await list("carol", `${ids.bob}/avatar-b.jpg`)).rows?.length, 0);                                      // Bob : privé et photo non référencée
    assert.equal((await list("bob", `${ids.alice}/avatar-1.jpg`)).rows?.length, 0);                                      // Bob n'a pas publié (réciprocité)
    assert.equal((await list("tom", `${ids.alice}/avatar-1.jpg`)).rows?.length, 0); assert.equal((await list(null, `${ids.alice}/avatar-1.jpg`, "anon")).rows?.length ?? 0, 0);
    assert.ok((await setVis("alice", false)).ok); assert.equal((await list("carol", `${ids.alice}/avatar-1.jpg`)).rows?.length, 0);   // masqué ⇒ photo illisible aussi
    assert.equal((await list("alice", `${ids.alice}/avatar-1.jpg`)).rows?.length, 1);
    const del = await call("carol", `delete from storage.objects where name = $1 returning name`, [`${ids.alice}/avatar-1.jpg`]); assert.ok(del.ok && del.rows.length === 0);
    const upd = await call("carol", `update storage.objects set name = $1 where name = $2 returning name`, [`${ids.carol}/stolen.jpg`, `${ids.alice}/avatar-1.jpg`]); assert.ok(upd.ok && upd.rows.length === 0);
    assert.ok((await setVis("alice", true)).ok);
  });
  await t("fonctions : EXECUTE refusé à anon / public ; jamais de lecture directe ; recherche de chemins sûre (search_path vide)", async () => {
    const fns = (await db.query<any>(`select p.proname, p.prosecdef, coalesce(p.proconfig::text,'') cfg, has_function_privilege('anon', p.oid, 'execute') anon, has_function_privilege('authenticated', p.oid, 'execute') auth from pg_proc p where p.pronamespace = 'public'::regnamespace and (p.proname like '%club%')`)).rows;
    assert.ok(fns.length >= 9);
    for (const f of fns) { assert.equal(f.anon, false, f.proname); assert.equal(f.auth, true, f.proname); if (f.prosecdef) assert.match(f.cfg, /search_path/, f.proname); }
    assert.equal((await db.query<any>(`select has_table_privilege('authenticated', 'public.club_profiles', 'select') s, has_table_privilege('anon', 'public.club_profiles', 'select') a`)).rows[0].s, false);
  });
  await t("NON-RÉGRESSION : fonctions et politiques existantes (B0, B3, B4.1) inchangées ; STAFF / admin sans nouveau pouvoir ; profils B4.1 toujours cloisonnés", async () => {
    const after = await catalog(); const map = new Map(after.map((c) => [`${c.proname}(${c.args})`, c]));
    for (const b of before) assert.deepEqual(map.get(`${b.proname}(${b.args})`), b, `${b.proname} modifiée`);
    const polAfter = (await db.query<any>(`select tablename, policyname from pg_policies where schemaname = 'public' order by 1, 2`)).rows; assert.deepEqual(polAfter, policiesBefore);
    const sa = await call("tom", `select * from public.space_access`); assert.ok(sa.ok && sa.rows.every((r) => r.user_id === ids.tom));
    assert.deepEqual((await call("bob", `select * from public.participant_profiles`)).rows, []);
  });
  await db.close();
}
console.log(`${n} tests PROFILS CLUB (Postgres local) : OK`);
