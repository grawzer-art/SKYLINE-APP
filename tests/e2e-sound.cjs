/* eslint-disable */
// SKYLINE SOUND : états, intégration du widget (avec un faux widget — SoundCloud est inaccessible depuis l'environnement de test),
// erreurs réelles réseau, mobiles 375/390/430, animations réduites. Ne valide PAS la lecture réelle SoundCloud.
const { chromium } = require("playwright");
const B = process.env.BASE || "http://localhost:3100";
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${!c && d ? " — " + d : ""}`); if (!c) fails++; };
const URLS = { set: "https://soundcloud.com/skyline-test/sets/demo", track: "https://soundcloud.com/skyline-test/demo" };
const fakeApi = `window.__h={};window.SC={Widget:Object.assign(function(){return{bind:function(e,cb){window.__h[e]=cb;if(e==='ready')setTimeout(cb,60)},unbind:function(){}}},{Events:{READY:'ready',PLAY:'play',PAUSE:'pause',FINISH:'finish',ERROR:'error'}})};window.__fire=function(e){window.__h[e]&&window.__h[e]()};`;
(async () => {
  const b = await chromium.launch();
  const mk = async (o = {}, mock = false) => { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, ...o }); if (mock) { await ctx.route("https://w.soundcloud.com/player/api.js", (r) => r.fulfill({ contentType: "application/javascript", body: fakeApi })); await ctx.route("https://w.soundcloud.com/player/?**", (r) => r.fulfill({ contentType: "text/html", body: "<!doctype html><title>stub</title><body style='background:#222;color:#fff'>widget</body>" })); } const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message)); return { ctx, p, errs }; };
  const loadTest = async (p, url) => { await p.locator("summary").click(); await p.getByLabel(/Collez l'adresse/).fill(url); await p.getByRole("button", { name: "Charger le lecteur" }).click(); await p.waitForTimeout(500); };

  /* États vides */
  {
    const { ctx, p, errs } = await mk(); await p.goto(B + "/v3/explore/sound"); await p.waitForTimeout(1200);
    ok("SOUND : redirection de l'ancienne route radio", (await (async () => { await p.goto(B + "/v3/explore/radio"); await p.waitForTimeout(800); return p.url(); })()).endsWith("/v3/explore/sound"));
    for (const t of ["Sunset Club", "Above The Clouds", "After Hours", "Island Mode"]) ok(`SOUND : collection ${t}`, (await p.getByRole("button", { name: new RegExp(t) }).count()) === 1);
    ok("SOUND : genres affichés", (await p.getByText("Afro House / Melodic House").count()) === 1 && (await p.getByText("Deep House / Chill").count()) === 1 && (await p.getByText("Tech House / Club").count()) === 1 && (await p.getByText("Summer / Feel Good").count()) === 1);
    ok("SOUND : invitation à choisir une collection", (await p.getByText(/Choisissez une collection/).count()) === 1);
    ok("SOUND : aucune iframe (ni requête SoundCloud) avant le choix", (await p.locator("iframe").count()) === 0);
    await p.getByRole("button", { name: /Above The Clouds/ }).click(); await p.waitForTimeout(400);
    ok("SOUND : collection sans URL → « arrive bientôt », sans iframe (Above The Clouds)", (await p.getByText("Cette collection arrive bientôt.").count()) === 1 && (await p.locator("iframe").count()) === 0);
    ok("SOUND : aucun audio ni lecture automatique", await p.evaluate(() => [...document.querySelectorAll("audio")].every((a) => a.paused)));
    await p.locator("summary").click(); await p.getByLabel(/Collez l'adresse/).fill("https://example.com/a/b"); await p.getByRole("button", { name: "Charger le lecteur" }).click(); await p.waitForTimeout(300);
    ok("SOUND : URL hors SoundCloud refusée", (await p.getByRole("alert").filter({ hasText: /soundcloud\.com/ }).count()) === 1 && (await p.locator("iframe").count()) === 0);
    ok("SOUND : aucune erreur JS", errs.length === 0, errs.join("|"));
    await ctx.close();
  }

  /* SUNSET CLUB : playlist configurée */
  {
    const { ctx, p } = await mk({}, true); await p.goto(B + "/v3/explore/sound"); await p.waitForTimeout(800);
    await p.getByRole("button", { name: /Sunset Club/ }).click(); await p.waitForTimeout(800);
    const src = await p.locator("iframe").getAttribute("src");
    ok("SUNSET CLUB : iframe officielle sur la playlist configurée", src.startsWith("https://w.soundcloud.com/player/?") && src.includes(encodeURIComponent("https://soundcloud.com/luk_music/sets/afro-house-remix-songs-afro")));
    ok("SUNSET CLUB : « Bientôt » retiré de la collection configurée", (await p.getByRole("button", { name: /Sunset Club/ }).getByText("Bientôt").count()) === 0);
    await ctx.close();
  }

  /* Erreur réelle : SoundCloud injoignable depuis cet environnement */
  {
    const { ctx, p } = await mk(); await p.goto(B + "/v3/explore/sound"); await p.waitForTimeout(800);
    await loadTest(p, URLS.set); await p.waitForTimeout(2500);
    ok("ERREUR : widget injoignable → message + lien de secours vers SoundCloud", (await p.getByRole("alert").filter({ hasText: /n'a pas pu se charger/ }).count()) === 1 && (await p.getByRole("link", { name: /Écouter sur SoundCloud/ }).getAttribute("href")) === URLS.set);
    await ctx.close();
  }

  /* Intégration avec faux widget */
  for (const w of [375, 390, 430]) {
    const { ctx, p } = await mk({ viewport: { width: w, height: 812 } }, true); await p.goto(B + "/v3/explore/sound"); await p.waitForTimeout(800);
    await loadTest(p, URLS.set); await p.waitForTimeout(700);
    const f = p.locator("iframe"); const src = await f.getAttribute("src");
    if (w === 390) {
      ok("WIDGET : iframe officielle w.soundcloud.com, URL encodée", src.startsWith("https://w.soundcloud.com/player/?") && src.includes(encodeURIComponent(URLS.set)));
      ok("WIDGET : compact (166 px, visual=false, couleur), sans lecture auto, ni recadrage CSS", src.includes("auto_play=false") && src.includes("visual=false") && src.includes(encodeURIComponent("#8FB8FF")) && (await f.evaluate((e) => getComputedStyle(e).visibility !== "hidden" && getComputedStyle(e).opacity !== "0" && Math.round(e.getBoundingClientRect().height) === 166 && getComputedStyle(e).clipPath === "none" && getComputedStyle(e).transform === "none")));
      ok("WIDGET : statut « Lecteur prêt »", (await p.getByRole("status").filter({ hasText: "Lecteur prêt" }).count()) === 1);
      await p.evaluate(() => window.__fire("play")); await p.waitForTimeout(200); ok("WIDGET : événement lecture → « Lecture en cours »", (await p.getByText("Lecture en cours").count()) === 1);
      await p.evaluate(() => window.__fire("pause")); await p.waitForTimeout(200); ok("WIDGET : événement pause → « En pause »", (await p.getByText("En pause").count()) === 1);
      await p.evaluate(() => window.__fire("error")); await p.waitForTimeout(200); ok("WIDGET : événement erreur → message de secours", (await p.getByRole("alert").filter({ hasText: /n'a pas pu se charger/ }).count()) === 1);
      await p.getByRole("button", { name: /Island Mode/ }).click(); await p.waitForTimeout(300); ok("WIDGET : changer de collection quitte le lecteur de test", (await p.locator("iframe").count()) === 0);
    }
    await loadTest(p, URLS.track).catch(() => {}); await p.waitForTimeout(300);
    ok(`MOBILE ${w} px : aucun défilement horizontal avec le lecteur`, (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
    await ctx.close();
  }

  /* Animations réduites */
  {
    const { ctx, p, errs } = await mk({ reducedMotion: "reduce" }, true); await p.goto(B + "/v3/explore/sound"); await p.waitForTimeout(800); await loadTest(p, URLS.track); await p.waitForTimeout(500);
    ok("ANIMATIONS RÉDUITES : lecteur fonctionnel", (await p.getByText("Lecteur prêt").count()) === 1 && errs.length === 0);
    await ctx.close();
  }
  await b.close(); console.log(fails ? `${fails} ÉCHEC(S)` : "TOUT PASSE"); process.exit(fails ? 1 : 0);
})();
