/* eslint-disable @typescript-eslint/no-explicit-any */
// B3 — Service MISSIONS : schéma « b3 » (fonctions _v2, heure, agenda collectif) ET client « b2 » sur une base MIGRÉE (compatibilité). Postgres local : B0 + proposition.
// Le code testé (src/lib/missions/service.ts) est exactement celui du navigateur ; seul le "port" d'accès diffère (SQL local au lieu de PostgREST).
// AUCUN accès réseau, AUCUNE écriture dans la base Supabase réelle.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { createMissionsService } from "../src/lib/missions/service.ts";
import type { DbPort } from "../src/lib/missions/port.ts";

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
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`);
for (const f of readdirSync("supabase/migrations").filter((x) => x.endsWith(".sql")).sort()) await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
await db.exec(readFileSync("supabase/proposals/B3_1_agenda_notifications.sql", "utf8"));
// Compatibilité : `EXTRA_SQL=supabase/proposals/B3_1_agenda_notifications.sql` rejoue TOUTE la suite sur B0 + proposition (la proposition ne doit rien casser).

const ids: Record<string, string> = {};
const provision = async (slug: string, o: { platform?: string[]; spaces?: string[]; staff?: string[]; active?: boolean } = {}) => {
  ids[slug] = (await db.query<{ id: string }>(`insert into auth.users (email) values ($1) returning id`, [`${slug}@example.test`])).rows[0].id;
  await db.query(`update public.accounts set display_name = $1, active = $2 where id = $3`, [slug[0].toUpperCase() + slug.slice(1), o.active ?? true, ids[slug]]);
  for (const s of o.spaces ?? []) await db.query(`insert into public.space_access (user_id, space) values ($1, $2)`, [ids[slug], s]);
  for (const r of o.platform ?? []) await db.query(`insert into public.platform_roles (user_id, role) values ($1, $2)`, [ids[slug], r]);
  for (const r of o.staff ?? []) await db.query(`insert into public.staff_roles (user_id, role) values ($1, $2)`, [ids[slug], r]);
  if ((o.spaces ?? []).includes("staff")) await db.query(`insert into public.staff_profiles (user_id, slug, function_title) values ($1, $2, $3)`, [ids[slug], slug, `Fonction ${slug}`]);
};
await provision("graw", { platform: ["super_admin"], spaces: ["staff", "members"] });
await provision("tom", { spaces: ["staff"], staff: ["admin"] });
await provision("qafard", { spaces: ["staff"], staff: ["member"] });
await provision("participant", { spaces: ["members"] });
await provision("ghost", { spaces: ["staff"], staff: ["member"], active: false });
await provision("norole", {});

// ---- Port de test : SQL local sous le rôle `authenticated` + JWT simulé (ou `anon`), sérialisé (une seule connexion).
let chain: Promise<unknown> = Promise.resolve(); let calls = 0;
const serial = <T,>(fn: () => Promise<T>): Promise<T> => { const r = chain.then(fn, fn); chain = r.catch(() => undefined); return r; };
const COL = /^[a-z0-9_,]+$/; const IDENT = /^[a-z0-9_]+$/;
const run = async (who: string, sql: string, params: unknown[]) => serial(async () => {
  calls++;
  if (who === "anon") await db.exec(`set role anon; select set_config('request.jwt.claims', '', false)`);
  else await db.exec(`set role authenticated; select set_config('request.jwt.claims', '{"sub":"${ids[who]}","role":"authenticated"}', false)`);
  // Comme PostgREST : dates et horodatages en TEXTE (JSON), jamais en objets Date.
  const norm = (row: any) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v instanceof Date ? (k === "due_date" ? v.toISOString().slice(0, 10) : v.toISOString()) : v]));
  try { return { data: (await db.query<any>(sql, params)).rows.map(norm) as any[], error: null }; }
  catch (e: any) { return { data: null, error: { message: String(e.message), code: e.code as string | undefined } }; }
  finally { await db.exec(`reset role; select set_config('request.jwt.claims', '', false)`); }
});
const portFor = (who: string): DbPort => ({
  async select(table, o) {
    assert.match(table, IDENT); assert.match(o.columns, COL);
    const p: unknown[] = []; const where = Object.entries(o.eq ?? {}).map(([k, v]) => { assert.match(k, IDENT); p.push(v); return `${k} = $${p.length}`; });
    const order = (o.order ?? []).map(([c, asc]) => { assert.match(c, IDENT); return `${c} ${asc ? "asc" : "desc"}`; });
    const sql = `select ${o.columns} from public.${table}${where.length ? " where " + where.join(" and ") : ""}${order.length ? " order by " + order.join(", ") : ""}${o.limit ? ` limit ${Number(o.limit)}` : ""}`;
    return run(who, sql, p);
  },
  async rpc(fn, args = {}) {
    assert.match(fn, IDENT);
    const keys = Object.keys(args); keys.forEach((k) => assert.match(k, IDENT));
    const sql = `select * from public.${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(", ")})`;
    const r = await run(who, sql, keys.map((k) => args[k]));
    if (r.error) return r;
    return { data: fn === "list_team" || fn === "list_team_agenda" ? r.data : r.data?.[0] ?? null, error: null };
  },
});
const svc = (who: string, schema: "b2" | "b3" = "b3") => createMissionsService(portFor(who), { schema });
const ok = async <T,>(p: Promise<{ ok: boolean } & any>): Promise<T> => { const r = await p; assert.equal(r.ok, true, JSON.stringify(r)); return r.value as T; };
const err = async (p: Promise<any>, kind: string) => { const r = await p; assert.equal(r.ok, false, "attendu un refus"); assert.equal(r.error.kind, kind, JSON.stringify(r.error)); return r.error; };
const base = (assignee: string, validator: string, title: string, due: string | null = "2026-11-12", time: string | null = null) => ({ title, description: "Description secrète", assigneeId: ids[assignee], validatorId: ids[validator], dueDate: due, dueTime: time, priority: "normal" as const, status: "todo" as const });

let timed: any;
await t("schéma B3 : création avec heure (create_mission_v2), relue par la base ; sans date, aucune heure n'est envoyée", async () => {
  timed = await ok<any>(svc("tom").createMission(base("qafard", "graw", "Horodatée", "2026-11-12", "09:30"))); assert.equal(timed.dueTime, "09:30"); assert.equal(timed.dueDate, "2026-11-12");
  const nodate = await ok<any>(svc("tom").createMission(base("qafard", "graw", "Sans date", null, "10:00"))); assert.equal(nodate.dueTime, null); assert.equal(nodate.dueDate, null);
  assert.equal((await ok<any>(svc("tom").loadAll())).missions.find((m: any) => m.id === timed.id).dueTime, "09:30");
});
await t("schéma B3 : modification de l'heure dans « Informations » (update_mission_v2), conflit de version inchangé, effacement explicite", async () => {
  const e = await ok<any>(svc("tom").editInfo(timed, { title: "Horodatée", description: "", validatorId: ids.graw, dueDate: "2026-11-12", dueTime: "14:15", priority: "normal" })); assert.equal(e.dueTime, "14:15"); assert.equal(e.version, 2);
  await err(svc("tom").editInfo(timed, { title: "Périmée", description: "", validatorId: ids.graw, dueDate: "2026-11-12", dueTime: "08:00", priority: "normal" }), "conflict");
  const c = await ok<any>(svc("tom").editInfo(e, { title: "Horodatée", description: "", validatorId: ids.graw, dueDate: "2026-11-12", dueTime: null, priority: "normal" })); assert.equal(c.dueTime, null);
  timed = await ok<any>(svc("tom").editInfo(c, { title: "Horodatée", description: "", validatorId: ids.graw, dueDate: "2026-11-12", dueTime: "09:30", priority: "normal" })); assert.equal(timed.dueTime, "09:30");
});
await t("COMPATIBILITÉ : un client B2 (schéma « b2 ») sur la base migrée fonctionne et n'efface JAMAIS l'heure", async () => {
  const old = svc("tom", "b2"); const snap = await ok<any>(old.loadAll()); const m = snap.missions.find((x: any) => x.id === timed.id); assert.equal(m.dueTime, null, "le client B2 ne lit pas l'heure");
  const e = await ok<any>(old.editInfo(m, { title: "Titre modifié par un client B2", description: "", validatorId: ids.graw, dueDate: "2026-11-12", priority: "urgent" })); assert.equal(e.version, timed.version + 1);
  assert.equal((await ok<any>(svc("tom").fetchMission(timed.id))).dueTime, "09:30");                           // lu par un client B3 : l'heure est intacte
  const cr = await ok<any>(old.createMission(base("qafard", "graw", "Créée par un client B2", "2026-11-13"))); assert.equal(cr.dueTime, null);
  await ok<any>(svc("qafard", "b2").setStatus(cr.id, "in_progress")); await ok<any>(old.assign(cr.id, ids.tom)); await ok<any>(old.archive(cr.id));
  timed = await ok<any>(svc("tom").fetchMission(timed.id));
});
await t("COMPATIBILITÉ : le client B2 n'appelle jamais les fonctions _v2 ni l'agenda collectif ; le schéma B2 refuse l'agenda collectif SANS appel base", async () => {
  const calls: string[] = []; const spy = { select: portFor("tom").select, rpc: async (fn: string, a?: any) => { calls.push(fn); return portFor("tom").rpc(fn, a); } };
  const old = createMissionsService(spy as any, { schema: "b2" }); await ok<any>(old.createMission(base("tom", "graw", "Spy"))); await ok<any>(old.loadAll()); await err(old.loadTeamAgenda("2026-11-01", "2026-11-30"), "invalid");
  assert.ok(calls.every((c) => !/_v2$|list_team_agenda/.test(c)), calls.join(","));
});
await t("AGENDA COLLECTIF : un membre voit les missions des autres (titre, responsable, date, heure, statut, priorité) et rien d'autre", async () => {
  await ok<any>(svc("tom").createMission(base("tom", "graw", "Brief privé de Tom", "2026-11-12", "08:00")));
  const mine = (await ok<any>(svc("qafard").loadAll())).missions.map((m: any) => m.title); assert.ok(!mine.includes("Brief privé de Tom"));         // la RLS B0 reste en place
  const team = await ok<any[]>(svc("qafard").loadTeamAgenda("2026-11-09", "2026-11-15")); const brief = team.find((e) => e.title === "Brief privé de Tom");
  assert.ok(brief); assert.deepEqual(Object.keys(brief).sort(), ["assigneeId", "dueDate", "dueTime", "id", "priority", "status", "title"]); assert.deepEqual([brief.assigneeId, brief.dueTime, brief.dueDate, brief.status], [ids.tom, "08:00", "2026-11-12", "todo"]);
  assert.doesNotMatch(JSON.stringify(team), /secrète|description|creator|validator|comment/i);
  await err(svc("qafard").fetchMission(brief.id), "not_found");                                                                                  // et le détail reste inaccessible
});
await t("AGENDA COLLECTIF : missions privées exclues ; participants, comptes inactifs et anonymes refusés ; période invalide refusée", async () => {
  const hidden = await ok<any>(svc("tom").createMission(base("tom", "graw", "Négociation", "2026-11-12", "11:00"))); await portFor("tom").rpc("set_mission_private", { p_id: hidden.id, p_private: true });
  assert.ok(!(await ok<any[]>(svc("qafard").loadTeamAgenda("2026-11-09", "2026-11-15"))).some((e) => e.title === "Négociation"));
  for (const w of ["participant", "norole", "ghost"]) await err(svc(w).loadTeamAgenda("2026-11-09", "2026-11-15"), "forbidden"); await err(svc("anon").loadTeamAgenda("2026-11-09", "2026-11-15"), "forbidden");
  await err(svc("qafard").loadTeamAgenda("2026-11-01", "2027-03-01"), "invalid"); await err(svc("qafard").loadTeamAgenda("n'importe quoi", "2026-11-15"), "invalid");
});
console.log(`${n} tests SERVICE B3 (Postgres local, B0 + proposition) : OK`);
