// Tests unitaires des accès : rôle GLOBAL / accès par espace / permissions STAFF — `node --experimental-strip-types tests/access.test.mts`
import assert from "node:assert/strict";
import { DEMO_ACCOUNTS, NO_ACCESS, accessLabels, canEnterMembers, canEnterStaff, canManageAccounts, isCoordinator, isSuperAdmin, type Access } from "../src/lib/auth/roles.ts";

let n = 0; const t = (name: string, fn: () => void) => { fn(); n++; console.log("PASS", name); };
const GRAW: Access = { platform: ["super_admin"], spaces: ["staff", "members"], staff: [] };
const TOM: Access = { platform: [], spaces: ["staff"], staff: ["admin"] };
const QAFARD: Access = { platform: [], spaces: ["staff"], staff: ["member"] };
const PARTICIPANT: Access = { platform: [], spaces: ["members"], staff: [] };

t("GRAW super admin GLOBAL : gère les comptes, coordonne STAFF (accès staff), peut aussi avoir l'accès MEMBERS", () => { assert.ok(isSuperAdmin(GRAW) && canManageAccounts(GRAW) && canEnterStaff(GRAW) && isCoordinator(GRAW) && canEnterMembers(GRAW)); });
t("TOM admin STAFF : coordonne, mais NE gère PAS les comptes (ni accès, ni rôles) et n'est pas super admin", () => { assert.ok(canEnterStaff(TOM) && isCoordinator(TOM)); assert.equal(canManageAccounts(TOM), false); assert.equal(isSuperAdmin(TOM), false); assert.equal(canEnterMembers(TOM), false); });
t("QAFARD member STAFF : entre dans STAFF HQ, ne coordonne pas, ne gère pas les comptes", () => { assert.ok(canEnterStaff(QAFARD)); assert.equal(isCoordinator(QAFARD), false); assert.equal(canManageAccounts(QAFARD), false); });
t("PARTICIPANT (accès members seul) : AUCUN droit STAFF, même actif", () => { assert.ok(canEnterMembers(PARTICIPANT)); assert.equal(canEnterStaff(PARTICIPANT), false); assert.equal(isCoordinator(PARTICIPANT), false); assert.equal(canManageAccounts(PARTICIPANT), false); });
t("aucun accès : rien", () => { for (const f of [canEnterStaff, isCoordinator, canManageAccounts, canEnterMembers, isSuperAdmin]) { assert.equal(f(NO_ACCESS), false); assert.equal(f(undefined), false); } });
t("l'accès staff est indispensable : une permission STAFF sans accès `staff` ne donne rien", () => { const orphan: Access = { platform: [], spaces: ["members"], staff: ["admin"] }; assert.equal(canEnterStaff(orphan), false); assert.equal(isCoordinator(orphan), false); });
t("le super admin SANS accès staff ne coordonne pas STAFF (rôle global ≠ permission STAFF) mais garde l'administration des comptes", () => { const sa: Access = { platform: ["super_admin"], spaces: [], staff: [] }; assert.equal(canEnterStaff(sa), false); assert.equal(isCoordinator(sa), false); assert.ok(canManageAccounts(sa)); });
t("cumul d'accès : un même compte peut être staff + participant", () => { const both: Access = { platform: [], spaces: ["staff", "members"], staff: ["member"] }; assert.ok(canEnterStaff(both) && canEnterMembers(both)); });
t("libellés d'affichage : rôle global puis permissions STAFF", () => { assert.deepEqual(accessLabels(GRAW), ["super_admin"]); assert.deepEqual(accessLabels(TOM), ["admin"]); assert.deepEqual(accessLabels(QAFARD), ["member"]); assert.deepEqual(accessLabels(PARTICIPANT), []); });
t("comptes de démonstration alignés (sans mot de passe)", () => {
  const by = Object.fromEntries(DEMO_ACCOUNTS.map((a) => [a.id, a]));
  assert.ok(isSuperAdmin(by.graw.access) && canEnterStaff(by.graw.access) && canEnterMembers(by.graw.access));
  assert.ok(isCoordinator(by.tom.access) && !canManageAccounts(by.tom.access)); assert.ok(canEnterStaff(by.qafard.access) && !isCoordinator(by.qafard.access));
  assert.ok(canEnterMembers(by.participant.access) && !canEnterStaff(by.participant.access));
  for (const a of DEMO_ACCOUNTS) assert.equal("password" in a, false);
});
console.log(`${n} tests ACCÈS : OK`);
