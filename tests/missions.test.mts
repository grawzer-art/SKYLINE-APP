// Tests unitaires MISSIONS : `node --experimental-strip-types tests/missions.test.mts`
import assert from "node:assert/strict";
import { allowedStatusTransitions, canCreateFor, canDelete, canEdit, canView, changeStatus, countByStatus, createMission, daysLate, filterMissions, isOverdue, sortMissions, updateMission, validateMissionInput, type Actor, type Mission, type MissionInput } from "../src/domain/missions.ts";

let n = 0; const t = (name: string, fn: () => void) => { fn(); n++; console.log("PASS", name); };
const IDS = ["tom", "graw", "qafard"];
const tom: Actor = { memberId: "tom", coordinator: true }, graw: Actor = { memberId: "graw", coordinator: true }, qafard: Actor = { memberId: "qafard", coordinator: false };
const base: MissionInput = { title: "Shooting repérage", description: "", assigneeId: "qafard", validatorId: "tom", dueDate: "2027-01-10", priority: "normal", status: "todo" };
const mk = (i: Partial<MissionInput> = {}, a: Actor = tom, id = "m1"): Mission => { const r = createMission({ ...base, ...i }, a, IDS, "2026-11-01T10:00:00Z", id); assert.ok(r.ok, JSON.stringify(r)); return r.value; };

t("titre obligatoire", () => { const r = validateMissionInput({ ...base, title: "   " }, IDS); assert.ok(!r.ok && r.errors.title); });
t("titre limité à 120 caractères", () => assert.ok(!validateMissionInput({ ...base, title: "x".repeat(121) }, IDS).ok));
t("description facultative, limitée à 500", () => { assert.ok(validateMissionInput(base, IDS).ok); assert.ok(!validateMissionInput({ ...base, description: "x".repeat(501) }, IDS).ok); });
t("responsable : seulement les membres actifs", () => assert.ok(!validateMissionInput({ ...base, assigneeId: "sarah" }, IDS).ok));
t("validateur : membre actif et différent de l'assigné", () => { assert.ok(!validateMissionInput({ ...base, validatorId: "qafard" }, IDS).ok); assert.ok(!validateMissionInput({ ...base, validatorId: "loick" }, IDS).ok); });
t("échéance facultative ; date invalide refusée", () => { assert.ok(validateMissionInput({ ...base, dueDate: null }, IDS).ok); assert.ok(!validateMissionInput({ ...base, dueDate: "2027-02-30" }, IDS).ok); assert.ok(!validateMissionInput({ ...base, dueDate: "demain" }, IDS).ok); });
t("titre nettoyé (espaces)", () => { const r = validateMissionInput({ ...base, title: "  A  " }, IDS); assert.ok(r.ok && r.value.title === "A"); });
t("création : historique « created », créateur et dates", () => { const m = mk(); assert.equal(m.history.length, 1); assert.equal(m.history[0].kind, "created"); assert.equal(m.creatorId, "tom"); });
t("un non-coordinateur ne crée que pour lui-même", () => { assert.equal(canCreateFor(qafard, "qafard"), true); assert.equal(canCreateFor(qafard, "graw"), false); assert.ok(!createMission({ ...base, assigneeId: "graw", validatorId: "tom" }, qafard, IDS, "x", "m2").ok); });
t("un non-coordinateur ne crée pas une mission déjà terminée", () => assert.ok(!createMission({ ...base, status: "done" }, qafard, IDS, "x", "m3").ok));

t("assigné : à faire → en cours → en validation, jamais « terminée »", () => {
  let m = mk(); assert.deepEqual(allowedStatusTransitions(qafard, m), ["in_progress"]);
  let r = changeStatus(m, "in_progress", qafard, "t1"); assert.ok(r.ok); m = r.ok ? r.value : m;
  assert.deepEqual(allowedStatusTransitions(qafard, m).sort(), ["review", "todo"]);
  r = changeStatus(m, "review", qafard, "t2"); assert.ok(r.ok); m = r.ok ? r.value : m;
  assert.equal(m.status, "review"); assert.ok(!allowedStatusTransitions(qafard, m).includes("done"));
  assert.ok(!changeStatus(m, "done", qafard, "t3").ok);
});
t("la soumission à validation ne termine PAS la mission", () => { const m = mk({ status: "in_progress" }); const r = changeStatus(m, "review", qafard, "t"); assert.ok(r.ok && r.value.status === "review" && r.value.status !== "done"); });
t("validateur : valider (terminée) ou renvoyer (en cours), avec historique", () => {
  const m = mk({ status: "review" });
  const ok = changeStatus(m, "done", tom, "t1", "Parfait"); assert.ok(ok.ok); if (ok.ok) { assert.equal(ok.value.history.at(-1)?.kind, "validated"); assert.equal(ok.value.history.at(-1)?.note, "Parfait"); }
  const back = changeStatus(m, "in_progress", tom, "t2", "À reprendre"); assert.ok(back.ok); if (back.ok) assert.equal(back.value.history.at(-1)?.kind, "returned");
});
t("un tiers (ni assigné, ni validateur, ni coordinateur) ne change rien", () => { const outsider: Actor = { memberId: "autre", coordinator: false }; assert.deepEqual(allowedStatusTransitions(outsider, mk()), []); });
t("l'assigné ne peut pas valider sa propre mission en validation", () => assert.ok(!allowedStatusTransitions(qafard, mk({ status: "review" })).includes("done")));
t("coordinateur : tout statut sauf l'actuel", () => assert.deepEqual(allowedStatusTransitions(graw, mk({ status: "todo" })), ["in_progress", "review", "done"]));
t("mission terminée : l'assigné ne peut pas la rouvrir", () => assert.deepEqual(allowedStatusTransitions(qafard, mk({ status: "done" }, tom, "m9")), []));
t("changement de statut refusé laisse la mission intacte", () => { const m = mk(); const r = changeStatus(m, "done", qafard, "t"); assert.ok(!r.ok); assert.equal(m.status, "todo"); });

t("modification : créateur ou coordinateur seulement", () => { const m = mk({}, qafard, "m5"); m.assigneeId = "qafard"; assert.equal(canEdit(qafard, m), true); assert.equal(canEdit(graw, m), true); const other = mk({ assigneeId: "qafard" }, tom, "m6"); assert.equal(canEdit(qafard, other), false); assert.equal(canDelete(qafard, other), false); assert.equal(canDelete(tom, other), true); });
t("modification : historique « edited » avec les champs changés", () => { const m = mk(); const r = updateMission(m, { ...base, title: "Nouveau titre", priority: "urgent" }, tom, IDS, "t1"); assert.ok(r.ok); if (r.ok) { assert.equal(r.value.title, "Nouveau titre"); assert.equal(r.value.history.at(-1)?.kind, "edited"); assert.match(r.value.history.at(-1)?.note ?? "", /title, priority/); } });
t("modification sans changement : aucun historique ajouté", () => { const m = mk(); const r = updateMission(m, { ...base }, tom, IDS, "t1"); assert.ok(r.ok); if (r.ok) assert.equal(r.value.history.length, 1); });
t("modification : le statut passe par les mêmes règles", () => { const m = mk({}, qafard, "m7"); const r = updateMission(m, { ...base, assigneeId: "qafard", status: "done" }, qafard, IDS, "t"); assert.ok(!r.ok); const ok = updateMission(m, { ...base, assigneeId: "qafard", status: "in_progress" }, qafard, IDS, "t"); assert.ok(ok.ok && ok.value.status === "in_progress"); });
t("modification refusée pour un non-autorisé", () => assert.ok(!updateMission(mk(), base, qafard, IDS, "t").ok));

t("visibilité : coordinateur voit tout, membre voit ses missions", () => { const m = mk({ assigneeId: "graw", validatorId: "tom" }, tom, "m8"); assert.equal(canView(qafard, m), false); assert.equal(canView(graw, m), true); assert.equal(canView(tom, m), true); });
t("retard : échéance passée et non terminée", () => { const m = mk({ dueDate: "2026-11-01" }); assert.equal(isOverdue(m, "2026-11-02"), true); assert.equal(isOverdue(m, "2026-11-01"), false); assert.equal(isOverdue({ ...m, status: "done" }, "2026-12-01"), false); assert.equal(isOverdue(m, null), false); assert.equal(isOverdue({ dueDate: null, status: "todo" }, "2030-01-01"), false); assert.equal(daysLate(m, "2026-11-04"), 3); });
t("filtres membre / statut / priorité combinés", () => {
  const list = [mk({ assigneeId: "qafard", priority: "urgent" }, tom, "a"), mk({ assigneeId: "graw", validatorId: "tom", status: "in_progress" }, tom, "b"), mk({ assigneeId: "qafard", status: "done", priority: "high" }, tom, "c")];
  assert.equal(filterMissions(list, { assigneeId: "qafard" }).length, 2); assert.equal(filterMissions(list, { status: "done" }).length, 1); assert.equal(filterMissions(list, { priority: "urgent", assigneeId: "qafard" }).length, 1); assert.equal(filterMissions(list, {}).length, 3); assert.equal(filterMissions(list, { assigneeId: "graw", status: "done" }).length, 0);
});
t("compteurs par statut", () => assert.deepEqual(countByStatus([mk({}, tom, "a"), mk({ status: "in_progress" }, tom, "b"), mk({ status: "done" }, tom, "c"), mk({ status: "review" }, tom, "d")]), { todo: 1, in_progress: 1, review: 1, done: 1 }));
t("tri : retards d'abord, terminées en dernier", () => { const late = mk({ dueDate: "2026-10-01", priority: "normal" }, tom, "late"), urgent = mk({ priority: "urgent", dueDate: "2027-03-01" }, tom, "urgent"), done = mk({ status: "done", priority: "urgent" }, tom, "done"); assert.deepEqual(sortMissions([done, urgent, late], "2026-11-10").map((m) => m.id), ["late", "urgent", "done"]); });
t("l'équipe active se limite à Tom, Graw, Qafard (aucun autre identifiant accepté)", () => { for (const bad of ["sarah", "loick", "bastien"]) assert.ok(!validateMissionInput({ ...base, assigneeId: bad }, IDS).ok); });
console.log(`${n} tests MISSIONS : OK`);
