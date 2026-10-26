// `node --experimental-strip-types tests/i18n.test.mts`
import assert from "node:assert/strict";
import { fr } from "../src/i18n/fr.ts";
import { en } from "../src/i18n/en.ts";
import { translateWith } from "../src/i18n/translate.ts";
const translate = (l: "fr" | "en", key: string, vars?: Record<string, string | number>) => translateWith(l === "en" ? en : fr, fr, key, vars);

let n = 0; const t = (name: string, fn: () => void) => { fn(); n++; console.log("PASS", name); };
t("mêmes clés en FR et EN", () => assert.deepEqual(Object.keys(fr).sort(), Object.keys(en).sort()));
t("aucune valeur vide", () => { for (const [k, v] of Object.entries({ ...fr, ...en })) assert.ok(String(v).trim().length > 0, k); });
t("mêmes variables {x} en FR et EN", () => { for (const k of Object.keys(fr) as (keyof typeof fr)[]) { const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(","); assert.equal(vars(fr[k]), vars(en[k]), k); } });
t("pluriel FR", () => { assert.equal(translate("fr", "members.count_one" as never, { count: 1 }), "1 membre visible"); assert.equal(translate("fr", "members.count" as never, { count: 1 }), "1 membre visible"); assert.equal(translate("fr", "members.count" as never, { count: 8 }), "8 membres visibles"); });
t("pluriel EN", () => { assert.equal(translate("en", "members.count" as never, { count: 1 }), "1 visible member"); assert.equal(translate("en", "members.count" as never, { count: 3 }), "3 visible members"); });
t("variables", () => assert.equal(translate("fr", "member.block.title", { name: "Alba" }), "Bloquer Alba ?"));
t("clé inconnue : retombe sur la clé (jamais d'erreur)", () => assert.equal(translate("en", "zzz" as never), "zzz"));
console.log(`\n${n} tests i18n : OK`);
