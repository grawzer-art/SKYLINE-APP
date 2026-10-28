/* eslint-disable */
// SKYLINE SOUND : états, widget global persistant, mini-lecteur, continuité de navigation, erreurs, mobiles.
// SoundCloud est inaccessible depuis l'environnement de test : le widget est SIMULÉ (même API officielle) pour valider NOTRE intégration.
// Ces tests ne valident PAS la lecture réelle SoundCloud ni Safari iPhone / PWA.
const { chromium } = require("playwright");
const B = process.env.BASE || "http://localhost:3100";
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${!c && d ? " — " + d : ""}`); if (!c) fails++; };
const URLS = { set: "https://soundcloud.com/skyline-test/sets/demo", track: "https://soundcloud.com/skyline-test/demo" };
const SUNSET = "https://soundcloud.com/andres-jaramillo-718256361/sets/black-coffee-2026-ibiza-chill";
const fakeApi = `(function(){var H={};var calls=[];window.__calls=calls;window.__made=0;window.__h=H;window.__fire=function(e){H[e]&&H[e]()};
var F=function(el){window.__made++;var url=new URL(el.src).searchParams.get('url')||'';var i=0,paused=true;var n=function(){return /\\/sets\\//.test(url)?3:1};
function f(e,d){setTimeout(function(){H[e]&&H[e]()},d||30)}
return{bind:function(e,cb){H[e]=cb;if(e==='ready'&&!window.__readyOnce){window.__readyOnce=1;setTimeout(cb,300)}},unbind:function(e){delete H[e]},
load:function(u,o){calls.push('load:'+u);url=u;i=0;paused=true;if(o&&o.callback)setTimeout(o.callback,20);f('ready',120)},
getSounds:function(cb){setTimeout(function(){cb(new Array(n()).fill({}))},10)},getCurrentSoundIndex:function(cb){cb(i)},
getCurrentSound:function(cb){cb({title:'Titre '+(i+1),user:{username:'DJ Test'},permalink_url:'https://soundcloud.com/x/'+i})},
play:function(){calls.push('play');paused=false;f('play')},pause:function(){calls.push('pause');paused=true;f('pause')},
next:function(){calls.push('next');if(i<n()-1)i++;if(!paused)f('play')},prev:function(){calls.push('prev');if(i>0)i--;if(!paused)f('play')}}};
F.Events={READY:'ready',PLAY:'play',PAUSE:'pause',FINISH:'finish',ERROR:'error'};window.SC={Widget:F};})();`;
(async () => {
  const b = await chromium.launch();
  const mk = async (o = {}, mock = false) => { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, ...o }); if (mock) { await ctx.route("https://w.soundcloud.com/player/api.js", (r) => r.fulfill({ contentType: "application/javascript", body: fakeApi })); await ctx.route("https://w.soundcloud.com/player/?**", (r) => r.fulfill({ contentType: "text/html", body: "<!doctype html><title>stub</title><body style='background:#222;color:#fff'>widget</body>" })); } const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message)); return { ctx, p, errs }; };
  const loadTest = async (p, url, wait = 500) => { if (!(await p.locator("details").evaluate((d) => d.open))) await p.locator("summary").click(); await p.getByLabel(/Collez l'adresse/).fill(url); await p.getByRole("button", { name: "Charger le lecteur" }).click(); await p.waitForTimeout(wait); };
  const nav = (p, name) => p.locator("nav[aria-label='Navigation du prototype'], nav[aria-label='Navigation principale']").filter({ visible: true }).first().getByRole("link", { name, exact: true });
  const mini = (p) => p.getByRole("region", { name: "Mini-lecteur SKYLINE SOUND" });
  const calls = (p) => p.evaluate(() => window.__calls.slice());

  /* États de la page */
  {
    const { ctx, p, errs } = await mk(); await p.goto(B + "/v3/explore/sound"); await p.waitForTimeout(1200);
    ok("SOUND : redirection de l'ancienne route radio", (await (async () => { await p.goto(B + "/v3/explore/radio"); await p.waitForTimeout(800); return p.url(); })()).endsWith("/v3/explore/sound"));
    for (const t of ["Sunset Club", "Above The Clouds", "After Hours", "Island Mode"]) ok(`SOUND : collection ${t}`, (await p.getByRole("button", { name: new RegExp(t) }).count()) === 1);
    ok("SOUND : invitation à choisir, aucune iframe avant le choix", (await p.getByText(/Choisissez une collection/).count()) === 1 && (await p.locator("iframe").count()) === 0);
    await p.getByRole("button", { name: /Above The Clouds/ }).click(); await p.waitForTimeout(400);
    ok("SOUND : collection sans URL → « arrive bientôt », sans iframe", (await p.getByText("Cette collection arrive bientôt.").count()) === 1 && (await p.locator("iframe").count()) === 0);
    await p.locator("summary").click(); await p.getByLabel(/Collez l'adresse/).fill("https://example.com/a/b"); await p.getByRole("button", { name: "Charger le lecteur" }).click(); await p.waitForTimeout(300);
    ok("SOUND : URL hors SoundCloud refusée", (await p.getByRole("alert").filter({ hasText: /soundcloud\.com/ }).count()) === 1 && (await p.locator("iframe").count()) === 0);
    ok("SOUND : aucune erreur JS", errs.length === 0, errs.join("|"));
    await ctx.close();
  }

  /* Erreur réelle : SoundCloud injoignable ici */
  {
    const { ctx, p } = await mk(); await p.goto(B + "/v3/explore/sound"); await p.waitForTimeout(800);
    await loadTest(p, URLS.set, 2500);
    ok("ERREUR : widget injoignable → message + lien de secours", (await p.getByRole("alert").filter({ hasText: /n'a pas pu se charger/ }).count()) === 1 && (await p.getByRole("link", { name: /Écouter sur SoundCloud/ }).getAttribute("href")) === URLS.set);
    await p.getByRole("button", { name: "Lecture" }).isDisabled().then((d) => ok("ERREUR : commandes désactivées", d));
    await ctx.close();
  }

  /* Widget global : iframe unique, compacte, sans lecture auto */
  {
    const { ctx, p, errs } = await mk({}, true); await p.goto(B + "/v3/explore/sound"); await p.waitForTimeout(800);
    await p.getByRole("button", { name: /Sunset Club/ }).click(); await p.waitForTimeout(900);
    const f = p.locator("iframe"); const src = await f.getAttribute("src");
    ok("SUNSET CLUB : iframe officielle sur la playlist configurée, compacte, sans lecture auto", src.startsWith("https://w.soundcloud.com/player/?") && src.includes(encodeURIComponent(SUNSET)) && src.includes("auto_play=false") && src.includes("visual=false") && Math.round((await f.boundingBox()).height) === 166);
    ok("WIDGET : l'iframe est exactement sur l'emplacement du lecteur (aucun recadrage)", await p.evaluate(() => { const a = document.querySelector("[data-testid=sound-slot]").getBoundingClientRect(), b = document.querySelector("iframe").getBoundingClientRect(); return Math.abs(a.top - b.top) < 2 && Math.abs(a.left - b.left) < 2 && Math.abs(a.width - b.width) < 2; }));
    ok("WIDGET : statut prêt, compteur 1 / 3", (await p.getByRole("status").filter({ hasText: "Lecteur prêt" }).count()) === 1 && (await p.getByText("1 / 3").count()) === 1);
    ok("WIDGET : aucune erreur JS", errs.length === 0, errs.join("|"));
    await ctx.close();
  }

  /* CONTINUITÉ DE LECTURE : SUNSET CLUB → HOME → FLIGHT → CLUB → EXPLORE → SOUND */
  {
    const { ctx, p, errs } = await mk({}, true); await p.goto(B + "/v3/explore/sound"); await p.waitForTimeout(800);
    await p.getByRole("button", { name: /Sunset Club/ }).click(); await p.waitForTimeout(900);
    await p.getByRole("button", { name: "Lecture" }).click(); await p.waitForTimeout(300);
    await p.evaluate(() => { window.__ifr = document.querySelector("iframe"); });
    const same = () => p.evaluate(() => document.querySelector("iframe") === window.__ifr && window.__ifr.isConnected);
    const one = async () => (await p.locator("iframe").count()) === 1 && (await p.evaluate(() => window.__made)) === 1;
    ok("CONTINUITÉ : sur SOUND, pas de mini-lecteur (le lecteur est visible)", (await mini(p).count()) === 0);

    await nav(p, "Home").click(); await p.waitForURL(B + "/"); await p.waitForTimeout(500);
    ok("HOME (/) : mini-lecteur affiché, lecture en cours, même iframe, un seul widget", (await mini(p).count()) === 1 && (await mini(p).getByRole("button", { name: "Pause" }).count()) === 1 && await same() && await one());
    ok("HOME : aucun rechargement (pas de load, un seul play)", !(await calls(p)).some((c) => c.startsWith("load:")) && (await calls(p)).filter((c) => c === "play").length === 1);
    ok("HOME : titre courant affiché + mention SoundCloud", (await mini(p).getByText("Titre 1").count()) === 1 && (await mini(p).getByText(/SoundCloud/).count()) === 1);

    await p.locator("nav[aria-label='Navigation principale']").getByRole("link", { name: "My Flight" }).click(); await p.waitForURL("**/v3/flight"); await p.waitForTimeout(500);
    ok("MY FLIGHT : lecture continue, mini-lecteur présent, même iframe", (await mini(p).getByRole("button", { name: "Pause" }).count()) === 1 && await same());
    await nav(p, "Club").click(); await p.waitForURL("**/v3/club"); await p.waitForTimeout(500);
    ok("CLUB : lecture continue, même iframe", (await mini(p).getByRole("button", { name: "Pause" }).count()) === 1 && await same());
    await nav(p, "Explore").click(); await p.waitForURL("**/v3/explore"); await p.waitForTimeout(500);
    ok("EXPLORE (V3) : lecture continue, même iframe", (await mini(p).getByRole("button", { name: "Pause" }).count()) === 1 && await same());
    await nav(p, "Home").click(); await p.waitForURL(B + "/"); await p.waitForTimeout(400);
    await p.locator("nav[aria-label='Navigation principale']").getByRole("link", { name: "Explore" }).click(); await p.waitForURL("**/explore"); await p.waitForTimeout(500);
    ok("EXPLORE (production /explore) : lecture continue, même iframe", (await mini(p).getByRole("button", { name: "Pause" }).count()) === 1 && await same() && await one());

    /* mini-lecteur : pause / reprise / suivant */
    const { ctx: c2, p: q, errs: e2 } = await mk({}, true); await q.goto(B + "/v3/explore/sound"); await q.waitForTimeout(800);
    await q.getByRole("button", { name: /Sunset Club/ }).click(); await q.waitForTimeout(900); await q.getByRole("button", { name: "Lecture" }).click(); await q.waitForTimeout(300);
    await q.evaluate(() => { window.__ifr = document.querySelector("iframe"); });
    await nav(q, "Home").click(); await q.waitForURL(B + "/"); await q.waitForTimeout(500);
    const m = mini(q);
    await m.getByRole("button", { name: "Pause" }).click(); await q.waitForTimeout(200);
    ok("MINI-LECTEUR : pause → pause() officiel, bouton « Lecture »", (await calls(q)).includes("pause") && (await m.getByRole("button", { name: "Lecture" }).count()) === 1);
    await m.getByRole("button", { name: "Lecture" }).click(); await q.waitForTimeout(200);
    ok("MINI-LECTEUR : reprise → play() officiel, bouton « Pause »", (await calls(q)).filter((c) => c === "play").length === 2 && (await m.getByRole("button", { name: "Pause" }).count()) === 1);
    await m.getByRole("button", { name: "Titre suivant" }).click(); await q.waitForTimeout(300);
    ok("MINI-LECTEUR : suivant → next() officiel, titre « Titre 2 »", (await calls(q)).includes("next") && (await m.getByText("Titre 2").count()) === 1);
    await m.getByRole("button", { name: "Titre précédent" }).click(); await q.waitForTimeout(300);
    ok("MINI-LECTEUR : précédent → prev() officiel, titre « Titre 1 »", (await calls(q)).includes("prev") && (await m.getByText("Titre 1").count()) === 1);
    await m.getByRole("button", { name: "Titre suivant" }).click(); await q.waitForTimeout(300);

    /* retour sur SOUND via le mini-lecteur : même morceau, même iframe */
    await m.getByRole("link", { name: "Ouvrir SKYLINE SOUND" }).click(); await q.waitForURL("**/v3/explore/sound"); await q.waitForTimeout(600);
    ok("RETOUR : via le mini-lecteur sur SKYLINE SOUND, même iframe, sans rechargement", await q.evaluate(() => document.querySelector("iframe") === window.__ifr && !window.__calls.some((c) => c.startsWith("load:"))) && (await q.locator("iframe").count()) === 1);
    ok("RETOUR : même morceau (2 / 3), lecture en cours, commandes actives, plus de mini-lecteur", (await q.getByText("2 / 3").count()) === 1 && (await q.getByRole("button", { name: "Pause" }).count()) === 1 && (await mini(q).count()) === 0);
    ok("RETOUR : l'iframe est de nouveau exactement sur l'emplacement", await q.evaluate(() => { const a = document.querySelector("[data-testid=sound-slot]").getBoundingClientRect(), b = document.querySelector("iframe").getBoundingClientRect(); return Math.abs(a.top - b.top) < 2 && Math.abs(a.left - b.left) < 2; }));
    ok("RETOUR : un seul widget créé pendant toute la session", (await q.evaluate(() => window.__made)) === 1);

    /* changement de playlist : réutilise le widget (load), jamais une 2e iframe */
    await loadTest(q, URLS.track, 900);
    ok("PLAYLIST : changer de collection → widget.load() sur le même widget, une seule iframe", (await calls(q)).includes("load:" + URLS.track) && (await q.locator("iframe").count()) === 1 && (await q.evaluate(() => window.__made)) === 1 && await q.evaluate(() => document.querySelector("iframe") === window.__ifr));
    ok("PLAYLIST : morceau unique → précédent/suivant désactivés, lecture active, pas de compteur", await q.getByRole("button", { name: "Titre précédent" }).isDisabled() && await q.getByRole("button", { name: "Titre suivant" }).isDisabled() && !(await q.getByRole("button", { name: "Lecture" }).isDisabled()) && (await q.getByText(/\d \/ \d/).count()) === 0);
    await q.getByRole("button", { name: /Above The Clouds/ }).click(); await q.waitForTimeout(300);
    ok("PLAYLIST : collection « bientôt » sélectionnée → la lecture en cours reste pilotable (« En lecture »)", (await q.getByText(/En lecture : URL de test/).count()) === 1 && (await q.getByRole("button", { name: "Lecture" }).count()) === 1);
    ok("MINI/SOUND : aucune erreur JS", e2.length === 0 && errs.length === 0, e2.concat(errs).join("|"));
    await c2.close();
    await ctx.close();
  }

  /* Un seul son à la fois : démarrage d'une autre source → pause SoundCloud */
  {
    const { ctx, p } = await mk({}, true); await p.goto(B + "/v3/explore/sound"); await p.waitForTimeout(800);
    await p.getByRole("button", { name: /Sunset Club/ }).click(); await p.waitForTimeout(900); await p.getByRole("button", { name: "Lecture" }).click(); await p.waitForTimeout(300);
    await p.evaluate(() => window.dispatchEvent(new CustomEvent("skyline:audio-start", { detail: "legacy" }))); await p.waitForTimeout(300);
    ok("EXCLUSIVITÉ : un autre lecteur qui démarre met SoundCloud en pause", (await calls(p)).includes("pause") && (await p.getByRole("button", { name: "Lecture" }).count()) === 1);
    await ctx.close();
  }

  /* Fermeture du mini-lecteur */
  {
    const { ctx, p } = await mk({}, true); await p.goto(B + "/v3/explore/sound"); await p.waitForTimeout(800);
    await p.getByRole("button", { name: /Sunset Club/ }).click(); await p.waitForTimeout(900); await p.getByRole("button", { name: "Lecture" }).click(); await p.waitForTimeout(300);
    await nav(p, "Home").click(); await p.waitForURL(B + "/"); await p.waitForTimeout(500);
    await mini(p).getByRole("button", { name: "Fermer le mini-lecteur" }).click(); await p.waitForTimeout(300);
    ok("MINI-LECTEUR : fermer met en pause et masque la barre", (await calls(p)).includes("pause") && (await mini(p).count()) === 0);
    await ctx.close();
  }

  /* Mobiles + animations réduites */
  for (const w of [375, 390, 430]) {
    const { ctx, p } = await mk({ viewport: { width: w, height: 812 } }, true); await p.goto(B + "/v3/explore/sound"); await p.waitForTimeout(800);
    await p.getByRole("button", { name: /Sunset Club/ }).click(); await p.waitForTimeout(900); await p.getByRole("button", { name: "Lecture" }).click(); await p.waitForTimeout(300);
    ok(`MOBILE ${w} px : aucun défilement horizontal sur SOUND (widget hors écran inclus)`, (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
    await nav(p, "Home").click(); await p.waitForURL(B + "/"); await p.waitForTimeout(500);
    ok(`MOBILE ${w} px : mini-lecteur sans débordement, cibles ≥ 44 px`, (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0 && await p.evaluate(() => [...document.querySelectorAll("[aria-label='Mini-lecteur SKYLINE SOUND'] button, [aria-label='Mini-lecteur SKYLINE SOUND'] a")].every((e) => { const r = e.getBoundingClientRect(); return r.height >= 43 && r.width >= 43; })));
    await ctx.close();
  }
  {
    const { ctx, p, errs } = await mk({ reducedMotion: "reduce" }, true); await p.goto(B + "/v3/explore/sound"); await p.waitForTimeout(800);
    await p.getByRole("button", { name: /Sunset Club/ }).click(); await p.waitForTimeout(900);
    ok("ANIMATIONS RÉDUITES : lecteur fonctionnel", (await p.getByText("Lecteur prêt").count()) === 1 && errs.length === 0);
    await ctx.close();
  }
  await b.close(); console.log(fails ? `${fails} ÉCHEC(S)` : "TOUT PASSE"); process.exit(fails ? 1 : 0);
})();
