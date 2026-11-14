/* eslint-disable @typescript-eslint/no-explicit-any */
// Dossier d'exécution SKYLINE-TEST : les scripts de contrôle, d'amorçage et d'isolation sont VALIDÉS en local avant toute exécution distante.
// `node --experimental-strip-types --no-warnings tests/test-env-kit.test.mts`
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { build } from "../supabase/test-env/generate.mts";

const K = (f: string) => readFileSync(`supabase/test-env/${f}`, "utf8"); const P = (f: string) => readFileSync(`supabase/proposals/${f}`, "utf8");
let n = 0; const t = async (name: string, fn: () => Promise<void>) => { await fn(); n++; console.log("PASS", name); };
const defaultsBy: Record<string, string> = {
  large: `alter default privileges in schema public grant all on tables to anon, authenticated, service_role; alter default privileges in schema public grant all on functions to anon, authenticated, service_role; alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;`,
  postgres: `alter default privileges in schema public grant truncate, references, trigger on tables to anon, authenticated, service_role; alter default privileges in schema public revoke execute on functions from public; alter default privileges in schema public grant usage, select, update on sequences to anon, authenticated, service_role;`,
};
const fresh = async (defaults: string) => {
  const db = new PGlite();
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; create schema auth; create schema storage;
   create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, raw_user_meta_data jsonb not null default '{}'::jsonb, email_confirmed_at timestamptz, invited_at timestamptz, is_anonymous boolean not null default false);
   create function auth.uid() returns uuid language sql stable as $$ select nullif((nullif(current_setting('request.jwt.claims', true), '')::jsonb) ->> 'sub', '')::uuid $$;
   create table storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
   create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid); alter table storage.objects enable row level security;
   grant usage on schema public, auth, storage to anon, authenticated, service_role; grant all on storage.objects, storage.buckets to authenticated; grant execute on function auth.uid() to anon, authenticated, service_role; ${defaults}`);
  for (const f of readdirSync("supabase/migrations").filter((x) => x.endsWith(".sql")).sort()) await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
  await db.exec(readFileSync("supabase/preview/shared-db-drift/20261107123121_direct_staff_mission_assignment.sql", "utf8"));
  for (const f of ["B4_1_participant_profiles.sql", "B4_2_member_signup.sql", "B4_3_club_profiles.sql", "B4_2b_club_traveler_gate.sql", "B4_2c_revoke_rls_auto_enable.sql"]) await db.exec(P(f));
  return db;
};
const global = async (db: PGlite, sql: string) => { const rows = (await db.query<any>(sql.replace(/;\s*$/, ""))).rows; return { ok: rows.find((r) => r.controle === "GLOBAL")?.ok as boolean, bad: rows.filter((r) => r.ok === false && r.controle !== "GLOBAL").map((r) => r.controle) }; };
const run = async (db: PGlite, sql: string) => { try { await db.exec(sql); return "ok"; } catch (e: any) { return String(e.message); } };

await t("fichiers de contrôle générés à jour (empreintes du dépôt) — sinon : node --experimental-strip-types supabase/test-env/generate.mts --write", async () => {
  const { pre, post } = await build(); assert.equal(K("precheck_before_b44.sql"), pre); assert.equal(K("postcheck_after_b44.sql"), post);
});
for (const [scenario, defaults] of Object.entries(defaultsBy)) {
  const T = async (name: string, fn: () => Promise<void>) => t(`[${scenario}] ${name}`, fn);
  const db = await fresh(defaults);
  await T("contrôle AVANT B4.4 : état B0 → B4.2c exact ⇒ GLOBAL ok ; il détecte une dérive (fonction modifiée, B4.4 déjà appliquée)", async () => {
    const g = await global(db, K("precheck_before_b44.sql")); assert.deepEqual(g, { ok: true, bad: [] });
    await db.exec(`create or replace function public.club_genres_ok(g text[]) returns boolean language sql immutable set search_path = '' as $$ select true $$`);
    const drift = await global(db, K("precheck_before_b44.sql")); assert.equal(drift.ok, false); assert.ok(drift.bad.some((c) => /identiques au dépôt/.test(c)));
    await db.close(); const d2 = await fresh(defaults); await d2.exec(P("B4_4_club_consent.sql")); assert.equal((await global(d2, K("precheck_before_b44.sql"))).ok, false, "B4.4 déjà appliquée ⇒ ARRÊT"); await d2.close();
  });
  const db2 = await fresh(defaults);
  await T("contrôle APRÈS B4.4 : état attendu ⇒ GLOBAL ok ; refuse l'état d'avant", async () => {
    await assert.rejects(() => global(db2, K("postcheck_after_b44.sql")), /club_consent_version|does not exist/, "avant B4.4 : le contrôle d'après échoue (fonction absente)");
    await db2.exec(P("B4_4_club_consent.sql")); assert.deepEqual(await global(db2, K("postcheck_after_b44.sql")), { ok: true, bad: [] });
  });
  await T("amorçage : garde-fous (adresses non renseignées, compte absent, équipe, déjà vérifié) puis succès pour 3 comptes fictifs", async () => {
    const seed = K("seed_test_accounts.sql"); assert.match(await run(db2, seed), /adresses de test non renseignées/);
    const mkUser = async (e: string) => (await db2.query<any>(`insert into auth.users (email, email_confirmed_at) values ($1, now()) returning id`, [e])).rows[0].id;
    const sub = (m: string, a: string, b: string) => seed.replace("REMPLACER-membre-sans-reservation@exemple.invalid", m).replace("REMPLACER-voyageur-1@exemple.invalid", a).replace("REMPLACER-voyageur-2@exemple.invalid", b);
    const m = await mkUser("membre@test.invalid"), a = await mkUser("v1@test.invalid"), b = await mkUser("v2@test.invalid"); const staff = await mkUser("equipe@test.invalid");
    assert.match(await run(db2, sub("membre@test.invalid", "v1@test.invalid", "absent@test.invalid")), /introuvable/);
    assert.match(await run(db2, sub("membre@test.invalid", "v1@test.invalid", "v1@test.invalid")), /trois adresses distinctes/);
    await db2.query(`update public.accounts set active = true where id = $1`, [staff]); await db2.query(`insert into public.space_access (user_id, space) values ($1, 'staff')`, [staff]);
    assert.match(await run(db2, sub("membre@test.invalid", "v1@test.invalid", "equipe@test.invalid")), /appartient à l'équipe/);
    assert.equal((await db2.query<any>(`select count(*)::int c from public.traveler_reservations`)).rows[0].c, 0, "aucun statut accordé après un refus");
    assert.equal(await run(db2, sub("membre@test.invalid", "v1@test.invalid", "v2@test.invalid")), "ok");
    const rows = (await db2.query<any>(`select user_id, edition, verified_by from public.traveler_reservations order by 1`)).rows; assert.deepEqual(rows.map((r: any) => r.user_id).sort(), [a, b].sort()); assert.ok(rows.every((r: any) => r.edition === "test-fictif" && r.verified_by === null));
    assert.equal((await db2.query<any>(`select count(*)::int c from public.space_access where space = 'members'`)).rows[0].c, 3);
    assert.equal((await db2.query<any>(`select count(*)::int c from public.traveler_reservations where user_id = $1`, [m])).rows[0].c, 0, "le membre sans réservation n'est jamais vérifié");
    assert.match(await run(db2, sub("membre@test.invalid", "v1@test.invalid", "v2@test.invalid")), /déjà un statut vérifié|a déjà/, "rejeu refusé");
    assert.equal((await global(db2, K("postcheck_after_b44.sql"))).ok, false, "le contrôle « avant amorçage » détecte bien les comptes ajoutés");
  });
  await T("contrôle d'isolation : 22 vérifications ISOLATION_OK, et RIEN n'est conservé (annulation automatique)", async () => {
    const msg = await run(db2, K("live_isolation_check.sql")); assert.match(msg, /^ISOLATION_OK /, msg.slice(0, 400));
    const r = JSON.parse(msg.slice("ISOLATION_OK ".length)); assert.equal(r.length, 22); assert.ok(r.every((x: any) => x.ok));
    for (const tb of ["club_profiles", "club_consents"]) assert.equal((await db2.query<any>(`select count(*)::int c from public.${tb}`)).rows[0].c, 0, tb + " vide après le contrôle");
  });
  await T("le contrôle d'isolation ÉCHOUE si la sécurité est affaiblie (publication sans consentement rétablie)", async () => {
    await db2.exec(readFileSync("supabase/rollback/B4_4_club_consent_DOWN.sql", "utf8"));
    const msg = await run(db2, K("live_isolation_check.sql")); assert.ok(!/^ISOLATION_OK/.test(msg), msg.slice(0, 200));
  });
  await T("désamorçage : supprime réservations fictives et profils, sans toucher aux comptes", async () => {
    await db2.exec(K("unseed_test_accounts.sql")); assert.equal((await db2.query<any>(`select count(*)::int c from public.traveler_reservations`)).rows[0].c, 0); assert.equal((await db2.query<any>(`select count(*)::int c from auth.users`)).rows[0].c, 4);
  });
  await db2.close();
}
console.log(`${n} tests DOSSIER D'EXÉCUTION SKYLINE-TEST (Postgres local) : OK`);
