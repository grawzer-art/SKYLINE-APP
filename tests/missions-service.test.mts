/* eslint-disable @typescript-eslint/no-explicit-any */
// B2 — Service MISSIONS (mode base de données) testé contre un VRAI Postgres local (PGlite) avec les migrations B0 et la RLS réelle.
// Le code testé (src/lib/missions/service.ts) est exactement celui du navigateur ; seul le "port" d'accès diffère (SQL local au lieu de PostgREST).
// AUCUN accès réseau, AUCUNE écriture dans la base Supabase réelle.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { createMissionsService, isUuid } from "../src/lib/missions/service.ts";
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
await provision("ghost", { active: false });
await provision("norole", {});

// ---- Port de test : SQL local sous le rôle `authenticated` + JWT simulé (ou `anon`), sérialisé (une seule connexion).
let chain: Promise<unknown> = Promise.resolve(); let calls = 0;
const serial = <T,>(fn: () => Promise<T>): Promise<T> => { const r = chain.then(fn, fn); chain = r.catch(() => undefined); return r; };
const COL = /^[a-z_,]+$/; const IDENT = /^[a-z_]+$/;
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
    return { data: fn === "list_team" ? r.data : r.data?.[0] ?? null, error: null };
  },
});
const svc = (who: string) => createMissionsService(portFor(who));
const ok = async <T,>(p: Promise<{ ok: boolean } & any>): Promise<T> => { const r = await p; assert.equal(r.ok, true, JSON.stringify(r)); return r.value as T; };
const err = async (p: Promise<any>, kind: string) => { const r = await p; assert.equal(r.ok, false, "attendu un refus"); assert.equal(r.error.kind, kind, JSON.stringify(r.error)); return r.error; };
const base = (assignee: string, validator: string, title = "Mission test") => ({ title, description: "", assigneeId: ids[assignee], validatorId: ids[validator], dueDate: null, priority: "normal" as const, status: "todo" as const });

await t("annuaire : membres de l'équipe avec rôles, coordinateurs = admin et super admin (UUID réels)", async () => {
  const snap = await ok<any>(svc("tom").loadAll());
  assert.deepEqual(snap.team.map((x: any) => x.slug).sort(), ["graw", "qafard", "tom"]);
  assert.deepEqual(snap.team.filter((x: any) => x.coordinator).map((x: any) => x.slug).sort(), ["graw", "tom"]);
  assert.ok(snap.team.every((x: any) => isUuid(x.id)));
});

await t("ACCÈS : sans session (anon) → refus total, aucune donnée", async () => {
  await err(svc("anon").loadAll(), "forbidden");
  await err(svc("anon").createMission(base("tom", "graw")), "forbidden");
});
await t("ACCÈS : participant (accès MEMBERS seul) → aucun accès STAFF : ni annuaire, ni missions, création refusée", async () => {
  await err(svc("participant").loadAll(), "forbidden");
  await err(svc("participant").createMission(base("tom", "graw")), "forbidden");
});
await t("ACCÈS : compte inactif ou sans accès → refus", async () => {
  await err(svc("ghost").loadAll(), "forbidden"); await err(svc("norole").loadAll(), "forbidden");
  await err(svc("norole").createMission(base("tom", "graw")), "forbidden");
});

let m1: any; let m2: any;
await t("cycle : Tom crée pour Qafard ; Qafard ne voit que SES missions, Tom et Graw voient tout", async () => {
  m1 = await ok<any>(svc("tom").createMission(base("qafard", "graw", "Repérage")));
  assert.equal(m1.version, 1); assert.equal(m1.assigneeId, ids.qafard); assert.equal(m1.history[0].kind, "created"); assert.equal(m1.history[0].by, ids.tom);
  m2 = await ok<any>(svc("tom").createMission(base("tom", "graw", "Brief privé Tom")));
  assert.deepEqual((await ok<any>(svc("qafard").loadAll())).missions.map((x: any) => x.title), ["Repérage"]);
  assert.equal((await ok<any>(svc("tom").loadAll())).missions.length, 2);
  assert.equal((await ok<any>(svc("graw").loadAll())).missions.length, 2);
  await err(svc("qafard").fetchMission(m2.id), "not_found");           // mission d'un autre : invisible
  await err(svc("qafard").setStatus(m2.id, "in_progress"), "not_found");
});
await t("statuts : le responsable démarre, ne peut JAMAIS terminer ; le validateur valide", async () => {
  let m = await ok<any>(svc("qafard").setStatus(m1.id, "in_progress")); assert.equal(m.status, "in_progress");
  m = await ok<any>(svc("qafard").setStatus(m1.id, "review"));
  await err(svc("qafard").setStatus(m1.id, "done"), "forbidden");
  m = await ok<any>(svc("graw").setStatus(m1.id, "done", "OK")); assert.equal(m.status, "done");
  assert.deepEqual(m.history.map((h: any) => h.kind), ["created", "status", "status", "validated"]);
  await err(svc("graw").setStatus(m1.id, "done"), "conflict");           // déjà « terminée »
});
await t("propositions : Qafard propose, Tom approuve ; Qafard ne peut pas approuver ; refus possible", async () => {
  const p = await ok<any>(svc("qafard").createMission(base("tom", "graw", "Proposition")));
  assert.equal(p.assigneeId, ids.qafard); assert.equal(p.proposedAssigneeId, ids.tom);
  await err(svc("qafard").resolve(p.id, true), "forbidden");
  const a = await ok<any>(svc("tom").resolve(p.id, true)); assert.equal(a.assigneeId, ids.tom); assert.equal(a.proposedAssigneeId, null);
  const q = await ok<any>(svc("qafard").createMission(base("graw", "tom", "À refuser")));
  const r = await ok<any>(svc("graw").resolve(q.id, false)); assert.equal(r.assigneeId, ids.qafard); assert.equal(r.proposedAssigneeId, null);
  await err(svc("graw").resolve(q.id, false), "conflict");               // plus rien en attente
});
await t("attribution : le coordinateur réattribue ; un membre non lié à la mission est refusé", async () => {
  const x = await ok<any>(svc("tom").createMission(base("tom", "graw", "Attribution")));
  const y = await ok<any>(svc("tom").assign(x.id, ids.qafard)); assert.equal(y.assigneeId, ids.qafard);
  await err(svc("tom").assign(x.id, ids.participant), "invalid");        // un participant n'est pas un membre STAFF
});
await t("CONFLIT : deux modifications concurrentes → la seconde est rejetée, puis réussit après rechargement", async () => {
  const x = await ok<any>(svc("tom").createMission(base("qafard", "graw", "Conflit")));
  const a = await ok<any>(svc("tom").fetchMission(x.id)); const b = await ok<any>(svc("graw").fetchMission(x.id));
  const info = (title: string) => ({ title, description: "", validatorId: ids.graw, dueDate: null, priority: "normal" as const });
  const done = await ok<any>(svc("tom").editInfo(a, info("Titre de Tom"))); assert.equal(done.version, 2);
  const e = await err(svc("graw").editInfo(b, info("Titre de Graw")), "conflict"); assert.match(e.message, /Rechargez/);
  const fresh = await ok<any>(svc("graw").fetchMission(x.id));
  assert.equal((await ok<any>(svc("graw").editInfo(fresh, info("Titre de Graw")))).title, "Titre de Graw");
});
await t("édition : un membre ne modifie pas la mission d'un autre ; l'édition ne change NI responsable NI statut", async () => {
  const x = await ok<any>(svc("tom").createMission(base("qafard", "graw", "Info seule")));
  const mine = await ok<any>(svc("qafard").fetchMission(x.id));
  await err(svc("qafard").editInfo(mine, { title: "X", description: "", validatorId: ids.graw, dueDate: null, priority: "normal" }), "forbidden"); // créateur = Tom
  const e = await ok<any>(svc("tom").editInfo(mine, { title: "Info seule v2", description: "d", validatorId: ids.graw, dueDate: "2027-01-31", priority: "urgent" }));
  assert.equal(e.assigneeId, ids.qafard); assert.equal(e.status, "todo"); assert.equal(e.dueDate, "2027-01-31"); assert.equal(e.priority, "urgent");
});
await t("commentaires : lecture et ajout pour qui voit la mission ; refus pour les autres", async () => {
  const x = await ok<any>(svc("tom").createMission(base("qafard", "graw", "Commentée")));
  const c = await ok<any>(svc("qafard").addComment(x.id, "  Bien reçu  ")); assert.equal(c.body, "Bien reçu"); assert.equal(c.authorId, ids.qafard);
  assert.equal((await ok<any>(svc("tom").loadComments(x.id))).length, 1);
  await err(svc("qafard").addComment(x.id, "   "), "invalid");
  const priv = m2; await err(svc("qafard").addComment(priv.id, "intrus"), "forbidden");
  assert.deepEqual(await ok<any>(svc("qafard").loadComments(priv.id)), []);          // RLS : aucun commentaire visible
  await err(svc("participant").addComment(x.id, "intrus"), "forbidden");
});
await t("archivage et suppression : archivage par le créateur/coordinateur ; suppression réservée aux coordinateurs", async () => {
  const x = await ok<any>(svc("qafard").createMission(base("qafard", "tom", "À archiver")));
  await err(svc("qafard").remove(x.id), "forbidden");
  const a = await ok<any>(svc("qafard").archive(x.id)); assert.ok(a.archivedAt);
  await err(svc("qafard").setStatus(x.id, "in_progress"), "invalid"); // archivée
  await ok<any>(svc("tom").remove(x.id));
  await err(svc("tom").fetchMission(x.id), "not_found");
});
await t("IDENTIFIANTS : un identifiant local fictif n'atteint JAMAIS la base (aucun appel émis)", async () => {
  const before = calls; const s = svc("tom");
  for (const bad of ["tom", "graw", "m-123", "ex-abc-0", "", "1; drop table missions"]) {
    await err(s.setStatus(bad, "in_progress"), "invalid"); await err(s.assign(bad, ids.tom), "invalid"); await err(s.assign(m2.id, bad), "invalid");
    await err(s.archive(bad), "invalid"); await err(s.remove(bad), "invalid"); await err(s.resolve(bad, true), "invalid");
    await err(s.addComment(bad, "x"), "invalid"); await err(s.loadComments(bad), "invalid"); await err(s.fetchMission(bad), "invalid");
    await err(s.createMission({ ...base("tom", "graw"), assigneeId: bad }), "invalid"); await err(s.createMission({ ...base("tom", "graw"), validatorId: bad }), "invalid");
  }
  assert.equal(calls, before, "des appels ont atteint la base avec des identifiants invalides");
});
await t("un UUID bien formé mais inexistant est refusé PAR LA BASE (pas de contournement par le format)", async () => {
  const ghost = "00000000-0000-4000-8000-000000000000";
  await err(svc("tom").assign(m2.id, ghost), "invalid");
  await err(svc("tom").createMission({ ...base("tom", "graw"), assigneeId: ghost }), "invalid");
  await err(svc("tom").createMission({ ...base("tom", "graw"), validatorId: ids.qafard }), "invalid"); // un membre n'est pas validateur
});
await t("ERREURS : un message serveur inconnu ne fuite jamais à l'écran ; réseau et session expirée distingués", async () => {
  const { mapDbError } = await import("../src/lib/missions/errors.ts");
  assert.equal(mapDbError({ message: 'relation "public.secret" does not exist' }).kind, "unknown");
  assert.doesNotMatch(mapDbError({ message: 'relation "public.secret" does not exist' }).message, /secret|relation/);
  assert.equal(mapDbError({ message: "Failed to fetch", status: 0 }).kind, "network");
  assert.equal(mapDbError({ message: "JWT expired", status: 401 }).kind, "auth");
  assert.equal(mapDbError({ message: "permission denied for table missions", code: "42501" }).kind, "forbidden");
  assert.equal(mapDbError({ message: "version_conflict" }).kind, "conflict");
  assert.equal(mapDbError(null).kind, "unknown");
});
console.log(`${n} tests SERVICE MISSIONS (base locale) : OK`);
