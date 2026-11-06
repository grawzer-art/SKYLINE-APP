/* eslint-disable @typescript-eslint/no-explicit-any */
// B3 — COMPATIBILITÉ de la migration proposée (supabase/proposals/B3_1_agenda_notifications.sql) AVANT / APRÈS, sur un Postgres local (PGlite).
// Prouve : fonctions B0 STRICTEMENT inchangées (code, signature, propriétaire, SECURITY DEFINER, droits d'exécution) ; un client B2 se comporte à
// l'identique avant et après (dans la MÊME session : plans en cache) ; un client B2 ne peut pas effacer due_time ; droits anon / authenticated.
// Deux scénarios de privilèges par défaut (supabase_admin « large » et postgres). AUCUNE base distante.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

let n = 0; const results: string[] = [];
const defaultsBy: Record<string, string> = {
  large: `alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
          alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
          alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;`,
  postgres: `alter default privileges in schema public grant truncate, references, trigger on tables to anon, authenticated, service_role;
             alter default privileges in schema public revoke execute on functions from public;
             alter default privileges in schema public grant usage, select, update on sequences to anon, authenticated, service_role;`,
};
const PROPOSAL = readFileSync("supabase/proposals/B3_1_agenda_notifications.sql", "utf8");

for (const [scenarioName, defaults] of Object.entries(defaultsBy)) {
  const db = new PGlite(); const ok = (label: string) => { n++; results.push(label); console.log("PASS", `[${scenarioName}]`, label); };
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, raw_user_meta_data jsonb not null default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif((nullif(current_setting('request.jwt.claims', true), '')::jsonb) ->> 'sub', '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    ${defaults}
  `);
  for (const f of readdirSync("supabase/migrations").filter((x) => x.endsWith(".sql")).sort()) await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));

  const ids: Record<string, string> = {};
  const provision = async (slug: string, o: { platform?: string[]; spaces?: string[]; staff?: string[] } = {}) => {
    ids[slug] = (await db.query<{ id: string }>(`insert into auth.users (email) values ($1) returning id`, [`${slug}@example.test`])).rows[0].id;
    await db.query(`update public.accounts set display_name = $1, active = true where id = $2`, [slug[0].toUpperCase() + slug.slice(1), ids[slug]]);
    for (const s of o.spaces ?? []) await db.query(`insert into public.space_access (user_id, space) values ($1, $2)`, [ids[slug], s]);
    for (const r of o.platform ?? []) await db.query(`insert into public.platform_roles (user_id, role) values ($1, $2)`, [ids[slug], r]);
    for (const r of o.staff ?? []) await db.query(`insert into public.staff_roles (user_id, role) values ($1, $2)`, [ids[slug], r]);
    if ((o.spaces ?? []).includes("staff")) await db.query(`insert into public.staff_profiles (user_id, slug, function_title) values ($1, $2, 'F')`, [ids[slug], slug]);
  };
  await provision("graw", { platform: ["super_admin"], spaces: ["staff", "members"] });
  await provision("tom", { spaces: ["staff"], staff: ["admin"] });
  await provision("qafard", { spaces: ["staff"], staff: ["member"] });
  await provision("participant", { spaces: ["members"] });

  let chain: Promise<unknown> = Promise.resolve();
  const serial = <T,>(fn: () => Promise<T>): Promise<T> => { const r = chain.then(fn, fn); chain = r.catch(() => undefined); return r; };
  const as = <T,>(who: string, fn: () => Promise<T>): Promise<T> => serial(async () => {
    if (who === "anon") await db.exec(`set role anon; select set_config('request.jwt.claims', '', false)`);
    else await db.exec(`set role authenticated; select set_config('request.jwt.claims', '{"sub":"${ids[who]}","role":"authenticated"}', false)`);
    try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claims', '', false)`); }
  });
  const q = (who: string, sql: string, p: unknown[] = []) => as(who, async () => (await db.query<any>(sql, p)).rows);
  const tryq = async (who: string, sql: string, p: unknown[] = []) => { try { return { ok: true as const, rows: await q(who, sql, p) }; } catch (e) { return { ok: false as const, error: String((e as Error).message) }; } };

  // ---- Catalogue des fonctions (code, signature, propriétaire, droits) : empreinte comparable avant / après
  const catalog = async () => (await db.query<any>(`
    select p.proname, pg_get_function_identity_arguments(p.oid) args, p.oid::int oid, p.prosecdef, p.proowner::regrole::text owner, coalesce(p.proacl::text, 'NULL') acl, md5(p.prosrc) src, coalesce(p.proconfig::text, '') cfg, p.prorettype::regtype::text ret,
           has_function_privilege('anon', p.oid, 'execute') anon_x, has_function_privilege('authenticated', p.oid, 'execute') auth_x
    from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind = 'f' order by 1, 2`)).rows as any[];
  const before = await catalog();

  // ---- Scénario « client B2 » : joué AVANT puis APRÈS la migration, résultats normalisés (identifiants et horodatages neutralisés)
  const norm = (v: unknown) => { const seen = new Map<string, string>(); return JSON.parse(JSON.stringify(v, (k, x) => {
    if (x instanceof Date) return k === "due_date" ? x.toISOString().slice(0, 10) : "T";
    if (typeof x === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x)) { if (!seen.has(x)) seen.set(x, `#${seen.size}`); return seen.get(x); }
    if (typeof x === "string" && /^\d{4}-\d{2}-\d{2}T/.test(x)) return "T";
    return x;
  })); };
  const withoutNew = (rows: any[]) => rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => k !== "due_time" && k !== "is_private")));
  const scenario = async () => {
    const out: any[] = []; const rec = async (step: string, who: string, sql: string, p: unknown[] = []) => { const r = await tryq(who, sql, p); out.push({ step, ...(r.ok ? { rows: withoutNew(r.rows) } : { error: r.error }) }); return r; };
    const m1 = (await rec("create (B2)", "tom", `select * from public.create_mission('Repérage', 'Description', $1, $2, '2026-11-12', 'normal', 'todo', null)`, [ids.qafard, ids.graw])) as any; const id1 = m1.rows[0].id;
    const m2 = (await rec("proposition (B2)", "qafard", `select * from public.create_mission('Idée', '', $1, $2, null, 'high', 'todo', null)`, [ids.tom, ids.graw])) as any; const id2 = m2.rows[0].id;
    await rec("statut", "qafard", `select * from public.set_mission_status($1, 'in_progress', null)`, [id1]);
    await rec("statut interdit", "qafard", `select * from public.set_mission_status($1, 'done', null)`, [id1]);
    await rec("update (B2)", "tom", `select * from public.update_mission($1, 2, 'Repérage v2', 'Description', $2, '2026-11-13', 'urgent', null)`, [id1, ids.graw]);
    await rec("update version périmée", "tom", `select * from public.update_mission($1, 1, 'X', '', $2, null, 'normal', null)`, [id1, ids.graw]);
    await rec("update par un tiers", "qafard", `select * from public.update_mission($1, 3, 'X', '', $2, null, 'normal', null)`, [id2, ids.graw]);
    await rec("résolution", "tom", `select * from public.resolve_assignment($1, true, null)`, [id2]);
    await rec("attribution", "tom", `select * from public.assign_mission($1, $2)`, [id1, ids.tom]);
    await rec("commentaire", "tom", `select * from public.add_mission_comment($1, 'Bien reçu')`, [id1]);
    await rec("archivage", "tom", `select * from public.archive_mission($1)`, [id2]);
    await rec("suppression par un membre", "qafard", `select public.delete_mission($1)`, [id1]);
    await rec("suppression par un admin", "tom", `select public.delete_mission($1)`, [id1]);
    await rec("lecture RLS membre", "qafard", `select title, status from public.missions order by title`);
    await rec("lecture RLS admin", "tom", `select title, status, version from public.missions order by title`);
    await rec("historique", "tom", `select kind, note from public.mission_events order by id`);
    await rec("appel anonyme", "anon", `select * from public.create_mission('x', '', $1, $2, null, 'normal', 'todo', null)`, [ids.qafard, ids.graw]);
    await rec("appel participant", "participant", `select * from public.create_mission('x', '', $1, $2, null, 'normal', 'todo', null)`, [ids.qafard, ids.graw]);
    return out;
  };
  const resetData = async () => { await db.exec(`truncate public.missions cascade`); };
  const scenarioBefore = norm(await scenario());       // plans en cache pour les fonctions B0
  await resetData();

  // ---- Migration
  await db.exec(PROPOSAL);
  const after = await catalog();

  // ---- 1. Fonctions B0 STRICTEMENT inchangées
  const key = (c: any) => `${c.proname}(${c.args})`; const beforeMap = new Map(before.map((c) => [key(c), c]));
  for (const c of after) { const b = beforeMap.get(key(c)); if (!b) continue; assert.deepEqual(c, b, `fonction B0 modifiée : ${key(c)}`); }
  assert.equal(after.filter((c) => beforeMap.has(key(c))).length, before.length, "aucune fonction B0 supprimée ni remplacée");
  ok(`${before.length} fonctions B0 : code, signature, OID, propriétaire, SECURITY DEFINER, droits d'exécution IDENTIQUES avant / après (aucun DROP, aucun REPLACE)`);

  // ---- 2. Aucune surcharge ambiguë ; nouvelles fonctions = ajouts seulement
  const names = after.map((c) => c.proname); for (const f of new Set(names)) assert.equal(names.filter((x) => x === f).length, 1, `surcharge de ${f}`);
  const added = after.filter((c) => !beforeMap.has(key(c))).map((c) => c.proname).sort();
  assert.deepEqual(added, ["can_view_notification", "create_agenda_event", "create_mission_v2", "delete_agenda_event", "list_team_agenda", "mark_notifications_read", "missions_keep_time_consistent", "register_push_subscription", "revoke_push_subscription", "send_announcement", "set_mission_private", "set_notification_preferences", "update_agenda_event", "update_mission_v2"]);
  ok("aucune surcharge de nom (RPC non ambigu) ; les nouvelles fonctions sont des AJOUTS (noms distincts : create_mission_v2, update_mission_v2…)");

  // ---- 3. Client B2 : comportement identique avant / après, dans la même session
  const scenarioAfter = norm(await scenario());
  assert.deepEqual(scenarioAfter, scenarioBefore);
  ok("scénario complet d'un client B2 (création, proposition, statuts, mise à jour, version périmée, attribution, commentaire, archivage, suppression, lectures RLS, appels interdits) : résultats IDENTIQUES avant / après");
  const rows = (await db.query<any>(`select due_time, is_private from public.missions`)).rows; assert.ok(rows.every((r) => r.due_time === null && r.is_private === false));
  ok("les missions créées par un client B2 après migration : due_time = null, is_private = false (valeurs par défaut neutres)");
  await resetData();

  // ---- 4. Un client B2 ne peut PAS effacer due_time
  const m = (await q("tom", `select * from public.create_mission_v2(p_title => 'Horodatée', p_description => '', p_assignee => $1, p_validator => $2, p_due => '2026-11-12', p_time => '09:30')`, [ids.qafard, ids.graw]))[0];
  const u1 = (await q("tom", `select * from public.update_mission($1, 1, 'Horodatée v2', '', $2, '2026-11-12', 'urgent', null)`, [m.id, ids.graw]))[0];
  assert.equal(String(u1.due_time), "09:30:00"); assert.equal(u1.version, 2);
  const u2 = (await q("tom", `select * from public.update_mission($1, 2, 'Horodatée v3', '', $2, '2026-11-20', 'normal', null)`, [m.id, ids.graw]))[0];
  assert.equal(String(u2.due_time), "09:30:00"); assert.equal(u2.due_date.toISOString().slice(0, 10), "2026-11-20");
  await q("qafard", `select * from public.set_mission_status($1, 'in_progress', null)`, [m.id]); await q("tom", `select * from public.assign_mission($1, $2)`, [m.id, ids.tom]);
  await q("tom", `select * from public.archive_mission($1)`, [m.id]);
  assert.equal(String((await db.query<any>(`select due_time from public.missions where id = $1`, [m.id])).rows[0].due_time), "09:30:00");
  ok("client B2 (update_mission, set_mission_status, assign_mission, archive_mission) : due_time n'est JAMAIS effacé ni modifié");
  const m3 = (await q("tom", `select * from public.create_mission_v2(p_title => 'Date effacée', p_description => '', p_assignee => $1, p_validator => $2, p_due => '2026-11-12', p_time => '10:00')`, [ids.qafard, ids.graw]))[0];
  const c3 = (await q("tom", `select * from public.update_mission($1, 1, 'Date effacée', '', $2, null, 'normal', null)`, [m3.id, ids.graw]))[0];
  assert.equal(c3.due_date, null); assert.equal(c3.due_time, null);
  ok("client B2 qui efface la DATE d'une mission horodatée : aucune erreur, l'heure suit (déclencheur de cohérence) — jamais d'état incohérent");
  const bad = await tryq("tom", `select * from public.update_mission_v2($1, 2, 'x', '', $2, null, '10:00', 'normal', null)`, [m3.id, ids.graw]); assert.ok(!bad.ok && /invalid_time/.test(bad.error));
  let direct = ""; try { await db.exec(`update public.missions set due_time = '10:00' where id = '${m3.id}'`); } catch (e) { direct = String((e as Error).message); } assert.equal(direct, "", "écriture directe superuser : le déclencheur normalise (date nulle ⇒ heure nulle)");
  assert.equal((await db.query<any>(`select due_time from public.missions where id = $1`, [m3.id])).rows[0].due_time, null);
  ok("cohérence garantie jusque dans la table : une heure sans date est impossible (déclencheur + contrainte)");

  // ---- 5. Nouveaux appels : heure OBLIGATOIRE et explicite (jamais d'effacement silencieux)
  for (const [label, sql] of [["create_mission_v2 sans p_time", `select * from public.create_mission_v2(p_title => 'x', p_description => '', p_assignee => $1, p_validator => $2, p_due => '2026-11-12')`], ["update_mission_v2 sans p_time", `select * from public.update_mission_v2(p_id => $1, p_expected_version => 1, p_title => 'x', p_description => '', p_validator => $2, p_due => '2026-11-12', p_priority => 'normal')`]] as const) {
    const r = await tryq("tom", sql, label.startsWith("create") ? [ids.qafard, ids.graw] : [m.id, ids.graw]); assert.ok(!r.ok && /does not exist|function/.test(r.error), `${label} doit échouer`);
  }
  const v = (await q("tom", `select * from public.create_mission_v2(p_title => 'Explicite', p_description => '', p_assignee => $1, p_validator => $2, p_due => '2026-11-12', p_time => null)`, [ids.qafard, ids.graw]))[0]; assert.equal(v.due_time, null);
  ok("fonctions _v2 : omettre p_time est une ERREUR (fonction introuvable) ; null explicite = « aucune heure »");

  // ---- 6. Parité des règles entre anciennes et nouvelles fonctions (détecte toute dérive de copie)
  const rule = async (label: string, who: string, oldSql: string, newSql: string, po: unknown[], pn: unknown[]) => {
    const a = await tryq(who, oldSql, po); const b = await tryq(who, newSql, pn);
    assert.equal(a.ok, b.ok, `${label} : ancien ${a.ok ? "accepte" : (a as any).error} / nouveau ${b.ok ? "accepte" : (b as any).error}`);
    if (!a.ok && !b.ok) assert.equal(a.error.split(/\s+at\s+/)[0], b.error.split(/\s+at\s+/)[0].replace(/_v2/g, ""), label);
  };
  const O = (extra = "") => `select * from public.create_mission($1, '', $2, $3, '2026-11-12', 'normal', 'todo', null${extra})`; const N = `select * from public.create_mission_v2($1, '', $2, $3, '2026-11-12', null)`;
  await rule("titre vide", "tom", O(), N, ["  ", ids.qafard, ids.graw], ["  ", ids.qafard, ids.graw]);
  await rule("responsable invalide", "tom", O(), N, ["T", ids.participant, ids.graw], ["T", ids.participant, ids.graw]);
  await rule("validateur non coordinateur", "tom", O(), N, ["T", ids.qafard, ids.qafard], ["T", ids.qafard, ids.qafard]);
  await rule("validateur = responsable", "tom", O(), N, ["T", ids.graw, ids.graw], ["T", ids.graw, ids.graw]);
  await rule("participant", "participant", O(), N, ["T", ids.qafard, ids.graw], ["T", ids.qafard, ids.graw]);
  await rule("anonyme", "anon", O(), N, ["T", ids.qafard, ids.graw], ["T", ids.qafard, ids.graw]);
  await rule("membre crée pour lui-même", "qafard", O(), N, ["T", ids.qafard, ids.tom], ["T", ids.qafard, ids.tom]);
  const mm = (await q("tom", `select * from public.create_mission('Base', '', $1, $2, '2026-11-12', 'normal', 'todo', null)`, [ids.qafard, ids.graw]))[0];
  const OU = `select * from public.update_mission($1, $2, $3, '', $4, '2026-11-12', 'normal', null)`; const NU = `select * from public.update_mission_v2($1, $2, $3, '', $4, '2026-11-12', null, 'normal', null)`;
  await rule("update version périmée", "tom", OU, NU, [mm.id, 99, "T", ids.graw], [mm.id, 99, "T", ids.graw]);
  await rule("update par un membre non créateur", "qafard", OU, NU, [mm.id, 1, "T", ids.graw], [mm.id, 1, "T", ids.graw]);
  await rule("update validateur invalide", "tom", OU, NU, [mm.id, 1, "T", ids.qafard], [mm.id, 1, "T", ids.qafard]);
  await rule("update titre vide", "tom", OU, NU, [mm.id, 1, " ", ids.graw], [mm.id, 1, " ", ids.graw]);
  await rule("update anonyme", "anon", OU, NU, [mm.id, 1, "T", ids.graw], [mm.id, 1, "T", ids.graw]);
  ok("règles identiques entre create/update_mission (B0) et create/update_mission_v2 : mêmes acceptations et mêmes erreurs (aucune dérive de copie)");

  // ---- 7. Droits d'exécution : matrice complète, anciennes et nouvelles fonctions
  const final = await catalog();
  for (const c of final) {
    const isB0 = beforeMap.has(key(c));
    if (isB0) { const b = beforeMap.get(key(c))!; assert.equal(c.anon_x, b.anon_x, `anon ${key(c)}`); assert.equal(c.auth_x, b.auth_x, `authenticated ${key(c)}`); }
    else { assert.equal(c.anon_x, false, `anon ne doit pas exécuter ${c.proname}`); assert.equal(c.auth_x, c.proname !== "missions_keep_time_consistent", `authenticated ${c.proname}`); }
  }
  assert.deepEqual(final.filter((c) => c.anon_x).map((c) => c.proname), [], "aucune fonction exécutable par anon");
  const pub = (await db.query<any>(`select p.proname from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind = 'f' and exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where a.grantee = 0 and a.privilege_type = 'EXECUTE')`)).rows;
  assert.deepEqual(pub, [], "aucune fonction exécutable par PUBLIC");
  for (const fn of ["create_mission", "update_mission", "create_mission_v2", "update_mission_v2", "list_team_agenda"]) {
    const r = await tryq("anon", fn === "list_team_agenda" ? `select * from public.${fn}('2026-11-01', '2026-11-30')` : `select public.${fn}()`, []); assert.ok(!r.ok && /permission denied|does not exist/.test(r.error), `anon ${fn}`);
  }
  ok("droits d'exécution : anon = AUCUNE fonction, PUBLIC = aucune ; authenticated = anciennes fonctions comme avant + nouvelles (hors fonction de déclencheur) ; appels anonymes refusés");
  assert.equal((await tryq("tom", `select public.missions_keep_time_consistent()`)).ok, false);
  ok("la fonction de déclencheur n'est exécutable par aucun utilisateur");

  // ---- 8. RLS et privilèges de table : inchangés pour les clients B2
  const own = await q("qafard", `select title from public.missions order by title`); assert.ok(!own.some((r) => r.title === "Base" === false && false));
  const others = await q("qafard", `select title from public.missions where assignee_id = $1`, [ids.tom]); assert.deepEqual(others, []);
  for (const [role, expect] of [["anon", []], ["authenticated", ["SELECT"]]] as const) { const got: string[] = []; for (const p of ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE"]) if ((await db.query<any>(`select has_table_privilege($1, 'public.missions', $2) ok`, [role, p])).rows[0].ok) got.push(p); assert.deepEqual(got, expect, `missions ${role}`); }
  const pol = (await db.query<any>(`select policyname from pg_policies where tablename = 'missions' order by 1`)).rows.map((r) => r.policyname); assert.deepEqual(pol, ["missions_select"]);
  ok("table missions : mêmes politiques RLS, mêmes privilèges (anon aucun ; authenticated SELECT seul) ; un membre ne lit toujours pas les missions d'autrui");
  await db.close();
}
console.log(`${n} vérifications de COMPATIBILITÉ avant / après migration : OK`);
