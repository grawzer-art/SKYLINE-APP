/* eslint-disable @typescript-eslint/no-explicit-any */
// Sprint 01 — Stratégie d'environnement de TEST : le manifeste (ordre + empreintes) correspond aux fichiers du dépôt, la chaîne s'applique de bout en bout sur un
// Postgres local vierge, supabase/preview/verify.sql renvoie « ok » partout, et aucun secret n'est présent. `--write` régénère les empreintes.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const MANIFEST = "supabase/preview/manifest.json"; const sha = (f: string) => createHash("sha256").update(readFileSync(f)).digest("hex");
const STEPS: { file: string; kind: string; sharedDbVersion: string | null; sharedDbStatus: "applied" | "not_applied" }[] = [
  { file: "supabase/migrations/20261101000100_b0_accounts_access.sql", kind: "migration", sharedDbVersion: "20261031141912", sharedDbStatus: "applied" },
  { file: "supabase/migrations/20261101000200_b0_missions.sql", kind: "migration", sharedDbVersion: "20261106111620", sharedDbStatus: "applied" },
  { file: "supabase/migrations/20261101000300_b0_rls_policies.sql", kind: "migration", sharedDbVersion: "20261106111740", sharedDbStatus: "applied" },
  { file: "supabase/preview/shared-db-drift/20261107123121_direct_staff_mission_assignment.sql", kind: "shared-db-export", sharedDbVersion: "20261107123121", sharedDbStatus: "applied" },
  { file: "supabase/proposals/B4_1_participant_profiles.sql", kind: "proposal", sharedDbVersion: "20261107161509", sharedDbStatus: "applied" },
  { file: "supabase/proposals/B4_2_member_signup.sql", kind: "proposal", sharedDbVersion: null, sharedDbStatus: "not_applied" },
  { file: "supabase/proposals/B4_3_club_profiles.sql", kind: "proposal", sharedDbVersion: null, sharedDbStatus: "not_applied" },
  { file: "supabase/proposals/B4_2b_club_traveler_gate.sql", kind: "proposal", sharedDbVersion: null, sharedDbStatus: "not_applied" },
  { file: "supabase/proposals/B4_2c_revoke_rls_auto_enable.sql", kind: "proposal", sharedDbVersion: null, sharedDbStatus: "not_applied" },
];
if (process.argv.includes("--write")) {
  writeFileSync(MANIFEST, JSON.stringify({ schema: 1, purpose: "Reconstruire un projet Supabase de TEST isolé, dans cet ordre. Ne jamais appliquer ces étapes sur le projet partagé sans autorisation.", steps: STEPS.map((s, i) => ({ order: i + 1, ...s, sha256: sha(s.file) })) }, null, 2) + "\n"); console.log("manifeste régénéré"); process.exit(0);
}
let n = 0; const t = async (name: string, fn: () => void | Promise<void>) => { await fn(); n++; console.log("PASS", name); };
const man = JSON.parse(readFileSync(MANIFEST, "utf8"));

await t("manifeste : ordre contigu, fichiers présents, empreintes SHA-256 à jour (toute modification d'un SQL exige de régénérer : npm run preview:manifest)", () => {
  assert.equal(man.steps.length, STEPS.length);
  man.steps.forEach((s: any, i: number) => { assert.equal(s.order, i + 1); assert.equal(s.file, STEPS[i].file); assert.equal(s.sha256, sha(s.file), `${s.file} : empreinte périmée`); assert.equal(s.sharedDbStatus, STEPS[i].sharedDbStatus); });
});
await t("manifeste : état du projet partagé consigné (B0 + dérive + B4.1 appliqués ; B4.2 / B4.3 / B4.2b / B4.2c NON appliqués) ; les migrations du dépôt couvrent toutes celles qui existent", () => {
  assert.deepEqual(man.steps.filter((s: any) => s.sharedDbStatus === "applied").map((s: any) => s.sharedDbVersion), ["20261031141912", "20261106111620", "20261106111740", "20261107123121", "20261107161509"]);
  assert.deepEqual(readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).map((f) => `supabase/migrations/${f}`).sort(), man.steps.filter((s: any) => s.kind === "migration").map((s: any) => s.file));
  assert.deepEqual(readdirSync("supabase/proposals").filter((f) => f.endsWith(".sql")).map((f) => `supabase/proposals/${f}`).sort(), man.steps.filter((s: any) => s.kind === "proposal").map((s: any) => s.file).sort());
});
const db = new PGlite();
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create schema storage;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, raw_user_meta_data jsonb not null default '{}'::jsonb, email_confirmed_at timestamptz, invited_at timestamptz, is_anonymous boolean not null default false);
  create function auth.uid() returns uuid language sql stable as $$ select nullif((nullif(current_setting('request.jwt.claims', true), '')::jsonb) ->> 'sub', '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid);
  alter table storage.objects enable row level security;
  grant usage on schema public, auth, storage to anon, authenticated, service_role; grant all on storage.objects, storage.buckets to authenticated; grant execute on function auth.uid() to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role; alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  create function public.rls_auto_enable() returns void language plpgsql security definer set search_path = pg_catalog as $$ begin null; end $$; grant execute on function public.rls_auto_enable() to anon, authenticated;
`);
await t("chaîne complète : s'applique sans erreur, dans l'ordre du manifeste, sur un Postgres vierge", async () => { for (const s of man.steps) await db.exec(readFileSync(s.file, "utf8")); });
await t("verify.sql (lecture seule) : toutes les vérifications renvoient ok = true", async () => {
  const r = (await db.query<any>(readFileSync("supabase/preview/verify.sql", "utf8").replace(/^--.*$/gm, "").trim().replace(/;$/, ""))).rows;
  assert.ok(r.length >= 9); for (const x of r) assert.equal(x.ok, true, x.check_name);
});
await t("dérive reproduite : l'attribution DIRECTE de missions STAFF (migration du projet partagé, absente du dépôt) fonctionne dans la chaîne de test", async () => {
  const mk = async (slug: string, o: { spaces: string[]; staff?: string[] }) => { const id = (await db.query<any>(`insert into auth.users (email) values ($1) returning id`, [`${slug}@example.test`])).rows[0].id; await db.query(`update public.accounts set active = true where id = $1`, [id]); for (const s of o.spaces) await db.query(`insert into public.space_access (user_id, space) values ($1, $2)`, [id, s]); for (const r of o.staff ?? []) await db.query(`insert into public.staff_roles (user_id, role) values ($1, $2)`, [id, r]); await db.query(`insert into public.staff_profiles (user_id, slug, function_title) values ($1, $2, 'F')`, [id, slug]); return id; };
  const tom = await mk("tom", { spaces: ["staff"], staff: ["admin"] }); const qa = await mk("qafard", { spaces: ["staff"], staff: ["member"] }); const root = await mk("root", { spaces: ["staff"], staff: ["admin"] });
  await db.exec(`set role authenticated; select set_config('request.jwt.claims', '{"sub":"${qa}","role":"authenticated"}', false)`);
  const r = (await db.query<any>(`select assignee_id, proposed_assignee_id from public.create_mission('M','', $1, $2, null, 'normal', 'todo', null)`, [tom, root])).rows[0];
  await db.exec(`reset role`); assert.deepEqual([r.assignee_id, r.proposed_assignee_id], [tom, null]);
});
await t("aucun secret dans le manifeste, les fichiers de test d'environnement ni la documentation associée", () => {
  const files = ["supabase/preview/manifest.json", "supabase/preview/verify.sql", "docs/skyline-staff-v2/SUPABASE-TEST-ENV.md"].filter((f) => { try { statSync(f); return true; } catch { return false; } });
  for (const f of files) assert.doesNotMatch(readFileSync(f, "utf8"), /eyJ[A-Za-z0-9_-]{20,}|sb_secret_[A-Za-z0-9]|postgres(ql)?:\/\/[^\s]*:[^\s@]+@|sk_live|BEGIN (RSA |EC )?PRIVATE/, f);
});
await db.close();
console.log(`${n} tests ENVIRONNEMENT DE TEST : OK`);
