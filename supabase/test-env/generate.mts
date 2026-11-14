// Génère supabase/test-env/precheck_before_b44.sql et postcheck_after_b44.sql à partir des fichiers SQL du dépôt (empreintes calculées sur un Postgres local).
// Usage : node --experimental-strip-types --no-warnings supabase/test-env/generate.mts [--write]   (sans --write : affiche les fichiers attendus, utilisé par le test)
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const P = (f: string) => readFileSync(`supabase/proposals/${f}`, "utf8");
export async function build(): Promise<{ pre: string; post: string }> {
  const db = new PGlite();
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; create schema auth; create schema storage;
   create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, raw_user_meta_data jsonb not null default '{}'::jsonb, email_confirmed_at timestamptz, invited_at timestamptz, is_anonymous boolean not null default false);
   create function auth.uid() returns uuid language sql stable as $$ select nullif((nullif(current_setting('request.jwt.claims', true), '')::jsonb) ->> 'sub', '')::uuid $$;
   create table storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
   create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid); alter table storage.objects enable row level security;
   grant usage on schema public, auth, storage to anon, authenticated, service_role; grant all on storage.objects, storage.buckets to authenticated; grant execute on function auth.uid() to anon, authenticated, service_role;
   alter default privileges in schema public grant truncate, references, trigger on tables to anon, authenticated, service_role; alter default privileges in schema public revoke execute on functions from public;`);
  for (const f of readdirSync("supabase/migrations").filter((x) => x.endsWith(".sql")).sort()) await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
  await db.exec(readFileSync("supabase/preview/shared-db-drift/20261107123121_direct_staff_mission_assignment.sql", "utf8"));
  for (const f of ["B4_1_participant_profiles.sql", "B4_2_member_signup.sql", "B4_3_club_profiles.sql", "B4_2b_club_traveler_gate.sql", "B4_2c_revoke_rls_auto_enable.sql"]) await db.exec(P(f));
  const fp = async () => (await db.query<{ f: string; src: string }>(`select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' f, md5(p.prosrc) src from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind = 'f' order by 1`)).rows;
  const before = await fp(); await db.exec(P("B4_4_club_consent.sql")); const after = await fp(); await db.close();
  const values = (rows: { f: string; src: string }[]) => rows.map((r) => `    ('${r.f.replace(/'/g, "''")}', '${r.src}')`).join(",\n");
  const common = (tag: string, rows: { f: string; src: string }[], extra: string) => `-- SKYLINE-TEST — ${tag}. LECTURE SEULE. Généré par supabase/test-env/generate.mts (ne pas modifier à la main : le test du dépôt vérifie qu'il est à jour).
-- Chaque ligne : contrôle, valeur attendue, valeur réelle, ok. La dernière ligne « GLOBAL » doit être ok = true ; sinon : ARRÊT, ne rien exécuter.
with fp(f, src) as (values
${values(rows)}
), actual as (
  select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' f, md5(p.prosrc) src from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'
), checks(c, e, a) as (
  select 'fonctions publiques identiques au dépôt (empreinte du code)', (select count(*) from fp)::text, (select count(*) from fp join actual using (f, src))::text
  union all select 'fonctions publiques en trop ou manquantes', '0', ((select count(*) from actual x where not exists (select 1 from fp where fp.f = x.f)) + (select count(*) from fp where not exists (select 1 from actual x where x.f = fp.f)))::text
  union all select 'tables publiques sans RLS', '0', (select count(*) from pg_tables where schemaname = 'public' and not rowsecurity)::text
  union all select 'fonctions publiques exécutables par anon', '0', (select count(*) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind = 'f' and has_function_privilege('anon', p.oid, 'execute'))::text
  union all select 'accès directs anon/authenticated à club_profiles', '0', (select count(*) from (values ('anon'), ('authenticated')) r(role), (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) p(priv) where has_table_privilege(r.role, 'public.club_profiles', p.priv))::text
  union all select 'écritures anon/authenticated sur traveler_reservations', '0', (select count(*) from (values ('anon'), ('authenticated')) r(role), (values ('INSERT'), ('UPDATE'), ('DELETE')) p(priv) where has_table_privilege(r.role, 'public.traveler_reservations', p.priv))::text
  union all select 'bucket de photos privé', 'club-avatars:privé', (select coalesce(string_agg(id || ':' || case when public then 'public' else 'privé' end, ','), 'absent') from storage.buckets where id = 'club-avatars')
${extra}
)
select c as controle, e as attendu, a as reel, (e = a) as ok from checks
union all select 'GLOBAL', 'tout ok', case when bool_and(e = a) then 'tout ok' else 'ÉCART : ARRÊT' end, bool_and(e = a) from checks;
`;
  const pre = common("CONTRÔLE AVANT B4.4 (l'état réel doit être exactement B0 → B4.2c)", before, `  union all select 'B4.4 absente : table club_consents', 'absente', coalesce(to_regclass('public.club_consents')::text, 'absente')
  union all select 'B4.4 absente : fonction à 2 arguments', '0', (select count(*) from pg_proc where proname = 'set_my_club_visibility' and pronamespace = 'public'::regnamespace and pronargs = 2)::text
  union all select 'comptes d''authentification (avant amorçage)', '0', (select count(*) from auth.users)::text
  union all select 'réservations de voyageurs (avant amorçage)', '0', (select count(*) from public.traveler_reservations)::text
  union all select 'profils CLUB (avant amorçage)', '0', (select count(*) from public.club_profiles)::text`);
  const post = common("CONTRÔLE APRÈS B4.4 (état attendu : B0 → B4.2c + B4.4)", after, `  union all select 'journal club_consents : RLS activée', 'true', (select coalesce(bool_and(c.relrowsecurity)::text, 'absente') from pg_class c where c.oid = to_regclass('public.club_consents'))
  union all select 'journal club_consents : accès directs anon/authenticated', '0', (select count(*) from (values ('anon'), ('authenticated')) r(role), (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) p(priv) where has_table_privilege(r.role, 'public.club_consents', p.priv))::text
  union all select 'journal club_consents : politiques RLS', '0', (select count(*) from pg_policies where schemaname = 'public' and tablename = 'club_consents')::text
  union all select 'ancienne publication sans consentement supprimée', '0', (select count(*) from pg_proc where proname = 'set_my_club_visibility' and pronamespace = 'public'::regnamespace and pronargs = 1)::text
  union all select 'nouvelles fonctions exécutables par authenticated', '3', (select count(*) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('set_my_club_visibility', 'get_my_club_consent', 'club_consent_version') and has_function_privilege('authenticated', p.oid, 'execute'))::text
  union all select 'version courante du texte de consentement', 'club-annuaire-1', public.club_consent_version()
  union all select 'réservations de voyageurs inchangées (avant amorçage)', '0', (select count(*) from public.traveler_reservations)::text
  union all select 'journal de consentement vide (avant tout usage)', '0', (select count(*) from public.club_consents)::text`);
  return { pre, post };
}
if (process.argv[1]?.endsWith("generate.mts")) {
  const { pre, post } = await build();
  if (process.argv.includes("--write")) { writeFileSync("supabase/test-env/precheck_before_b44.sql", pre); writeFileSync("supabase/test-env/postcheck_after_b44.sql", post); console.log("fichiers générés"); } else console.log(pre.length, post.length);
}
