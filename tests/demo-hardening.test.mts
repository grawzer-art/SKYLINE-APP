// Durcissement : session STAFF de démonstration réservée au local : `node --experimental-strip-types --no-warnings tests/demo-hardening.test.mts`
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { demoSessionAllowed, onHostingPlatform } from "../src/lib/auth/demoGate.ts";

let n = 0; const t = (name: string, fn: () => void) => { fn(); n++; console.log("PASS", name); };

t("local (aucune variable d'hébergeur) : démo autorisée par défaut, coupée par DEMO_AUTH=off", () => {
  assert.equal(demoSessionAllowed({}), true); assert.equal(demoSessionAllowed({ DEMO_AUTH: "off" }), false); assert.equal(demoSessionAllowed({ DEMO_AUTH: "on" }), true);
});
t("Vercel : JAMAIS, quelle que soit la valeur de VERCEL_ENV, de VERCEL ou de DEMO_AUTH (variable absente, vide, incorrecte, « on »)", () => {
  for (const host of [{ VERCEL: "1" }, { VERCEL_ENV: "preview" }, { VERCEL_ENV: "production" }, { VERCEL_ENV: "development" }, { VERCEL_ENV: "n'importe quoi" }, { VERCEL: "1", VERCEL_ENV: "preview" }])
    for (const d of [undefined, "", "on", "ON", "true", "1", "off", "x"]) assert.equal(demoSessionAllowed({ ...host, DEMO_AUTH: d }), false, JSON.stringify({ ...host, d }));
});
t("onHostingPlatform : vide ou absent = pas d'hébergeur", () => { assert.equal(onHostingPlatform({}), false); assert.equal(onHostingPlatform({ VERCEL: "", VERCEL_ENV: "" }), false); assert.equal(onHostingPlatform({ VERCEL: "1" }), true); });
t("le contournement DEMO_AUTH=on n'existe plus dans le code", () => {
  const src = readFileSync(new URL("../src/lib/auth/token.ts", import.meta.url), "utf8");
  assert.ok(!/DEMO_AUTH === "on"/.test(src));
});
t("noindex hors production : en-tête X-Robots-Tag dans next.config.ts, noindex absent en production", () => {
  const src = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
  assert.ok(/X-Robots-Tag/.test(src) && /VERCEL_ENV !== "production"\) headers\.push/.test(src));
});
console.log(`${n} tests OK`);
