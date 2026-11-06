// B2 — Séparation stricte des modes (local / base de données) et activation explicite. `node --experimental-strip-types tests/missions-modes.test.mts`
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolveDataSource } from "../src/lib/staff/data-source.ts";

let n = 0; const t = (name: string, fn: () => void) => { fn(); n++; console.log("PASS", name); };

t("source de données : « local » par défaut, « db » seulement si demandée ET si l'authentification Supabase est active", () => {
  assert.equal(resolveDataSource({}, "demo"), "local");
  assert.equal(resolveDataSource({}, "supabase"), "local");                                   // auth Supabase seule ≠ données en base
  assert.equal(resolveDataSource({ STAFF_DATA_SOURCE: "db" }, "demo"), "local");              // jamais « db » sans authentification Supabase
  assert.equal(resolveDataSource({ STAFF_DATA_SOURCE: "db" }, "supabase"), "db");
  for (const v of ["DB", "true", "1", "supabase", " db", "", "local"]) assert.equal(resolveDataSource({ STAFF_DATA_SOURCE: v }, "supabase"), "local", `valeur ${JSON.stringify(v)}`);
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
  assert.match(r, /userId: id\.userId/); assert.match(r, /dataSource: staffDataSource\(\)/);
  assert.equal([...r.matchAll(/dataSource: "local"/g)].length, 3, "démo, Supabase sans session, et erreur : toujours local");
});
console.log(`${n} tests MODES : OK`);
