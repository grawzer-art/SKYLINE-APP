// Sprint V3.1 — Navigation V3 unifiée, redirections sans boucle, mode revue protégé, contenus sans texte de remplacement.
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { isTabActive, legacyRedirects, navItems } from "../src/components/layout/nav-items.ts";

let n = 0; const t = (name: string, fn: () => void) => { fn(); n++; console.log("PASS", name); };
const read = (p: string) => readFileSync(p, "utf8"); const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = `${d}/${f}`; return statSync(p).isDirectory() ? walk(p) : [p]; });

t("ONGLETS : quatre onglets uniques (HOME, MY FLIGHT, EXPLORE, CLUB), tous vers /v3 ; une seule source partagée par la barre V3", () => {
  assert.deepEqual(navItems.map((i) => [i.label, i.href]), [["Home", "/v3"], ["My Flight", "/v3/flight"], ["Explore", "/v3/explore"], ["Club", "/v3/club"]]);
  const shell = strip(read("src/components/v3/V3Shell.tsx")); assert.match(shell, /navItems\.map/); assert.match(shell, /isTabActive\(href, pathname\)/); assert.doesNotMatch(shell, /const tabs\s*=/); assert.doesNotMatch(shell, /href: "\/"/);
});
t("ÉTAT ACTIF : HOME seulement sur /v3 exact ; les autres sur leur page et sous-pages ; jamais deux onglets ; profil / compte / connexion : aucun", () => {
  const act = (p: string) => navItems.filter((i) => isTabActive(i.href, p)).map((i) => i.id);
  assert.deepEqual(act("/v3"), ["home"]);
  for (const [p, id] of [["/v3/flight", "flight"], ["/v3/explore", "explore"], ["/v3/explore/sound", "explore"], ["/v3/club", "club"], ["/v3/club/space", "club"], ["/v3/club/members/abc", "club"], ["/v3/club/messages/m1", "club"]] as const) assert.deepEqual(act(p), [id], p);
  for (const p of ["/v3/profile", "/v3/account", "/v3/login", "/v3/signup", "/v3/flightx", "/v3/clubhouse", "/", "/start"]) assert.deepEqual(act(p), [], p);
});
t("REDIRECTIONS : table unique, une seule étape, aucune boucle ; /v3, /auth, /staff, /signal, /start jamais redirigés ; /crew → /v3/club", () => {
  const sources = new Set(legacyRedirects.map((r) => r.source.replace("/:path*", "")));
  for (const r of legacyRedirects) { const dest = r.destination; assert.ok(!sources.has(dest), `${r.source} → ${dest} : chaîne`); assert.notEqual(r.source.replace("/:path*", ""), dest); assert.match(dest, /^\/v3(\/[a-z]+)*$/); }
  for (const r of legacyRedirects) for (const forbidden of ["/auth", "/staff", "/signal", "/start", "/api"]) assert.ok(!r.source.startsWith(forbidden), r.source);
  for (const s of ["/v3/login", "/v3/signup", "/v3/signup/complete", "/v3/account", "/v3/flight", "/v3/explore", "/v3/club", "/v3", "/v3/explore/sound"]) assert.ok(![...sources].some((x) => x === s), `${s} ne doit pas être redirigé`);
  const m = new Map(legacyRedirects.map((r) => [r.source, r.destination]));
  assert.equal(m.get("/crew"), "/v3/club"); assert.equal(m.get("/explore"), "/v3/explore"); assert.equal(m.get("/flight"), "/v3/flight"); assert.equal(m.get("/club"), "/v3/club"); assert.equal(m.get("/pass"), "/v3/flight"); assert.equal(m.get("/more"), "/v3"); assert.equal(m.get("/v3/explore/radio/:path*"), "/v3/explore/sound");
  assert.match(read("next.config.ts"), /legacyRedirects\.map/);
});
t("« / » : traité par le proxy — choix d'espace (/start) et STAFF mémorisé d'abord, sinon /v3 avec requête conservée ; aucune boucle (/v3 ne renvoie jamais vers /)", () => {
  const p = strip(read("src/proxy.ts")); const i = p.indexOf('pathname === "/"'); const blk = p.slice(i, p.indexOf("MODE REVUE", i) > 0 ? p.indexOf('pathname === "/v3/screens"', i) : i + 900);
  assert.match(blk, /to\("\/start"\)/); assert.match(blk, /to\("\/staff"\)/); assert.match(blk, /to\("\/v3", true\)/); assert.doesNotMatch(p.slice(p.indexOf('pathname === "/v3/screens"')), /to\("\/"/);
  assert.match(read("src/app/page.tsx"), /redirect\("\/v3"\)/);
  for (const f of walk("src/app/v3").filter((x) => /page\.tsx$/.test(x))) assert.doesNotMatch(strip(read(f)), /redirect\("\/"\)/, f);
});
t("PARCOURS D'AUTHENTIFICATION préservés : routes login / signup / account / callback / signout non redirigées ; destinations internes /v3 inchangées", () => {
  const cfg = read("src/lib/participant/paths.ts"); assert.match(cfg, /PARTICIPANT_HOME = "\/v3\/account"/); assert.match(cfg, /SIGNOUT_TARGETS = \["\/staff\/login", "\/v3\/login", "\/v3\/profile"\]/);
  const p = strip(read("src/proxy.ts")); for (const r of ['pathname === "/v3/login"', 'pathname === "/v3/signup"', 'pathname === "/v3/account"']) assert.ok(p.includes(r), r);
  assert.ok(existsSync("src/app/auth/callback/route.ts") && existsSync("src/app/auth/signout/route.ts"));
});
t("MODE REVUE protégé : plan des écrans et wireframes inexistants (404) hors revue LOCALE ; commandes de simulation absentes du parcours réel", () => {
  const p = strip(read("src/proxy.ts")); assert.match(p, /matcher: \[[^\]]*"\/v3\/screens", "\/v3\/wireframes"/);
  assert.match(p, /reviewModeFromProcess\(\{ host: request\.headers\.get\("host"\), forwardedHost: request\.headers\.get\("x-forwarded-host"\) \}\)[\s\S]*?NextResponse\.rewrite\(new URL\("\/signal-introuvable"/);
  const shell = strip(read("src/components/v3/V3Shell.tsx")); assert.match(shell, /x\.showSimulation && \(<button/); assert.match(shell, /\{x\.showSimulation && <Sheet/); assert.doesNotMatch(shell, /Quitter le prototype/);
  assert.match(strip(read("src/app/api/review-mode/route.ts")), /reviewModeFromProcess/); assert.doesNotMatch(read("src/lib/experience/reviewMode.ts").replace(/\/\*[\s\S]*?\*\//g, ""), /NODE_ENV/);
});
t("CONTENUS : aucun texte de remplacement entre crochets visible ; blocs vides masqués hors revue ; messages d'attente conservés", () => {
  for (const f of [...walk("src/components/v3"), ...walk("src/components/participant"), ...walk("src/components/home").filter(() => existsSync("src/components/home"))].filter((x) => x.endsWith(".tsx"))) {
    const s = strip(read(f)); const hit = s.match(/>\s*\[[A-Za-zÀ-ÿ'’ ]{4,50}\]\s*</g) ?? s.match(/"\[[A-ZÉ][A-Za-zÀ-ÿ'’ ]{4,50}\]"/g) ?? [];
    if (f.endsWith("V3Home.tsx")) { assert.match(s, /\{phase === "during" && x\.demoContent && <Now \/>\}/); continue; }   // emplacements de revue, jamais rendus en live
    assert.deepEqual(hit, [], f);
  }
  const ex = read("src/components/v3/V3Explore.tsx"); assert.match(ex, /x\.demoContent && <Block label="Line-up">/); assert.match(ex, /x\.demoContent && <Block label="Expériences à Ibiza">/);
  const fl = read("src/components/v3/V3Flight.tsx"); assert.match(fl, /Les détails de votre voyage apparaîtront ici dès leur confirmation/); assert.match(fl, /x\.demoContent && <ul/);
  assert.match(read("src/components/v3/V3Home.tsx"), /Dates à confirmer/);
});
t("AUCUNE donnée inventée en live : origine du pass « À confirmer », identité vide, compte à rebours seulement sur date confirmée", () => {
  assert.match(read("src/components/v3/V3Flight.tsx"), /origin=\{x\.demoContent \? "France" : "À confirmer"\}/); assert.match(read("src/components/participant/IdentityLine.tsx"), /id\.status === "off" && !x\.review\) return/);
  assert.match(read("src/components/v3/V3Home.tsx"), /x\.countdown \? <Countdown \/> : <DatesPending \/>/);
});
console.log(`${n} tests NAVIGATION : OK`);
