// Sprint V3.1 — Résolveur de vérité de l'expérience participants + mode revue LOCAL uniquement.
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { isLoopbackHost, reviewModeAllowed } from "../src/lib/experience/reviewMode.ts";
import { resolveExperience, type ExperienceInput, type IdentityView } from "../src/lib/experience/resolve.ts";

let n = 0; const t = (name: string, fn: () => void) => { fn(); n++; console.log("PASS", name); };
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = `${d}/${f}`; return statSync(p).isDirectory() ? walk(p) : [p]; });
const NOT_CONFIRMED = { dates: false, schedule: false, seats: false, tickets: false };
const base = (o: Partial<ExperienceInput> & { identity: IdentityView }): ExperienceInput => ({ review: false, proto: { phase: "during", sim: { reservation: "confirmed", tone: true, trip: true } }, confirmation: NOT_CONFIRMED, datePhase: "during", ...o });

t("MODE REVUE : local uniquement — variable explicite + aucune plateforme + boucle locale (relais public refusé) ; jamais Vercel (Preview ni Production)", () => {
  const on = { SKYLINE_REVIEW_MODE: "on" }; const local = { host: "localhost:3100" };
  assert.equal(reviewModeAllowed(on, local), true); assert.equal(reviewModeAllowed(on, { host: "127.0.0.1:3000" }), true); assert.equal(reviewModeAllowed(on, { host: "[::1]:3000" }), true);
  for (const v of [undefined, "", "off", "ON", "true", "1", " on"]) assert.equal(reviewModeAllowed({ SKYLINE_REVIEW_MODE: v }, local), false, String(v));
  for (const e of [{ VERCEL: "1" }, { VERCEL_ENV: "production" }, { VERCEL_ENV: "preview" }, { VERCEL_ENV: "development" }, { VERCEL: "1", VERCEL_ENV: "preview" }]) assert.equal(reviewModeAllowed({ ...on, ...e }, local), false, JSON.stringify(e));
  for (const h of ["skyline-app.vercel.app", "example.com", "localhost.evil.com", "evil.com#localhost", "192.168.1.5:3000", "0.0.0.0:3000", "", null, undefined, "localhost:abc"]) assert.equal(reviewModeAllowed(on, { host: h }), false, String(h));
  assert.equal(reviewModeAllowed(on, { host: "localhost:3000", forwardedHost: "skyline-app.vercel.app" }), false);       // relais public : jamais
  assert.equal(reviewModeAllowed(on, { host: "localhost:3000", forwardedHost: "10.0.0.5:3000" }), false);
  assert.equal(reviewModeAllowed(on, { host: "localhost:3000", forwardedHost: "localhost:3000" }), true);                  // en-tête ajouté par Next.js lui-même
  assert.equal(isLoopbackHost("LOCALHOST:3100"), true); assert.equal(isLoopbackHost("localhost@evil.com"), false);
});
t("SURFACES : chargement → rien de simulé ; revue ; compte ; sans comptes", () => {
  assert.equal(resolveExperience(base({ review: null, identity: { status: "loading" } })).surface, "loading");
  assert.equal(resolveExperience(base({ review: null, identity: { status: "off" } })).surface, "loading");                        // revue pas encore connue
  assert.equal(resolveExperience(base({ review: true, identity: { status: "off" } })).surface, "review");
  assert.equal(resolveExperience(base({ review: false, identity: { status: "off" } })).surface, "open");
  for (const status of ["anonymous", "no_access", "error", "misconfigured", "ready"] as const) assert.equal(resolveExperience(base({ review: true, identity: { status } })).surface, "account", status);   // la revue n'existe pas avec de vrais comptes
});
t("SANS COMPTES (authentification désactivée, hors revue) : aucune réservation, aucun voyage, aucune simulation, phase « avant », même avec un état local « confirmé / pendant »", () => {
  const x = resolveExperience(base({ identity: { status: "off" } }));
  assert.deepEqual([x.surface, x.reservation, x.verifiedTraveler, x.reservationConfirmed, x.accountActive, x.phase, x.demoTrip, x.demoTone, x.demoContent, x.showSimulation, x.countdown, x.toConfirmDates],
    ["open", "none", false, false, false, "before", false, false, false, false, false, true]);
});
t("ANONYME (compte requis, non connecté) : mêmes garanties", () => {
  const x = resolveExperience(base({ identity: { status: "anonymous" } })); assert.deepEqual([x.surface, x.reservation, x.reservationConfirmed, x.phase, x.demoTrip, x.showSimulation], ["account", "none", false, "before", false, false]);
});
t("MEMBRE SANS RÉSERVATION : traveler « none » ⇒ pas de réservation, communauté fermée, quel que soit l'état local simulé", () => {
  const x = resolveExperience(base({ identity: { status: "ready", traveler: "none" } }));
  assert.deepEqual([x.reservation, x.verifiedTraveler, x.reservationConfirmed, x.accountActive, x.phase, x.demoTrip, x.demoTone], ["none", false, false, true, "before", false, false]);
});
t("STATUT INCONNU (migration non appliquée / erreur) : jamais « vérifié » par défaut", () => {
  for (const tr of [undefined, "unknown" as const]) { const x = resolveExperience(base({ identity: { status: "ready", traveler: tr } })); assert.deepEqual([x.reservation, x.verifiedTraveler, x.reservationConfirmed], ["unknown", false, false]); }
});
t("VOYAGEUR VÉRIFIÉ : seule la preuve serveur produit « verified » (et rien d'autre : pas de voyage, pas de phase, pas de démonstration)", () => {
  const x = resolveExperience(base({ identity: { status: "ready", traveler: "verified" } }));
  assert.deepEqual([x.reservation, x.verifiedTraveler, x.reservationConfirmed, x.phase, x.demoTrip, x.demoContent], ["verified", true, true, "before", false, false]);
});
t("ISOLEMENT : aucun état local (phase, réservation, trip, tone) ne change le résultat hors revue — balayage exhaustif", () => {
  const ids: IdentityView[] = [{ status: "off" }, { status: "anonymous" }, { status: "no_access" }, { status: "ready", traveler: "none" }, { status: "ready", traveler: "verified" }, { status: "ready", traveler: "unknown" }];
  for (const identity of ids) {
    const ref = resolveExperience(base({ identity, proto: { phase: "before", sim: { reservation: "pending", tone: false, trip: false } } }));
    for (const phase of ["before", "during", "after"] as const) for (const reservation of ["confirmed", "pending"] as const) for (const tone of [true, false]) for (const trip of [true, false])
      assert.deepEqual(resolveExperience(base({ identity, proto: { phase, sim: { reservation, tone, trip } } })), ref, JSON.stringify([identity, phase, reservation, tone, trip]));
  }
});
t("PHASE : « avant » tant que les dates ne sont pas confirmées ; suit la date réelle seulement une fois confirmée", () => {
  const confirmed = { ...NOT_CONFIRMED, dates: true };
  for (const dp of ["before", "during", "after"] as const) { assert.equal(resolveExperience(base({ identity: { status: "off" }, datePhase: dp })).phase, "before"); assert.equal(resolveExperience(base({ identity: { status: "off" }, datePhase: dp, confirmation: confirmed })).phase, dp); }
  assert.equal(resolveExperience(base({ identity: { status: "off" }, confirmation: confirmed })).countdown, true);
});
t("REVUE : la simulation pilote tout, étiquetée (jamais « vérifié » : statut voyageur serveur absent)", () => {
  const x = resolveExperience(base({ review: true, identity: { status: "off" } }));
  assert.deepEqual([x.surface, x.phase, x.reservation, x.reservationConfirmed, x.verifiedTraveler, x.demoTrip, x.demoTone, x.showSimulation, x.demoContent], ["review", "during", "simulated_confirmed", true, false, true, true, true, true]);
  assert.equal(resolveExperience(base({ review: true, identity: { status: "off" }, proto: { phase: "after", sim: { reservation: "pending", tone: false, trip: false } } })).reservation, "simulated_pending");
});
t("CODE : plus aucune lecture de l'état simulé (state.sim / state.phase) hors résolveur, éligibilité et stockage ; aucun QR ; pas de ?phase=", () => {
  const allowed = new Set(["src/lib/experience/resolve.ts", "src/lib/experience/useExperience.ts", "src/lib/useProto.ts", "src/lib/useCommunity.ts", "src/components/v3/V3Shell.tsx"]);
  for (const f of walk("src").filter((x) => /\.(ts|tsx)$/.test(x))) { const s = strip(readFileSync(f, "utf8"));
    if (/\bstate\.sim\b|\bstate\.phase\b|\.sim\.(reservation|tone|trip)\b/.test(s)) assert.ok(allowed.has(f), `${f} lit l'état simulé directement`);
    assert.doesNotMatch(s, /qrcode|QRCode|qr-code|toDataURL\(/i, f); assert.doesNotMatch(s, /searchParams[^\n]*["']phase["']|get\(["']phase["']\)/, `${f} : ?phase=`); }
  assert.doesNotMatch(strip(readFileSync("src/lib/useEventPhase.ts", "utf8")), /forced|phase=/);
});
console.log(`${n} tests EXPÉRIENCE : OK`);
