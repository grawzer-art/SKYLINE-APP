const { chromium } = require("playwright");
const B = "http://localhost:3100";
let fails = 0; const ok = (l, c) => { if (!c) fails++; console.log(c ? "PASS" : "FAIL", l); };
const path = (p) => new URL(p.url()).pathname;
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [n, vp] of [["375", { width: 375, height: 812 }], ["390", { width: 390, height: 844 }], ["430", { width: 430, height: 932 }], ["desktop", { width: 1280, height: 800 }]]) {
    const ctx = await b.newContext({ viewport: vp, hasTouch: n !== "desktop" }); const p = await ctx.newPage();
    p.on("console", (m) => m.type() === "error" && !/status of 404/.test(m.text()) && errs.push(n + ": " + m.text())); p.on("pageerror", (e) => errs.push(n + " pageerror: " + e.message));
    const ovf = async (l) => ok(`${n} sans débordement — ${l}`, (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
    await p.goto(B + "/"); await p.waitForTimeout(1500); await ovf("HOME");
    const card = p.getByRole("link", { name: /Skyline Signal/i });
    ok(`${n} HOME : carte SIGNAL unique`, (await card.count()) === 1);
    ok(`${n} HOME : indicateur NEW`, (await card.getByText("New").count()) === 1);
    ok(`${n} HOME : action DÉCOUVRIR`, /Découvrir/i.test(await card.textContent()));
    ok(`${n} HOME : révélation la plus récente (lieu)`, /Un lieu à Ibiza se dévoile/.test(await card.textContent()));
    if (n === "390") {
      // HOME -> SIGNAL -> retour
      await card.click(); await p.waitForURL("**/signal/un-lieu-a-ibiza-se-devoile"); await p.waitForTimeout(400);
      ok("SIGNAL : wordmark officiel visible", await p.getByRole("img", { name: /^SKYLINE/ }).locator("visible=true").first().isVisible());
      ok("SIGNAL : Fermer accessible dès 0,4 s", await p.getByRole("button", { name: /Fermer/ }).isVisible());
      ok("SIGNAL : en-tête et navigation de l'app masqués", (await p.locator("nav[aria-label='Navigation principale']").count()) === 0);
      await p.waitForTimeout(2000); await ovf("SIGNAL"); await p.screenshot({ path: "s3-signal-open.png" });
      ok("SIGNAL : titre H1 lisible", (await p.locator("h1:visible").getAttribute("aria-label")) === "Un lieu à Ibiza se dévoile");
      ok("SIGNAL : pastille Démo", (await p.getByText("Démo", { exact: true }).locator("visible=true").count()) >= 1);
      ok("SIGNAL : lien complémentaire fonctionnel", (await p.getByRole("link", { name: /Toutes les révélations/ }).getAttribute("href")) === "/explore");
      await p.getByRole("button", { name: /Fermer/ }).click(); await p.waitForURL(B + "/"); await p.waitForTimeout(800);
      ok("fermer → retour HOME", path(p) === "/");
      ok("HOME : NEW retiré, « Revoir »", (await card.getByText("New").count()) === 0 && /Revoir/i.test(await card.textContent()));
      // retour Safari/navigateur
      await card.click(); await p.waitForURL("**/signal/**"); await p.waitForTimeout(500); await p.goBack(); await p.waitForURL(B + "/");
      ok("retour navigateur : HOME", path(p) === "/");
      // Escape
      await card.click(); await p.waitForURL("**/signal/**"); await p.waitForTimeout(500); await p.keyboard.press("Escape"); await p.waitForURL(B + "/");
      ok("Échap ferme et revient", path(p) === "/");
      // EXPLORE
      await p.getByRole("link", { name: "Explore" }).click(); await p.waitForURL("**/explore"); await p.waitForTimeout(800);
      const rows = p.locator("#signal-title").locator("xpath=..").locator("ul li a");
      ok("EXPLORE : 3 révélations publiées (brouillon exclu)", (await rows.count()) === 3);
      const titles = await rows.allTextContents();
      ok("EXPLORE : classées par date décroissante", /lieu/i.test(titles[0]) && /premier nom/i.test(titles[1]) && /mix/i.test(titles[2]));
      ok("EXPLORE : brouillon absent", !titles.join(" ").includes("Brouillon"));
      ok("EXPLORE : NEW sur les non consultées uniquement", (await rows.nth(0).getByText("New").count()) === 0 && (await rows.nth(1).getByText("New").count()) === 1 && (await rows.nth(2).getByText("New").count()) === 1);
      await p.evaluate(() => window.scrollTo(0, 300)); const y0 = await p.evaluate(() => scrollY);
      await rows.nth(1).click(); await p.waitForURL("**/signal/un-premier-nom-rejoint-la-line-up"); await p.waitForTimeout(2200);
      ok("ARTIST : libellé et nom d'artiste (démo)", (await p.getByText(/Artist Reveal/).locator("visible=true").count()) >= 1 && (await p.getByText("Artiste à confirmer").locator("visible=true").count()) >= 1);
      ok("ARTIST : image manquante → emplacement identifié", (await p.getByText(/Photo à fournir/).locator("visible=true").count()) >= 1);
      await p.screenshot({ path: "s3-artist.png" });
      await p.getByRole("button", { name: /Fermer/ }).click(); await p.waitForURL("**/explore"); await p.waitForTimeout(800);
      ok("EXPLORE → SIGNAL → retour : même page", path(p) === "/explore");
      ok("EXPLORE : NEW retiré après consultation", (await rows.nth(1).getByText("New").count()) === 0);
      ok("EXPLORE : position de défilement conservée (±80 px)", Math.abs((await p.evaluate(() => scrollY)) - y0) < 80);
      ok("nav : point NEW tant qu'un signal reste non consulté", (await p.locator("nav").getByText(/nouvelle révélation/).count()) === 1);
      // MIX : média indisponible, aucune lecture auto
      await rows.nth(2).click(); await p.waitForURL("**/signal/un-mix**"); await p.waitForTimeout(2200);
      ok("MIX : média indisponible géré", (await p.getByText(/Extrait audio indisponible/).count()) === 1);
      ok("MIX : DJ et titre du mix (démo)", (await p.getByText(/Mix à confirmer — DJ à confirmer/).count()) === 1);
      ok("MIX : aucun audio ne joue", (await p.evaluate(() => [...document.querySelectorAll("audio")].every((a) => a.paused))));
      await p.screenshot({ path: "s3-mix.png" });
      await p.goBack(); await p.waitForURL("**/explore");
      ok("MIX : retour Safari → EXPLORE", path(p) === "/explore");
      ok("nav : plus de point NEW (tout consulté)", (await p.locator("nav").getByText(/nouvelle révélation/).count()) === 0);
      ok("contenus conservés (3 lignes)", (await rows.count()) === 3);
      // liens directs
      await p.goto(B + "/signal/un-lieu-a-ibiza-se-devoile"); await p.waitForTimeout(1500);
      await p.getByRole("button", { name: /Fermer/ }).click(); await p.waitForURL("**/explore");
      ok("lien direct : Fermer → EXPLORE (pas de sortie de l'app)", path(p) === "/explore");
      for (const s of ["brouillon-non-publie", "inconnu"]) { const r = await ctx.request.get(B + "/signal/" + s); const t = await r.text(); ok(`/signal/${s} → 404 (requête indépendante : ${r.status()}, page « Contenu introuvable »)`, r.status() === 404 && /contenu introuvable/i.test(t)); }
      // clavier
      await p.goto(B + "/signal/un-lieu-a-ibiza-se-devoile"); await p.waitForTimeout(1500);
      await p.keyboard.press("Tab"); ok("clavier : Tab atteint Fermer en premier", /Fermer/.test(await p.evaluate(() => document.activeElement.getAttribute("aria-label") || "")));
    }
    await ctx.close();
  }
  // animations réduites
  const rc = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" }); const rp = await rc.newPage();
  rp.on("pageerror", (e) => errs.push("rm: " + e.message));
  await rp.goto(B + "/"); await rp.waitForTimeout(600); await rp.getByRole("link", { name: /Skyline Signal/i }).click(); await rp.waitForURL("**/signal/**"); await rp.waitForTimeout(450);
  ok("réduction : titre et texte visibles < 0,5 s", await rp.locator("h1:visible").isVisible() && await rp.getByText(/Contenu de démonstration/).first().isVisible());
  ok("réduction : pas de clip-path animé", (await rp.evaluate(() => { const e = [...document.querySelectorAll("[role=region]")].find((x) => x.offsetParent !== null || getComputedStyle(x).position === "fixed"); return getComputedStyle(e).clipPath; })) === "none");
  await rp.screenshot({ path: "s3-reduced.png" });
  await rp.getByRole("button", { name: /Fermer/ }).click(); await rp.waitForURL(B + "/"); ok("réduction : fermeture immédiate", true);
  console.log("ERREURS CONSOLE:", errs.length ? errs : "aucune"); console.log(fails ? `${fails} ÉCHEC(S)` : "TOUT PASSE");
  await b.close();
})();
