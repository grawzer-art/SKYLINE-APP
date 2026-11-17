/* eslint-disable @typescript-eslint/no-explicit-any */
// B4.5 — Profil CLUB créé automatiquement (privé) après l'inscription autonome : `node --experimental-strip-types --no-warnings tests/club-autoprofile.test.mts`
// Chaîne B0 → B4.1 → B4.2 → B4.3 → B4.2b → B4.2c → B4.4 → B4.5, Postgres local, deux jeux de privilèges Supabase.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

let n = 0; const defaultsBy: Record<string, string> = {
  large: `alter default privileges in schema public grant all on tables to anon, authenticated, service_role; alter default privileges in schema public grant all on functions to anon, authenticated, service_role; alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;`,
  postgres: `alter default privileges in schema public grant truncate, references, trigger on tables to anon, authenticated, service_role; alter default privileges in schema public revoke execute on functions from public; alter default privileges in schema public grant usage, select, update on sequences to anon, authenticated, service_role;`,
};
const P = (f: string) => readFileSync(`supabase/proposals/${f}`, "utf8");
const V = "club-annuaire-1";
for (const [scenario, defaults] of Object.entries(defaultsBy)) {
  const t = async (name: string, fn: () => Promise<void>) => { await fn(); n++; console.log("PASS", `[${scenario}]`, name); };
  const db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; create schema auth; create schema storage;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, raw_user_meta_data jsonb not null default '{}'::jsonb, email_confirmed_at timestamptz, invited_at timestamptz, is_anonymous boolean not null default false);
    create function auth.uid() returns uuid language sql stable as $$ select nullif((nullif(current_setting('request.jwt.claims', true), '')::jsonb) ->> 'sub', '')::uuid $$;
    create table storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid); alter table storage.objects enable row level security;
    grant usage on schema public, auth, storage to anon, authenticated, service_role; grant all on storage.objects, storage.buckets to authenticated; grant execute on function auth.uid() to anon, authenticated, service_role;
    ${defaults}`);
  for (const f of readdirSync("supabase/migrations").filter((x) => x.endsWith(".sql")).sort()) await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
  await db.exec(P("B4_1_participant_profiles.sql"));
  await db.exec(`create function public.rls_auto_enable() returns void language plpgsql security definer set search_path = pg_catalog as $$ begin null; end $$; grant execute on function public.rls_auto_enable() to anon, authenticated;`);
  for (const f of ["B4_2_member_signup.sql", "B4_3_club_profiles.sql", "B4_2b_club_traveler_gate.sql", "B4_2c_revoke_rls_auto_enable.sql", "B4_4_club_consent.sql"]) await db.exec(P(f));
  await db.exec(`insert into public.terms_versions (version, min_age) values ('cgu-test-1', 18)`);
  const catalogBefore = (await db.query<any>(`select proname, md5(prosrc) s from pg_proc where pronamespace = 'public'::regnamespace and proname <> 'ensure_my_club_profile' order by 1, 2`)).rows;
  await db.exec(P("B4_5_club_profile_auto.sql"));
  const ids: Record<string, string> = {};
  const signup = async (slug: string, display: string) => {   // inscription autonome : e-mail confirmé par OTP, NON invité, puis claim_member_account
    ids[slug] = (await db.query<{ id: string }>(`insert into auth.users (email, email_confirmed_at) values ($1, now()) returning id`, [`${slug}@example.test`])).rows[0].id;
    await as(slug, () => db.query(`select * from public.claim_member_account('Prénom', 'Nom', $1, 'cgu-test-1', true)`, [display]));
  };
  const as = async <T,>(who: string | null, fn: () => Promise<T>, role = "authenticated"): Promise<T> => {
    await db.exec(`set role ${role}; select set_config('request.jwt.claims', '${who ? `{"sub":"${ids[who]}","role":"${role}"}` : ""}', false)`);
    try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claims', '', false)`); }
  };
  const q = (who: string | null, sql: string, args: unknown[] = [], role = "authenticated") => as(who, async () => { try { return { ok: true as const, rows: (await db.query<any>(sql, args)).rows }; } catch (e: any) { return { ok: false as const, msg: String(e.message) }; } }, role);
  const prof = async (slug: string) => (await db.query<any>(`select pseudo, visible, bio, genres, avatar_path, city from public.club_profiles where user_id = $1`, [ids[slug]])).rows;

  await signup("lea", "Léa Martin"); await signup("zed", "***"); await signup("long", "Un nom affiché vraiment très long à rallonge");
  await t("inscription autonome puis création automatique : profil CLUB PRIVÉ, pseudo dérivé du nom affiché, aucune publication, aucun consentement, aucun statut voyageur", async () => {
    assert.deepEqual(await prof("lea"), []);   // claim_member_account seul ne crée pas de profil CLUB (B4.2 inchangée)
    assert.equal((await q("lea", `select public.ensure_my_club_profile() r`)).rows![0].r, true);
    const p = await prof("lea"); assert.equal(p.length, 1); assert.equal(p[0].pseudo, "Léa Martin"); assert.equal(p[0].visible, false); assert.equal(p[0].bio, ""); assert.deepEqual(p[0].genres, []); assert.equal(p[0].avatar_path, null);
    assert.equal((await db.query<any>(`select count(*)::int c from public.club_consents`)).rows[0].c, 0);
    assert.equal((await q("lea", `select public.is_verified_traveler() v`)).rows![0].v, false);
    assert.equal((await db.query<any>(`select count(*)::int c from public.traveler_reservations`)).rows[0].c, 0);
  });
  await t("idempotent : un second appel ne modifie rien (pseudo édité conservé, profil publié conservé)", async () => {
    assert.ok((await q("lea", `select * from public.upsert_my_club_profile('Léa Club', 'Paris', 'Bio', array['house']::text[])`)).ok);
    assert.equal((await q("lea", `select public.ensure_my_club_profile() r`)).rows![0].r, false);
    const p = await prof("lea"); assert.equal(p[0].pseudo, "Léa Club"); assert.equal(p[0].city, "Paris");
  });
  await t("pseudo : caractères non autorisés retirés, 24 maximum, repli « Membre » si trop court", async () => {
    await q("zed", `select public.ensure_my_club_profile()`); await q("long", `select public.ensure_my_club_profile()`);
    assert.equal((await prof("zed"))[0].pseudo, "Membre"); const l = (await prof("long"))[0].pseudo; assert.ok(l.length >= 2 && l.length <= 24 && /^[\p{L}\p{N} ._'-]+$/u.test(l), l);
  });
  await t("publier reste réservé aux voyageurs vérifiés AVEC consentement : le profil auto-créé ne peut pas être publié par un simple membre", async () => {
    const r = await q("lea", `select public.set_my_club_visibility(true, $1)`, [V]); assert.ok(!r.ok && /traveler_required/.test((r as any).msg));
    assert.equal((await prof("lea"))[0].visible, false);
  });
  await t("accès : visiteur refusé ; compte non membre refusé ; aucun profil créé pour un tiers ; aucune lecture des profils d'un autre", async () => {
    const anon = await q(null, `select public.ensure_my_club_profile()`, [], "anon"); assert.ok(!anon.ok && /permission denied/.test((anon as any).msg));
    ids.ghost = (await db.query<{ id: string }>(`insert into auth.users (email, email_confirmed_at) values ('ghost@example.test', now()) returning id`)).rows[0].id;
    const g = await q("ghost", `select public.ensure_my_club_profile()`); assert.ok(!g.ok && /forbidden/.test((g as any).msg)); assert.deepEqual(await prof("ghost"), []);
    const direct = await q("lea", `select * from public.club_profiles`); assert.ok(!direct.ok);
  });
  await t("B4.5 n'altère aucune fonction existante (empreintes identiques) ; retour arrière : fonction supprimée, profils conservés", async () => {
    const after = (await db.query<any>(`select proname, md5(prosrc) s from pg_proc where pronamespace = 'public'::regnamespace and proname <> 'ensure_my_club_profile' order by 1, 2`)).rows; assert.deepEqual(after, catalogBefore);
    await db.exec(readFileSync("supabase/rollback/B4_5_club_profile_auto_DOWN.sql", "utf8"));
    assert.equal((await db.query<any>(`select count(*)::int c from pg_proc where proname = 'ensure_my_club_profile'`)).rows[0].c, 0); assert.equal((await prof("lea")).length, 1);
  });
  await db.close();
}
console.log(`${n} tests PROFIL CLUB AUTOMATIQUE B4.5 (Postgres local) : OK`);
