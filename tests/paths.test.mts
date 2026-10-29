// `node --experimental-strip-types --no-warnings tests/paths.test.mts`
import assert from "node:assert/strict";
import { safeStaffNext } from "../src/lib/staff/paths.ts";

let n = 0; const t = (name: string, fn: () => void) => { fn(); n++; console.log("PASS", name); };
t("chemins STAFF internes acceptés", () => { for (const p of ["/staff", "/staff/missions", "/staff/team/tom", "/staff/comms/general"]) assert.equal(safeStaffNext(p), p); });
t("redirection ouverte refusée (URL externe, protocole-relatif, autre espace, traversée)", () => {
  for (const bad of ["https://evil.example", "//evil.example", "/\\evil", "/v3/club", "/", "/staff/../v3", "/staffx", "javascript:alert(1)", "/staff//evil", "/staff?x=//evil", "", null, undefined]) assert.equal(safeStaffNext(bad as string), "/staff", String(bad));
});
console.log(`${n} tests REDIRECTIONS : OK`);
