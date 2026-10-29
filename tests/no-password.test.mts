// Garde-fou : STAFF HQ ne propose et n'appelle AUCUNE connexion par mot de passe, ni création de compte depuis l'application.
// `node --experimental-strip-types --no-warnings tests/no-password.test.mts`
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const files: string[] = []; const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(ts|tsx)$/.test(p)) files.push(p); } };
walk("src");
let n = 0; const t = (name: string, fn: () => void) => { fn(); n++; console.log("PASS", name); };
const hits = (re: RegExp) => files.filter((f) => re.test(readFileSync(f, "utf8")));
t("aucun appel à signInWithPassword / signUp / resetPasswordForEmail / updateUser(password) / admin API", () => {
  assert.deepEqual(hits(/signInWithPassword|\.signUp\(|resetPasswordForEmail|auth\.admin|updateUser\s*\(\s*\{[^}]*password/), []);
});
t("aucun champ de mot de passe dans l'interface STAFF", () => { assert.deepEqual(hits(/type=["']password["']|autoComplete=["'](current|new)-password["']/), []); });
t("l'authentification Supabase n'utilise que le code e-mail / lien magique, sans création de compte", () => {
  const login = readFileSync("src/components/staff/LoginScreen.tsx", "utf8");
  assert.match(login, /signInWithOtp/); assert.match(login, /shouldCreateUser:\s*false/); assert.match(login, /verifyOtp/);
});
t("aucune clé secrète (service_role / secret) référencée dans le code", () => { assert.deepEqual(hits(/SERVICE_ROLE|service_role|sb_secret_/i), []); });
t("la clé Supabase lue côté client est la clé PUBLIQUE", () => { const m = readFileSync("src/lib/staff/mode.ts", "utf8"); assert.match(m, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/); });
console.log(`${n} tests SANS MOT DE PASSE : OK`);
