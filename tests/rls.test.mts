/* eslint-disable @typescript-eslint/no-explicit-any */
// Tests des migrations SQL et des politiques RLS sur un vrai Postgres (PGlite, WebAssembly) — AUCUN accès réseau, AUCUNE base distante.
// `node --experimental-strip-types --no-warnings tests/rls.test.mts`
// Les rôles / le schéma `auth` de Supabase sont simulés (auth.uid() lit request.jwt.claims, comme sur Supabase).
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

let n = 0; const results: string[] = [];
const t = async (name: string, fn: () => Promise<void>) => { await fn(); n++; console.log("PASS", name); results.push(name); };
const db = new PGlite();

await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, raw_user_meta_data jsonb not null default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as $$ select nullif((nullif(current_setting('request.jwt.claims', true), '')::jsonb) ->> 'sub', '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  -- Comme sur Supabase : droits par défaut TRÈS larges sur public, que les migrations doivent restreindre.
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`);
for (const f of readdirSync("supabase/migrations").filter((x) => x.endsWith(".sql")).sort()) await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));

const ids: Record<string, string> = {};
const provision = async (slug: string, roles: string[], active = true) => {
  const r = await db.query<{ id: string }>(`insert into auth.users (email) values ($1) returning id`, [`${slug}@example.test`]);
  ids[slug] = r.rows[0].id;
  if (active) await db.query(`update public.profiles set slug = $1, display_name = $2, active = true where id = $3`, [slug, slug[0].toUpperCase() + slug.slice(1), ids[slug]]);
  for (const role of roles) await db.query(`insert into public.user_roles (user_id, role) values ($1, $2)`, [ids[slug], role]);
};
await provision("graw", ["super_admin"]); await provision("tom", ["admin"]); await provision("qafard", ["member"]);
await provision("ghost", [], false);          // invité, jamais activé
await provision("norole", [], true);          // profil actif mais SANS rôle

/** Exécute `fn` sous un rôle Postgres + un JWT simulé, puis remet le rôle initial. */
const as = async <T,>(who: string | "anon", fn: () => Promise<T>): Promise<T> => {
  if (who === "anon") await db.exec(`set role anon; select set_config('request.jwt.claims', '', false)`);
  else await db.exec(`set role authenticated; select set_config('request.jwt.claims', '{"sub":"${ids[who]}","role":"authenticated"}', false)`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claims', '', false)`); }
};
const q = (who: string, sql: string, p: unknown[] = []) => as(who, async () => (await db.query<Record<string, any>>(sql, p)).rows);
const fails = async (who: string, sql: string, re: RegExp, p: unknown[] = []) => { let msg = ""; try { await q(who, sql, p); } catch (e) { msg = String((e as Error).message); } assert.match(msg, re, `attendu une erreur ${re} pour : ${sql.slice(0, 70)}`); };
const mission = async (who: string, title: string, assignee: string, validator: string, extra: { status?: string; project?: string | null } = {}) =>
  (await q(who, `select * from public.create_mission($1, '', $2, $3, null, 'normal', $4, $5)`, [title, ids[assignee], ids[validator], extra.status ?? "todo", extra.project ?? null]))[0];

await t("invitation : le profil est créé INACTIF, sans rôle, avec un slug dérivé de l'e-mail", async () => {
  const r = (await db.query<any>(`insert into auth.users (email) values ('Nouvelle.Personne+x@example.test') returning id`)).rows[0];
  const p = (await db.query<any>(`select * from public.profiles where id = $1`, [r.id])).rows[0];
  assert.equal(p.active, false); assert.match(p.slug, /^nouvelle-personne-x/); assert.equal((await db.query(`select 1 from public.user_roles where user_id = $1`, [r.id])).rows.length, 0);
  const again = (await db.query<any>(`insert into auth.users (email) values ('nouvelle.personne+x@other.test') returning id`)).rows[0];
  assert.notEqual((await db.query<any>(`select slug from public.profiles where id = $1`, [again.id])).rows[0].slug, p.slug);
});
await t("ANONYME : aucune table, aucune fonction", async () => {
  for (const tbl of ["profiles", "user_roles", "missions", "mission_events", "mission_comments", "projects", "project_members"]) await fails("anon", `select * from public.${tbl}`, /permission denied/i);
  await fails("anon", `select public.has_role('admin')`, /permission denied/i);
  await fails("anon", `select * from public.create_mission('x','',gen_random_uuid(),gen_random_uuid(),null)`, /permission denied/i);
  await fails("anon", `select * from public.list_team()`, /permission denied/i);
});
await t("compte invité non activé / sans rôle : ne voit que son propre profil, aucune mission, aucune action", async () => {
  assert.equal((await q("ghost", `select * from public.profiles`)).length, 1);
  assert.equal((await q("norole", `select * from public.profiles where id <> $1`, [ids.norole])).length, 0);
  for (const u of ["ghost", "norole"]) {
    assert.equal((await q(u, `select * from public.missions`)).length, 0);
    assert.equal((await q(u, `select * from public.list_team()`)).length, 0);
    await fails(u, `select * from public.create_mission('x','',$1,$2,null)`, /forbidden/, [ids.qafard, ids.tom]);
  }
});
await t("équipe : les membres actifs voient les profils actifs et l'annuaire (3 membres, rôles inclus)", async () => {
  const team = await q("qafard", `select slug, roles from public.list_team()`);
  assert.deepEqual(team.map((r) => r.slug).sort(), ["graw", "qafard", "tom"]);
  assert.equal(String(team.find((r) => r.slug === "graw")!.roles).replace(/[{}]/g, ""), "super_admin");
  assert.equal((await q("qafard", `select * from public.profiles where slug = 'ghost'`)).length, 0);
  assert.equal((await q("graw", `select * from public.profiles where slug = 'ghost'`)).length, 1);
});
await t("RÔLES : seul le super admin (GRAW) gère comptes, rôles et activations — pas Tom, pas Qafard", async () => {
  for (const u of ["tom", "qafard"]) {
    await fails(u, `select public.manage_set_roles($1, array['member']::public.app_role[])`, /forbidden/, [ids.ghost]);
    await fails(u, `select public.manage_set_active($1, true)`, /forbidden/, [ids.ghost]);
    await fails(u, `select public.manage_update_profile($1, 'X', 'Y')`, /forbidden/, [ids.ghost]);
  }
  await q("graw", `select public.manage_set_roles($1, array['member']::public.app_role[])`, [ids.ghost]); await q("graw", `select public.manage_set_active($1, true)`, [ids.ghost]);
  assert.deepEqual((await q("graw", `select role from public.user_roles where user_id = $1`, [ids.ghost])).map((r) => r.role), ["member"]);
  await q("graw", `select public.manage_set_active($1, false)`, [ids.ghost]); await db.query(`delete from public.user_roles where user_id = $1`, [ids.ghost]);
});
await t("RÔLES : écriture directe impossible ; chacun ne lit que ses rôles (le super admin lit tout)", async () => {
  await fails("tom", `insert into public.user_roles (user_id, role) values ($1, 'super_admin')`, /permission denied/i, [ids.tom]);
  await fails("graw", `update public.user_roles set role = 'admin' where user_id = $1`, /permission denied/i, [ids.tom]);
  assert.equal((await q("qafard", `select * from public.user_roles`)).length, 1);
  assert.equal((await q("graw", `select * from public.user_roles`)).length >= 3, true);
});
await t("RÔLES : le dernier super admin ne peut être ni retiré ni désactivé", async () => {
  await fails("graw", `select public.manage_set_roles($1, array['admin']::public.app_role[])`, /last_super_admin/, [ids.graw]);
  await fails("graw", `select public.manage_set_active($1, false)`, /last_super_admin/, [ids.graw]);
});
await t("PROFIL : chacun modifie ses informations personnelles, jamais active / slug / fonction ni celles des autres", async () => {
  await q("qafard", `update public.profiles set display_name = 'Qafard P.', email_pro = 'q@example.test', phone_pro = '0600000000' where id = $1`, [ids.qafard]);
  assert.equal((await q("qafard", `select display_name from public.profiles where id = $1`, [ids.qafard]))[0].display_name, "Qafard P.");
  await fails("qafard", `update public.profiles set active = false where id = $1`, /permission denied/i, [ids.qafard]);
  await fails("qafard", `update public.profiles set slug = 'tom2' where id = $1`, /permission denied/i, [ids.qafard]);
  await fails("qafard", `update public.profiles set function_title = 'Fondateur' where id = $1`, /permission denied/i, [ids.qafard]);
  assert.equal((await q("qafard", `update public.profiles set display_name = 'Pirate' where id = $1 returning id`, [ids.tom])).length, 0);
  await q("qafard", `update public.profiles set display_name = 'Qafard' where id = $1`, [ids.qafard]);
});
await t("MISSIONS : aucune écriture directe (INSERT / UPDATE / DELETE refusés à tous, super admin compris)", async () => {
  for (const u of ["qafard", "tom", "graw"]) {
    await fails(u, `insert into public.missions (title, creator_id, assignee_id, validator_id) values ('x', $1, $1, $2)`, /permission denied/i, [ids[u], ids.graw === ids[u] ? ids.tom : ids.graw]);
    await fails(u, `update public.missions set status = 'done'`, /permission denied/i);
    await fails(u, `delete from public.missions`, /permission denied/i);
    await fails(u, `insert into public.mission_events (mission_id, actor_id, kind) values (gen_random_uuid(), $1, 'created')`, /permission denied/i, [ids[u]]);
    await fails(u, `insert into public.mission_comments (mission_id, author_id, body) values (gen_random_uuid(), $1, 'x')`, /permission denied/i, [ids[u]]);
  }
});

let mSelf: any, mProp: any, mTom: any;
await t("CRÉATION : un membre crée pour lui-même ; pour un autre = PROPOSITION (il reste responsable) ; un admin attribue directement", async () => {
  mSelf = await mission("qafard", "Repérage photo", "qafard", "tom");
  assert.equal(mSelf.assignee_id, ids.qafard); assert.equal(mSelf.creator_id, ids.qafard); assert.equal(mSelf.proposed_assignee_id, null); assert.equal(mSelf.version, 1);
  mProp = await mission("qafard", "Maquette pour Graw", "graw", "tom");
  assert.equal(mProp.assignee_id, ids.qafard); assert.equal(mProp.proposed_assignee_id, ids.graw);
  mTom = await mission("tom", "Brief identité", "qafard", "graw");
  assert.equal(mTom.assignee_id, ids.qafard); assert.equal(mTom.proposed_assignee_id, null);
  const ev = await q("qafard", `select kind from public.mission_events where mission_id = $1 order by id`, [mProp.id]);
  assert.deepEqual(ev.map((e) => e.kind), ["created", "assignment_proposed"]);
});
await t("CRÉATION : validateur obligatoirement admin / super admin, jamais le responsable ; statut « terminée » interdit à un membre", async () => {
  await fails("qafard", `select * from public.create_mission('x','',$1,$1,null)`, /invalid_validator/, [ids.qafard]);
  await fails("tom", `select * from public.create_mission('x','',$1,$2,null)`, /invalid_validator/, [ids.tom, ids.qafard]);
  await fails("tom", `select * from public.create_mission('x','',$1,$1,null)`, /validator_conflict/, [ids.tom]);
  await fails("qafard", `select * from public.create_mission('x','',$1,$2,null,'normal','done')`, /forbidden_status/, [ids.qafard, ids.tom]);
  await fails("qafard", `select * from public.create_mission('   ','',$1,$2,null)`, /invalid_title/, [ids.qafard, ids.tom]);
  await fails("qafard", `select * from public.create_mission('x','',gen_random_uuid(),$1,null)`, /invalid_assignee/, [ids.tom]);
  await fails("qafard", `select * from public.create_mission('x','',$1,$2,null)`, /validator_conflict/, [ids.tom, ids.tom]);
  assert.equal((await q("tom", `select * from public.create_mission('Déjà terminée','',$1,$2,null,'normal','done')`, [ids.qafard, ids.graw])).length, 1);
});
await t("VISIBILITÉ : un membre ne voit que ses missions ; Tom et Graw voient tout", async () => {
  const secret = (await q("tom", `select * from public.create_mission('Secrète','',$1,$2,null)`, [ids.graw, ids.tom]))[0];
  assert.equal((await q("qafard", `select id from public.missions where id = $1`, [secret.id])).length, 0);
  assert.equal((await q("qafard", `select id from public.missions where id = $1`, [mSelf.id])).length, 1);
  assert.equal((await q("graw", `select id from public.missions where id = $1`, [secret.id])).length, 1);
  assert.equal((await q("tom", `select id from public.missions where id = $1`, [mSelf.id])).length, 1);
  assert.equal((await q("qafard", `select * from public.mission_events where mission_id = $1`, [secret.id])).length, 0);
  await fails("qafard", `select public.set_mission_status($1, 'in_progress')`, /not_found/, [secret.id]);
});
await t("VISIBILITÉ : le proposé (Graw) voit la proposition ; les membres d'un projet voient ses missions", async () => {
  assert.equal((await q("graw", `select id from public.missions where id = $1`, [mProp.id])).length, 1);
  const proj = (await db.query<any>(`insert into public.projects (name, owner_id) values ('Shooting plage', $1) returning id`, [ids.tom])).rows[0];
  const inProj = (await q("tom", `select * from public.create_mission('Dans le projet','',$1,$2,null,'normal','todo',$3)`, [ids.graw, ids.tom, proj.id]))[0];
  assert.equal((await q("qafard", `select id from public.missions where id = $1`, [inProj.id])).length, 0);
  await db.query(`insert into public.project_members (project_id, user_id) values ($1, $2)`, [proj.id, ids.qafard]);
  assert.equal((await q("qafard", `select id from public.missions where id = $1`, [inProj.id])).length, 1);
  assert.equal((await q("qafard", `select id from public.projects`)).length, 1);
  await fails("qafard", `select * from public.create_mission('Hors projet','',$1,$2,null,'normal','todo',gen_random_uuid())`, /forbidden_project|violates foreign key/, [ids.qafard, ids.tom]);
});
await t("STATUT : le responsable avance (todo → en cours → en validation) mais ne termine JAMAIS ; le validateur valide ou renvoie", async () => {
  await q("qafard", `select public.set_mission_status($1, 'in_progress')`, [mSelf.id]);
  await fails("qafard", `select public.set_mission_status($1, 'done')`, /forbidden_transition/, [mSelf.id]);
  await q("qafard", `select public.set_mission_status($1, 'review', 'Prêt')`, [mSelf.id]);
  await fails("qafard", `select public.set_mission_status($1, 'done')`, /forbidden_transition/, [mSelf.id]);
  assert.equal((await q("qafard", `select status from public.missions where id = $1`, [mSelf.id]))[0].status, "review");
  await fails("qafard", `select public.set_mission_status($1, 'review')`, /same_status/, [mSelf.id]);
  await q("tom", `select public.set_mission_status($1, 'in_progress', 'À reprendre')`, [mSelf.id]);
  await q("qafard", `select public.set_mission_status($1, 'review')`, [mSelf.id]);
  await q("tom", `select public.set_mission_status($1, 'done', 'Parfait')`, [mSelf.id]);
  const ev = await q("qafard", `select kind, from_status, to_status, note from public.mission_events where mission_id = $1 order by id`, [mSelf.id]);
  assert.deepEqual(ev.map((e) => e.kind), ["created", "status", "status", "returned", "status", "validated"]);
  assert.equal(ev.at(-1)!.note, "Parfait"); assert.equal(ev.at(-1)!.from_status, "review"); assert.equal(ev.at(-1)!.to_status, "done");
  await fails("qafard", `select public.set_mission_status($1, 'in_progress')`, /forbidden_transition/, [mSelf.id]);
});
await t("STATUT : un tiers qui n'est ni responsable, ni validateur, ni admin ne peut rien changer ; Graw (super admin) intervient partout", async () => {
  const other = await mission("tom", "Pour Graw seul", "graw", "tom");
  await fails("qafard", `select public.set_mission_status($1, 'in_progress')`, /not_found/, [other.id]);
  const mg = await mission("tom", "Pour Graw", "graw", "tom");
  await q("graw", `select public.set_mission_status($1, 'done')`, [mg.id]);
  assert.equal((await q("tom", `select status from public.missions where id = $1`, [mg.id]))[0].status, "done");
});
await t("ATTRIBUTION : un admin approuve ou refuse une proposition ; un membre ne peut pas", async () => {
  await fails("qafard", `select public.resolve_assignment($1, true)`, /forbidden/, [mProp.id]);
  const approved = (await q("tom", `select * from public.resolve_assignment($1, true, 'OK')`, [mProp.id]))[0];
  assert.equal(approved.assignee_id, ids.graw); assert.equal(approved.proposed_assignee_id, null);
  await fails("tom", `select public.resolve_assignment($1, true)`, /no_pending_assignment/, [mProp.id]);
  const p2 = await mission("qafard", "Proposition refusée", "graw", "tom");
  const rej = (await q("graw", `select * from public.resolve_assignment($1, false)`, [p2.id]))[0];
  assert.equal(rej.assignee_id, ids.qafard); assert.equal(rej.proposed_assignee_id, null);
  const ev = await q("tom", `select kind from public.mission_events where mission_id = $1 order by id`, [p2.id]);
  assert.deepEqual(ev.map((e) => e.kind), ["created", "assignment_proposed", "assignment_rejected"]);
});
await t("ATTRIBUTION : réattribution immédiate par un admin ; proposition seulement pour le créateur / responsable membre", async () => {
  const m = await mission("tom", "À réattribuer", "qafard", "graw");
  const re = (await q("tom", `select * from public.assign_mission($1, $2)`, [m.id, ids.tom]))[0];
  assert.equal(re.assignee_id, ids.tom);
  await fails("tom", `select public.assign_mission($1, $2)`, /same_assignee/, [m.id, ids.tom]);
  await fails("tom", `select public.assign_mission($1, $2)`, /validator_conflict/, [m.id, ids.graw]);
  const own = await mission("qafard", "À proposer", "qafard", "tom");
  const prop = (await q("qafard", `select * from public.assign_mission($1, $2)`, [own.id, ids.graw]))[0];
  assert.equal(prop.assignee_id, ids.qafard); assert.equal(prop.proposed_assignee_id, ids.graw);
  await fails("qafard", `select public.assign_mission($1, $2)`, /not_found/, [m.id, ids.qafard]);
});
await t("MODIFICATION : créateur ou admin ; verrou de version ; historique « edited »", async () => {
  const m = await mission("qafard", "À modifier", "qafard", "tom");
  await fails("qafard", `select * from public.update_mission($1, 99, 'T', '', $2, null, 'normal')`, /version_conflict/, [m.id, ids.tom]);
  const u = (await q("qafard", `select * from public.update_mission($1, 1, 'Nouveau titre', 'desc', $2, '2099-01-01', 'urgent')`, [m.id, ids.graw]))[0];
  assert.equal(u.title, "Nouveau titre"); assert.equal(u.version, 2); assert.equal(u.priority, "urgent"); assert.equal(u.validator_id, ids.graw);
  const same = (await q("qafard", `select * from public.update_mission($1, 2, 'Nouveau titre', 'desc', $2, '2099-01-01', 'urgent')`, [m.id, ids.graw]))[0];
  assert.equal(same.version, 2);
  const ev = await q("qafard", `select kind, note from public.mission_events where mission_id = $1 order by id`, [m.id]);
  assert.deepEqual(ev.map((e) => e.kind), ["created", "edited"]); assert.match(ev[1].note, /title/);
  const byTom = await mission("tom", "Créée par Tom", "qafard", "graw");
  await fails("qafard", `select * from public.update_mission($1, 1, 'Pirate', '', $2, null, 'normal')`, /forbidden/, [byTom.id, ids.graw]);
  await fails("tom", `select * from public.update_mission($1, 2, 'x', '', $2, null, 'normal')`, /invalid_validator/, [m.id, ids.qafard]);
  const forGraw = await mission("tom", "Pour Graw (conflit)", "graw", "tom");
  await fails("tom", `select * from public.update_mission($1, 1, 'x', '', $2, null, 'normal')`, /validator_conflict/, [forGraw.id, ids.graw]);
});
await t("COMMENTAIRES : seuls ceux qui voient la mission peuvent commenter et lire", async () => {
  const secret = (await q("tom", `select * from public.create_mission('Privée','',$1,$2,null)`, [ids.graw, ids.tom]))[0];
  await fails("qafard", `select * from public.add_mission_comment($1, 'Coucou')`, /forbidden/, [secret.id]);
  const c = (await q("graw", `select * from public.add_mission_comment($1, 'Bien reçu')`, [secret.id]))[0];
  assert.equal(c.author_id, ids.graw);
  assert.equal((await q("qafard", `select * from public.mission_comments where mission_id = $1`, [secret.id])).length, 0);
  assert.equal((await q("tom", `select * from public.mission_comments where mission_id = $1`, [secret.id])).length, 1);
  await fails("graw", `select * from public.add_mission_comment($1, '   ')`, /invalid_comment/, [secret.id]);
});
await t("ARCHIVAGE : créateur ou admin ; ensuite plus aucun changement ; l'historique reste", async () => {
  const m = await mission("qafard", "À archiver", "qafard", "tom");
  await fails("qafard", `select public.archive_mission($1)`, /forbidden|not_found/, [mTom.id]);
  const a = (await q("qafard", `select * from public.archive_mission($1)`, [m.id]))[0]; assert.ok(a.archived_at);
  await fails("qafard", `select public.set_mission_status($1, 'in_progress')`, /archived/, [m.id]);
  await fails("tom", `select public.archive_mission($1)`, /archived/, [m.id]);
  assert.equal((await q("qafard", `select kind from public.mission_events where mission_id = $1 order by id desc limit 1`, [m.id]))[0].kind, "archived");
});
await t("SUPPRESSION : réservée aux admins ; supprime l'historique et les commentaires associés", async () => {
  const m = await mission("qafard", "À supprimer", "qafard", "tom");
  await fails("qafard", `select public.delete_mission($1)`, /forbidden/, [m.id]);
  await q("tom", `select public.delete_mission($1)`, [m.id]);
  assert.equal((await db.query(`select 1 from public.mission_events where mission_id = $1`, [m.id])).rows.length, 0);
  await fails("tom", `select public.delete_mission($1)`, /not_found/, [m.id]);
});
await t("HISTORIQUE : ajout seulement (aucune modification ni suppression, même pour le super admin)", async () => {
  for (const u of ["graw", "tom", "qafard"]) { await fails(u, `update public.mission_events set note = 'x'`, /permission denied/i); await fails(u, `delete from public.mission_events`, /permission denied/i); }
});
await t("DÉSACTIVATION : un compte désactivé perd immédiatement tout accès aux missions et aux fonctions", async () => {
  await q("graw", `select public.manage_set_active($1, false)`, [ids.qafard]);
  assert.equal((await q("qafard", `select * from public.missions`)).length, 0);
  await fails("qafard", `select * from public.create_mission('x','',$1,$2,null)`, /forbidden/, [ids.qafard, ids.tom]);
  assert.equal((await q("qafard", `select * from public.list_team()`)).length, 0);
  await q("graw", `select public.manage_set_active($1, true)`, [ids.qafard]);
  assert.equal((await q("qafard", `select * from public.missions`)).length > 0, true);
});
await t("DROITS : aucune fonction exécutable par l'anonyme ; aucune table avec écriture directe pour authenticated", async () => {
  const fn = (await db.query<any>(`select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prokind = 'f' and has_function_privilege('anon', p.oid, 'execute')`)).rows;
  assert.deepEqual(fn.map((r) => r.proname), [], "fonctions exécutables par anon");
  const tbl = (await db.query<any>(`select table_name, privilege_type from information_schema.role_table_grants where grantee = 'authenticated' and table_schema = 'public' and privilege_type in ('INSERT','DELETE','TRUNCATE')`)).rows;
  assert.deepEqual(tbl, [], "écritures directes ouvertes");
  const rls = (await db.query<any>(`select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`)).rows;
  assert.deepEqual(rls, [], "tables sans RLS");
});
console.log(`${n} tests RLS / migrations : OK`);
