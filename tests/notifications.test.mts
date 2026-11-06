// B3 — Notifications : dérivation STAFF depuis les missions réelles, préférences, annonces, participants, contrats Web Push. Aucun envoi réel.
// `node --experimental-strip-types tests/notifications.test.mts`
import assert from "node:assert/strict";
import { ANNOUNCEMENT_LIMITS, STAFF_CATEGORIES, canSendAnnouncement, confirmationLabel, defaultStaffPrefs, deriveReminders, deriveStaffNotifications, isVisible, normalizeStaffPrefs, staffSamples, unreadCount, validateAnnouncement } from "../src/domain/notifications.ts";
import { PARTICIPANT_CATEGORIES, defaultParticipantPrefs, isParticipantVisible, normalizeParticipantPrefs, participantSamples } from "../src/domain/participant-notifications.ts";
import { PUSH_SENDING_ENABLED, PUSH_ROUTES, canSendPush, detectPushSupport, minimalPayload, type PushEnv } from "../src/lib/push/contracts.ts";
import { assignMission, changeStatus, createMission, resolveAssignment, type Actor, type Mission, type MissionInput } from "../src/domain/missions.ts";

let n = 0; const t = (name: string, fn: () => void) => { fn(); n++; console.log("PASS", name); };
const IDS = ["tom", "graw", "qafard"]; const VIDS = ["tom", "graw"]; const NAME = (id: string) => ({ tom: "Tom", graw: "Graw", qafard: "Qafard" })[id] ?? id;
const tom: Actor = { memberId: "tom", coordinator: true }, graw: Actor = { memberId: "graw", coordinator: true }, qafard: Actor = { memberId: "qafard", coordinator: false };
const NOW = Date.parse("2026-11-10T12:00:00Z"); const iso = (h: number) => new Date(NOW - h * 3_600_000).toISOString();
const base: MissionInput = { title: "Repérage photo", description: "", assigneeId: "qafard", validatorId: "graw", dueDate: "2026-11-11", priority: "normal", status: "todo" };
const mk = (a: Actor, o: Partial<MissionInput> = {}, at = iso(3)): Mission => { const r = createMission({ ...base, ...o }, a, IDS, at, `m-${Math.random().toString(36).slice(2, 7)}`, VIDS); assert.ok(r.ok, JSON.stringify(r)); return r.value; };
const run = (m: Mission, actor: Actor) => deriveStaffNotifications({ missions: [m], actor, name: NAME, now: NOW });
const titles = (l: { title: string }[]) => l.map((x) => x.title);

t("nouvelle mission : notifie le RESPONSABLE (pas le créateur) ; lien profond vers la mission", () => {
  const m = mk(tom); const q = run(m, qafard); assert.deepEqual(titles(q), ["Nouvelle mission"]); assert.equal(q[0].category, "missions"); assert.equal(q[0].href, `/staff/missions?mission=${m.id}`); assert.match(q[0].body, /Tom vous a confié/);
  assert.deepEqual(run(m, tom), []);                                                                            // jamais pour ses propres actions
});
t("proposition : le coordinateur est prévenu ; la personne proposée aussi ; acceptation / refus remontent au proposant", () => {
  const p = mk(qafard, { assigneeId: "tom", validatorId: "graw" }); assert.equal(p.proposedAssigneeId, "tom");
  assert.deepEqual(titles(run(p, graw)), ["Proposition à traiter"]);                                            // graw (coordinateur) voit la proposition
  assert.ok(titles(run(p, tom)).includes("Proposition à traiter"));                                             // tom aussi (coordinateur)
  const ok = resolveAssignment(p, true, tom, iso(1)); assert.ok(ok.ok);
  assert.deepEqual(titles(run(ok.value, qafard)).includes("Proposition acceptée"), true);
  const no = resolveAssignment(p, false, graw, iso(1)); assert.ok(no.ok); assert.ok(titles(run(no.value, qafard)).includes("Proposition refusée"));
  const memberTarget = mk(tom, { assigneeId: "graw", validatorId: "tom" }); const prop = assignMission(memberTarget, "qafard", { memberId: "graw", coordinator: false }, IDS, iso(2)); assert.ok(prop.ok);
  assert.deepEqual(titles(run(prop.value, qafard)), ["On vous propose une mission"]);                            // un membre non coordinateur proposé
});
t("validations : « à valider » (validateur), « validée » et « renvoyée » (responsable)", () => {
  let m = mk(tom, { assigneeId: "qafard", validatorId: "graw" }); const s = changeStatus(m, "in_progress", qafard, iso(2)); assert.ok(s.ok); const r = changeStatus(s.value, "review", qafard, iso(1)); assert.ok(r.ok); m = r.value;
  assert.deepEqual(titles(run(m, graw)).filter((x) => x === "À valider").length, 1);
  assert.equal(run(m, qafard).filter((x) => x.category === "validations").length, 0);                           // pas de notification pour son propre envoi
  const v = changeStatus(m, "done", graw, iso(0)); assert.ok(v.ok); assert.ok(titles(run(v.value, qafard)).includes("Mission validée"));
  assert.equal(run(v.value, graw).filter((x) => x.title === "À valider").length, 0);                            // plus « à valider » une fois validée
  const back = changeStatus(m, "in_progress", graw, iso(0)); assert.ok(back.ok); assert.ok(titles(run(back.value, qafard)).includes("Renvoyée en cours"));
});
t("réattribution : seule la personne concernée est notifiée ; un tiers n'est jamais notifié", () => {
  const m = mk(tom, { assigneeId: "tom", validatorId: "graw" }); const a = assignMission(m, "qafard", tom, IDS, iso(1)); assert.ok(a.ok);
  assert.ok(titles(run(a.value, qafard)).includes("Mission attribuée"));
  const other = mk(tom, { assigneeId: "graw", validatorId: "tom" }); assert.deepEqual(run(other, qafard), []);                          // mission qui ne le concerne pas
});
t("commentaires : notifient les personnes concernées, pas l'auteur, pas les étrangers à la mission", () => {
  const m = mk(tom); const c = [{ id: "c1", missionId: m.id, authorId: "tom", body: "Pense aux autorisations d'image.", createdAt: iso(1) }];
  const q = deriveStaffNotifications({ missions: [m], actor: qafard, name: NAME, now: NOW, comments: c }); assert.ok(q.some((x) => x.category === "comments" && x.title === "Commentaire de Tom"));
  assert.ok(!deriveStaffNotifications({ missions: [m], actor: tom, name: NAME, now: NOW, comments: c }).some((x) => x.category === "comments"));
  const stranger: Actor = { memberId: "ghost", coordinator: false }; assert.deepEqual(deriveStaffNotifications({ missions: [m], actor: stranger, name: NAME, now: NOW, comments: c }), []);
});
t("fenêtre de 30 jours ; missions archivées ignorées ; identifiants stables (même évènement = même id)", () => {
  const old = mk(tom, {}, new Date(NOW - 45 * 86_400_000).toISOString()); assert.deepEqual(run(old, qafard), []);
  const m = mk(tom); assert.deepEqual(run({ ...m, archivedAt: iso(0) }, qafard), []); assert.deepEqual(run(m, qafard).map((x) => x.id), run(m, qafard).map((x) => x.id));
});
t("rappels d'échéance : mes missions non terminées, selon le délai choisi ; retard toujours signalé", () => {
  const soon = mk(tom, { dueDate: "2026-11-11", dueTime: "09:00" }); const far = mk(tom, { dueDate: "2026-11-14" }); const late = mk(tom, { dueDate: "2026-11-08" }); const done = { ...mk(tom, { dueDate: "2026-11-11" }), status: "done" as const }; const notMine = mk(tom, { assigneeId: "graw", validatorId: "tom", dueDate: "2026-11-11" });
  const at = (lead: "same_day" | "day_before" | "two_days") => deriveReminders({ missions: [soon, far, late, done, notMine], actor: qafard, now: NOW, lead });
  assert.deepEqual(at("same_day").map((x) => x.title), ["Mission en retard"]);
  const d1 = at("day_before"); assert.deepEqual(d1.map((x) => x.title).sort(), ["Mission en retard", "Échéance demain"]); assert.match(d1.find((x) => x.title === "Échéance demain")?.body ?? "", /à 09h00/);
  assert.equal(at("two_days").length, 2); assert.ok(at("day_before").find((x) => x.title === "Mission en retard")?.urgent);
  assert.equal(deriveReminders({ missions: [soon], actor: qafard, now: NOW, lead: "day_before" })[0].id, `due:${soon.id}:2026-11-11`);
});
t("préférences : défauts, fusion défensive (valeurs inconnues ignorées), annonces URGENTES jamais masquées", () => {
  const d = defaultStaffPrefs(); assert.ok(Object.values(d.categories).every(Boolean) && d.push === false && d.reminderLead === "day_before");
  const p = normalizeStaffPrefs({ categories: { comments: false, bogus: false, missions: "non" }, reminderLead: "never", push: "yes" }); assert.deepEqual([p.categories.comments, p.categories.missions, p.reminderLead, p.push], [false, true, "day_before", false]);
  assert.deepEqual(normalizeStaffPrefs(null), d); assert.deepEqual(normalizeStaffPrefs("garbage"), d); assert.equal(STAFF_CATEGORIES.length, 6);
  const off = { ...d, categories: { ...d.categories, announcements: false, comments: false } };
  const urgent = { id: "a", category: "announcements" as const, title: "x", body: "", at: iso(1), href: null, urgent: true }; assert.ok(isVisible(urgent, off) && !isVisible({ ...urgent, urgent: false }, off) && !isVisible({ ...urgent, category: "comments" }, off));
  assert.equal(unreadCount([urgent, { ...urgent, id: "b" }], new Set(["a"])), 1);
});
t("exemples STAFF : toujours marqués « sample », identifiants préfixés — jamais confondus avec du réel", () => { const s = staffSamples(NOW); assert.ok(s.length >= 3 && s.every((x) => x.sample === true && x.id.startsWith("sample:") && /fictif|Exemple/i.test(x.body + x.title))); });
t("annonces : réservées aux administrateurs, validées, confirmation explicite (case dédiée pour l'envoi global)", () => {
  for (const aud of ["staff", "participants"] as const) { assert.ok(canSendAnnouncement(tom, aud) && canSendAnnouncement(graw, aud)); assert.ok(!canSendAnnouncement(qafard, aud), `member refusé (${aud})`); }
  assert.ok(validateAnnouncement({ audience: "staff", title: " Briefing ", body: " Rendez-vous 9h ", urgent: false }).ok);
  assert.ok(!validateAnnouncement({ audience: "staff", title: "", body: "x", urgent: false }).ok && !validateAnnouncement({ audience: "staff", title: "x", body: "", urgent: false }).ok);
  assert.ok(!validateAnnouncement({ audience: "participants", title: "x".repeat(ANNOUNCEMENT_LIMITS.title + 1), body: "x", urgent: false }).ok && !validateAnnouncement({ audience: "participants", title: "x", body: "x".repeat(ANNOUNCEMENT_LIMITS.body + 1), urgent: false }).ok);
  assert.match(confirmationLabel("participants"), /tous les participants/); assert.match(confirmationLabel("staff"), /équipe STAFF/);
});
t("participants : catégories DISTINCTES de STAFF (aucune en commun), préférences, communications urgentes non masquables", () => {
  const staff = new Set<string>(STAFF_CATEGORIES.map((c) => c.id)); assert.ok(PARTICIPANT_CATEGORIES.every((c) => !staff.has(c.id)) && PARTICIPANT_CATEGORIES.length === 5);
  assert.deepEqual(PARTICIPANT_CATEGORIES.map((c) => c.id), ["artists", "flight", "program", "departure", "official"]);
  const d = defaultParticipantPrefs(); assert.equal(normalizeParticipantPrefs({ categories: { flight: false, x: 1 }, push: 1 }).categories.flight, false); assert.equal(normalizeParticipantPrefs(undefined).push, false);
  const off = { ...d, categories: { ...d.categories, official: false, flight: false } }; const s = participantSamples(NOW);
  assert.ok(isParticipantVisible(s.find((x) => x.urgent)!, off) && !isParticipantVisible(s.find((x) => x.category === "flight")!, off));
});
t("exemples participants : marqués « sample », génériques (aucun nom d'artiste, horaire ou numéro de vol inventé), bilingues", () => {
  for (const loc of ["fr", "en"] as const) { const s = participantSamples(NOW, loc); assert.equal(s.length, 5); for (const x of s) { assert.ok(x.sample && x.id.startsWith("sample:")); assert.doesNotMatch(x.title + x.body, /\d{1,2}[h:]\d{2}|[A-Z]{2}\d{3,4}/); } }
  assert.notEqual(participantSamples(NOW, "fr")[0].title, participantSamples(NOW, "en")[0].title);
});
const env = (o: Partial<PushEnv> = {}): PushEnv => ({ secure: true, isIOS: true, standalone: true, hasServiceWorker: true, hasPushManager: true, hasNotification: true, permission: "default", ...o });
t("Web Push (contrat) : AUCUN envoi ni abonnement en phase 1 ; détection : iPhone hors PWA → installation requise", () => {
  assert.equal(PUSH_SENDING_ENABLED, false);
  assert.equal(detectPushSupport(env({ standalone: false, hasPushManager: false })).state, "needs_install");           // Safari iPhone : PushManager absent hors PWA
  assert.equal(detectPushSupport(env({ secure: false })).state, "unsupported");
  assert.equal(detectPushSupport(env({ isIOS: false, hasPushManager: false })).state, "unsupported");
  assert.equal(detectPushSupport(env({ permission: "denied" })).state, "blocked");
  assert.equal(detectPushSupport(env()).state, "coming_soon");                                                        // tout est prêt côté appareil, mais l'envoi n'est pas activé
  assert.equal(detectPushSupport(env(), true).state, "ready");
});
t("Web Push (contrat) : envoi réservé aux administrateurs avec confirmation ; charge utile minimale ; routes documentées", () => {
  assert.ok(canSendPush(tom, true) && !canSendPush(tom, false) && !canSendPush(qafard, true));
  const p = minimalPayload({ id: "ev:1", urgent: true, url: "/staff/missions?mission=abc" }, "staff"); assert.deepEqual([p.title, p.url, p.urgent], ["SKYLINE STAFF", "/staff/missions?mission=abc", true]); assert.doesNotMatch(p.body, /mission|Repérage/i);
  assert.equal(minimalPayload({ id: "x", url: "https://evil.example" }, "participants").url, "/v3/notifications");        // jamais d'URL externe
  assert.deepEqual(Object.keys(PUSH_ROUTES), ["subscribe", "unsubscribe", "devices", "send"]);
});
t("code de l'interface : aucune demande d'autorisation ni abonnement push, aucun service worker enregistré (phase 1)", async () => {
  const { readFileSync, readdirSync } = await import("node:fs"); const files = ["src/components/notifications/PushCard.tsx", "src/components/staff/notifications/NotificationsScreen.tsx", "src/components/v3/V3Notifications.tsx", "src/lib/notifications/useStaffNotifications.ts", "src/lib/notifications/storage.ts"];
  for (const f of files) assert.doesNotMatch(readFileSync(f, "utf8"), /requestPermission|pushManager\.subscribe|serviceWorker\.register|new Notification\(/, f);
  assert.ok(!readdirSync("public").includes("sw.js"), "pas de service worker déployé en phase 1");
  assert.doesNotMatch(readFileSync("src/components/layout/Header.tsx", "utf8") + readFileSync("src/components/v3/V3Shell.tsx", "utf8"), /requestPermission/);
});
t("séparation des stockages : STAFF et participants n'ont aucune clé en commun", async () => {
  const { readFileSync } = await import("node:fs"); const keys = (f: string) => [...readFileSync(f, "utf8").matchAll(/skyline\.[a-z.]+\.v\d/g)].map((m) => m[0]);
  const s = keys("src/lib/notifications/useStaffNotifications.ts"); const p = keys("src/components/v3/V3Notifications.tsx"); assert.ok(s.length >= 3 && p.length >= 3); assert.ok(s.every((k) => !p.includes(k)) && s.every((k) => k.startsWith("skyline.staff.")) && p.every((k) => k.startsWith("skyline.participant.")));
});
console.log(`${n} tests NOTIFICATIONS : OK`);
