/* eslint-disable @typescript-eslint/no-explicit-any */
// B4.2 — Inscription autonome : claim membre atomique / idempotent, refus (invité, STAFF, suspendu, e-mail non confirmé), métadonnées non fiables,
// séparation membre gratuit / voyageur vérifié, adaptation B4.3 (annuaire réservé aux voyageurs vérifiés), non-régression STAFF.
// Propositions : supabase/proposals/B4_2_member_signup.sql, B4_3_club_profiles.sql, B4_2b_club_traveler_gate.sql (NON appliquées à la base réelle). Postgres local.
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
const TV = "cgu-2026-11";

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
  await db.exec(P("B4_1_participant_profiles.sql"));        // déjà appliquée sur le projet partagé : reproduite ici comme prérequis
  const catalog = async () => (await db.query<any>(`select p.proname, pg_get_function_identity_arguments(p.oid) args, coalesce(p.proacl::text,'NULL') acl, md5(p.prosrc) src from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind = 'f' order by 1, 2`)).rows;
  const before = await catalog(); const polBefore = (await db.query<any>(`select tablename, policyname, md5(coalesce(qual,'')||coalesce(with_check,'')) m from pg_policies where schemaname = 'public' order by 1, 2`)).rows;
  await db.exec(P("B4_2_member_signup.sql"));

  const ids: Record<string, string> = {};
  const mkUser = async (slug: string, o: { confirmed?: boolean; invited?: boolean; anon?: boolean; meta?: object } = {}) => {
    ids[slug] = (await db.query<{ id: string }>(`insert into auth.users (email, raw_user_meta_data, email_confirmed_at, invited_at, is_anonymous) values ($1, $2::jsonb, $3, $4, $5) returning id`,
      [`${slug}@example.test`, JSON.stringify(o.meta ?? {}), o.confirmed === false ? null : new Date().toISOString(), o.invited ? new Date().toISOString() : null, !!o.anon])).rows[0].id;
  };
  const grant = async (slug: string, o: { spaces?: string[]; staff?: string[]; platform?: string[]; active?: boolean }) => {
    if (o.active !== false) await db.query(`update public.accounts set active = true where id = $1`, [ids[slug]]);
    for (const s of o.spaces ?? []) await db.query(`insert into public.space_access (user_id, space) values ($1, $2)`, [ids[slug], s]);
    for (const r of o.platform ?? []) await db.query(`insert into public.platform_roles (user_id, role) values ($1, $2)`, [ids[slug], r]);
    for (const r of o.staff ?? []) await db.query(`insert into public.staff_roles (user_id, role) values ($1, $2)`, [ids[slug], r]);
    if ((o.spaces ?? []).includes("staff")) await db.query(`insert into public.staff_profiles (user_id, slug, function_title) values ($1, $2, 'F')`, [ids[slug], slug]);
  };
  const as = async <T,>(who: string | null, fn: () => Promise<T>, role = "authenticated"): Promise<T> => {
    await db.exec(`set role ${role}; select set_config('request.jwt.claims', '${who ? `{"sub":"${ids[who]}","role":"${role}"}` : ""}', false)`);
    try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claims', '', false)`); }
  };
  const call = (who: string | null, sql: string, args: unknown[] = [], role = "authenticated") => as(who, async () => { try { return { ok: true as const, rows: (await db.query<any>(sql, args)).rows }; } catch (e: any) { return { ok: false as const, msg: String(e.message), code: e.code as string | undefined }; } }, role);
  const claim = (who: string | null, f = "Camille", l = "Dupont", d = "Cam", tv = TV, adult: boolean | null = true, role = "authenticated") => call(who, `select * from public.claim_member_account($1,$2,$3,$4,$5)`, [f, l, d, tv, adult], role);
  const counts = async (slug: string) => { const q = async (s: string) => (await db.query<any>(`select count(*)::int c from ${s} where user_id = $1`, [ids[slug]])).rows[0].c; return { profile: await q("public.participant_profiles"), member: await q("public.member_accounts"), spaces: await q("public.space_access"), roles: await q("public.platform_roles") + await q("public.staff_roles") }; };

  await mkUser("root"); await grant("root", { spaces: ["staff", "members"], platform: ["super_admin"] });
  await mkUser("tom", { invited: true }); await grant("tom", { spaces: ["staff"], staff: ["admin"] });
  await mkUser("invitee", { invited: true }); await grant("invitee", { spaces: ["members"] });

  await t("CLAIM nominal : profil privé + accès « members » + trace d'inscription créés atomiquement ; nom affiché du compte = saisie validée ; aucun rôle", async () => {
    await mkUser("alice"); assert.deepEqual(await counts("alice"), { profile: 0, member: 0, spaces: 0, roles: 0 });
    assert.deepEqual((await call("alice", `select public.has_space('members') h`)).rows, [{ h: false }]);                    // avant : aucun accès
    const r = await claim("alice", " Camille ", "Dupont", "Cam"); assert.ok(r.ok); assert.deepEqual(r.rows, [{ outcome: "created" }]);
    assert.deepEqual(await counts("alice"), { profile: 1, member: 1, spaces: 1, roles: 0 });
    const row = (await db.query<any>(`select a.active, a.display_name, p.first_name, p.last_name, p.display_name pd, m.terms_version, m.source, (select array_agg(space::text) from public.space_access where user_id = a.id) sp from public.accounts a join public.participant_profiles p on p.user_id = a.id join public.member_accounts m on m.user_id = a.id where a.id = $1`, [ids.alice])).rows[0];
    assert.deepEqual([row.active, row.display_name, row.first_name, row.last_name, row.pd, row.terms_version, row.source, row.sp], [true, "Cam", "Camille", "Dupont", "Cam", TV, "self_signup", ["members"]]);
    assert.deepEqual((await call("alice", `select public.has_space('members') m, public.has_space('staff') s, public.is_staff_member() st, public.is_super_admin() sa`)).rows, [{ m: true, s: false, st: false, sa: false }]);
  });
  await t("IDEMPOTENCE : second appel → « already_member », rien n'est modifié (même avec d'autres noms) ; appels simultanés → un seul « created »", async () => {
    const again = await claim("alice", "Autre", "Nom", "Autre"); assert.ok(again.ok && again.rows[0].outcome === "already_member");
    assert.deepEqual((await db.query<any>(`select first_name from public.participant_profiles where user_id = $1`, [ids.alice])).rows, [{ first_name: "Camille" }]);
    await mkUser("race"); const rs = await Promise.all([claim("race"), claim("race"), claim("race")]); const outs = rs.map((r) => (r.ok ? r.rows[0].outcome : r.msg)).sort();
    assert.deepEqual(outs, ["already_member", "already_member", "created"]); assert.deepEqual(await counts("race"), { profile: 1, member: 1, spaces: 1, roles: 0 });
  });
  await t("E-MAIL non confirmé, invité, anonyme, sans session → refus, rien d'écrit", async () => {
    await mkUser("unconf", { confirmed: false }); await mkUser("anon1", { anon: true });
    const cases: [string, string][] = [["unconf", "email_not_confirmed"], ["invitee", "not_eligible"], ["anon1", "not_eligible"]];
    for (const [w, msg] of cases) { const r = await claim(w); assert.ok(!r.ok && r.msg.includes(msg), `${w}: ${JSON.stringify(r)}`); }
    assert.deepEqual(await counts("unconf"), { profile: 0, member: 0, spaces: 0, roles: 0 }); assert.deepEqual(await counts("anon1"), { profile: 0, member: 0, spaces: 0, roles: 0 });
    const none = await claim(null); assert.ok(!none.ok && none.code === "42501");
    const anon = await claim(null, "A", "B", "C", TV, true, "anon"); assert.ok(!anon.ok);
  });
  await t("DROITS EXISTANTS : STAFF, admin, super admin, membre créé par l'administration, compte activé / modifié → refus ; aucune élévation", async () => {
    await mkUser("late"); await grant("late", { spaces: [], active: true });                                         // activé par un administrateur, sans accès
    await mkUser("touched"); await db.query(`update public.accounts set display_name = 'Modifié' where id = $1`, [ids.touched]); await new Promise((r) => setTimeout(r, 5)); await db.query(`update public.accounts set display_name = 'Modifié 2' where id = $1`, [ids.touched]);
    for (const w of ["root", "tom", "invitee", "late", "touched"]) { const r = await claim(w); assert.ok(!r.ok && /not_eligible/.test(r.msg), `${w}: ${JSON.stringify(r)}`); }
    assert.deepEqual((await db.query<any>(`select count(*)::int c from public.member_accounts where user_id = any($1)`, [["root", "tom", "invitee", "late", "touched"].map((s) => ids[s])])).rows, [{ c: 0 }]);
    assert.deepEqual((await db.query<any>(`select space::text from public.space_access where user_id = $1 order by 1`, [ids.tom])).rows, [{ space: "staff" }]);         // inchangé
  });
  await t("SUSPENSION : un membre désactivé par un administrateur n'est JAMAIS réactivé par le claim ; réactivation par l'administrateur → de nouveau idempotent", async () => {
    await mkUser("sus"); assert.ok((await claim("sus")).ok);
    assert.ok((await call("root", `select public.manage_set_account_active($1, false)`, [ids.sus])).ok);
    const r = await claim("sus"); assert.ok(!r.ok && /suspended/.test(r.msg)); assert.deepEqual((await db.query<any>(`select active from public.accounts where id = $1`, [ids.sus])).rows, [{ active: false }]);
    await db.query(`delete from public.space_access where user_id = $1`, [ids.sus]); await db.query(`update public.accounts set active = true where id = $1`, [ids.sus]);   // accès retiré, compte actif
    const r2 = await claim("sus"); assert.ok(!r2.ok && /suspended/.test(r2.msg)); assert.equal((await counts("sus")).spaces, 0);
    await db.query(`insert into public.space_access (user_id, space) values ($1, 'members')`, [ids.sus]); const r3 = await claim("sus"); assert.ok(r3.ok && r3.rows[0].outcome === "already_member");
  });
  await t("VALIDATION côté base : majorité, version des CGU, noms invalides → refus ET aucune écriture partielle (atomicité)", async () => {
    await mkUser("val");
    const bad: [any[], string][] = [[["A", "B", "C", TV, false], "adult_required"], [["A", "B", "C", TV, null], "adult_required"], [["A", "B", "C", "", true], "terms_required"], [["A", "B", "C", "x".repeat(41), true], "terms_required"],
      [["", "B", "C", TV, true], "invalid_first_name"], [["A", "b".repeat(61), "C", TV, true], "invalid_last_name"], [["A", "B", "c\u0007", TV, true], "invalid_display_name"], [[null, "B", "C", TV, true], "invalid_first_name"]];
    for (const [a, msg] of bad) { const r = await call("val", `select * from public.claim_member_account($1,$2,$3,$4,$5)`, a); assert.ok(!r.ok && r.msg.includes(msg), `${msg}: ${JSON.stringify(r)}`); }
    assert.deepEqual(await counts("val"), { profile: 0, member: 0, spaces: 0, roles: 0 });
    assert.deepEqual((await db.query<any>(`select active from public.accounts where id = $1`, [ids.val])).rows, [{ active: false }]);
  });
  await t("MÉTADONNÉES CLIENT non fiables : { role: super_admin, spaces: [staff], name } n'accorde rien ; le nom affiché vient de la saisie validée", async () => {
    await mkUser("hacker", { meta: { role: "super_admin", spaces: ["members", "staff"], is_admin: true, name: "ROOT" } });
    assert.ok((await claim("hacker", "Hugo", "Martin", "Hugo")).ok);
    assert.deepEqual((await call("hacker", `select public.has_space('staff') s, public.is_super_admin() sa, public.is_staff_member() st, public.is_staff_coordinator() sc`)).rows, [{ s: false, sa: false, st: false, sc: false }]);
    assert.deepEqual((await db.query<any>(`select display_name from public.accounts where id = $1`, [ids.hacker])).rows, [{ display_name: "Hugo" }]);
    assert.equal((await counts("hacker")).roles, 0);
    assert.doesNotMatch(readFileSync("supabase/proposals/B4_2_member_signup.sql", "utf8").replace(/--[^\n]*/g, ""), /raw_user_meta_data|raw_app_meta_data|user_metadata/);
  });
  await t("ÉCRITURES DIRECTES refusées : member_accounts, traveler_reservations, space_access, accounts.active, participant_profiles ; fonctions inaccessibles à anon", async () => {
    await mkUser("direct"); await claim("direct");
    for (const sql of [`insert into public.member_accounts (user_id, terms_version) values ('${ids.direct}', 'x')`, `update public.member_accounts set terms_version = 'y'`, `delete from public.member_accounts`,
      `insert into public.traveler_reservations (user_id, edition) values ('${ids.direct}', 'ibiza-2027')`, `update public.traveler_reservations set edition = 'x'`, `insert into public.space_access (user_id, space) values ('${ids.direct}', 'staff')`,
      `update public.accounts set active = false`, `insert into public.participant_profiles (user_id, first_name, last_name, display_name) values ('${ids.direct}','a','b','c')`]) assert.ok(!(await call("direct", sql)).ok, sql);
    const fns = (await db.query<any>(`select p.proname, has_function_privilege('anon', p.oid, 'execute') anon, has_function_privilege('authenticated', p.oid, 'execute') auth, p.prosecdef, coalesce(p.proconfig::text,'') cfg from pg_proc p where p.proname in ('claim_member_account','is_verified_traveler','get_my_traveler_status')`)).rows;
    assert.equal(fns.length, 3); for (const f of fns) { assert.equal(f.anon, false, f.proname); assert.equal(f.auth, true, f.proname); assert.ok(f.prosecdef); assert.match(f.cfg, /search_path/); }
    assert.equal((await db.query<any>(`select has_table_privilege('authenticated','public.member_accounts','insert') i, has_table_privilege('anon','public.member_accounts','select') s`)).rows[0].i, false);
    const argNames = (await db.query<any>(`select pg_get_function_arguments(oid) a from pg_proc where proname = 'claim_member_account'`)).rows[0].a; assert.doesNotMatch(argNames, /role|space|user|uid/i);
  });
  await t("MEMBRE GRATUIT ≠ VOYAGEUR VÉRIFIÉ : statut « none » après inscription ; « verified » seulement avec une réservation confirmée posée côté serveur ; aucune fuite entre comptes", async () => {
    await mkUser("free"); await claim("free"); await mkUser("trav"); await claim("trav");
    assert.deepEqual((await call("free", `select public.is_verified_traveler() v, public.get_my_traveler_status() s`)).rows, [{ v: false, s: "none" }]);
    await db.query(`insert into public.traveler_reservations (user_id, edition, verified_by) values ($1, 'ibiza-2027', $2)`, [ids.trav, ids.root]);          // posé par l'équipe (hors B4.2)
    assert.deepEqual((await call("trav", `select public.is_verified_traveler() v, public.get_my_traveler_status() s`)).rows, [{ v: true, s: "verified" }]);
    assert.deepEqual((await call("free", `select public.get_my_traveler_status() s`)).rows, [{ s: "none" }]);
    assert.deepEqual((await call("free", `select * from public.traveler_reservations`)).rows, []); assert.equal((await call("trav", `select * from public.traveler_reservations`)).rows?.length, 1);
    assert.deepEqual((await call("trav", `select * from public.member_accounts`)).rows?.map((r: any) => r.user_id), [ids.trav]);
    await db.query(`update public.accounts set active = false where id = $1`, [ids.trav]); assert.deepEqual((await call("trav", `select public.is_verified_traveler() v`)).rows, [{ v: false }]); await db.query(`update public.accounts set active = true where id = $1`, [ids.trav]);
    assert.deepEqual((await call(null, `select public.get_my_traveler_status() s`, [], "anon")).ok, false);
  });
  await t("NON-RÉGRESSION STAFF : un membre inscrit ne lit ni missions, ni fiches STAFF, ni annuaire d'équipe, ni comptes des autres ; B0 / B4.1 inchangées ; STAFF et super admin sans changement", async () => {
    for (const sql of [`select * from public.missions`, `select * from public.staff_profiles`, `select * from public.staff_roles`, `select * from public.platform_roles`]) { const r = await call("free", sql); assert.ok(!r.ok || r.rows.length === 0, sql); }
    { const lt = await call("free", `select * from public.list_team()`); assert.ok(!lt.ok || lt.rows.length === 0); }
    assert.deepEqual((await call("free", `select id from public.accounts`)).rows, [{ id: ids.free }]);
    assert.ok(!(await call("free", `select public.manage_set_spaces($1, array['staff']::public.app_space[])`, [ids.free])).ok); assert.ok(!(await call("free", `select public.manage_set_account_active($1, true)`, [ids.sus])).ok);
    assert.ok((await call("tom", `select * from public.list_team()`)).ok); assert.deepEqual((await call("tom", `select public.is_staff_coordinator() c`)).rows, [{ c: true }]);
    const after = await catalog(); const map = new Map(after.map((c) => [`${c.proname}(${c.args})`, c]));
    for (const b of before) assert.deepEqual(map.get(`${b.proname}(${b.args})`), b, `${b.proname} modifiée`);
    assert.deepEqual(after.filter((c) => !before.some((b) => b.proname === c.proname && b.args === c.args)).map((c) => c.proname).sort(), ["claim_member_account", "get_my_traveler_status", "is_verified_traveler"]);
    const pol = (await db.query<any>(`select tablename, policyname, md5(coalesce(qual,'')||coalesce(with_check,'')) m from pg_policies where schemaname = 'public' order by 1, 2`)).rows;
    for (const b of polBefore) assert.deepEqual(pol.find((p: any) => p.tablename === b.tablename && p.policyname === b.policyname), b);
    assert.deepEqual(pol.filter((p: any) => !polBefore.some((b: any) => b.tablename === p.tablename && b.policyname === p.policyname)).map((p: any) => p.policyname).sort(), ["member_accounts_select_own", "traveler_reservations_select_own"]);
  });

  /* ===== B4.3 + adaptation B4.2b : annuaire réservé aux voyageurs vérifiés ===== */
  await db.exec(P("B4_3_club_profiles.sql")); await db.exec(P("B4_2b_club_traveler_gate.sql"));
  await t("B4.2b : un membre gratuit crée son profil CLUB (privé) mais ne peut PAS le publier ; annuaire et fiches fermés (traveler_required)", async () => {
    const up = await call("free", `select * from public.upsert_my_club_profile('Libre', 'Paris', '', array[]::text[])`); assert.ok(up.ok && up.rows[0].visible === false);
    const v = await call("free", `select public.set_my_club_visibility(true)`); assert.ok(!v.ok && /traveler_required/.test(v.msg));
    assert.ok((await call("free", `select public.set_my_club_visibility(false)`)).ok);
    for (const sql of [`select * from public.list_club_directory()`, `select * from public.get_club_member(gen_random_uuid())`]) { const r = await call("free", sql); assert.ok(!r.ok && /traveler_required/.test(r.msg), sql); }
  });
  await t("B4.2b : deux voyageurs vérifiés se voient une fois publiés ; un profil de membre gratuit n'apparaît jamais, même forcé visible ; réservation retirée ⇒ profil retiré", async () => {
    await mkUser("trav2"); await claim("trav2"); await db.query(`insert into public.traveler_reservations (user_id, edition) values ($1, 'ibiza-2027')`, [ids.trav2]);
    assert.ok((await call("trav", `select * from public.upsert_my_club_profile('Nova','Lille','',array['House'])`)).ok); assert.ok((await call("trav2", `select * from public.upsert_my_club_profile('Orion','Lyon','',array[]::text[])`)).ok);
    assert.ok((await call("trav", `select public.set_my_club_visibility(true)`)).ok); assert.ok((await call("trav2", `select public.set_my_club_visibility(true)`)).ok);
    await db.query(`update public.club_profiles set visible = true where user_id = $1`, [ids.free]);                                              // forcé hors fonctions (superutilisateur)
    const d = await call("trav", `select * from public.list_club_directory()`); assert.ok(d.ok); assert.deepEqual(d.rows.map((r: any) => r.pseudo), ["Orion"]);
    const txt = JSON.stringify(d.rows); for (const id of Object.values(ids)) assert.ok(!txt.includes(id));
    const m = await call("trav", `select * from public.get_club_member($1)`, [d.rows[0].public_id]); assert.ok(m.ok && m.rows[0].pseudo === "Orion");
    const freeView = await call("free", `select * from public.list_club_directory()`); assert.ok(!freeView.ok);
    await db.query(`delete from public.traveler_reservations where user_id = $1`, [ids.trav2]); const d2 = await call("trav", `select * from public.list_club_directory()`); assert.ok(d2.ok && d2.rows.length === 0);
  });
  await db.close();
}
console.log(`${n} tests INSCRIPTION AUTONOME (Postgres local) : OK`);
