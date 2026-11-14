/* eslint-disable @typescript-eslint/no-explicit-any */
// B4.4 — Consentement explicite avant publication dans l'annuaire CLUB + trace : `node --experimental-strip-types --no-warnings tests/club-consent.test.mts`
// Chaîne COMPLÈTE B0 → B4.1 → B4.2 → B4.3 → B4.2b → B4.2c puis B4.4 (PROPOSITION non appliquée), Postgres local, deux jeux de privilèges Supabase.
// Vérifie : consentement exigé côté serveur, trace, retrait toujours possible, isolation, aucun statut « voyageur vérifié » automatique (équipe / compte connecté), retour arrière.
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
const V = "club-annuaire-1";

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
  await db.exec(P("B4_1_participant_profiles.sql"));
  await db.exec(`create function public.rls_auto_enable() returns void language plpgsql security definer set search_path = pg_catalog as $$ begin null; end $$;
                 grant execute on function public.rls_auto_enable() to anon, authenticated;`);
  for (const f of CHAIN) await db.exec(P(f));

  const ids: Record<string, string> = {};
  const mk = async (slug: string, o: { spaces?: string[]; staff?: string[]; platform?: string[]; active?: boolean } = {}) => {
    ids[slug] = (await db.query<{ id: string }>(`insert into auth.users (email, email_confirmed_at, invited_at) values ($1, now(), now()) returning id`, [`${slug}@example.test`])).rows[0].id;
    if (o.active !== false) await db.query(`update public.accounts set active = true where id = $1`, [ids[slug]]);
    for (const s of o.spaces ?? []) await db.query(`insert into public.space_access (user_id, space) values ($1, $2)`, [ids[slug], s]);
    for (const r of o.platform ?? []) await db.query(`insert into public.platform_roles (user_id, role) values ($1, $2)`, [ids[slug], r]);
    for (const r of o.staff ?? []) await db.query(`insert into public.staff_roles (user_id, role) values ($1, $2)`, [ids[slug], r]);
    if ((o.spaces ?? []).includes("staff")) await db.query(`insert into public.staff_profiles (user_id, slug, function_title) values ($1, $2, 'F')`, [ids[slug], slug]);
  };
  await mk("root", { spaces: ["staff", "members"], platform: ["super_admin"] }); await mk("tom", { spaces: ["staff"], staff: ["admin"] }); await mk("qafard", { spaces: ["staff"], staff: ["member"] });
  await mk("alice", { spaces: ["members"] }); await mk("bob", { spaces: ["members"] }); await mk("carl", { spaces: ["members"] }); await mk("dormant", { spaces: ["members"], active: false });
  // SEULE attribution du statut « voyageur vérifié » : insertion manuelle (propriétaire de la base), explicite, pour alice et bob uniquement.
  for (const u of ["alice", "bob"]) await db.query(`insert into public.traveler_reservations (user_id, edition) values ($1, 'ibiza-2027')`, [ids[u]]);
  const as = async <T,>(who: string | null, fn: () => Promise<T>, role = "authenticated"): Promise<T> => {
    await db.exec(`set role ${role}; select set_config('request.jwt.claims', '${who ? `{"sub":"${ids[who]}","role":"${role}"}` : ""}', false)`);
    try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claims', '', false)`); }
  };
  const q = (who: string | null, sql: string, args: unknown[] = [], role = "authenticated") => as(who, async () => { try { return { ok: true as const, rows: (await db.query<any>(sql, args)).rows }; } catch (e: any) { return { ok: false as const, msg: String(e.message) }; } }, role);
  const catalog = async () => (await db.query<any>(`select p.proname, pg_get_function_identity_arguments(p.oid) args, coalesce(p.proacl::text,'NULL') acl, md5(p.prosrc) src from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind = 'f' order by 1, 2`)).rows;
  const before = await catalog(); const reservationsBefore = (await db.query<any>(`select count(*)::int c from public.traveler_reservations`)).rows[0].c;
  for (const [u, p] of [["alice", "Alice"], ["bob", "Bobby"], ["carl", "Carl"]]) assert.ok((await q(u, `select * from public.upsert_my_club_profile($1, 'Paris', '', array[]::text[])`, [p])).ok);
  await db.exec(P("B4_4_club_consent.sql"));
  const log = async (u: string) => (await db.query<any>(`select action, consent_version from public.club_consents where user_id = $1 order by id`, [ids[u]])).rows;

  await t("B4.4 : l'ancienne voie sans consentement n'existe plus ; un appel « à l'ancienne » est refusé (consent_required) et ne publie rien", async () => {
    const sigs = (await db.query<any>(`select pg_get_function_identity_arguments(p.oid) a from pg_proc p where proname = 'set_my_club_visibility' and pronamespace = 'public'::regnamespace`)).rows.map((r) => r.a);
    assert.deepEqual(sigs, ["p_visible boolean, p_consent_version text"]);
    const r = await q("alice", `select public.set_my_club_visibility(true)`); assert.ok(!r.ok && /consent_required/.test(r.msg));
    assert.equal((await db.query<any>(`select visible from public.club_profiles where user_id = $1`, [ids.alice])).rows[0].visible, false);
    assert.deepEqual(await log("alice"), []);
  });
  await t("consentement : absent, vide, périmé ou falsifié ⇒ refusé ; correct ⇒ publié ET inscrit au journal (action, version, date)", async () => {
    for (const bad of [null, "", "club-annuaire-0", "CLUB-ANNUAIRE-1", "club-annuaire-1 ", "x"]) { const r = await q("alice", `select public.set_my_club_visibility(true, $1)`, [bad]); assert.ok(!r.ok && /consent_required/.test(r.msg), String(bad)); }
    assert.deepEqual(await log("alice"), []);
    const ok = await q("alice", `select public.set_my_club_visibility(true, $1) r`, [V]); assert.ok(ok.ok && ok.rows[0].r === true);
    assert.deepEqual(await log("alice"), [{ action: "publish", consent_version: V }]);
    const mine = await q("alice", `select * from public.get_my_club_consent()`); assert.ok(mine.ok && mine.rows.length === 1 && mine.rows[0].action === "publish" && mine.rows[0].consent_version === V && mine.rows[0].created_at);
    assert.ok((await q("alice", `select public.set_my_club_visibility(true, $1)`, [V])).ok); assert.equal((await log("alice")).length, 1, "republier un profil déjà publié n'ajoute pas de ligne");
  });
  await t("retrait : toujours possible, sans consentement ; journalisé une seule fois ; le profil disparaît aussitôt de l'annuaire ; republier exige à nouveau la confirmation", async () => {
    assert.ok((await q("bob", `select public.set_my_club_visibility(true, $1)`, [V])).ok);
    assert.deepEqual((await q("bob", `select pseudo from public.list_club_directory()`)).rows.map((r: any) => r.pseudo), ["Alice"]);
    const w = await q("alice", `select public.set_my_club_visibility(false) r`); assert.ok(w.ok && w.rows[0].r === false);
    assert.deepEqual((await log("alice")).map((l) => l.action), ["publish", "withdraw"]);
    assert.ok((await q("alice", `select public.set_my_club_visibility(false)`)).ok); assert.equal((await log("alice")).length, 2);
    const d = await q("bob", `select * from public.list_club_directory()`); assert.ok(d.ok && d.rows.length === 0);
    const again = await q("alice", `select public.set_my_club_visibility(true)`); assert.ok(!again.ok && /consent_required/.test(again.msg));
    assert.equal((await q("alice", `select * from public.get_my_club_consent()`)).rows[0].action, "withdraw");
  });
  await t("annuaire réservé aux voyageurs vérifiés : un membre gratuit ne peut pas publier même avec le bon consentement (traveler_required), peut se retirer, et ne voit pas l'annuaire", async () => {
    const r = await q("carl", `select public.set_my_club_visibility(true, $1)`, [V]); assert.ok(!r.ok && /traveler_required/.test(r.msg));
    assert.ok((await q("carl", `select public.set_my_club_visibility(false)`)).ok); assert.deepEqual(await log("carl"), []);
    assert.ok(!(await q("carl", `select * from public.list_club_directory()`)).ok);
  });
  await t("AUCUN statut vérifié automatique : équipe (administrateur général, STAFF), compte connecté, compte suspendu ⇒ jamais « verified » ; seules les 2 lignes insérées à la main existent", async () => {
    for (const u of ["root", "tom", "qafard", "carl", "dormant"]) {
      const s = await q(u, `select public.is_verified_traveler() v, public.get_my_traveler_status() s`); assert.ok(s.ok, u);
      assert.deepEqual([s.rows[0].v, s.rows[0].s], [false, "none"], u);
    }
    for (const u of ["tom", "qafard", "dormant"]) { const r = await q(u, `select public.set_my_club_visibility(true, $1)`, [V]); assert.ok(!r.ok && /forbidden/.test(r.msg), u); }
    const root = await q("root", `select public.set_my_club_visibility(true, $1)`, [V]); assert.ok(!root.ok, "même l'administrateur général n'est pas voyageur vérifié par défaut");
    assert.equal((await db.query<any>(`select count(*)::int c from public.traveler_reservations`)).rows[0].c, reservationsBefore);
    // Aucune fonction, aucun déclencheur ne peut écrire dans traveler_reservations ; aucun privilège d'écriture pour les rôles applicatifs.
    const writers = (await db.query<any>(`select proname from pg_proc where pronamespace = 'public'::regnamespace and prokind = 'f' and prosrc ~* '(insert\\s+into|update|delete\\s+from)\\s+public\\.traveler_reservations'`)).rows;
    assert.deepEqual(writers, [], "aucune fonction n'écrit les réservations");
    const trig = (await db.query<any>(`select c.relname, t.tgname from pg_trigger t join pg_class c on c.oid = t.tgrelid where not t.tgisinternal and exists (select 1 from pg_proc p where p.oid = t.tgfoid and p.prosrc ~* 'traveler_reservations')`)).rows;
    assert.deepEqual(trig, []);
    for (const role of ["anon", "authenticated"]) for (const priv of ["INSERT", "UPDATE", "DELETE"]) assert.equal((await db.query<any>(`select has_table_privilege($1, 'public.traveler_reservations', $2) h`, [role, priv])).rows[0].h, false, `${role} ${priv}`);
    const ins = await q("alice", `insert into public.traveler_reservations (user_id, edition) values ($1, 'x-2027')`, [ids.carl]); assert.ok(!ins.ok, "un utilisateur ne s'auto-attribue pas (ni n'attribue à un autre) un statut vérifié");
  });
  await t("isolation et accès non autorisés : journal inaccessible en direct (lecture, écriture, anon) ; chacun ne lit que SA trace ; l'annuaire ne rend jamais de donnée de consentement", async () => {
    for (const sql of [`select * from public.club_consents`, `insert into public.club_consents (user_id, action, consent_version) values (gen_random_uuid(), 'publish', 'x')`, `update public.club_consents set action = 'withdraw'`, `delete from public.club_consents`]) {
      const r = await q("alice", sql); assert.ok(!r.ok, sql); const a = await q(null, sql, [], "anon"); assert.ok(!a.ok, "anon " + sql);
    }
    assert.ok(!(await q(null, `select * from public.get_my_club_consent()`, [], "anon")).ok); assert.ok(!(await q(null, `select public.set_my_club_visibility(false)`, [], "anon")).ok);
    assert.ok((await q("bob", `select * from public.get_my_club_consent()`)).rows.every((r: any) => r.action === "publish"), "bob ne voit que sa propre trace");
    const mine = await q("tom", `select * from public.get_my_club_consent()`); assert.ok(!mine.ok && /forbidden/.test(mine.msg));
    assert.ok((await q("alice", `select public.set_my_club_visibility(true, $1)`, [V])).ok);
    const d = await q("bob", `select * from public.list_club_directory()`); assert.ok(d.ok); assert.deepEqual(Object.keys(d.rows[0]).sort(), ["avatar_path", "bio", "city", "genres", "pseudo", "public_id"]);
    assert.ok(!JSON.stringify(d.rows).match(/consent|publish|withdraw/i));
  });
  await t("suppression d'un compte : sa trace de consentement est effacée avec lui (donnée personnelle, pas de ligne orpheline)", async () => {
    assert.ok((await log("bob")).length >= 1); await db.query(`delete from auth.users where id = $1`, [ids.bob]);
    assert.equal((await db.query<any>(`select count(*)::int c from public.club_consents where user_id = $1`, [ids.bob])).rows[0].c, 0);
  });
  await t("retour arrière : B4_4_club_consent_DOWN.sql rétablit EXACTEMENT l'état B4.2c (fonctions, privilèges, journal supprimé), publication à l'ancienne de nouveau possible ; B4.4 peut être rejouée", async () => {
    await db.exec(readFileSync("supabase/rollback/B4_4_club_consent_DOWN.sql", "utf8"));
    const after = await catalog(); assert.deepEqual(after, before, "catalogue identique à l'état d'avant B4.4");
    assert.equal((await db.query<any>(`select to_regclass('public.club_consents') r`)).rows[0].r, null);
    assert.equal((await q("alice", `select public.set_my_club_visibility(false) r`)).rows[0].r, false);
    assert.equal((await q("alice", `select public.set_my_club_visibility(true) r`)).rows[0].r, true);
    await db.exec(P("B4_4_club_consent.sql")); assert.equal((await q("alice", `select public.club_consent_version() v`)).rows[0].v, V);
  });
  await db.close();
}
console.log(`${n} tests CONSENTEMENT CLUB B4.4 (Postgres local) : OK`);
