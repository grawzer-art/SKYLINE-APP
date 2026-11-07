/* eslint-disable @typescript-eslint/no-explicit-any */
// B4.1 — Services participants (accès, lecture et enregistrement du profil) : le VRAI code du serveur et du navigateur, contre Postgres local (B0 + proposition) avec RLS réelle.
// Aucune base distante. `loadParticipantAccess` (proxy + /api/participant/me), `loadParticipantProfile`, `saveParticipantProfile`.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { loadParticipantAccess, loadParticipantProfile } from "../src/lib/participant/access.ts";
import { saveParticipantProfile } from "../src/lib/participant/profileService.ts";

let n = 0; const t = async (name: string, fn: () => Promise<void>) => { await fn(); n++; console.log("PASS", name); };
const boot = async (withProposal: boolean) => {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, raw_user_meta_data jsonb not null default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif((nullif(current_setting('request.jwt.claims', true), '')::jsonb) ->> 'sub', '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated, service_role; grant execute on function auth.uid() to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role; alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  `);
  for (const f of readdirSync("supabase/migrations").filter((x) => x.endsWith(".sql")).sort()) await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
  if (withProposal) await db.exec(readFileSync("supabase/proposals/B4_1_participant_profiles.sql", "utf8"));
  const ids: Record<string, string> = {};
  const provision = async (slug: string, o: { spaces?: string[]; staff?: string[]; active?: boolean; meta?: object } = {}) => {
    ids[slug] = (await db.query<{ id: string }>(`insert into auth.users (email, raw_user_meta_data) values ($1, $2::jsonb) returning id`, [`${slug}@example.test`, JSON.stringify(o.meta ?? {})])).rows[0].id;
    if (o.active !== false && o.spaces) await db.query(`update public.accounts set active = true where id = $1`, [ids[slug]]);
    for (const s of o.spaces ?? []) await db.query(`insert into public.space_access (user_id, space) values ($1, $2)`, [ids[slug], s]);
    for (const r of o.staff ?? []) await db.query(`insert into public.staff_roles (user_id, role) values ($1, $2)`, [ids[slug], r]);
    if ((o.spaces ?? []).includes("staff")) await db.query(`insert into public.staff_profiles (user_id, slug, function_title) values ($1, $2, 'F')`, [ids[slug], slug]);
  };
  await provision("alice", { spaces: ["members"] }); await provision("bob", { spaces: ["members"] }); await provision("tom", { spaces: ["staff"], staff: ["admin"] });
  await provision("inactive", { spaces: ["members"], active: false }); await provision("norole", {}); await provision("hacker", { meta: { role: "super_admin", spaces: ["members", "staff"], is_admin: true } });
  let chain: Promise<unknown> = Promise.resolve(); let rpcCalls = 0;
  const serial = <T,>(fn: () => Promise<T>) => { const r = chain.then(fn, fn); chain = r.catch(() => undefined); return r; };
  const asUser = async <T,>(who: string, fn: () => Promise<T>): Promise<T> => { await db.exec(`set role authenticated; select set_config('request.jwt.claims', '{"sub":"${ids[who]}","role":"authenticated"}', false)`); try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claims', '', false)`); } };
  const client = (who: string): any => ({
    from(table: string) {
      const q: any = { cols: "*", f: {} as Record<string, string>, single: false };
      q.select = (c: string) => { q.cols = c; return q; }; q.eq = (k: string, v: string) => { q.f[k] = v; return q; }; q.maybeSingle = () => { q.single = true; return q; };
      q.then = (res: any, rej: any) => serial(() => asUser(who, async () => {
        try { const keys = Object.keys(q.f); const rows = (await db.query<any>(`select ${q.cols} from public.${table}${keys.length ? " where " + keys.map((k, i) => `${k} = $${i + 1}`).join(" and ") : ""}`, keys.map((k) => q.f[k]))).rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v instanceof Date ? v.toISOString() : v])));
          return { data: q.single ? rows[0] ?? null : rows, error: null }; } catch (e: any) { return { data: null, error: { message: String(e.message), code: e.code } }; }
      })).then(res, rej); return q;
    },
    rpc: (fn: string, args: Record<string, unknown>) => serial(() => asUser(who, async () => { rpcCalls++; try { const keys = Object.keys(args); const r = await db.query<any>(`select * from public.${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(", ")})`, keys.map((k) => args[k])); return { data: r.rows[0] ?? null, error: null }; } catch (e: any) { return { data: null, error: { message: String(e.message), code: e.code } }; } })),
  });
  return { db, ids, client, calls: () => rpcCalls };
};

const A = await boot(true);
await t("ACCÈS : seul un compte ACTIF avec accès « members » entre ; STAFF seul, inactif, sans accès, métadonnées piégées → refusés", async () => {
  assert.equal(await loadParticipantAccess(A.client("alice"), A.ids.alice), true); assert.equal(await loadParticipantAccess(A.client("bob"), A.ids.bob), true);
  for (const w of ["tom", "inactive", "norole", "hacker"]) assert.equal(await loadParticipantAccess(A.client(w), A.ids[w]), false, w);
});
await t("ISOLATION : l'accès et le profil d'un autre compte ne sont pas lisibles (RLS : seulement SES lignes)", async () => {
  assert.equal(await loadParticipantAccess(A.client("alice"), A.ids.bob), false);
  assert.deepEqual(await loadParticipantProfile(A.client("alice"), A.ids.bob), { ok: true, profile: null });
});
await t("PROFIL : sans profil → null (jamais de nom inventé) ; création puis relecture ; mises à jour ; l'avatar n'est jamais fixé ici", async () => {
  assert.deepEqual(await loadParticipantProfile(A.client("alice"), A.ids.alice), { ok: true, profile: null });
  assert.deepEqual(await saveParticipantProfile(A.client("alice"), { firstName: " Camille ", lastName: "Dupont", displayName: "Camille D." }), { ok: true });
  const r = await loadParticipantProfile(A.client("alice"), A.ids.alice); assert.ok(r.ok && r.profile); assert.deepEqual([r.profile.userId, r.profile.firstName, r.profile.lastName, r.profile.displayName, r.profile.avatarPath], [A.ids.alice, "Camille", "Dupont", "Camille D.", null]);
  assert.deepEqual(await saveParticipantProfile(A.client("alice"), { firstName: "Camille", lastName: "Dupont", displayName: "Cam" }), { ok: true });
  const r2 = await loadParticipantProfile(A.client("alice"), A.ids.alice); assert.ok(r2.ok && r2.profile?.displayName === "Cam");
  assert.deepEqual(await loadParticipantProfile(A.client("bob"), A.ids.bob), { ok: true, profile: null });                       // le profil d'Alice n'est pas celui de Bob
});
await t("VALIDATION : une saisie invalide est refusée AVANT tout appel base, avec les champs en erreur", async () => {
  const before = A.calls(); const r = await saveParticipantProfile(A.client("alice"), { firstName: "", lastName: "x".repeat(61), displayName: "ok" });
  assert.ok(!r.ok && r.kind === "invalid" && r.fields?.firstName && r.fields?.lastName && !r.fields?.displayName); assert.equal(A.calls(), before);
});
await t("PERMISSIONS : STAFF seul, inactif, sans accès ne peuvent pas créer de profil participant ; message sûr, rien n'est écrit", async () => {
  for (const w of ["tom", "inactive", "norole", "hacker"]) { const r = await saveParticipantProfile(A.client(w), { firstName: "A", lastName: "B", displayName: "C" }); assert.ok(!r.ok && r.kind === "forbidden" && /accès/i.test(r.message), w); }
  assert.equal((await A.db.query<any>(`select count(*)::int c from public.participant_profiles`)).rows[0].c, 1);
});
await t("ERREURS : messages sûrs (jamais le texte brut), réseau, session expirée, fonction absente (migration non appliquée)", async () => {
  const mk = (e: any, thrown = false) => ({ rpc: async () => { if (thrown) throw new Error("fetch failed"); return { error: e }; } }) as any; const v = { firstName: "A", lastName: "B", displayName: "C" };
  const net = await saveParticipantProfile(mk(null, true), v); assert.ok(!net.ok && net.kind === "network");
  const gone = await saveParticipantProfile(mk({ message: "Could not find the function public.upsert_my_participant_profile", code: "PGRST202" }), v); assert.ok(!gone.ok && gone.kind === "unavailable");
  const exp = await saveParticipantProfile(mk({ message: "JWT expired", status: 401 }), v); assert.ok(!exp.ok && /session/i.test(exp.message));
  const weird = await saveParticipantProfile(mk({ message: 'relation "public.secret_table" does not exist at character 14' , code: "XX000" }), v); assert.ok(!weird.ok); assert.doesNotMatch(weird.message, /secret_table|relation/);
  const inv = await saveParticipantProfile(mk({ message: "invalid_display_name" }), v); assert.ok(!inv.ok && inv.kind === "invalid" && inv.message === "Nom affiché invalide.");
});
await A.db.close();

const B = await boot(false);   // base SANS la migration B4.1 : l'application reste utilisable
await t("MIGRATION NON APPLIQUÉE : le profil est « indisponible » (pas une erreur) ; l'accès fonctionne ; l'enregistrement dit clairement qu'il n'est pas encore disponible", async () => {
  assert.equal(await loadParticipantAccess(B.client("alice"), B.ids.alice), true);
  const p = await loadParticipantProfile(B.client("alice"), B.ids.alice); assert.ok(!p.ok && p.unavailable === true);
  const s = await saveParticipantProfile(B.client("alice"), { firstName: "A", lastName: "B", displayName: "C" }); assert.ok(!s.ok && s.kind === "unavailable");
});
await B.db.close();
console.log(`${n} tests SERVICES PARTICIPANTS (Postgres local) : OK`);
