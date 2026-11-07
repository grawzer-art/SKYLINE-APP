// B4.1 — Participants : configuration, redirections sûres, validation du profil, identité, garde-fous de sécurité du code. `node --experimental-strip-types tests/participant.test.mts`
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { evaluateParticipantConfig } from "../src/lib/participant/config.ts";
import { PARTICIPANT_HOME, SIGNOUT_TARGETS, resolveLoginNext, safeParticipantNext, safeSignoutTarget, safeStaffPath } from "../src/lib/participant/paths.ts";
import { PROFILE_LIMITS, initialsOf, suggestDisplayName, validateProfileInput } from "../src/domain/participant.ts";
import { authActive, identityName, type ParticipantIdentity } from "../src/lib/participant/useParticipantIdentity.ts";

let n = 0; const t = (name: string, fn: () => void) => { fn(); n++; console.log("PASS", name); };
const cfg = (e: { PARTICIPANT_AUTH?: string; supabaseConfigured?: boolean }) => evaluateParticipantConfig({ supabaseConfigured: true, ...e });
const read = (p: string) => readFileSync(p, "utf8");
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = `${d}/${f}`; return statSync(p).isDirectory() ? walk(p) : [p]; });

t("configuration : « off » par défaut (application inchangée) ; « supabase » exige l'URL et la clé publique ; toute autre valeur = ERREUR explicite", () => {
  for (const v of [undefined, "", "off"]) assert.deepEqual(cfg({ PARTICIPANT_AUTH: v }), { mode: "off", issue: null });
  assert.deepEqual(cfg({ PARTICIPANT_AUTH: "supabase" }), { mode: "supabase", issue: null });
  const noKey = cfg({ PARTICIPANT_AUTH: "supabase", supabaseConfigured: false }); assert.equal(noKey.mode, "misconfigured"); assert.match(noKey.issue ?? "", /NEXT_PUBLIC_SUPABASE_URL/);
  for (const v of ["on", "true", "Supabase", "SUPABASE", " supabase", "demo", "1"]) { const c = cfg({ PARTICIPANT_AUTH: v }); assert.equal(c.mode, "misconfigured", v); assert.match(c.issue ?? "", /non reconnue/); }
  assert.doesNotMatch(JSON.stringify([noKey, cfg({ PARTICIPANT_AUTH: "sb_secret_x" })]), /sb_secret_x|https?:\/\//);
});
t("redirections après connexion : uniquement des chemins INTERNES /v3 (participants) ou /staff ; jamais d'URL externe, de //, de .. ni de protocole", () => {
  for (const ok of ["/v3/account", "/v3/profile", "/v3/club/space", "/v3"]) assert.equal(safeParticipantNext(ok), ok);
  for (const bad of ["https://evil.example", "//evil.example", "/\\evil", "/v3/../staff", "/v3//x", "javascript:alert(1)", "/staff", "/", "", null, undefined, "/v3/account?x=1", "/v3/a b", "v3/account", "/v3x/account"]) assert.equal(safeParticipantNext(bad as string), PARTICIPANT_HOME, String(bad));
  assert.equal(safeStaffPath("/staff/missions"), "/staff/missions"); for (const bad of ["/v3/account", "//x", "/staff/../v3", "https://x"]) assert.equal(safeStaffPath(bad), "/staff");
});
t("callback : destination STAFF ou participants selon le cookie ; participants désactivés ⇒ jamais de redirection /v3 ; comportement STAFF historique conservé", () => {
  assert.deepEqual(resolveLoginNext("/v3/account", true), { kind: "participant", path: "/v3/account" });
  assert.deepEqual(resolveLoginNext("/v3/account", false), { kind: "staff", path: "/staff" });
  assert.deepEqual(resolveLoginNext("/staff/missions", true), { kind: "staff", path: "/staff/missions" });
  assert.deepEqual(resolveLoginNext(null, true), { kind: "staff", path: "/staff" }); assert.deepEqual(resolveLoginNext("https://evil.example", true), { kind: "staff", path: "/staff" });
  assert.deepEqual(resolveLoginNext("/v3/../staff", true), { kind: "participant", path: PARTICIPANT_HOME });
  const cb = read("src/app/auth/callback/route.ts"); assert.match(cb, /if \(!staff\) dest = \{ kind: "participant"/); assert.match(cb, /\/v3\/login\?error=1/); assert.match(cb, /\/staff\/login\?error=1/);
});
t("déconnexion : destination dans une liste FERMÉE de pages de connexion", () => {
  for (const ok of SIGNOUT_TARGETS) assert.equal(safeSignoutTarget(ok), ok);
  for (const bad of ["https://evil.example", "//evil", "/staff", "/v3/account", "", null, undefined, "/v3/login?x=1"]) assert.equal(safeSignoutTarget(bad as string), "/staff/login");
  const so = read("src/app/auth/signout/route.ts"); assert.match(so, /export async function POST/); assert.doesNotMatch(so, /export async function GET/);
});
t("validation du profil : prénom, nom, nom affiché obligatoires (60 max, sans caractères de contrôle), valeurs nettoyées ; miroir de la base", () => {
  assert.deepEqual(validateProfileInput({ firstName: "  Élodie ", lastName: " de la Cruz", displayName: " Élo ✈ " }), { ok: true, value: { firstName: "Élodie", lastName: "de la Cruz", displayName: "Élo ✈" } });
  for (const [k, v] of [["firstName", ""], ["firstName", "   "], ["lastName", ""], ["displayName", ""], ["firstName", "x".repeat(61)], ["displayName", "y".repeat(61)], ["lastName", "a\u0007b"], ["displayName", "a\nb"], ["firstName", "a\u0000"]] as const) {
    const r = validateProfileInput({ firstName: "A", lastName: "B", displayName: "C", [k]: v }); assert.ok(!r.ok && r.errors[k], `${k}=${JSON.stringify(v)}`);
  }
  assert.ok(validateProfileInput({ firstName: "x".repeat(PROFILE_LIMITS.first), lastName: "B", displayName: "y".repeat(PROFILE_LIMITS.display) }).ok);
  assert.equal(suggestDisplayName("  Camille  "), "Camille"); assert.equal(initialsOf("Camille Dupont"), "CD"); assert.equal(initialsOf("  élodie "), "É"); assert.equal(initialsOf(""), "");
});
t("identité : jamais de nom inventé ; l'authentification active masque toute identité de démonstration", () => {
  const ready: ParticipantIdentity = { status: "ready", email: "a@b.c", profileAvailable: true, profile: { userId: "u", firstName: "Camille", lastName: "Dupont", displayName: "Camille D.", avatarPath: null, createdAt: "", updatedAt: "" } };
  assert.equal(identityName(ready), "Camille D."); assert.equal(identityName({ ...ready, profile: null }), null);
  for (const s of ["loading", "off", "anonymous", "no_access", "error"] as const) assert.equal(identityName({ status: s } as ParticipantIdentity), null, s);
  assert.deepEqual((["loading", "off", "anonymous", "no_access", "error", "ready"] as const).map((s) => authActive(s === "ready" ? ready : ({ status: s } as ParticipantIdentity))), [false, false, true, true, true, true]);
});
t("SÉCURITÉ du code : jamais getSession pour décider, jamais les métadonnées utilisateur, jamais de clé secrète, aucun mot de passe", () => {
  const files = [...walk("src/lib/participant"), ...walk("src/components/participant"), "src/app/api/participant/me/route.ts", "src/app/auth/callback/route.ts", "src/app/auth/signout/route.ts", "src/lib/auth/useEmailCodeLogin.ts", "src/proxy.ts"];
  for (const f of files) { const s = read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    assert.doesNotMatch(s, /user_metadata|raw_user_meta_data|app_metadata/, `${f} : métadonnées`); assert.doesNotMatch(s, /auth\.getSession\(|getSession\(\)/, `${f} : getSession`);
    assert.doesNotMatch(s, /service_role|SERVICE_ROLE|sb_secret|SUPABASE_SECRET/, `${f} : secret`); assert.doesNotMatch(s, /signInWithPassword|signUp\(|resetPasswordForEmail|updateUser\(/, `${f} : mot de passe / inscription`); }
  assert.match(read("src/app/api/participant/me/route.ts"), /auth\.getUser\(\)/); assert.match(read("src/proxy.ts"), /loadParticipantAccess\(supabase, user\.id\)/);
  assert.match(read("src/lib/auth/useEmailCodeLogin.ts"), /shouldCreateUser: false/);
});
t("pages personnelles : protégées CÔTÉ SERVEUR (proxy) — session vérifiée + compte actif + accès « members » ; inexistantes si désactivées ; erreur explicite si mal configurées", () => {
  const p = read("src/proxy.ts");
  assert.match(p, /matcher: \[[^\]]*"\/v3\/login", "\/v3\/account", "\/v3\/account\/:path\*"/);
  assert.match(p, /cfg\.mode === "off"\) return NextResponse\.rewrite/); assert.match(p, /cfg\.mode === "misconfigured"\) return configErrorPage/);
  assert.match(p, /if \(!user \|\| !supabase\) return go\(/); assert.match(p, /if \(!\(await loadParticipantAccess\(supabase, user\.id\)\)\) return go\("\?denied=1"\)/);
  assert.doesNotMatch(p.split('pathname === "/v3/login"')[1]?.split('pathname.startsWith("/staff")')[0] ?? "", /localStorage|sessionStorage|document\.cookie/);
  const a = read("src/lib/participant/access.ts"); assert.match(a, /\.eq\("id", userId\)/); assert.match(a, /\.eq\("user_id", userId\)/); assert.match(a, /space === "members"/);
});
t("interface : les identités de démonstration (Alex Martin…) n'apparaissent plus que si l'authentification participants est DÉSACTIVÉE ; états « à confirmer »", () => {
  for (const f of ["src/components/home/HomeHero.tsx", "src/components/v3/V3Home.tsx"]) assert.doesNotMatch(read(f), /user\.fullName/, f);
  assert.match(read("src/components/participant/IdentityLine.tsx"), /id\.status === "off"\) return variant === "legacy" \? <p className=\{wrap\}>\{user\.fullName\}/);
  assert.match(read("src/components/v3/V3Flight.tsx"), /realMode \? "to_confirm"/); assert.match(read("src/components/v3/V3Flight.tsx"), /const demo = !realMode && state\.sim\.trip/);
  assert.match(read("src/components/v3/FlightPass.tsx"), /to_confirm: "Réservation à confirmer"/);
  const d = read("src/data/demo.ts"); assert.match(d, /eventConfirmation = \{ dates: false, schedule: false, seats: false, tickets: false \}/);
  for (const f of ["src/components/v3/V3Home.tsx", "src/components/home/HomeHero.tsx"]) assert.match(read(f), /!eventConfirmation\.dates && <p data-testid="to-confirm"/);
  assert.match(read("src/components/screens/CrewScreen.tsx"), /eventConfirmation\.seats \? m\.seat : "Siège à confirmer"/);
});
console.log(`${n} tests PARTICIPANTS : OK`);
