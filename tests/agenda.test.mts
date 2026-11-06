// B3 — Agenda : règles pures. L'agenda RÉUTILISE les missions B2 (aucun second système de tâches). `node --experimental-strip-types tests/agenda.test.mts`
import assert from "node:assert/strict";
import { addDays, buildAgenda, canManageEvent, canSeeEvent, createEvent, dayCount, daysBetween, hasAnything, startOfWeek, toISO, validateEventInput, weekDays, type AgendaEvent } from "../src/domain/agenda.ts";
import { createMission, editMissionInfo, validateMissionInput, type Actor, type Mission, type MissionInput } from "../src/domain/missions.ts";

let n = 0; const t = (name: string, fn: () => void) => { fn(); n++; console.log("PASS", name); };
const IDS = ["tom", "graw", "qafard"]; const VIDS = ["tom", "graw"];
const tom: Actor = { memberId: "tom", coordinator: true }, qafard: Actor = { memberId: "qafard", coordinator: false };
const base: MissionInput = { title: "Repérage", description: "", assigneeId: "qafard", validatorId: "tom", dueDate: "2026-11-10", dueTime: "09:30", priority: "normal", status: "todo" };
let seq = 0;
const mk = (o: Partial<MissionInput> = {}, a: Actor = tom): Mission => { const r = createMission({ ...base, ...o }, a, IDS, "2026-11-01T10:00:00Z", `m${++seq}`, VIDS); assert.ok(r.ok, JSON.stringify(r)); return r.value; };
const TODAY = "2026-11-10"; // mardi

t("semaine : débute le lundi, 7 jours consécutifs, passage de mois et d'année corrects", () => {
  assert.equal(startOfWeek("2026-11-10"), "2026-11-09"); assert.equal(startOfWeek("2026-11-08"), "2026-11-02"); // dimanche → lundi précédent
  assert.deepEqual(weekDays("2026-11-10"), ["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15"]);
  assert.deepEqual(weekDays("2027-01-01").slice(0, 2), ["2026-12-28", "2026-12-29"]);
  assert.equal(addDays("2026-02-28", 1), "2026-03-01"); assert.equal(daysBetween("2026-11-10", "2026-11-13"), 3); assert.equal(toISO(new Date(2026, 10, 3)), "2026-11-03");
});
t("heure facultative d'une mission : format HH:MM, exige une date, effacée si la date disparaît", () => {
  assert.ok(validateMissionInput({ ...base }, IDS, VIDS).ok);
  for (const bad of ["9:30", "24:00", "12:60", "abc"]) assert.ok(!validateMissionInput({ ...base, dueTime: bad }, IDS, VIDS).ok, bad);
  const noDate = validateMissionInput({ ...base, dueDate: null, dueTime: "09:30" }, IDS, VIDS); assert.ok(!noDate.ok && noDate.errors.dueTime);
  const m = mk(); assert.equal(m.dueTime, "09:30");
  const r = editMissionInfo(m, { title: m.title, description: "", validatorId: "tom", dueDate: null, dueTime: null, priority: "normal" }, tom, IDS, "2026-11-02T00:00:00Z", VIDS);
  assert.ok(r.ok && r.value.dueDate === null && r.value.dueTime === null && r.value.history.at(-1)?.note?.includes("dueDate") && r.value.history.at(-1)?.note?.includes("dueTime"));
  assert.equal(mk({ dueTime: undefined }).dueTime, null);
});
t("« Mon agenda » : mes missions seulement ; « Équipe » : toutes celles que je vois ; placées à leur date, triées par heure", () => {
  const a = mk({ assigneeId: "qafard", dueTime: "14:00" }), b = mk({ assigneeId: "tom", validatorId: "graw", dueTime: "08:00" }), c = mk({ assigneeId: "qafard", dueTime: null }), d = mk({ assigneeId: "qafard", dueDate: "2026-11-11", dueTime: null });
  const mine = buildAgenda({ missions: [a, b, c, d], events: [], me: "qafard", coordinator: false, view: "mine", today: TODAY });
  assert.deepEqual((mine.byDay["2026-11-10"] ?? []).map((i) => i.key), [`m:${a.id}`, `m:${c.id}`]);                       // 14:00 puis « toute la journée »
  assert.equal(dayCount(mine, "2026-11-11"), 1); assert.ok(!(mine.byDay["2026-11-10"] ?? []).some((i) => i.key === `m:${b.id}`));
  const team = buildAgenda({ missions: [a, b, c, d], events: [], me: "qafard", coordinator: false, view: "team", today: TODAY });
  assert.deepEqual((team.byDay["2026-11-10"] ?? []).map((i) => i.key), [`m:${b.id}`, `m:${a.id}`, `m:${c.id}`]);        // 08:00, 14:00, jour
});
t("« À planifier » : missions sans date non terminées ; « En retard » : échéance passée non terminée ; archivées exclues", () => {
  const nodate = mk({ dueDate: null, dueTime: null }), late = mk({ dueDate: "2026-11-05", dueTime: null }), done = { ...mk({ dueDate: "2026-11-01", dueTime: null }), status: "done" as const }, arch = { ...mk({ dueDate: null, dueTime: null }), archivedAt: "2026-11-02T00:00:00Z" };
  const ag = buildAgenda({ missions: [nodate, late, done, arch], events: [], me: "qafard", coordinator: false, view: "team", today: TODAY });
  assert.deepEqual(ag.unscheduled.map((m) => m.id), [nodate.id]); assert.deepEqual(ag.overdue.map((m) => m.id), [late.id]);
  assert.ok(!Object.values(ag.byDay).flat().some((i) => i.type === "mission" && i.mission.id === arch.id));
  assert.equal(dayCount(ag, "2026-11-01"), 1);                                                                          // la terminée reste visible à sa date
});
t("propositions d'attribution : listées pour les coordinateurs seulement", () => {
  const p = mk({ assigneeId: "tom", validatorId: "graw" }, qafard); assert.ok(p.proposedAssigneeId);
  assert.equal(buildAgenda({ missions: [p], events: [], me: "tom", coordinator: true, view: "team", today: TODAY }).proposals.length, 1);
  assert.equal(buildAgenda({ missions: [p], events: [], me: "qafard", coordinator: false, view: "team", today: TODAY }).proposals.length, 0);
});
t("l'agenda n'élargit JAMAIS la visibilité : seules les missions fournies (déjà filtrées par la base) apparaissent", () => {
  const visible = mk({ assigneeId: "qafard" }); const hidden = mk({ assigneeId: "tom", validatorId: "graw" });
  const ag = buildAgenda({ missions: [visible], events: [], me: "qafard", coordinator: false, view: "team", today: TODAY });
  assert.ok(!Object.values(ag.byDay).flat().some((i) => i.type === "mission" && i.mission.id === hidden.id));
});
const ev = (o: Partial<AgendaEvent> = {}): AgendaEvent => ({ id: "e1", title: "Point équipe", kind: "meeting", date: "2026-11-10", startTime: "10:00", endTime: "11:00", place: "Bureau", scope: "team", creatorId: "tom", createdAt: "2026-11-01T00:00:00Z", ...o });
t("réunions et événements : type DISTINCT des missions, portée équipe / personnelle, triés avec les missions", () => {
  const m = mk({ dueTime: "09:30", assigneeId: "qafard" });
  const ag = buildAgenda({ missions: [m], events: [ev(), ev({ id: "e2", scope: "me", creatorId: "tom", startTime: "09:00" }), ev({ id: "e3", startTime: null })], me: "qafard", coordinator: false, view: "mine", today: TODAY });
  assert.deepEqual((ag.byDay["2026-11-10"] ?? []).map((i) => i.key), [`m:${m.id}`, "e:e1", "e:e3"]);                      // e2 (personnel de Tom) invisible pour Qafard
  assert.ok(canSeeEvent(ev({ scope: "me", creatorId: "tom" }), "tom") && !canSeeEvent(ev({ scope: "me", creatorId: "tom" }), "qafard"));
  assert.ok(!(ag.byDay["2026-11-10"] ?? []).some((i) => i.type === "event" && i.event.id === "e2") && hasAnything(ag));
});
t("événements : validation (titre, date, heures cohérentes), création, droits de gestion", () => {
  const ok = (o: object) => validateEventInput({ title: "Brief", kind: "meeting", date: "2026-11-10", startTime: "10:00", endTime: "11:00", place: "", scope: "team", ...o } as never);
  assert.ok(ok({}).ok); assert.ok(!ok({ title: "  " }).ok); assert.ok(!ok({ date: "2026-02-30" }).ok); assert.ok(!ok({ endTime: "09:00" }).ok); assert.ok(!ok({ startTime: null, endTime: "11:00" }).ok); assert.ok(!ok({ startTime: "25:00" }).ok);
  const v = ok({ startTime: null, endTime: null }); assert.ok(v.ok && v.value.endTime === null);
  const c = createEvent({ title: " Brief ", kind: "event", date: "2026-11-10", startTime: null, endTime: null, place: "", scope: "team" }, "tom", "2026-11-01T00:00:00Z", "e9"); assert.ok(c.ok && c.value.title === "Brief" && c.value.creatorId === "tom");
  assert.ok(canManageEvent(ev(), "tom", false) && !canManageEvent(ev(), "qafard", false) && canManageEvent(ev({ creatorId: "qafard" }), "tom", true) && !canManageEvent(ev({ creatorId: "qafard", scope: "me" }), "tom", true));
});
t("agenda COLLECTIF : entrées minimales ajoutées en vue Équipe seulement, sans doublon avec une mission lisible, triées avec le reste", () => {
  const mine = mk({ assigneeId: "qafard", dueTime: "14:00" });
  const shared = [{ id: "s1", title: "Mission d'un autre", assigneeId: "tom", dueDate: "2026-11-10", dueTime: "08:00", status: "todo" as const, priority: "high" as const }, { id: mine.id, title: "doublon", assigneeId: "qafard", dueDate: "2026-11-10", dueTime: "14:00", status: "todo" as const, priority: "normal" as const }];
  const team = buildAgenda({ missions: [mine], events: [], me: "qafard", coordinator: false, view: "team", today: TODAY, shared });
  assert.deepEqual((team.byDay["2026-11-10"] ?? []).map((i) => i.key), ["s:s1", `m:${mine.id}`]);                       // 08:00 (partagée) puis 14:00 ; le doublon est ignoré
  const it = (team.byDay["2026-11-10"] ?? [])[0]; assert.ok(it.type === "shared"); assert.deepEqual(Object.keys((it as { entry: object }).entry).sort(), ["assigneeId", "dueDate", "dueTime", "id", "priority", "status", "title"]);
  const minev = buildAgenda({ missions: [mine], events: [], me: "qafard", coordinator: false, view: "mine", today: TODAY, shared });
  assert.ok(!Object.values(minev.byDay).flat().some((i) => i.type === "shared"));                                       // « Mon agenda » : jamais de missions d'autrui
  assert.equal(team.unscheduled.length + team.overdue.length + team.proposals.length, 0);                              // les entrées partagées n'alimentent pas « À planifier » / « En retard » / propositions
});
console.log(`${n} tests AGENDA : OK`);
