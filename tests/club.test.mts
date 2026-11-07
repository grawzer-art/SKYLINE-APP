// B4.3 — Profil CLUB : règles pures, séparation identité / communauté, garde-fous de sécurité du code. `node --experimental-strip-types tests/club.test.mts`
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { AVATAR, avatarTarget, checkAvatarInput, validateClubInput } from "../src/domain/club.ts";
import { mapError } from "../src/lib/club/clubService.ts";

let n = 0; const t = (name: string, fn: () => void) => { fn(); n++; console.log("PASS", name); };
const read = (p: string) => readFileSync(p, "utf8");
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = `${d}/${f}`; return statSync(p).isDirectory() ? walk(p) : [p]; });
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

t("validation : pseudo 2–24 sans lien / @ / e-mail, ville ≤ 40, bio ≤ 140, 5 goûts max (dédoublonnés), valeurs nettoyées", () => {
  assert.deepEqual(validateClubInput({ pseudo: "  Skylar B ", city: " Paris ", bio: " Salut ", genres: ["House", "House", " Techno "] }), { ok: true, value: { pseudo: "Skylar B", city: "Paris", bio: "Salut", genres: ["House", "Techno"] } });
  assert.deepEqual(validateClubInput({ pseudo: "Zoé", city: "  ", bio: "", genres: [] }), { ok: true, value: { pseudo: "Zoé", city: null, bio: "", genres: [] } });
  for (const bad of ["", "x", "y".repeat(25), "me@ex.fr", "@alice_ig", "site.com", "https://x.fr", "a\nb", "<b>"]) { const r = validateClubInput({ pseudo: bad, city: null, bio: "", genres: [] }); assert.ok(!r.ok && r.errors.pseudo, JSON.stringify(bad)); }
  assert.ok(!validateClubInput({ pseudo: "Ok", city: "v".repeat(41), bio: "", genres: [] }).ok); assert.ok(!validateClubInput({ pseudo: "Ok", city: null, bio: "b".repeat(141), genres: [] }).ok);
  assert.ok(!validateClubInput({ pseudo: "Ok", city: null, bio: "a\u0007", genres: [] }).ok); assert.ok(!validateClubInput({ pseudo: "Ok", city: null, bio: "", genres: ["a", "b", "c", "d", "e", "f"] }).ok);
  assert.ok(!validateClubInput({ pseudo: "Ok", city: null, bio: "", genres: ["x".repeat(31)] }).ok);
});
t("photo : types JPEG / PNG / WebP uniquement en entrée, poids borné, sortie ≤ 512 px et ≤ 512 Ko", () => {
  assert.equal(checkAvatarInput({ type: "image/png", size: 1000 }), "ok"); assert.equal(checkAvatarInput({ type: "image/gif", size: 10 }), "type"); assert.equal(checkAvatarInput({ type: "image/svg+xml", size: 10 }), "type");
  assert.equal(checkAvatarInput({ type: "image/jpeg", size: 13 * 1024 * 1024 }), "size"); assert.equal(AVATAR.maxBytes, 512 * 1024);
  assert.deepEqual(avatarTarget(4000, 3000), { w: 512, h: 384 }); assert.deepEqual(avatarTarget(100, 80), { w: 100, h: 80 }); assert.deepEqual(avatarTarget(0, 0), { w: 1, h: 1 });
});
t("erreurs : messages sûrs, jamais le texte brut du serveur", () => {
  assert.equal(mapError({ message: "reciprocity_required" }).kind, "reciprocity"); assert.equal(mapError({ message: "no_profile" }).kind, "no_profile");
  assert.equal(mapError({ message: "invalid_pseudo" }).message, "Pseudo invalide."); assert.equal(mapError({ message: "forbidden", code: "42501" }).kind, "forbidden");
  assert.equal(mapError({ code: "PGRST202", message: "Could not find the function public.get_my_club_profile" }).kind, "unavailable");
  const w = mapError({ message: 'relation "public.secret" does not exist at character 14', code: "XX000" }); assert.doesNotMatch(w.message, /secret|relation/);
  assert.match(mapError({ message: "JWT expired", status: 401 }).message, /session/i);
});
t("SÉCURITÉ du code CLUB : pas de clé secrète, de métadonnées utilisateur, de getSession, d'URL publique de stockage ; aucune table lue en direct", () => {
  const files = [...walk("src/lib/club"), "src/domain/club.ts", "src/components/participant/ClubSpaceReal.tsx", "src/components/participant/ClubDirectoryReal.tsx", "src/components/participant/ClubSoon.tsx"];
  for (const f of files) { const s = strip(read(f));
    assert.doesNotMatch(s, /user_metadata|raw_user_meta_data|app_metadata/, f); assert.doesNotMatch(s, /getSession\(/, f); assert.doesNotMatch(s, /service_role|SERVICE_ROLE|sb_secret/, f);
    assert.doesNotMatch(s, /getPublicUrl/, `${f} : URL publique`); assert.doesNotMatch(s, /\.from\(["']club_profiles["']\)/, `${f} : lecture directe de la table`); assert.doesNotMatch(s, /localStorage|sessionStorage/, `${f} : stockage navigateur`); }
  assert.match(strip(read("src/lib/club/clubService.ts")), /createSignedUrls/);
});
t("SÉPARATION : le profil CLUB n'expose aucun champ d'identité privée ; le mode réel n'utilise pas l'état de démonstration (state.me, members)", () => {
  const d = read("src/domain/club.ts"); assert.doesNotMatch(strip(d), /firstName|lastName|email|displayName|reservation/i);
  for (const f of ["src/components/participant/ClubSpaceReal.tsx", "src/components/participant/ClubDirectoryReal.tsx"]) { const s = strip(read(f)); assert.doesNotMatch(s, /state\.me\b|\bmembers\b.*from "@\/data\/v3"|c\.member\(/, f); assert.doesNotMatch(s, /Alex|GRAW|GRAWZ/, f); }
  assert.match(read("src/components/v3/V3Space.tsx"), /authActive\(identity\) \? <ClubSpaceReal/); assert.match(read("src/components/v3/V3Members.tsx"), /authActive\(identity\) \? <ClubDirectoryReal/); assert.match(read("src/components/v3/V3Member.tsx"), /authActive\(identity\) \? <ClubMemberReal/);
  for (const f of ["V3Messages", "V3Chat", "V3Community"]) assert.match(read(`src/components/v3/${f}.tsx`), /authActive\(identity\) \? <ClubSoon/);
  assert.doesNotMatch(read("src/components/participant/ClubSpaceReal.tsx"), /useCommunity/);
});
t("PASS : aucun QR code n'est généré (ni bibliothèque, ni image) sans réservation vérifiée", () => {
  const src = walk("src").filter((f) => /\.(ts|tsx)$/.test(f)); for (const f of src) assert.doesNotMatch(strip(read(f)), /qrcode|QRCode|qr-code|toDataURL\(/i, f);
  assert.match(read("src/components/v3/FlightPass.tsx"), /Aucun faux numéro, aucun faux QR/);
  const pkg = JSON.parse(read("package.json")); assert.ok(!Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).some((k) => /qr/i.test(k)));
});
t("formulaire iPhone : champs ≥ 16 px, feuille au-dessus de la navigation, barre d'action collante", () => {
  const f = strip(read("src/components/participant/ClubSpaceReal.tsx")); assert.match(f, /sticky bottom-0/); assert.match(f, /text-\[1rem\]/); assert.doesNotMatch(f, /text-\[0\.(7|8|9)\d*rem\][^"]*"\s*(value|onChange)/);
  assert.match(read("src/components/ui/Sheet.tsx"), /z-\[100\]/); assert.match(read("src/components/v3/V3Shell.tsx"), /z-50/);
});
console.log(`${n} tests CLUB : OK`);
