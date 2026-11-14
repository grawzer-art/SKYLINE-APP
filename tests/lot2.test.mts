// LOT 2 — contrôles de code : `node --experimental-strip-types --no-warnings tests/lot2.test.mts`
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (p: string) => readFileSync(new URL("../" + p, import.meta.url), "utf8");
let n = 0; const t = (name: string, fn: () => void) => { fn(); n++; console.log("PASS", name); };

t("langue : sélecteur masqué par un drapeau unique, langue effective toujours « fr » tant qu'il est faux, dictionnaires intacts", () => {
  const i = read("src/i18n/index.ts"); assert.match(i, /LANGUAGE_SWITCH_ENABLED = false/); assert.match(i, /activeLocale = \(l: Locale\): Locale => \(LANGUAGE_SWITCH_ENABLED \? l : "fr"\)/);
  assert.match(i, /dictionaries: Record<Locale, Record<string, string>> = \{ fr, en \}/);
  assert.match(read("src/components/v3/V3Profile.tsx"), /LANGUAGE_SWITCH_ENABLED && <Block label=\{t\("profile\.language"\)\}>/);
  assert.match(read("src/lib/useCommunity.ts"), /translate\(activeLocale\(state\.locale\)/);
  assert.match(read("src/components/participant/ClubSpaceReal.tsx"), /activeLocale\(state\.locale\)/);
  const fr = [...read("src/i18n/fr.ts").matchAll(/"([a-z][\w.]*)":/g)].map((m) => m[1]).sort(), en = [...read("src/i18n/en.ts").matchAll(/"([a-z][\w.]*)":/g)].map((m) => m[1]).sort();
  assert.deepEqual(fr, en, "fr et en gardent exactement les mêmes clés");
});
t("aucune mention « Prototype » / « démonstration » dans les métadonnées et textes d'accessibilité publics", () => {
  for (const f of ["src/app/layout.tsx", "src/app/v3/layout.tsx", "src/app/manifest.ts"]) assert.doesNotMatch(read(f).replace(/\/\/.*$/gm, ""), /Prototype|[Dd]émonstration/, f);
  assert.doesNotMatch(read("src/components/v3/FlightPass.tsx"), /prototype/i); assert.doesNotMatch(read("src/components/v3/V3Shell.tsx"), /accueil du prototype/);
  assert.match(read("src/app/v3/layout.tsx"), /template: "%s — SKYLINE"/);
});
t("pass : nom sans troncature (plus de `truncate`), cadre de QR supprimé", () => {
  const p = read("src/components/v3/FlightPass.tsx");
  assert.match(p, /<FitName name=\{name\}/); assert.doesNotMatch(p, /truncate/); assert.doesNotMatch(p, /Emplacement du QR/);
});
t("CLUB V3.2 : plus de carte membre ; Messages réservé à la revue locale ; sous-titres sur 2 lignes", () => {
  const c = read("src/components/v3/V3Club.tsx"), v = read("src/components/v3/visual.tsx");
  assert.doesNotMatch(c, /MembershipCard|TiltToggle|useMetal/); assert.doesNotMatch(v, /MembershipCard/);
  assert.match(c, /\{x\.review && <NavTile href="\/v3\/club\/messages"/); assert.match(v, /line-clamp-2/);
  assert.match(c, /href="\/v3\/club\/space" title=\{real \? "Mon profil CLUB" : "My Space"\}/); assert.match(c, /href="\/v3\/club\/members" title=\{real \? "Membres" : "Members"\}/); assert.match(c, /href="\/v3\/club\/memories" title="Souvenirs"/);
});
t("en-têtes de sécurité : nosniff + Referrer-Policy sur toutes les routes ; pas de CSP dans ce lot", () => {
  const c = read("next.config.ts"); assert.match(c, /X-Content-Type-Options/); assert.match(c, /Referrer-Policy/); assert.match(c, /VERCEL_ENV !== "production"\) headers\.push/); assert.doesNotMatch(c, /Content-Security-Policy/);
});
t("start_url du manifest inchangé (D5 reporté)", () => assert.match(read("src/app/manifest.ts"), /start_url: "\/"/));
t("STAFF HQ non touché par ce lot : aucun fichier staff, proxy, API ni supabase dans la liste (contrôle de non-présence des imports)", () => {
  assert.doesNotMatch(read("src/components/v3/FitName.tsx"), /staff|supabase/i);
});
console.log(`${n} tests OK`);

// ---- V3.2 : en-tête (pur) ----
const { headerMode, headerLabel, headerBack } = await import("../src/components/v3/headerMode.ts");
t("V3.2 en-tête : HOME « home », MY FLIGHT / CLUB / sous-écrans / compte « compact », EXPLORE et inscription « legacy », revue locale toujours « legacy »", () => {
  assert.equal(headerMode("/v3", false), "home");
  for (const p of ["/v3/flight", "/v3/club", "/v3/club/space", "/v3/club/members", "/v3/club/memories", "/v3/club/messages", "/v3/profile", "/v3/account"]) assert.equal(headerMode(p, false), "compact", p);
  for (const p of ["/v3/explore", "/v3/explore/sound", "/v3/signup"]) assert.equal(headerMode(p, false), "legacy", p);
  for (const p of ["/v3", "/v3/flight", "/v3/club", "/v3/club/space", "/v3/account"]) assert.equal(headerMode(p, true), "legacy", "revue " + p);
});
t("V3.2 en-tête : noms d'écran courts (≤ 11 caractères pour tenir à 320 px) et retours sur les sous-écrans seulement", () => {
  for (const [p, l] of [["/v3/flight", "MY FLIGHT"], ["/v3/club", "CLUB"], ["/v3/club/space", "PROFIL CLUB"], ["/v3/club/members", "MEMBRES"], ["/v3/club/memories", "SOUVENIRS"], ["/v3/account", "COMPTE"]] as const) { assert.equal(headerLabel(p), l); assert.ok(l.length <= 11); }
  assert.equal(headerBack("/v3/flight"), null); assert.equal(headerBack("/v3/club"), null); assert.deepEqual(headerBack("/v3/club/space"), { href: "/v3/club", label: "Club" }); assert.deepEqual(headerBack("/v3/account"), { href: "/v3/profile", label: "Profil" });
});
t("V3.2 MY FLIGHT : reflet = TiltButton intégré au pass (plus de TiltToggle), onglets masqués seulement si tout est en attente et hors revue", () => {
  const f = read("src/components/v3/V3Flight.tsx"), p = read("src/components/v3/FlightPass.tsx"), m = read("src/components/v3/metal.tsx");
  assert.doesNotMatch(f, /TiltToggle/); assert.match(p, /<TiltButton metal=\{metal\}/); assert.match(m, /export function TiltButton/); assert.match(m, /size-11/);
  assert.match(f, /const allWaiting = !x\.review && !trip\.departure && !trip\.stay && trip\.updates\.length === 0/);
});
t("V3.2 HOME : plus de lien vers MY FLIGHT en live, action contextuelle seulement (connexion / profil), revue locale inchangée", () => {
  const h = read("src/components/v3/V3Home.tsx");
  assert.match(h, /function contextualCta/); assert.match(h, /x\.review \? \{ label: c\.cta\.label/); assert.doesNotMatch(h, /contextualCta[\s\S]{0,400}\/v3\/flight/);
});
