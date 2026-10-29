// Tests unitaires des rôles STAFF : `node --experimental-strip-types tests/access.test.mts`
import assert from "node:assert/strict";
import { DEMO_ACCOUNTS, canEnterStaff, canManageAccounts, isCoordinator, type Role } from "../src/lib/auth/roles.ts";

let n = 0; const t = (name: string, fn: () => void) => { fn(); n++; console.log("PASS", name); };
const SA: Role[] = ["super_admin"], AD: Role[] = ["admin"], ME: Role[] = ["member"], PA: Role[] = ["participant"];
t("GRAW super_admin : gère les comptes, coordonne, entre dans STAFF HQ", () => { assert.ok(canManageAccounts(SA) && isCoordinator(SA) && canEnterStaff(SA)); });
t("TOM admin : coordonne et entre, mais NE gère PAS les comptes ni les permissions", () => { assert.ok(isCoordinator(AD) && canEnterStaff(AD)); assert.equal(canManageAccounts(AD), false); });
t("QAFARD member : entre dans STAFF HQ, ne coordonne pas, ne gère pas les comptes", () => { assert.ok(canEnterStaff(ME)); assert.equal(isCoordinator(ME), false); assert.equal(canManageAccounts(ME), false); });
t("participant : aucun accès STAFF HQ", () => { assert.equal(canEnterStaff(PA), false); assert.equal(canEnterStaff([]), false); assert.equal(canEnterStaff(undefined), false); });
t("rôles cumulables : participant + super_admin", () => { const r: Role[] = ["participant", "super_admin"]; assert.ok(canEnterStaff(r) && canManageAccounts(r)); });
t("comptes de démonstration alignés sur les rôles officiels (sans mot de passe)", () => {
  const by = Object.fromEntries(DEMO_ACCOUNTS.map((a) => [a.id, a]));
  assert.ok(by.graw.roles.includes("super_admin") && by.tom.roles.includes("admin") && by.qafard.roles.includes("member"));
  for (const a of DEMO_ACCOUNTS) assert.equal("password" in a, false);
});
console.log(`${n} tests ACCÈS : OK`);
