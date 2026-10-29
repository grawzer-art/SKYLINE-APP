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
const reset = async () => { await db.exec(`truncate auth.users cascade; delete from public.user_roles; delete from public.profiles`); };
const users = async (list: Partial<Record<"graw" | "tom" | "qafard", Record<string, unknown>>> = { graw: {}, tom: {}, qafard: {} }) => {
  for (const [k, extra] of Object.entries(list)) await db.query(`insert into auth.users (email, email_confirmed_at, encrypted_password, banned_until, deleted_at) values ($1, $2, $3, $4, $5)`,
    [(E as any)[k], (extra as any).unconfirmed ? null : new Date().toISOString(), (extra as any).password ?? "", (extra as any).banned ?? null, (extra as any).deleted ?? null]);
};
const state = async () => ({
  roles: (await db.query<any>(`select p.slug, ur.role from public.user_roles ur join public.profiles p on p.id = ur.user_id order by p.slug`)).rows,
  active: (await db.query<any>(`select slug from public.profiles where active order by slug`)).rows.map((r) => r.slug),
});
const rejects = async (re: RegExp, fn: () => Promise<unknown>) => { let msg = ""; try { await fn(); } catch (e) { msg = (e as Error).message; } assert.match(msg, re); };
const untouched = async () => { const s = await state(); assert.deepEqual(s.roles, []); assert.deepEqual(s.active, []); };

await t("succès : les trois comptes reçoivent graw=super_admin, tom=admin, qafard=member (profil activé, fonction renseignée)", async () => {
  await reset(); await users(); await run();
  const s = await state(); assert.deepEqual(s.roles, [{ slug: "graw", role: "super_admin" }, { slug: "qafard", role: "member" }, { slug: "tom", role: "admin" }]); assert.deepEqual(s.active, ["graw", "qafard", "tom"]);
  assert.equal((await db.query<any>(`select function_title from public.profiles where slug = 'qafard'`)).rows[0].function_title, "Photographe");
});
await t("relance sans effet (idempotent) quand l'état est déjà correct", async () => { await run(); const s = await state(); assert.equal(s.roles.length, 3); });
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
await t("conflit : un compte a déjà un autre rôle (ex. Qafard admin) → refus sans rien modifier", async () => {
  await reset(); await users(); const q = (await db.query<any>(`select id from auth.users where email = $1`, [E.qafard])).rows[0].id;
  await db.query(`update public.profiles set active = false where id = $1`, [q]); await db.query(`insert into public.user_roles (user_id, role) values ($1, 'admin')`, [q]);
  await rejects(/rôle différent/, () => run()); assert.deepEqual((await state()).roles, [{ slug: (await db.query<any>(`select slug from public.profiles where id = $1`, [q])).rows[0].slug, role: "admin" }]);
});
await t("un autre compte actif avec un rôle, ou un autre super_admin : refus", async () => {
  await reset(); await users(); const o = (await db.query<any>(`insert into auth.users (email) values ('intrus@skyline.test') returning id`)).rows[0].id;
  await db.query(`update public.profiles set active = true where id = $1`, [o]); await db.query(`insert into public.user_roles (user_id, role) values ($1, 'member')`, [o]);
  await rejects(/autre compte actif/, () => run()); await db.query(`delete from public.user_roles`); await db.query(`update public.profiles set active = false`);
  await db.query(`insert into public.user_roles (user_id, role) values ($1, 'super_admin')`, [o]); await rejects(/autre super_admin/, () => run());
  assert.deepEqual((await state()).active, []);
});
await t("slug déjà pris par un autre compte : refus", async () => {
  await reset(); await users(); const o = (await db.query<any>(`insert into auth.users (email) values ('graw-bis@skyline.test') returning id`)).rows[0].id;
  await db.query(`update public.profiles set slug = 'graw-ancien' where slug = 'graw'`); await db.query(`update public.profiles set slug = 'graw' where id = $1`, [o]); await rejects(/slug « graw » appartient/, () => run()); await untouched();
});
await t("profil manquant (comptes créés avant la migration) : créé par le script, résultat correct", async () => {
  await reset(); await users(); await db.query(`delete from public.profiles`); await run();
  const s = await state(); assert.equal(s.roles.length, 3); assert.deepEqual(s.active, ["graw", "qafard", "tom"]);
});
await t("aucun COMMIT / ROLLBACK manuel dans le script (un seul bloc DO atomique)", async () => {
  const code = SCRIPT.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
  assert.equal(/\b(begin|commit|rollback)\s*;/i.test(code), false); assert.equal((code.match(/\bdo \$bootstrap\$/gi) ?? []).length, 1);
  assert.equal(/\b(drop|truncate|delete\s+from)\b/i.test(code), false, "aucune instruction destructive");
});
console.log(`${n} tests BOOTSTRAP : OK`);
