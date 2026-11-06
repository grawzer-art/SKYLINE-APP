/* eslint-disable @typescript-eslint/no-explicit-any */
// B2 — Identité STAFF et correspondance des UUID, contre un VRAI Postgres local (migrations B0 + RLS). Aucun accès réseau, aucune base réelle.
// `loadStaffIdentity` (src/lib/staff/session.ts) est le code RÉEL du proxy et de /api/staff/session.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { loadStaffIdentity } from "../src/lib/staff/session.ts";
import { isUuid } from "../src/lib/missions/service.ts";

let n = 0; const t = async (name: string, fn: () => Promise<void>) => { await fn(); n++; console.log("PASS", name); };
const db = new PGlite();
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, raw_user_meta_data jsonb not null default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as $$ select nullif((nullif(current_setting('request.jwt.claims', true), '')::jsonb) ->> 'sub', '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`);
for (const f of readdirSync("supabase/migrations").filter((x) => x.endsWith(".sql")).sort()) await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
const ids: Record<string, string> = {};
const provision = async (slug: string, o: { platform?: string[]; spaces?: string[]; staff?: string[]; active?: boolean; profile?: boolean } = {}) => {
  ids[slug] = (await db.query<{ id: string }>(`insert into auth.users (email) values ($1) returning id`, [`${slug}@example.test`])).rows[0].id;
  await db.query(`update public.accounts set display_name = $1, active = $2 where id = $3`, [slug[0].toUpperCase() + slug.slice(1), o.active ?? true, ids[slug]]);
  for (const s of o.spaces ?? []) await db.query(`insert into public.space_access (user_id, space) values ($1, $2)`, [ids[slug], s]);
  for (const r of o.platform ?? []) await db.query(`insert into public.platform_roles (user_id, role) values ($1, $2)`, [ids[slug], r]);
  for (const r of o.staff ?? []) await db.query(`insert into public.staff_roles (user_id, role) values ($1, $2)`, [ids[slug], r]);
  if (o.profile ?? (o.spaces ?? []).includes("staff")) await db.query(`insert into public.staff_profiles (user_id, slug, function_title) values ($1, $2, $3)`, [ids[slug], slug, `Fonction ${slug}`]);
};
await provision("graw", { platform: ["super_admin"], spaces: ["staff", "members"] });
await provision("tom", { spaces: ["staff"], staff: ["admin"] });
await provision("qafard", { spaces: ["staff"], staff: ["member"] });
await provision("participant", { spaces: ["members"] });
await provision("ghost", { spaces: ["staff"], staff: ["member"], active: false });
await provision("norole", {});
await provision("noprofile", { spaces: ["staff"], staff: ["member"], profile: false });

// Faux client Supabase minimal (from/select/eq/maybeSingle) exécuté sous le rôle `authenticated` + JWT du compte : mêmes politiques RLS que PostgREST.
let chain: Promise<unknown> = Promise.resolve();
const serial = <T,>(fn: () => Promise<T>) => { const r = chain.then(fn, fn); chain = r.catch(() => undefined); return r; };
const asUser = async <T,>(who: string, fn: () => Promise<T>): Promise<T> => {
  await db.exec(`set role authenticated; select set_config('request.jwt.claims', '{"sub":"${ids[who]}","role":"authenticated"}', false)`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claims', '', false)`); }
};
const clientFor = (who: string): any => ({
  from(table: string) {
    const q: any = { cols: "*", f: {} as Record<string, string>, single: false };
    q.select = (c: string) => { q.cols = c; return q; };
    q.eq = (k: string, v: string) => { q.f[k] = v; return q; };
    q.maybeSingle = () => { q.single = true; return q; };
    q.then = (res: any, rej: any) => serial(() => asUser(who, async () => {
      try {
        const keys = Object.keys(q.f);
        const rows = (await db.query<any>(`select ${q.cols} from public.${table}${keys.length ? " where " + keys.map((k, i) => `${k} = $${i + 1}`).join(" and ") : ""}`, keys.map((k) => q.f[k]))).rows;
        return { data: q.single ? rows[0] ?? null : rows, error: null };
      } catch (e: any) { return { data: null, error: { message: String(e.message) } }; }
    })).then(res, rej);
    return q;
  },
});
const identity = (who: string, asId = ids[who]) => loadStaffIdentity(clientFor(who), asId, `${who}@example.test`);

await t("Tom / Qafard / Graw : identité STAFF avec l'UUID du compte, le slug, les rôles et accès exacts", async () => {
  const tom = await identity("tom"); assert.ok(tom && isUuid(tom.userId)); assert.equal(tom.userId, ids.tom); assert.equal(tom.slug, "tom");
  assert.deepEqual(tom.access, { platform: [], spaces: ["staff"], staff: ["admin"] });
  const q = await identity("qafard"); assert.deepEqual(q?.access, { platform: [], spaces: ["staff"], staff: ["member"] });
  const g = await identity("graw"); assert.deepEqual(g?.access.platform, ["super_admin"]); assert.deepEqual([...(g?.access.spaces ?? [])].sort(), ["members", "staff"]);
});
await t("REFUS PAR DÉFAUT : participant, compte inactif, sans accès, sans fiche d'annuaire → aucune identité STAFF", async () => {
  for (const w of ["participant", "ghost", "norole", "noprofile"]) assert.equal(await identity(w), null, w);
});
await t("un compte ne peut pas se faire passer pour un autre : l'identité d'un tiers n'est pas lisible (RLS)", async () => {
  assert.equal(await identity("tom", ids.qafard), null);
  assert.equal(await identity("participant", ids.tom), null);
  assert.equal(await identity("qafard", ids.graw), null);
});
await t("UUID : identifiant de session = auth.users.id = accounts.id = list_team().id (jamais le slug)", async () => {
  const team = await asUser("tom", async () => (await db.query<any>(`select id, slug from public.list_team()`)).rows);
  for (const slug of ["tom", "graw", "qafard"]) {
    const who = await identity(slug); const row = team.find((r: any) => r.slug === slug);
    assert.equal(who?.userId, ids[slug]); assert.equal(row.id, ids[slug]); assert.ok(isUuid(row.id)); assert.notEqual(who?.userId, slug);
    assert.equal((await db.query<any>(`select count(*)::int c from public.accounts a join auth.users u on u.id = a.id where a.id = $1`, [ids[slug]])).rows[0].c, 1);
  }
  assert.equal(team.some((r: any) => ["participant", "ghost", "norole", "noprofile"].includes(r.slug)), false, "l'annuaire ne contient que des membres STAFF actifs");
});
console.log(`${n} tests IDENTITÉ / UUID : OK`);
