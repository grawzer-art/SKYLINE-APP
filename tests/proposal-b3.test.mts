/* eslint-disable @typescript-eslint/no-explicit-any */
// B3 — VALIDATION de la migration PROPOSÉE (supabase/proposals/B3_1_agenda_notifications.sql) sur un Postgres local : B0 + proposition.
// Elle n'est PAS appliquée à la base réelle. Vérifie : heure des missions (compatibilité), événements, séparation STAFF / participants,
// annonces (administrateurs + confirmation), préférences, appareils Web Push (secrets illisibles), privilèges.
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
await provision("participant", { spaces: ["members"] });
await provision("participant2", { spaces: ["members"] });
await provision("ghost", { spaces: ["members"], active: false });
await provision("norole", {});

let chain: Promise<unknown> = Promise.resolve();
const serial = <T,>(fn: () => Promise<T>): Promise<T> => { const r = chain.then(fn, fn); chain = r.catch(() => undefined); return r; };
const as = async <T,>(who: string, fn: () => Promise<T>): Promise<T> => serial(async () => {
  if (who === "anon") await db.exec(`set role anon; select set_config('request.jwt.claims', '', false)`);
  else await db.exec(`set role authenticated; select set_config('request.jwt.claims', '{"sub":"${ids[who]}","role":"authenticated"}', false)`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claims', '', false)`); }
});
const q = (who: string, sql: string, p: unknown[] = []) => as(who, async () => (await db.query<any>(sql, p)).rows);
const fails = async (who: string, sql: string, re: RegExp, p: unknown[] = []) => { let msg = ""; try { await q(who, sql, p); } catch (e) { msg = String((e as Error).message); } assert.match(msg, re, `attendu ${re} pour : ${sql.slice(0, 80)}`); };
const titles = async (who: string) => (await q(who, `select title from public.notifications order by title`)).map((r) => r.title);

await t("migration : B0 + proposition s'appliquent sans erreur ; l'ancien appel de create_mission (sans p_time) reste valide", async () => {
  const m = (await q("tom", `select * from public.create_mission('Repérage', '', $1, $2, '2026-11-12', 'normal', 'todo', null)`, [ids.qafard, ids.graw]))[0];
  assert.equal(m.due_time, null); assert.equal(m.due_date.toISOString().slice(0, 10), "2026-11-12");
});
await t("heure facultative : enregistrée avec la date, refusée sans date, effacée si la date disparaît, historisée", async () => {
  const m = (await q("tom", `select * from public.create_mission(p_title => 'Avec heure', p_description => '', p_assignee => $1, p_validator => $2, p_due => '2026-11-12', p_time => '09:30')`, [ids.qafard, ids.graw]))[0];
  assert.equal(String(m.due_time), "09:30:00");
  await fails("tom", `select * from public.create_mission(p_title => 'x', p_description => '', p_assignee => $1, p_validator => $2, p_due => null, p_time => '09:30')`, /invalid_time/, [ids.qafard, ids.graw]);
  const u = (await q("tom", `select * from public.update_mission($1, 1, 'Avec heure', '', $2, '2026-11-12', 'normal', null, '14:00')`, [m.id, ids.graw]))[0]; assert.equal(String(u.due_time), "14:00:00"); assert.equal(u.version, 2);
  const ev = (await q("tom", `select note from public.mission_events where mission_id = $1 order by id desc limit 1`, [m.id]))[0]; assert.equal(ev.note, "dueTime");
  await fails("tom", `select * from public.update_mission($1, 2, 'Avec heure', '', $2, null, 'normal', null, '14:00')`, /invalid_time/, [m.id, ids.graw]);   // une heure sans date est refusée
  const c = (await q("tom", `select * from public.update_mission($1, 2, 'Avec heure', '', $2, null, 'normal', null, null)`, [m.id, ids.graw]))[0]; assert.equal(c.due_time, null); assert.equal(c.due_date, null);
  await fails("qafard", `select * from public.update_mission($1, 3, 'x', '', $2, null, 'normal')`, /forbidden|not_found/, [m.id, ids.graw]);
});
await t("événements : un membre crée un événement PERSONNEL ; l'événement d'ÉQUIPE est réservé aux administrateurs", async () => {
  await q("qafard", `select * from public.create_agenda_event('Rdv perso', 'meeting', '2026-11-12', '10:00', '11:00', 'Bureau', 'me')`);
  await fails("qafard", `select * from public.create_agenda_event('Réunion', 'meeting', '2026-11-12', '10:00', null, '', 'team')`, /forbidden/);
  await q("tom", `select * from public.create_agenda_event('Point équipe', 'meeting', '2026-11-12', '09:00', '09:30', 'Salle', 'team')`);
  await fails("tom", `select * from public.create_agenda_event('x', 'meeting', '2026-11-12', '10:00', '09:00', '', 'team')`, /invalid_time|check/);
  await fails("tom", `select * from public.create_agenda_event('x', 'meeting', '2026-11-12', null, '09:00', '', 'team')`, /invalid_time/);
  await fails("tom", `select * from public.create_agenda_event('  ', 'meeting', '2026-11-12', null, null, '', 'team')`, /invalid_title/);
});
await t("événements : l'événement personnel n'est visible que de son créateur ; les participants ne voient AUCUN événement STAFF", async () => {
  assert.deepEqual((await q("qafard", `select title from public.agenda_events order by title`)).map((r) => r.title), ["Point équipe", "Rdv perso"]);
  assert.deepEqual((await q("tom", `select title from public.agenda_events order by title`)).map((r) => r.title), ["Point équipe"]);   // Tom ne voit pas le perso de Qafard (même admin)
  for (const w of ["participant", "norole", "ghost"]) assert.deepEqual(await q(w, `select * from public.agenda_events`), [], w);
  assert.deepEqual(await q("anon", `select 1`).catch(() => "x"), [{ "?column?": 1 }]);
  await fails("anon", `select * from public.agenda_events`, /permission denied/);
});
await t("événements : modification par le créateur seulement ; suppression par le créateur ou un administrateur (équipe)", async () => {
  const team = (await q("tom", `select id from public.agenda_events where title = 'Point équipe'`))[0].id; const perso = (await q("qafard", `select id from public.agenda_events where title = 'Rdv perso'`))[0].id;
  await fails("qafard", `select * from public.update_agenda_event($1, 'Piraté', 'meeting', '2026-11-12', null, null, '')`, /forbidden/, [team]);
  await fails("tom", `select * from public.update_agenda_event($1, 'Piraté', 'meeting', '2026-11-12', null, null, '')`, /not_found/, [perso]);   // l'événement personnel d'autrui est invisible
  assert.equal((await q("tom", `select * from public.update_agenda_event($1, 'Point équipe v2', 'meeting', '2026-11-12', '09:00', null, 'Salle')`, [team]))[0].title, "Point équipe v2");
  await fails("qafard", `select public.delete_agenda_event($1)`, /forbidden/, [team]);
  await fails("tom", `select public.delete_agenda_event($1)`, /not_found/, [perso]);
  await q("graw", `select public.delete_agenda_event($1)`, [team]);                                                              // un autre administrateur supprime l'événement d'équipe
  await q("qafard", `select public.delete_agenda_event($1)`, [perso]);
});
await t("SÉPARATION : annonce STAFF visible des seuls membres STAFF ; annonce participants visible des seuls participants (+ boîte d'envoi des administrateurs)", async () => {
  await q("tom", `select * from public.send_announcement('staff', 'Briefing STAFF', 'Rendez-vous à 9h.', false, true)`);
  await q("tom", `select * from public.send_announcement('participants', 'Info participants', 'Point de rendez-vous communiqué.', true, true)`);
  assert.deepEqual(await titles("qafard"), ["Briefing STAFF"]);                       // un membre STAFF ne lit PAS les annonces participants
  assert.deepEqual(await titles("participant"), ["Info participants"]);               // un participant ne lit JAMAIS une annonce STAFF
  assert.deepEqual(await titles("participant2"), ["Info participants"]);
  assert.deepEqual(await titles("tom"), ["Briefing STAFF", "Info participants"]);     // administrateur : sa boîte + la boîte d'envoi participants
  assert.deepEqual(await titles("graw"), ["Briefing STAFF", "Info participants"]);    // cumule STAFF + MEMBERS
  for (const w of ["norole", "ghost"]) assert.deepEqual(await titles(w), [], w);
  await fails("anon", `select * from public.notifications`, /permission denied/);
  const cats = (await q("tom", `select audience, category from public.notifications order by audience`)); assert.deepEqual(cats.map((c) => c.category), ["announcements", "official"]);
});
await t("notifications nominatives : visibles du seul destinataire, et seulement dans son audience", async () => {
  await db.query(`insert into public.notifications (audience, recipient_id, category, title, body) values ('staff', $1, 'missions', 'Pour Qafard', 'Mission attribuée.')`, [ids.qafard]);
  await db.query(`insert into public.notifications (audience, recipient_id, category, title, body) values ('participants', $1, 'flight', 'Pour Participant', 'Info de vol.')`, [ids.participant]);
  assert.ok((await titles("qafard")).includes("Pour Qafard") && !(await titles("tom")).includes("Pour Qafard") && !(await titles("participant")).includes("Pour Qafard"));
  assert.ok((await titles("participant")).includes("Pour Participant") && !(await titles("participant2")).includes("Pour Participant") && !(await titles("qafard")).includes("Pour Participant"));
  // nominatif STAFF adressé à un compte qui n'a PAS l'accès STAFF : jamais lisible
  await db.query(`insert into public.notifications (audience, recipient_id, category, title, body) values ('staff', $1, 'missions', 'STAFF vers participant', 'x')`, [ids.participant]);
  assert.ok(!(await titles("participant")).includes("STAFF vers participant"));
});
await t("contrainte : une catégorie STAFF dans l'audience participants (et inversement) est impossible", async () => {
  for (const [a, c] of [["participants", "missions"], ["staff", "flight"], ["staff", "official"], ["participants", "announcements"]]) {
    let msg = ""; try { await db.query(`insert into public.notifications (audience, category, title, body) values ($1, $2, 't', 'b')`, [a, c]); } catch (e) { msg = String((e as Error).message); } assert.match(msg, /notifications_category_matches_audience|check/, `${a}/${c}`);
  }
});
await t("ANNONCES : réservées aux administrateurs, confirmation explicite obligatoire, textes validés", async () => {
  for (const w of ["qafard", "participant", "norole", "ghost"]) await fails(w, `select * from public.send_announcement('participants', 'Piratage', 'Message', false, true)`, /forbidden|permission/, []);
  await fails("anon", `select * from public.send_announcement('participants', 'x', 'y', false, true)`, /permission denied/);
  await fails("tom", `select * from public.send_announcement('participants', 'Sans confirmation', 'Message', false, false)`, /confirmation_required/);
  await fails("tom", `select * from public.send_announcement('participants', 'Sans confirmation', 'Message', false, null)`, /confirmation_required/);
  await fails("tom", `select * from public.send_announcement('staff', '', 'Message', false, true)`, /invalid_title/);
  await fails("tom", `select * from public.send_announcement('staff', 'Titre', $1, false, true)`, /invalid_body/, ["x".repeat(281)]);
  assert.equal((await q("graw", `select * from public.send_announcement('staff', 'Par le super admin', 'Message', false, true)`))[0].created_by, ids.graw);
});
await t("lecture : on ne marque comme lues que des notifications VISIBLES ; l'état de lecture d'autrui est invisible", async () => {
  const stf = (await q("qafard", `select id from public.notifications where title = 'Briefing STAFF'`))[0].id; const part = (await q("participant", `select id from public.notifications where title = 'Info participants'`))[0].id;
  assert.equal((await q("qafard", `select public.mark_notifications_read($1::uuid[]) as c`, [`{${stf},${part}}`]))[0].c, 1);       // l'annonce participants est ignorée pour un membre STAFF
  assert.equal((await q("participant", `select public.mark_notifications_read($1::uuid[]) as c`, [`{${stf},${part}}`]))[0].c, 1);  // l'annonce STAFF est ignorée pour un participant
  assert.deepEqual((await q("qafard", `select notification_id from public.notification_reads`)).map((r) => r.notification_id), [stf]);
  assert.deepEqual((await q("participant", `select notification_id from public.notification_reads`)).map((r) => r.notification_id), [part]);
  await fails("anon", `select public.mark_notifications_read('{}'::uuid[])`, /permission denied/);
  await fails("ghost", `select public.mark_notifications_read('{}'::uuid[])`, /forbidden/);
});
await t("préférences : chacun lit / écrit les SIENNES, valeurs validées", async () => {
  await q("qafard", `select * from public.set_notification_preferences('{"comments": false, "reminders": true}'::jsonb, 'two_days', false)`);
  await q("participant", `select * from public.set_notification_preferences('{"flight": false}'::jsonb, 'day_before', false)`);
  assert.deepEqual((await q("qafard", `select reminder_lead from public.notification_preferences`)).map((r) => r.reminder_lead), ["two_days"]);
  assert.equal((await q("participant", `select * from public.notification_preferences`)).length, 1);
  await fails("qafard", `select * from public.set_notification_preferences('{"comments": "oui"}'::jsonb, 'day_before', false)`, /invalid_preferences/);
  await fails("qafard", `select * from public.set_notification_preferences('{}'::jsonb, 'never', false)`, /invalid_preferences/);
  await fails("qafard", `insert into public.notification_preferences (user_id) values (gen_random_uuid())`, /permission denied/);
  await fails("qafard", `update public.notification_preferences set push = true`, /permission denied/);
});
await t("APPAREILS WEB PUSH : enregistrement par STAFF ou participant ; secrets (endpoint, clés) ILLISIBLES ; révocation de ses seuls appareils", async () => {
  const dev = (await q("qafard", `select public.register_push_subscription('https://web.push.apple.com/abc', 'p256-key', 'auth-secret', 'iPhone de Qafard') as id`))[0].id;
  await q("participant", `select public.register_push_subscription('https://web.push.apple.com/xyz', 'k', 'a', 'iPhone participant')`);
  assert.deepEqual((await q("qafard", `select device_label from public.push_subscriptions`)).map((r) => r.device_label), ["iPhone de Qafard"]);   // jamais l'appareil d'un autre
  for (const col of ["endpoint", "p256dh", "auth"]) await fails("qafard", `select ${col} from public.push_subscriptions`, /permission denied/);
  await fails("qafard", `select * from public.push_subscriptions`, /permission denied/);
  await fails("qafard", `insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values ($1, 'https://x', 'a', 'b')`, /permission denied/, [ids.qafard]);
  await fails("participant", `select public.revoke_push_subscription($1)`, /not_found/, [dev]);                                                      // pas l'appareil d'autrui
  await q("qafard", `select public.revoke_push_subscription($1)`, [dev]);
  assert.notEqual((await q("qafard", `select revoked_at from public.push_subscriptions`))[0].revoked_at, null);
  await fails("norole", `select public.register_push_subscription('https://x/y', 'a', 'b', 'c')`, /forbidden/);
  await fails("ghost", `select public.register_push_subscription('https://x/y', 'a', 'b', 'c')`, /forbidden/);
  await fails("anon", `select public.register_push_subscription('https://x/y', 'a', 'b', 'c')`, /permission denied/);
  await fails("qafard", `select public.register_push_subscription('http://insecure/y', 'a', 'b', 'c')`, /check|violates/);                          // https obligatoire
});
await t("PRIVILÈGES : anon = aucun droit ; authenticated = SELECT seul sur les nouvelles tables ; aucune écriture directe ; RLS partout", async () => {
  const tables = ["agenda_events", "notifications", "notification_reads", "notification_preferences", "push_subscriptions"];
  for (const tb of tables) for (const [role, expect] of [["anon", []], ["authenticated", tb === "push_subscriptions" ? [] : ["SELECT"]]] as const) {
    const got: string[] = []; for (const p of ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"]) if ((await db.query<any>(`select has_table_privilege($1, $2, $3) ok`, [role, `public.${tb}`, p])).rows[0].ok) got.push(p);
    assert.deepEqual(got, expect, `${role}.${tb}`);
  }
  assert.equal((await db.query<any>(`select count(*)::int c from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`)).rows[0].c, 0);
  const fn = async (role: string) => (await db.query<any>(`select p.proname from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind = 'f' and has_function_privilege($1, p.oid, 'execute') order by 1`, [role])).rows.map((r) => r.proname);
  assert.deepEqual(await fn("anon"), []);
  const auth = await fn("authenticated"); for (const f of ["create_agenda_event", "update_agenda_event", "delete_agenda_event", "mark_notifications_read", "set_notification_preferences", "register_push_subscription", "revoke_push_subscription", "send_announcement", "can_view_notification"]) assert.ok(auth.includes(f), f);
  assert.ok(!auth.includes("is_staff_user") && !auth.includes("is_validator_user") && !auth.includes("handle_new_user"));
  assert.equal(auth.filter((x) => x === "create_mission" || x === "update_mission").length, 2, "une seule version de chaque fonction (pas de surcharge ambiguë)");
});
console.log(`${n} tests PROPOSITION B3 (Postgres local) : OK`);
