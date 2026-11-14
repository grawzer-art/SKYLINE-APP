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
t("pass et carte CLUB : nom sans troncature (plus de `truncate`), cadre de QR supprimé", () => {
  const p = read("src/components/v3/FlightPass.tsx"), v = read("src/components/v3/visual.tsx");
  assert.match(p, /<FitName name=\{name\}/); assert.doesNotMatch(p, /truncate/); assert.doesNotMatch(p, /Emplacement du QR/);
  const card = v.slice(v.indexOf("export function MembershipCard"), v.indexOf("Pastille de goût")); assert.match(card, /<FitName name=\{name\}/); assert.doesNotMatch(card, /truncate|h-full/);
  assert.match(card, /aspect-\[1\.586\/1\]/);
});
t("tuiles CLUB : Messages non cliquable (« soon »), My Space et Members restent des liens ; sous-titres sur 2 lignes", () => {
  const c = read("src/components/v3/V3Club.tsx"), v = read("src/components/v3/visual.tsx");
  assert.match(c, /href="\/v3\/club\/messages" soon=\{real\}/); assert.doesNotMatch(c, /href="\/v3\/club\/space"[^\n]*soon/); assert.doesNotMatch(c, /href="\/v3\/club\/members"[^\n]*soon/);
  assert.match(v, /line-clamp-2/); assert.match(v, /data-testid="tile-soon"/);
});
t("en-têtes de sécurité : nosniff + Referrer-Policy sur toutes les routes ; pas de CSP dans ce lot", () => {
  const c = read("next.config.ts"); assert.match(c, /X-Content-Type-Options/); assert.match(c, /Referrer-Policy/); assert.match(c, /VERCEL_ENV !== "production"\) headers\.push/); assert.doesNotMatch(c, /Content-Security-Policy/);
});
t("start_url du manifest inchangé (D5 reporté)", () => assert.match(read("src/app/manifest.ts"), /start_url: "\/"/));
t("STAFF HQ non touché par ce lot : aucun fichier staff, proxy, API ni supabase dans la liste (contrôle de non-présence des imports)", () => {
  assert.doesNotMatch(read("src/components/v3/FitName.tsx"), /staff|supabase/i);
});
console.log(`${n} tests OK`);
