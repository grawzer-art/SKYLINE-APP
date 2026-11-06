/* eslint-disable @typescript-eslint/no-explicit-any */
// B3 — AGENDA COLLECTIF (list_team_agenda) : lecture sécurisée, colonnes MINIMALES, règles de confidentialité. Postgres local (B0 + proposition).
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

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

const ids: Record<string, string> = {};
const provision = async (slug: string, o: { platform?: string[]; spaces?: string[]; staff?: string[]; active?: boolean } = {}) => {
  ids[slug] = (await db.query<{ id: string }>(`insert into auth.users (email) values ($1) returning id`, [`${slug}@example.test`])).rows[0].id;
  await db.query(`update public.accounts set display_name = $1, active = $2 where id = $3`, [slug[0].toUpperCase() + slug.slice(1), o.active ?? true, ids[slug]]);
  for (const s of o.spaces ?? []) await db.query(`insert into public.space_access (user_id, space) values ($1, $2)`, [ids[slug], s]);
  for (const r of o.platform ?? []) await db.query(`insert into public.platform_roles (user_id, role) values ($1, $2)`, [ids[slug], r]);
  for (const r of o.staff ?? []) await db.query(`insert into public.staff_roles (user_id, role) values ($1, $2)`, [ids[slug], r]);
  if ((o.spaces ?? []).includes("staff")) await db.query(`insert into public.staff_profiles (user_id, slug, function_title) values ($1, $2, 'F')`, [ids[slug], slug]);
};
await provision("graw", { platform: ["super_admin"], spaces: ["staff", "members"] });
await provision("tom", { spaces: ["staff"], staff: ["admin"] });
await provision("qafard", { spaces: ["staff"], staff: ["member"] });
await provision("autre", { spaces: ["staff"], staff: ["member"] });
await provision("participant", { spaces: ["members"] });
await provision("ghost", { spaces: ["staff"], staff: ["member"], active: false });
await provision("norole", {});

let chain: Promise<unknown> = Promise.resolve();
const serial = <T,>(fn: () => Promise<T>): Promise<T> => { const r = chain.then(fn, fn); chain = r.catch(() => undefined); return r; };
const as = <T,>(who: string, fn: () => Promise<T>): Promise<T> => serial(async () => {
  if (who === "anon") await db.exec(`set role anon; select set_config('request.jwt.claims', '', false)`);
  else await db.exec(`set role authenticated; select set_config('request.jwt.claims', '{"sub":"${ids[who]}","role":"authenticated"}', false)`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claims', '', false)`); }
});
const q = (who: string, sql: string, p: unknown[] = []) => as(who, async () => (await db.query<any>(sql, p)).rows);
const fails = async (who: string, sql: string, re: RegExp, p: unknown[] = []) => { let msg = ""; try { await q(who, sql, p); } catch (e) { msg = String((e as Error).message); } assert.match(msg, re, `attendu ${re} pour : ${sql.slice(0, 80)}`); };
const agenda = (who: string, from = "2026-11-01", to = "2026-11-30") => q(who, `select * from public.list_team_agenda($1, $2)`, [from, to]);
const titles = async (who: string, ...r: [string?, string?]) => (await agenda(who, ...r)).map((x) => x.title);

const SECRET = "DESCRIPTION CONFIDENTIELLE : budget artiste, ne pas diffuser";
const mk = async (who: string, title: string, assignee: string, validator: string, due: string | null, time: string | null = null, desc = SECRET) =>
  (await q(who, `select * from public.create_mission_v2($1, $2, $3, $4, $5, $6)`, [title, desc, ids[assignee], ids[validator], due, time]))[0];
await mk("tom", "Brief équipe", "tom", "graw", "2026-11-10", "09:00");
const mQaf = await mk("tom", "Repérage photo", "qafard", "graw", "2026-11-10", null);
await mk("graw", "Direction artistique", "graw", "tom", "2026-11-12", "14:30");
const mPriv = await mk("tom", "Négociation confidentielle", "tom", "graw", "2026-11-11", "10:00");
await mk("tom", "Sans date", "tom", "graw", null);
const mArch = await mk("tom", "Archivée", "tom", "graw", "2026-11-13"); await q("tom", `select * from public.archive_mission($1)`, [mArch.id]);
await mk("tom", "Hors fenêtre", "tom", "graw", "2027-03-01");
await q("qafard", `select * from public.add_mission_comment($1, 'COMMENTAIRE PRIVÉ du responsable')`, [mQaf.id]);
await q("tom", `select * from public.set_mission_private($1, true)`, [mPriv.id]);

await t("tout membre STAFF consulte le planning collectif : titres, responsables, dates, heures, statuts, priorités des missions des AUTRES", async () => {
  for (const w of ["qafard", "autre", "tom", "graw"]) assert.deepEqual(await titles(w), ["Brief équipe", "Repérage photo", "Direction artistique"], w);
  const r = (await agenda("autre")).find((x) => x.title === "Brief équipe")!;
  assert.equal(r.assignee_id, ids.tom); assert.equal(String(r.due_time), "09:00:00"); assert.equal(r.status, "todo"); assert.equal(r.priority, "normal"); assert.equal(r.due_date.toISOString().slice(0, 10), "2026-11-10");
});
await t("COLONNES MINIMALES : exactement id, titre, responsable, date, heure, statut, priorité — aucun autre champ", async () => {
  const rows = await agenda("autre"); assert.ok(rows.length >= 3);
  for (const r of rows) assert.deepEqual(Object.keys(r).sort(), ["assignee_id", "due_date", "due_time", "id", "priority", "status", "title"]);
  const sig = (await db.query<any>(`select pg_get_function_result(p.oid) r from pg_proc p where p.proname = 'list_team_agenda'`)).rows[0].r;
  assert.equal(sig, "TABLE(id uuid, title text, assignee_id uuid, due_date date, due_time time without time zone, status mission_status, priority mission_priority)");
});
await t("CONFIDENTIALITÉ : description, commentaires, historique, validateur, créateur, projet, version ne sont JAMAIS exposés", async () => {
  const dump = JSON.stringify(await agenda("autre"));
  for (const secret of [SECRET, "DESCRIPTION CONFIDENTIELLE", "COMMENTAIRE PRIVÉ", "description", "creator_id", "validator_id", "proposed_assignee_id", "project_id", "version", "mission_events", "note"]) assert.ok(!dump.includes(secret), `fuite : ${secret}`);
  // et la lecture directe des missions d'autrui reste interdite (RLS B0 inchangée)
  assert.deepEqual(await q("autre", `select title from public.missions`), []);
  assert.deepEqual(await q("autre", `select * from public.mission_comments`), []); assert.deepEqual(await q("autre", `select * from public.mission_events`), []);
  assert.deepEqual((await q("qafard", `select title from public.missions order by title`)).map((r) => r.title), ["Repérage photo"]);
  await fails("autre", `select description from public.list_team_agenda('2026-11-01', '2026-11-30')`, /column .* does not exist/);
});
await t("RÈGLES : missions privées, archivées, sans date ou hors fenêtre exclues", async () => {
  const all = await titles("autre"); for (const hidden of ["Négociation confidentielle", "Archivée", "Sans date", "Hors fenêtre"]) assert.ok(!all.includes(hidden), hidden);
  assert.deepEqual(await titles("autre", "2027-03-01", "2027-03-31"), ["Hors fenêtre"]); assert.deepEqual(await titles("autre", "2026-12-01", "2026-12-31"), []);
  assert.deepEqual(await titles("autre", "2026-11-12", "2026-11-12"), ["Direction artistique"]);
});
await t("tri chronologique : date, heure (toute la journée après les horaires), titre", async () => {
  const day = await q("autre", `select title, due_time from public.list_team_agenda('2026-11-10', '2026-11-10')`); assert.deepEqual(day.map((r) => r.title), ["Brief équipe", "Repérage photo"]);
});
await t("mission privée : le créateur ou un administrateur la retire / la remet ; un autre membre ne le peut pas ; la visibilité B0 ne change pas", async () => {
  await fails("autre", `select * from public.set_mission_private($1, true)`, /not_found|forbidden/, [mQaf.id]);
  await fails("qafard", `select * from public.set_mission_private($1, true)`, /forbidden/, [mQaf.id]);                    // visible (responsable) mais ni créateur ni administrateur
  await q("tom", `select * from public.set_mission_private($1, true)`, [mQaf.id]);                                         // le créateur (Tom)
  assert.ok(!(await titles("autre")).includes("Repérage photo")); assert.deepEqual((await q("qafard", `select title from public.missions`)).map((r) => r.title), ["Repérage photo"]);   // Qafard la voit toujours (RLS B0)
  await q("graw", `select * from public.set_mission_private($1, false)`, [mQaf.id]);                                       // un administrateur la remet
  assert.ok((await titles("autre")).includes("Repérage photo"));
  await fails("anon", `select * from public.set_mission_private($1, true)`, /permission denied/, [mQaf.id]);
});
await t("REFUS : participants, comptes inactifs, comptes sans accès et anonymes ne lisent AUCUN planning collectif", async () => {
  for (const w of ["participant", "ghost", "norole"]) await fails(w, `select * from public.list_team_agenda('2026-11-01', '2026-11-30')`, /forbidden/, []);
  await fails("anon", `select * from public.list_team_agenda('2026-11-01', '2026-11-30')`, /permission denied/);
});
await t("BORNES : fenêtre de 62 jours maximum, dates obligatoires et ordonnées (pas d'export en masse)", async () => {
  for (const [a, b] of [["2026-11-01", "2027-02-01"], ["2026-11-30", "2026-11-01"], [null, "2026-11-30"], ["2026-11-01", null]] as const) await fails("autre", `select * from public.list_team_agenda($1, $2)`, /invalid_range/, [a, b]);
  assert.ok((await q("autre", `select * from public.list_team_agenda('2026-11-01', '2027-01-02')`)).length >= 3);        // 62 jours : accepté
});
await t("LIMITE : 500 lignes au plus", async () => {
  await db.exec(`insert into public.missions (title, creator_id, assignee_id, validator_id, due_date) select 'Masse ' || g, '${ids.tom}', '${ids.tom}', '${ids.graw}', date '2026-12-05' from generate_series(1, 520) g`);
  assert.equal((await q("autre", `select * from public.list_team_agenda('2026-12-01', '2026-12-31')`)).length, 500);
});
await t("DROITS : exécutable par authenticated, jamais par anon ni PUBLIC ; aucune écriture possible via la fonction (lecture seule)", async () => {
  const f = (await db.query<any>(`select has_function_privilege('anon', p.oid, 'execute') a, has_function_privilege('authenticated', p.oid, 'execute') u, p.provolatile v, p.prosecdef d, p.proconfig c from pg_proc p where proname = 'list_team_agenda'`)).rows[0];
  assert.deepEqual([f.a, f.u, f.v, f.d], [false, true, "s", true]); assert.match(String(f.c), /search_path=/);
  const before = (await db.query<any>(`select count(*)::int c from public.missions`)).rows[0].c; await agenda("tom"); assert.equal((await db.query<any>(`select count(*)::int c from public.missions`)).rows[0].c, before);
});
console.log(`${n} tests AGENDA COLLECTIF (Postgres local) : OK`);
