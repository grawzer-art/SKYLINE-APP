// Tests unitaires de la couche métier : `node --experimental-strip-types tests/community.test.mts`
import assert from "node:assert/strict";
import { LIMITS, canRequestContact, commonGenres, declineRetryAt, isEligible, isRateLimited, missingConditions, requestsRemaining, searchDirectory, validateIntro, validateMessage, validatePseudo } from "../src/domain/community.ts";

let n = 0; const t = (name: string, fn: () => void) => { fn(); n++; console.log("PASS", name); };

const full = { reservationConfirmed: true, accountActive: true, adult: true, charter: true, consent: true };
t("éligible quand les 5 conditions sont réunies", () => assert.equal(isEligible(full), true));
for (const k of Object.keys(full) as (keyof typeof full)[]) t(`inéligible sans « ${k} »`, () => { const e = { ...full, [k]: false }; assert.equal(isEligible(e), false); assert.deepEqual(missingConditions(e), [k]); });

t("message valide", () => assert.deepEqual(validateMessage("  Salut, tu écoutes quoi ?  "), { ok: true, text: "Salut, tu écoutes quoi ?" }));
t("message vide refusé", () => assert.deepEqual(validateMessage("   "), { ok: false, reason: "empty" }));
t("message trop long refusé", () => assert.deepEqual(validateMessage("a".repeat(LIMITS.messageMax + 1)), { ok: false, reason: "tooLong" }));
t("500 caractères exactement acceptés", () => assert.equal(validateMessage("a".repeat(LIMITS.messageMax)).ok, true));
for (const bad of ["va sur https://exemple.com", "www.test.fr", "écris-moi sur toto@mail.com", "mon site : super-dj.io", "suis-moi @dj_fan_2027", "insta : bit.ly/abc"]) t(`lien / contact externe refusé : ${bad}`, () => assert.deepEqual(validateMessage(bad), { ok: false, reason: "link" }));
for (const bad of ["appelle-moi 06 12 34 56 78", "+33 6 12 34 56 78", "mon num 0612345678", "06.12.34.56.78"]) t(`numéro de téléphone refusé : ${bad}`, () => assert.deepEqual(validateMessage(bad), { ok: false, reason: "phone" }));
for (const good of ["On se retrouve au départ à 8h ?", "J'ai 27 ans et toi ?", "Édition 2027, vol de 2 heures", "Rendez-vous porte 12"]) t(`texte courant accepté : ${good}`, () => assert.equal(validateMessage(good).ok, true));

t("intro facultative vide acceptée", () => assert.deepEqual(validateIntro(""), { ok: true, text: "" }));
t("intro > 140 refusée", () => assert.deepEqual(validateIntro("a".repeat(141)), { ok: false, reason: "tooLong" }));
t("intro avec lien refusée", () => assert.deepEqual(validateIntro("regarde www.x.fr"), { ok: false, reason: "link" }));

t("pseudo trop court", () => assert.deepEqual(validatePseudo("A"), { ok: false, reason: "short" }));
t("pseudo trop long", () => assert.deepEqual(validatePseudo("a".repeat(25)), { ok: false, reason: "long" }));
t("pseudo avec lien refusé", () => assert.deepEqual(validatePseudo("dj.fan.com"), { ok: false, reason: "chars" }));
t("pseudo accentué accepté", () => assert.equal(validatePseudo("Maëlys").ok, true));

const now = 1_000_000_000_000;
t("quota : 10 demandes / jour", () => { const sent = Array.from({ length: 10 }, (_, i) => now - i * 1000); assert.equal(requestsRemaining(sent, now), 0); assert.equal(canRequestContact({ sentAt: sent, pendingCount: 0, now, alreadyLinked: false, blocked: false, self: false }).ok, false); });
t("quota : fenêtre glissante 24 h", () => { const sent = Array.from({ length: 10 }, () => now - 25 * 3_600_000); assert.equal(requestsRemaining(sent, now), 10); });
t("demande : 30 en attente max", () => assert.deepEqual(canRequestContact({ sentAt: [], pendingCount: 30, now, alreadyLinked: false, blocked: false, self: false }), { ok: false, reason: "pending" }));
t("demande : refusée si bloqué / déjà en contact / soi-même", () => {
  const base = { sentAt: [], pendingCount: 0, now, alreadyLinked: false, blocked: false, self: false };
  assert.deepEqual(canRequestContact({ ...base, blocked: true }), { ok: false, reason: "blocked" });
  assert.deepEqual(canRequestContact({ ...base, alreadyLinked: true }), { ok: false, reason: "already" });
  assert.deepEqual(canRequestContact({ ...base, self: true }), { ok: false, reason: "self" });
});
t("demande autorisée sinon", () => assert.deepEqual(canRequestContact({ sentAt: [], pendingCount: 0, now, alreadyLinked: false, blocked: false, self: false }), { ok: true }));
t("rafale : 5 messages en 10 s → limité", () => assert.equal(isRateLimited([now - 1, now - 2000, now - 4000, now - 6000, now - 9000], now), true));
t("rafale : 4 messages → libre", () => assert.equal(isRateLimited([now - 1, now - 2000, now - 4000, now - 6000], now), false));
t("rafale : anciens messages ignorés", () => assert.equal(isRateLimited([now - 11_000, now - 12_000, now - 13_000, now - 14_000, now - 15_000], now), false));
t("nouvelle demande possible 30 jours après un refus", () => assert.equal(declineRetryAt(now), now + 30 * 86_400_000));

const dir = [
  { id: "1", pseudo: "Zoé", city: "Lille", genres: ["House"], bio: "", visible: true },
  { id: "2", pseudo: "Alba", city: "Paris", genres: ["House", "Melodic"], bio: "", visible: true },
  { id: "3", pseudo: "Éric", city: "Paris", genres: ["Techno"], bio: "", visible: true },
  { id: "4", pseudo: "Privé", city: "Paris", genres: ["House"], bio: "", visible: false },
  { id: "5", pseudo: "Moi", city: "Paris", genres: ["House"], bio: "", visible: true },
];
t("annuaire : jamais de profil non visible", () => assert.ok(!searchDirectory(dir, { text: "", city: "", genres: [], blocked: [] }).some((m) => m.id === "4")));
t("annuaire : ni soi-même ni bloqués", () => assert.deepEqual(searchDirectory(dir, { text: "", city: "", genres: [], blocked: ["1"], selfId: "5" }).map((m) => m.id), ["2", "3"]));
t("annuaire : ordre alphabétique (sans classement)", () => assert.deepEqual(searchDirectory(dir, { text: "", city: "", genres: [], blocked: [] }).map((m) => m.pseudo), ["Alba", "Éric", "Moi", "Zoé"]));
t("annuaire : filtre ville + affinité + texte", () => { assert.deepEqual(searchDirectory(dir, { text: "", city: "Paris", genres: ["House"], blocked: [] }).map((m) => m.id), ["2", "5"]); assert.deepEqual(searchDirectory(dir, { text: "lil", city: "", genres: [], blocked: [] }).map((m) => m.id), ["1"]); });
t("affinités communes", () => assert.deepEqual(commonGenres(["House", "Techno"], ["Techno", "Disco"]), ["Techno"]));

console.log(`\n${n} tests unitaires : OK`);
