/* eslint-disable @typescript-eslint/no-explicit-any */
// B4.3 — Services CLUB (le VRAI code navigateur) contre Postgres local (B0 + B4.1 + B4.3) avec RLS réelle : deux participants distincts, aucune fuite entre comptes.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { getClubMember, listClubDirectory, loadMyClubProfile, removeMyAvatar, saveMyClubProfile, setMyClubVisibility, signedAvatarUrls, uploadMyAvatar } from "../src/lib/club/clubService.ts";

let n = 0; const t = async (name: string, fn: () => Promise<void>) => { await fn(); n++; console.log("PASS", name); };
const db = new PGlite();
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create schema storage;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, raw_user_meta_data jsonb not null default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as $$ select nullif((nullif(current_setting('request.jwt.claims', true), '')::jsonb) ->> 'sub', '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid);
  alter table storage.objects enable row level security;
  grant usage on schema public, auth, storage to anon, authenticated, service_role; grant all on storage.objects, storage.buckets to authenticated;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role; alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`);
for (const f of readdirSync("supabase/migrations").filter((x) => x.endsWith(".sql")).sort()) await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
await db.exec(readFileSync("supabase/proposals/B4_1_participant_profiles.sql", "utf8")); await db.exec(readFileSync("supabase/proposals/B4_3_club_profiles.sql", "utf8"));
const ids: Record<string, string> = {};
for (const [slug, space] of [["alice", "members"], ["bob", "members"], ["tom", "staff"]] as const) {
  ids[slug] = (await db.query<{ id: string }>(`insert into auth.users (email) values ($1) returning id`, [`${slug}@example.test`])).rows[0].id;
  await db.query(`update public.accounts set active = true where id = $1`, [ids[slug]]); await db.query(`insert into public.space_access (user_id, space) values ($1, $2)`, [ids[slug], space]);
}
let chain: Promise<unknown> = Promise.resolve(); const serial = <T,>(fn: () => Promise<T>) => { const r = chain.then(fn, fn); chain = r.catch(() => undefined); return r; };
const asUser = async <T,>(who: string, fn: () => Promise<T>): Promise<T> => { await db.exec(`set role authenticated; select set_config('request.jwt.claims', '{"sub":"${ids[who]}","role":"authenticated"}', false)`); try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claims', '', false)`); } };
const iso = (r: any) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v instanceof Date ? v.toISOString() : v]));
const client = (who: string): any => ({
  rpc: (fn: string, args: Record<string, unknown> = {}) => serial(() => asUser(who, async () => { try { const keys = Object.keys(args); const r = await db.query<any>(`select * from public.${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(", ")})`, keys.map((k) => args[k])); return { data: r.rows.map(iso), error: null }; } catch (e: any) { return { data: null, error: { message: String(e.message), code: e.code } }; } })),
  auth: { getUser: async () => ({ data: { user: { id: ids[who] } }, error: null }) },
  storage: { from: () => ({
    upload: (path: string, _b: Blob) => serial(() => asUser(who, async () => { try { await db.query(`insert into storage.objects (bucket_id, name, owner) values ('club-avatars', $1, auth.uid())`, [path]); return { data: { path }, error: null }; } catch (e: any) { return { data: null, error: { message: String(e.message), code: e.code } }; } })),
    remove: (paths: string[]) => serial(() => asUser(who, async () => { for (const p of paths) await db.query(`delete from storage.objects where name = $1`, [p]); return { data: [], error: null }; })),
    createSignedUrls: (paths: string[]) => serial(() => asUser(who, async () => ({ data: (await Promise.all(paths.map(async (p) => ({ p, ok: (await db.query<any>(`select 1 from storage.objects where name = $1`, [p])).rows.length > 0 })))).map((x) => ({ path: x.p, signedUrl: x.ok ? `https://signed.example/${x.p}?t=1` : null, error: x.ok ? null : "not found" })), error: null }))),
  }) },
});
const blob = new Blob(["x"], { type: "image/webp" });

await t("deux participants : chacun ne voit que SON profil ; aucune donnée ne passe d'un compte à l'autre avant publication", async () => {
  assert.deepEqual(await loadMyClubProfile(client("alice")), { ok: true, profile: null });
  const a = await saveMyClubProfile(client("alice"), { pseudo: " Lia ", city: "Paris", bio: "Bio d'Alice", genres: ["House"] }); assert.ok(a.ok); assert.deepEqual(a.profile, { pseudo: "Lia", city: "Paris", bio: "Bio d'Alice", genres: ["House"], avatarPath: null, visible: false });
  assert.deepEqual(await loadMyClubProfile(client("bob")), { ok: true, profile: null });                 // Bob ne reçoit rien d'Alice
  const b = await saveMyClubProfile(client("bob"), { pseudo: "Bobby", city: null, bio: "", genres: [] }); assert.ok(b.ok && b.profile.city === null);
  const la = await loadMyClubProfile(client("alice")); assert.ok(la.ok && la.profile?.pseudo === "Lia");
});
await t("annuaire : fermé tant que SON profil n'est pas publié (réciprocité) ; publication volontaire ; seuls les champs publics", async () => {
  const closed = await listClubDirectory(client("bob")); assert.ok(!closed.ok && closed.kind === "reciprocity");
  assert.deepEqual(await setMyClubVisibility(client("alice"), true), { ok: true, visible: true });
  assert.ok(!(await listClubDirectory(client("bob"))).ok);                                              // Bob n'a pas publié
  assert.deepEqual(await setMyClubVisibility(client("bob"), true), { ok: true, visible: true });
  const d = await listClubDirectory(client("bob")); assert.ok(d.ok && d.members.length === 1 && d.members[0].pseudo === "Lia");
  assert.deepEqual(Object.keys(d.ok ? d.members[0] : {}).sort(), ["avatarPath", "bio", "city", "genres", "id", "pseudo"]);
  const txt = JSON.stringify(d); for (const id of Object.values(ids)) assert.ok(!txt.includes(id), "identifiant de compte exposé"); assert.doesNotMatch(txt, /example\.test/);
  const m = await getClubMember(client("bob"), d.ok ? d.members[0].id : ""); assert.ok(m.ok && m.member?.bio === "Bio d'Alice");
  assert.deepEqual(await getClubMember(client("bob"), "pas-un-uuid"), { ok: true, member: null });
});
await t("masquer retire immédiatement le profil ; recherche par pseudo et ville", async () => {
  const idAlice = (await listClubDirectory(client("bob"))); assert.ok(idAlice.ok); const pid = idAlice.members[0].id;
  const byText = await listClubDirectory(client("bob"), { text: "li" }); assert.ok(byText.ok && byText.members.length === 1); const none = await listClubDirectory(client("bob"), { city: "Lyon" }); assert.ok(none.ok && none.members.length === 0);
  assert.ok((await setMyClubVisibility(client("alice"), false)).ok);
  const after = await listClubDirectory(client("bob")); assert.ok(after.ok && after.members.length === 0);
  const m = await getClubMember(client("bob"), pid); assert.ok(m.ok && m.member === null);
  assert.ok((await setMyClubVisibility(client("alice"), true)).ok);
});
await t("modification : la visibilité et la photo ne sont pas touchées par l'enregistrement du profil", async () => {
  const r = await saveMyClubProfile(client("alice"), { pseudo: "Lia B", city: "Lyon", bio: "", genres: ["Disco", "House"] }); assert.ok(r.ok && r.profile.visible === true && r.profile.pseudo === "Lia B");
});
await t("validation : saisie invalide refusée AVANT tout appel (champs en erreur)", async () => {
  let calls = 0; const spy: any = { rpc: async () => { calls++; return { data: [], error: null }; } };
  const r = await saveMyClubProfile(spy, { pseudo: "a@b.fr", city: null, bio: "b".repeat(141), genres: [] }); assert.ok(!r.ok && r.kind === "invalid" && r.fields?.pseudo && r.fields?.bio); assert.equal(calls, 0);
});
await t("permissions : STAFF seul → refus ; sans profil, visibilité refusée (message clair)", async () => {
  const s = await saveMyClubProfile(client("tom"), { pseudo: "Tom", city: null, bio: "", genres: [] }); assert.ok(!s.ok && s.kind === "forbidden"); assert.ok(!(await loadMyClubProfile(client("tom"))).ok);
  await db.query(`insert into auth.users (email) values ('carol@example.test')`); const c = (await db.query<any>(`select id from auth.users where email = 'carol@example.test'`)).rows[0].id; ids.carol = c;
  await db.query(`update public.accounts set active = true where id = $1`, [c]); await db.query(`insert into public.space_access (user_id, space) values ($1, 'members')`, [c]);
  const v = await setMyClubVisibility(client("carol"), true); assert.ok(!v.ok && v.kind === "no_profile");
});
await t("photo : téléversement dans SON dossier, chemin enregistré, URL signée pour un lecteur autorisé ; retrait ; échec de la fonction → fichier nettoyé", async () => {
  const up = await uploadMyAvatar(client("alice"), blob, null); assert.ok(up.ok && up.path.startsWith(ids.alice + "/")); const path = up.ok ? up.path : "";
  const pr = await loadMyClubProfile(client("alice")); assert.ok(pr.ok && pr.profile?.avatarPath === path);
  const seen = await signedAvatarUrls(client("bob"), [path]); assert.ok(seen[path]?.includes(path));                         // Bob (publié) peut voir la photo d'un profil publié
  assert.ok((await setMyClubVisibility(client("alice"), false)).ok); assert.deepEqual(await signedAvatarUrls(client("bob"), [path]), {});   // masqué ⇒ illisible
  assert.ok((await setMyClubVisibility(client("alice"), true)).ok);
  const bad = await uploadMyAvatar({ ...client("alice"), rpc: async () => ({ data: null, error: { message: "invalid_avatar" } }) } as any, blob, null); assert.ok(!bad.ok);
  assert.equal((await db.query<any>(`select count(*)::int c from storage.objects`)).rows[0].c, 1);                           // pas de fichier orphelin
  const up2 = await uploadMyAvatar(client("alice"), blob, path); assert.ok(up2.ok && up2.path !== path); assert.equal((await db.query<any>(`select count(*)::int c from storage.objects where name = $1`, [path])).rows[0].c, 0);
  assert.deepEqual(await removeMyAvatar(client("alice"), up2.ok ? up2.path : null), { ok: true }); assert.equal((await db.query<any>(`select count(*)::int c from storage.objects`)).rows[0].c, 0);
  const notBlob = await uploadMyAvatar(client("alice"), new Blob(["x"], { type: "image/gif" }), null); assert.ok(!notBlob.ok && notBlob.kind === "invalid");
  const foreign = await db.query(`insert into storage.objects (bucket_id, name) values ('club-avatars', $1)`, [`${ids.bob}/x.jpg`]); void foreign;
  const steal = await signedAvatarUrls(client("alice"), [`${ids.bob}/x.jpg`]); assert.deepEqual(steal, {});
});
await t("réseau : erreur réseau → message sûr (sans exception)", async () => {
  const boom: any = { rpc: async () => { throw new Error("fetch failed"); } };
  for (const r of [await loadMyClubProfile(boom), await listClubDirectory(boom), await setMyClubVisibility(boom, true)]) assert.ok(!r.ok && r.kind === "network");
});
await db.close();
console.log(`${n} tests SERVICES CLUB (Postgres local) : OK`);
