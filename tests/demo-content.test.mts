// LOT 1 — contenus de démonstration masqués par défaut : `node --experimental-strip-types tests/demo-content.test.mts`
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { demoContentAllowed } from "../src/lib/experience/demoContent.ts";
import { getSoundCollections, soundCollections } from "../src/data/sound.ts";

let n = 0; const t = (name: string, fn: () => void) => { fn(); n++; console.log("PASS", name); };

t("fermé par défaut : variable absente, vide, ou valeur incorrecte", () => {
  assert.equal(demoContentAllowed({}), false);
  for (const v of ["", "off", "ON", "true", "1", " on", "yes"]) assert.equal(demoContentAllowed({ SKYLINE_REVIEW_MODE: v }), false, v);
});
t("ouvert uniquement avec SKYLINE_REVIEW_MODE=on hors hébergeur", () => assert.equal(demoContentAllowed({ SKYLINE_REVIEW_MODE: "on" }), true));
t("jamais sur Vercel (Preview, Production, ou VERCEL seul), même avec SKYLINE_REVIEW_MODE=on", () => {
  for (const e of [{ VERCEL: "1" }, { VERCEL_ENV: "preview" }, { VERCEL_ENV: "production" }, { VERCEL_ENV: "development" }, { VERCEL: "1", VERCEL_ENV: "preview" }]) assert.equal(demoContentAllowed({ SKYLINE_REVIEW_MODE: "on", ...e }), false, JSON.stringify(e));
});
t("SOUND : un lien aux droits non confirmés n'est servi qu'en revue locale", () => {
  const pending = soundCollections.filter((c) => c.soundcloudUrl && c.rights !== "confirmed");
  assert.ok(pending.length >= 1, "le test suppose au moins un lien « pending »");
  assert.ok(getSoundCollections(false).every((c) => c.soundcloudUrl === null || c.rights === "confirmed"));
  assert.ok(getSoundCollections(true).some((c) => c.soundcloudUrl !== null));
});
t("SOUND : aucune collection ne perd son titre, son genre ni sa couverture (seul le lien est retiré)", () => {
  const a = getSoundCollections(false); assert.equal(a.length, soundCollections.length);
  a.forEach((c, i) => { assert.equal(c.id, soundCollections[i].id); assert.equal(c.title, soundCollections[i].title); assert.equal(c.cover, soundCollections[i].cover); });
});
t("SOUND : défaut sûr — tout lien sans `rights: \"confirmed\"` est masqué", () => {
  assert.equal(soundCollections.every((c) => c.rights !== "confirmed" || c.soundcloudUrl), true);
});
t("le composant client V3Sound n'importe plus la liste brute (plus de lien tiers dans le bundle client)", () => {
  const src = readFileSync(new URL("../src/components/v3/V3Sound.tsx", import.meta.url), "utf8");
  assert.ok(!/from "@\/data\/sound"/.test(src.replace(/import type[^\n]*\n/g, "")));
  assert.ok(!/andres-jaramillo/.test(src));
});
t("profil participant : plus aucune référence au sélecteur STAFF", () => {
  const src = readFileSync(new URL("../src/components/v3/V3Profile.tsx", import.meta.url), "utf8");
  assert.ok(!/SpaceSwitcher|ChangeSpaceLink|api\/staff/.test(src));
});
t("Signaux : la liste publiée exclut les contenus `demo` sauf revue locale (même règle unique)", () => {
  const src = readFileSync(new URL("../src/data/signals.ts", import.meta.url), "utf8");
  assert.ok(/demoContentFromProcess\(\)/.test(src) && /\(demoOk \|\| !s\.demo\)/.test(src));
});
console.log(`${n} tests OK`);
