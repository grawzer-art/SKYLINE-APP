/* eslint-disable @typescript-eslint/no-explicit-any */
// Tests du script d'attribution initiale des rôles (supabase/bootstrap/B0_roles_template.sql) : atomicité, vérifications préalables,
// absence de doublons, annulation automatique. PGlite (Postgres WebAssembly), aucun accès réseau.
// `node --experimental-strip-types --no-warnings tests/bootstrap.test.mts`
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

let n = 0; const t = async (name: string, fn: () => Promise<void>) => { await fn(); n++; console.log("PASS", name); };
const db = new PGlite();
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, email_confirmed_at timestamptz default now(),
    encrypted_password text default '', banned_until timestamptz, deleted_at timestamptz, is_anonymous boolean default false,
    raw_user_meta_data jsonb not null default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as $$ select nullif((nullif(current_setting('request.jwt.claims', true), '')::jsonb) ->> 'sub', '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`);
for (const f of readdirSync("supabase/migrations").filter((x) => x.endsWith(".sql")).sort()) await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
const SCRIPT = readFileSync("supabase/bootstrap/B0_roles_template.sql", "utf8");
const E = { graw: "graw@skyline.test", tom: "tom@skyline.test", qafard: "qafard@skyline.test" };
const run = async (emails: { graw: string; tom: string; qafard: string } = E, tweak: (s: string) => string = (s) => s) => {
  const sql = tweak(SCRIPT.replace("REMPLACER-PAR-L-EMAIL-DE-GRAW", emails.graw).replace("REMPLACER-PAR-L-EMAIL-DE-TOM", emails.tom).replace("REMPLACER-PAR-L-EMAIL-DE-QAFARD", emails.qafard));
  return db.exec(sql);
};
const reset = async () => { await db.exec(`truncate auth.users cascade`); };
const users = async (list: Partial<Record<"graw" | "tom" | "qafard", Record<string, unknown>>> = { graw: {}, tom: {}, qafard: {} }) => {
  for (const [k, extra] of Object.entries(list)) await db.query(`insert into auth.users (email, email_confirmed_at, encrypted_password, banned_until, deleted_at) values ($1, $2, $3, $4, $5)`,
    [(E as any)[k], (extra as any).unconfirmed ? null : new Date().toISOString(), (extra as any).password ?? "", (extra as any).banned ?? null, (extra as any).deleted ?? null]);
};
const uid = async (email: string) => (await db.query<any>(`select id from auth.users where email = $1`, [email])).rows[0].id as string;
const state = async () => ({
  platform: (await db.query<any>(`select a.display_name as who, pr.role from public.platform_roles pr join public.accounts a on a.id = pr.user_id order by 1`)).rows,
  staff: (await db.query<any>(`select sp.slug as who, sr.role from public.staff_roles sr join public.staff_profiles sp on sp.user_id = sr.user_id order by 1`)).rows,
  active: (await db.query<any>(`select display_name from public.accounts where active order by 1`)).rows.map((r) => r.display_name),
  spaces: (await db.query<any>(`select count(*)::int as n from public.space_access`)).rows[0].n,
  profiles: (await db.query<any>(`select count(*)::int as n from public.staff_profiles`)).rows[0].n,
});
const rejects = async (re: RegExp, fn: () => Promise<unknown>) => { let msg = ""; try { await fn(); } catch (e) { msg = (e as Error).message; } assert.match(msg, re); };
const untouched = async () => { const s = await state(); assert.deepEqual(s.platform, []); assert.deepEqual(s.staff, []); assert.deepEqual(s.active, []); assert.equal(s.spaces, 0); assert.equal(s.profiles, 0); };

await t("succès : GRAW super admin GLOBAL + accès STAFF, TOM admin STAFF, QAFARD member STAFF (comptes activés, fonctions renseignées)", async () => {
  await reset(); await users(); await run();
  const s = await state(); assert.deepEqual(s.platform, [{ who: "Graw", role: "super_admin" }]); assert.deepEqual(s.staff, [{ who: "qafard", role: "member" }, { who: "tom", role: "admin" }]);
  assert.deepEqual(s.active, ["Graw", "Qafard", "Tom"]); assert.equal(s.spaces, 3);
  assert.equal((await db.query<any>(`select function_title from public.staff_profiles where slug = 'qafard'`)).rows[0].function_title, "Photographe");
  assert.equal((await db.query<any>(`select count(*)::int as n from public.space_access where space = 'members'`)).rows[0].n, 0, "aucun accès MEMBERS attribué en B0");
});
await t("relance sans effet (idempotent) quand l'état est déjà correct", async () => { await run(); const s = await state(); assert.equal(s.staff.length, 2); assert.equal(s.platform.length, 1); assert.equal(s.spaces, 3); });
await t("adresses non remplacées : refus, rien n'est modifié", async () => { await reset(); await users(); await rejects(/n'a pas été remplacée/, () => db.exec(SCRIPT)); await untouched(); });
await t("compte introuvable : tout est ANNULÉ automatiquement (aucun des deux autres comptes n'est activé)", async () => {
  await reset(); await users({ graw: {}, tom: {} }); await rejects(/introuvable pour qafard/, () => run()); await untouched();
});
await t("doublon d'adresse dans le script (même casse ou non) : refus", async () => {
  await reset(); await users(); await rejects(/distinctes/, () => run({ graw: E.graw, tom: E.graw.toUpperCase(), qafard: E.qafard })); await untouched();
});
await t("deux comptes pour la même adresse : refus", async () => {
  await reset(); await users(); await db.query(`insert into auth.users (email) values ($1)`, [E.tom.toUpperCase()]); await rejects(/plusieurs comptes pour tom/, () => run()); await untouched();
});
await t("adresse invalide : refus", async () => { await reset(); await users(); await rejects(/adresse invalide/, () => run({ graw: "pas-un-email", tom: E.tom, qafard: E.qafard })); await untouched(); });
await t("compte non confirmé, supprimé ou suspendu : refus", async () => {
  for (const [bad, re] of [[{ unconfirmed: true }, /pas confirmée/], [{ deleted: new Date().toISOString() }, /supprimé/], [{ banned: new Date(Date.now() + 86_400_000).toISOString() }, /suspendu/]] as const) {
    await reset(); await users({ graw: {}, tom: bad as any, qafard: {} }); await rejects(re, () => run()); await untouched();
  }
});
await t("compte possédant un mot de passe : refus (connexion par code e-mail uniquement)", async () => {
  await reset(); await users({ graw: {}, tom: {}, qafard: { password: "$2a$10$abcdefghijklmnopqrstuv" } }); await rejects(/possède un mot de passe/, () => run()); await untouched();
});
await t("conflit : une permission STAFF différente (Qafard déjà admin) ou un rôle global déjà attribué à un autre titre → refus sans rien modifier", async () => {
  await reset(); await users(); const q = await uid(E.qafard);
  await db.query(`insert into public.space_access (user_id, space) values ($1, 'staff')`, [q]); await db.query(`insert into public.staff_roles (user_id, role) values ($1, 'admin')`, [q]);
  await rejects(/permission STAFF différente/, () => run()); assert.deepEqual((await state()).active, []);
  await db.query(`delete from public.space_access where user_id = $1`, [q]);
});
await t("un autre compte actif ayant l'accès STAFF, ou un autre super_admin : refus", async () => {
  await reset(); await users(); const o = (await db.query<any>(`insert into auth.users (email) values ('intrus@skyline.test') returning id`)).rows[0].id;
  await db.query(`update public.accounts set active = true where id = $1`, [o]); await db.query(`insert into public.space_access (user_id, space) values ($1, 'staff')`, [o]);
  await rejects(/autre compte actif/, () => run()); await db.query(`delete from public.space_access`);
  await db.query(`insert into public.platform_roles (user_id, role) values ($1, 'super_admin')`, [o]); await rejects(/autre super_admin/, () => run());
  assert.deepEqual((await state()).staff, []);
});
await t("un participant actif (accès MEMBERS) ne bloque pas le script et ne reçoit AUCUN droit STAFF", async () => {
  await reset(); await users(); const o = (await db.query<any>(`insert into auth.users (email) values ('participant@skyline.test') returning id`)).rows[0].id;
  await db.query(`update public.accounts set active = true where id = $1`, [o]); await db.query(`insert into public.space_access (user_id, space) values ($1, 'members')`, [o]);
  await run();
  assert.equal((await db.query<any>(`select count(*)::int as n from public.space_access where user_id = $1 and space = 'staff'`, [o])).rows[0].n, 0);
  assert.equal((await db.query<any>(`select count(*)::int as n from public.staff_roles where user_id = $1`, [o])).rows[0].n, 0);
  assert.equal((await db.query<any>(`select count(*)::int as n from public.staff_profiles where user_id = $1`, [o])).rows[0].n, 0);
});
await t("slug déjà pris par une autre fiche STAFF : refus", async () => {
  await reset(); await users(); const o = (await db.query<any>(`insert into auth.users (email) values ('graw-bis@skyline.test') returning id`)).rows[0].id;
  await db.query(`insert into public.staff_profiles (user_id, slug) values ($1, 'graw')`, [o]); await rejects(/slug « graw » appartient/, () => run()); assert.deepEqual((await state()).active, []);
});
await t("compte global manquant (comptes créés avant la migration) : recréé par le script, résultat correct", async () => {
  await reset(); await users(); await db.query(`delete from public.accounts`); await run();
  const s = await state(); assert.equal(s.staff.length, 2); assert.equal(s.platform.length, 1); assert.deepEqual(s.active, ["Graw", "Qafard", "Tom"]);
});
await t("aucun COMMIT / ROLLBACK manuel dans le script (un seul bloc DO atomique), aucune instruction destructive", async () => {
  const code = SCRIPT.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
  assert.equal(/\b(begin|commit|rollback)\s*;/i.test(code), false); assert.equal((code.match(/\bdo \$bootstrap\$/gi) ?? []).length, 1);
  assert.equal(/\b(drop|truncate|delete\s+from)\b/i.test(code), false, "aucune instruction destructive");
});
console.log(`${n} tests BOOTSTRAP : OK`);
