// B2 — Séparation stricte des modes (local / base de données) et activation explicite. `node --experimental-strip-types tests/missions-modes.test.mts`
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { evaluateStaffConfig, type ConfigEnv } from "../src/lib/staff/data-source.ts";

let n = 0; const t = (name: string, fn: () => void) => { fn(); n++; console.log("PASS", name); };
const cfg = (e: Partial<ConfigEnv>) => evaluateStaffConfig({ supabaseConfigured: true, ...e });

t("défaut : données « local » (démonstration) quand STAFF_DATA_SOURCE est absente, vide ou « local »", () => {
  for (const d of [undefined, "", "local"]) { const c = cfg({ STAFF_DATA_SOURCE: d }); assert.deepEqual([c.data, c.issue], ["local", null]); }
  const c = cfg({ STAFF_AUTH_MODE: "supabase", STAFF_DATA_SOURCE: "local" }); assert.deepEqual([c.auth, c.data, c.issue], ["supabase", "local", null]);   // auth Supabase seule ≠ données en base
});
t("activation : « db » uniquement avec l'authentification Supabase ET l'URL / la clé publique", () => {
  const c = cfg({ STAFF_AUTH_MODE: "supabase", STAFF_DATA_SOURCE: "db" }); assert.deepEqual([c.auth, c.data, c.issue], ["supabase", "db", null]);
});
t("ERREUR EXPLICITE (jamais de repli silencieux) : « db » demandé sans authentification Supabase", () => {
  for (const a of [undefined, "", "demo"]) { const c = cfg({ STAFF_AUTH_MODE: a, STAFF_DATA_SOURCE: "db" }); assert.equal(c.data, "misconfigured"); assert.match(c.issue ?? "", /STAFF_DATA_SOURCE=db.*STAFF_AUTH_MODE=supabase/); }
});
t("ERREUR EXPLICITE : configuration Supabase incomplète (URL ou clé absente), avec ou sans « db »", () => {
  const a = cfg({ STAFF_AUTH_MODE: "supabase", STAFF_DATA_SOURCE: "db", supabaseConfigured: false }); assert.equal(a.data, "misconfigured"); assert.match(a.issue ?? "", /NEXT_PUBLIC_SUPABASE_URL/);
  const b = cfg({ STAFF_AUTH_MODE: "supabase", supabaseConfigured: false }); assert.equal(b.data, "misconfigured");                // plus de retour discret à la démo
});
t("ERREUR EXPLICITE : toute valeur non reconnue (faute de frappe) est refusée, jamais interprétée comme « local »", () => {
  for (const v of ["DB", "true", "1", "supabase", " db", "Local", "database"]) { const c = cfg({ STAFF_AUTH_MODE: "supabase", STAFF_DATA_SOURCE: v }); assert.equal(c.data, "misconfigured", `valeur ${JSON.stringify(v)}`); assert.match(c.issue ?? "", /non reconnue/); }
  for (const v of ["Supabase", "on", "true"]) assert.equal(cfg({ STAFF_AUTH_MODE: v }).data, "misconfigured", `auth ${v}`);
});
t("les messages d'erreur ne citent que des NOMS de variables, jamais de valeur sensible", () => {
  const all = [cfg({ STAFF_DATA_SOURCE: "db" }), cfg({ STAFF_AUTH_MODE: "supabase", supabaseConfigured: false }), cfg({ STAFF_DATA_SOURCE: "sb_secret_abc123" })];
  for (const c of all) assert.doesNotMatch(c.issue ?? "", /sb_secret|abc123|https?:\/\//);
});

const read = (p: string) => readFileSync(p, "utf8");
t("le code du mode base de données n'utilise AUCUN stockage navigateur", () => {
  for (const f of ["src/lib/missions/useDbMissions.ts", "src/lib/missions/service.ts", "src/lib/missions/supabase-port.ts", "src/lib/missions/errors.ts", "src/lib/missions/port.ts"])
    assert.doesNotMatch(read(f), /localStorage|sessionStorage|useLocalStorage|indexedDB|document\.cookie/, f);
});
t("le code du mode local n'appelle JAMAIS la base (aucun import Supabase, service ni port)", () => {
  assert.doesNotMatch(read("src/lib/missions/useLocalMissions.ts"), /supabase|createMissionsService|supabase-port|\.rpc\(|\.from\(/i);
});
t("aucune clé secrète ni service_role dans le code de synchronisation", () => {
  for (const f of readdirSync("src/lib/missions").map((x) => `src/lib/missions/${x}`)) assert.doesNotMatch(read(f), /service_role|SERVICE_ROLE|SUPABASE_SECRET|sb_secret/, f);
});
t("le service n'appelle que les fonctions et tables autorisées (liste fermée)", () => {
  const src = read("src/lib/missions/service.ts");
  const rpcs = new Set([...src.matchAll(/(?:write|port\.rpc)\(\s*"([a-z_]+)"/g)].map((m) => m[1]));
  assert.deepEqual([...rpcs].sort(), ["add_mission_comment", "archive_mission", "assign_mission", "create_mission", "delete_mission", "list_team", "resolve_assignment", "set_mission_status", "update_mission"]);
  const tables = new Set([...src.matchAll(/port\.select\(\s*"([a-z_]+)"/g)].map((m) => m[1]));
  assert.deepEqual([...tables].sort(), ["mission_comments", "mission_events", "missions"]);
  assert.doesNotMatch(src, /\.(insert|update|delete|upsert)\(/, "aucune écriture directe dans les tables");
});
t("l'identité d'action en mode base de données est l'UUID du compte, jamais le slug local", () => {
  const a = read("src/lib/useActor.ts"); assert.match(a, /isUuid\(s\.userId\)/); assert.match(a, /memberId: s\.userId/);
  assert.match(read("src/lib/useMissions.ts"), /isUuid\(st\.session\?\.userId\)/);
});
t("la session expose l'UUID en mode Supabase uniquement ; la source de données vient du serveur", () => {
  const r = read("src/app/api/staff/session/route.ts");
  assert.match(r, /userId: id\.userId/); assert.match(r, /dataSource: cfg\.data/); assert.match(r, /if \(cfg\.issue\)/);
  assert.equal([...r.matchAll(/dataSource: "local"/g)].length, 3, "démo, Supabase sans session, et erreur : toujours local");
});
t("le proxy suspend STAFF HQ (503) en cas de configuration invalide, avant tout accès ; la démo est coupée", () => {
  const p = read("src/proxy.ts"); assert.match(p, /const issue = staffConfigIssue\(\);\s*if \(issue\) return configErrorPage\(issue\)/); assert.match(p, /status: 503/);
  assert.match(read("src/lib/auth/token.ts"), /!staffConfigIssue\(\)/);
});
t("côté interface : statut « misconfigured » sans aucune donnée (ni base, ni locale)", () => {
  const u = read("src/lib/useMissions.ts"); assert.match(u, /status: "misconfigured", missions: \[\], local: null/);
  assert.match(u, /useLocalMissions\(dbMode \|\| misconfigured \? `\$\{MISSIONS_KEY\}:inactive`/);
});
console.log(`${n} tests MODES : OK`);
