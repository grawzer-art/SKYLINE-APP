// B4.2 — Inscription autonome : configuration (fermée par défaut, erreurs explicites), validation, service de claim, garde-fous de sécurité du code.
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { evaluateSignupConfig, safeDocUrl, type SignupEnv } from "../src/lib/participant/signupConfig.ts";
import { validateSignupInput } from "../src/domain/signup.ts";
import { claimMemberAccount } from "../src/lib/participant/signupService.ts";

let n = 0; const t = async (name: string, fn: () => void | Promise<void>) => { await fn(); n++; console.log("PASS", name); };
const read = (p: string) => readFileSync(p, "utf8"); const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = `${d}/${f}`; return statSync(p).isDirectory() ? walk(p) : [p]; });
const base: SignupEnv = { participantMode: "supabase", PARTICIPANT_SIGNUP: "on", PARTICIPANT_TERMS_VERSION: "cgu-2026-11", PARTICIPANT_TERMS_URL: "https://example.org/cgu", PARTICIPANT_CAPTCHA_PROVIDER: "turnstile", PARTICIPANT_CAPTCHA_SITE_KEY: "0x4AAAAAAAtestKEY" };
const cfg = (o: Partial<SignupEnv> = {}) => evaluateSignupConfig({ ...base, ...o });

await t("configuration : FERMÉE par défaut (absente / vide / off) ; « on » seulement si tout est valide ; toute autre valeur = ERREUR explicite", () => {
  for (const v of [undefined, "", "off"]) assert.deepEqual(cfg({ PARTICIPANT_SIGNUP: v }), { mode: "off", issue: null });
  const ok = cfg(); assert.equal(ok.mode, "on"); if (ok.mode === "on") assert.deepEqual([ok.termsVersion, ok.termsUrl, ok.charterUrl, ok.minAge, ok.captcha], ["cgu-2026-11", "https://example.org/cgu", null, 18, { provider: "turnstile", siteKey: "0x4AAAAAAAtestKEY" }]);
  for (const v of ["ON", "true", "1", " on", "yes", "open"]) { const c = cfg({ PARTICIPANT_SIGNUP: v }); assert.equal(c.mode, "misconfigured", v); assert.match(c.issue ?? "", /PARTICIPANT_SIGNUP/); }
});
await t("configuration : exige l'authentification participants, la version et l'adresse des CGU, un CAPTCHA ; aucune valeur ni secret dans les messages", () => {
  for (const [o, re] of [[{ participantMode: "off" as const }, /PARTICIPANT_AUTH/], [{ participantMode: "misconfigured" as const }, /PARTICIPANT_AUTH/], [{ PARTICIPANT_TERMS_VERSION: "" }, /TERMS_VERSION/], [{ PARTICIPANT_TERMS_VERSION: "a b" }, /TERMS_VERSION/],
    [{ PARTICIPANT_TERMS_URL: "" }, /TERMS_URL/], [{ PARTICIPANT_TERMS_URL: "javascript:alert(1)" }, /TERMS_URL/], [{ PARTICIPANT_TERMS_URL: "http://insecure.example" }, /TERMS_URL/], [{ PARTICIPANT_TERMS_URL: "//evil.example/x" }, /TERMS_URL/],
    [{ PARTICIPANT_CHARTER_URL: "data:text/html,x" }, /CHARTER_URL/], [{ PARTICIPANT_MIN_AGE: "12" }, /MIN_AGE/], [{ PARTICIPANT_MIN_AGE: "abc" }, /MIN_AGE/],
    [{ PARTICIPANT_CAPTCHA_PROVIDER: "" }, /CAPTCHA_PROVIDER/], [{ PARTICIPANT_CAPTCHA_PROVIDER: "recaptcha" }, /CAPTCHA_PROVIDER/], [{ PARTICIPANT_CAPTCHA_SITE_KEY: "" }, /SITE_KEY/], [{ PARTICIPANT_CAPTCHA_SITE_KEY: "x y" }, /SITE_KEY/]] as [Partial<SignupEnv>, RegExp][]) {
    const c = cfg(o); assert.equal(c.mode, "misconfigured", JSON.stringify(o)); assert.match(c.issue ?? "", re);
  }
  const all = JSON.stringify([cfg({ PARTICIPANT_TERMS_URL: "javascript:alert(1)" }), cfg({ PARTICIPANT_CAPTCHA_SITE_KEY: "SECRET-KEY!!" })]); assert.doesNotMatch(all, /javascript|SECRET-KEY/);
});
await t("configuration : CAPTCHA « none » explicite (local / test), charte facultative, âge minimum configurable, chemins internes acceptés", () => {
  const c = cfg({ PARTICIPANT_CAPTCHA_PROVIDER: "none", PARTICIPANT_CAPTCHA_SITE_KEY: undefined, PARTICIPANT_CHARTER_URL: "/legal/charte", PARTICIPANT_MIN_AGE: "21", PARTICIPANT_TERMS_URL: "/legal/cgu" });
  assert.equal(c.mode, "on"); if (c.mode === "on") assert.deepEqual([c.captcha, c.charterUrl, c.minAge, c.termsUrl], [null, "/legal/charte", 21, "/legal/cgu"]);
  assert.equal(safeDocUrl("https://a.example/x?y=1"), "https://a.example/x?y=1"); assert.equal(safeDocUrl("/a/../b"), null); assert.equal(safeDocUrl("ftp://x"), null); assert.equal(safeDocUrl("/ok path"), null);
});
await t("CAPTCHA « none » : INTERDIT sur Preview et Production (et tout environnement de déploiement inconnu), autorisé en local / test seulement ; CAPTCHA réel accepté partout", () => {
  const none = { PARTICIPANT_CAPTCHA_PROVIDER: "none", PARTICIPANT_CAPTCHA_SITE_KEY: undefined };
  for (const dep of ["preview", "production", "Preview", "PRODUCTION", "staging", "x"]) { const c = cfg({ ...none, VERCEL_ENV: dep }); assert.equal(c.mode, "misconfigured", dep); assert.match(c.issue ?? "", /interdit sur un déploiement Preview ou Production/); }
  for (const dep of [undefined, "", "development"]) assert.equal(cfg({ ...none, VERCEL_ENV: dep }).mode, "on", String(dep));
  for (const dep of ["preview", "production", undefined]) assert.equal(cfg({ VERCEL_ENV: dep }).mode, "on", `captcha réel / ${dep}`);
  assert.equal(cfg({ ...none, VERCEL_ENV: "production", PARTICIPANT_SIGNUP: "off" }).mode, "off");
  assert.match(read("src/lib/participant/config.ts"), /VERCEL_ENV: process\.env\.VERCEL_ENV/);
});
await t("validation : identité + e-mail + CGU + âge ; la finalisation n'exige pas d'e-mail", () => {
  const ok = validateSignupInput({ firstName: " Élodie ", lastName: "Cruz", displayName: "Élo", email: " Elo@Example.TEST ", acceptTerms: true, adult: true }); assert.ok(ok.ok && ok.value.email === "elo@example.test" && ok.value.firstName === "Élodie");
  const bad = validateSignupInput({ firstName: "", lastName: "", displayName: "", email: "pas-un-mail", acceptTerms: false, adult: false }, { minAge: 21 });
  assert.ok(!bad.ok && bad.errors.firstName && bad.errors.lastName && bad.errors.displayName && bad.errors.email && bad.errors.acceptTerms && /21 ans/.test(bad.errors.adult ?? ""));
  assert.ok(validateSignupInput({ firstName: "A", lastName: "B", displayName: "C", email: "", acceptTerms: true, adult: true }, { needEmail: false }).ok);
  assert.ok(!validateSignupInput({ firstName: "A", lastName: "B", displayName: "c\u0007", email: "a@b.cd", acceptTerms: true, adult: true }).ok);
});
await t("service claim : arguments EXACTS (aucun rôle / espace / identifiant), messages sûrs, validation avant appel", async () => {
  const calls: unknown[] = []; const mk = (r: { data?: unknown; error?: unknown }) => ({ rpc: async (fn: string, a: unknown) => { calls.push([fn, a]); return { data: r.data ?? null, error: r.error ?? null }; } }) as never;
  const ok = await claimMemberAccount(mk({ data: [{ outcome: "created" }] }), { firstName: " A ", lastName: "B", displayName: "C" }, "v1"); assert.deepEqual(ok, { ok: true, outcome: "created" });
  assert.deepEqual(calls[0], ["claim_member_account", { p_first_name: "A", p_last_name: "B", p_display_name: "C", p_terms_version: "v1", p_adult: true }]);
  assert.deepEqual(await claimMemberAccount(mk({ data: [{ outcome: "already_member" }] }), { firstName: "A", lastName: "B", displayName: "C" }, "v1"), { ok: true, outcome: "already_member" });
  const bad = await claimMemberAccount(mk({}), { firstName: "", lastName: "B", displayName: "C" }, "v1"); assert.ok(!bad.ok && bad.kind === "invalid" && bad.fields?.firstName); assert.equal(calls.length, 2);
  const kinds: [string, string][] = [["not_eligible", "not_eligible"], ["suspended", "suspended"], ["email_not_confirmed", "email_not_confirmed"], ["adult_required", "invalid"]];
  for (const [m, k] of kinds) { const r = await claimMemberAccount(mk({ error: { message: m } }), { firstName: "A", lastName: "B", displayName: "C" }, "v1"); assert.ok(!r.ok && r.kind === k, m); }
  const gone = await claimMemberAccount(mk({ error: { message: "Could not find the function public.claim_member_account", code: "PGRST202" } }), { firstName: "A", lastName: "B", displayName: "C" }, "v1"); assert.ok(!gone.ok && gone.kind === "unavailable");
  const weird = await claimMemberAccount(mk({ error: { message: 'relation "public.secret" does not exist', code: "XX000" } }), { firstName: "A", lastName: "B", displayName: "C" }, "v1"); assert.ok(!weird.ok); assert.doesNotMatch(weird.message, /secret|relation/);
  const net = await claimMemberAccount({ rpc: async () => { throw new Error("fetch failed"); } } as never, { firstName: "A", lastName: "B", displayName: "C" }, "v1"); assert.ok(!net.ok && net.kind === "network");
});
await t("SÉCURITÉ du code : création de compte autorisée UNIQUEMENT par le parcours d'inscription ; pas de métadonnées, secret, mot de passe, getSession", () => {
  const files = [...walk("src/lib/participant"), "src/components/participant/SignupFlow.tsx", "src/components/participant/SignupComplete.tsx", "src/components/participant/CaptchaWidget.tsx", "src/domain/signup.ts", "src/app/v3/signup/page.tsx", "src/app/v3/signup/complete/page.tsx", "src/lib/auth/useEmailCodeLogin.ts"];
  for (const f of files) { const s = strip(read(f)); assert.doesNotMatch(s, /user_metadata|raw_user_meta_data|app_metadata|options:\s*\{\s*data/, f); assert.doesNotMatch(s, /getSession\(/, f); assert.doesNotMatch(s, /service_role|SERVICE_ROLE|sb_secret/, f); assert.doesNotMatch(s, /signInWithPassword|\.signUp\(|resetPasswordForEmail|updateUser\(/, f); }
  assert.match(read("src/components/participant/SignupFlow.tsx"), /allowCreate: true/);
  for (const f of ["src/components/staff/LoginScreen.tsx", "src/components/participant/ParticipantLogin.tsx", "src/components/participant/SignupComplete.tsx"]) assert.doesNotMatch(strip(read(f)), /allowCreate/, f);
  assert.match(read("src/lib/auth/useEmailCodeLogin.ts"), /captchaToken/);
});
await t("proxy : pages d'inscription inexistantes si fermées (404), erreur explicite si mal configurées, finalisation protégée par session", () => {
  const p = read("src/proxy.ts"); assert.match(p, /matcher: \[[^\]]*"\/v3\/signup", "\/v3\/signup\/complete"/);
  assert.match(p, /pc\.mode === "off" \|\| sc\.mode === "off"\) return NextResponse\.rewrite/); assert.match(p, /sc\.mode === "misconfigured"\) return configErrorPage\(sc\.issue, "Inscription"\)/);
  assert.match(p, /if \(!user \|\| !supabase\) return to\("\/v3\/signup"\)/); assert.match(p, /loadParticipantAccess\(supabase, user\.id\)\) return to\("\/v3\/account"\)/);
  assert.match(read("src/app/v3/signup/page.tsx"), /c\.mode !== "on"\) notFound\(\)/);
});
await t("membre gratuit ≠ voyageur : le pass reste « à confirmer » en mode réel ; aucun QR ; le statut voyageur vient du serveur, jamais déduit du navigateur", () => {
  assert.match(read("src/components/v3/V3Flight.tsx"), /realMode \? "to_confirm"/); assert.match(strip(read("src/app/api/participant/me/route.ts")), /rpc\("get_my_traveler_status"\)/);
  assert.doesNotMatch(strip(read("src/lib/participant/useParticipantIdentity.ts")), /traveler\s*[:=]\s*"verified"[^?]*$/m);
  const sql = read("supabase/proposals/B4_2_member_signup.sql").replace(/--[^\n]*/g, ""); assert.doesNotMatch(sql, /insert into public\.traveler_reservations/i);
  assert.doesNotMatch(sql, /grant (insert|update|delete)/i);
});
console.log(`${n} tests INSCRIPTION (unitaires) : OK`);
