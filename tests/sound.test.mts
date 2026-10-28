// Tests unitaires SKYLINE SOUND : `node --experimental-strip-types tests/sound.test.mts`
import assert from "node:assert/strict";
import { embedHeight, embedSrc, parseSoundCloudUrl } from "../src/domain/sound.ts";
import { soundCollections } from "../src/data/sound.ts";

let n = 0; const t = (name: string, fn: () => void) => { fn(); n++; console.log("PASS", name); };

t("playlist SoundCloud acceptée (set)", () => assert.deepEqual(parseSoundCloudUrl("https://soundcloud.com/artist/sets/mix"), { ok: true, url: "https://soundcloud.com/artist/sets/mix", kind: "set" }));
t("titre SoundCloud accepté (track)", () => assert.equal((parseSoundCloudUrl("https://soundcloud.com/artist/track") as { kind: string }).kind, "track"));
t("lien court on.soundcloud.com accepté", () => assert.equal(parseSoundCloudUrl("https://on.soundcloud.com/AbC123").ok, true));
t("vide refusé", () => assert.deepEqual(parseSoundCloudUrl("  "), { ok: false, reason: "empty" }));
t("null refusé", () => assert.deepEqual(parseSoundCloudUrl(null), { ok: false, reason: "empty" }));
t("autre domaine refusé", () => assert.deepEqual(parseSoundCloudUrl("https://evil.example/soundcloud.com/x/y"), { ok: false, reason: "host" }));
t("faux sous-domaine refusé", () => assert.deepEqual(parseSoundCloudUrl("https://soundcloud.com.evil.example/a/b"), { ok: false, reason: "host" }));
t("http refusé", () => assert.deepEqual(parseSoundCloudUrl("http://soundcloud.com/a/b"), { ok: false, reason: "invalid" }));
t("javascript: refusé", () => assert.equal(parseSoundCloudUrl("javascript:alert(1)").ok, false));
t("identifiants dans l'URL refusés", () => assert.equal(parseSoundCloudUrl("https://user:pw@soundcloud.com/a/b").ok, false));
t("racine seule refusée", () => assert.equal(parseSoundCloudUrl("https://soundcloud.com/").ok, false));
t("texte quelconque refusé", () => assert.deepEqual(parseSoundCloudUrl("pas une url"), { ok: false, reason: "invalid" }));
t("iframe : widget officiel, URL encodée, jamais de lecture automatique", () => {
  const s = embedSrc("https://soundcloud.com/artist/sets/mix");
  assert.ok(s.startsWith("https://w.soundcloud.com/player/?"));
  assert.ok(s.includes("url=https%3A%2F%2Fsoundcloud.com%2Fartist%2Fsets%2Fmix"));
  assert.ok(s.includes("auto_play=false"));
});
t("lecteur compact : 166 px pour titres et playlists", () => { assert.equal(embedHeight("track"), 166); assert.equal(embedHeight("set"), 166); });
t("paramètres compacts officiels (visual=false, couleur, sans liste ni commentaires)", () => { const q = new URL(embedSrc("https://soundcloud.com/a/sets/b")).searchParams; assert.equal(q.get("visual"), "false"); assert.equal(q.get("color"), "#8FB8FF"); assert.equal(q.get("show_comments"), "false"); assert.equal(q.get("hide_related"), "true"); assert.equal(q.get("auto_play"), "false"); });
t("quatre collections prévues, ids uniques", () => { assert.deepEqual(soundCollections.map((c) => c.title), ["Sunset Club", "Above The Clouds", "After Hours", "Island Mode"]); assert.equal(new Set(soundCollections.map((c) => c.id)).size, 4); });
t("aucune URL inventée : toute URL renseignée est une URL SoundCloud valide", () => { for (const c of soundCollections) if (c.soundcloudUrl) assert.equal(parseSoundCloudUrl(c.soundcloudUrl).ok, true); });
console.log(`${n} tests SKYLINE SOUND : OK`);
