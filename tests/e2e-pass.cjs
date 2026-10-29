/* eslint-disable */
// SKYLINE PASS 3D : capteurs (DeviceOrientation simulé), permission iOS au toucher, pointeur desktop, version statique.
const { chromium } = require("playwright");
const B = process.env.BASE || "http://localhost:3100";
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${!c && d ? " — " + d : ""}`); if (!c) fails++; };
const vars = (p) => p.getByRole("group", { name: /Pass SKYLINE/ }).evaluate((e) => ({ rx: e.style.getPropertyValue("--rx"), ry: e.style.getPropertyValue("--ry"), nx: e.style.getPropertyValue("--nx"), mx: e.style.getPropertyValue("--mx") }));
const orient = (p, gamma, beta) => p.evaluate(([g, b]) => window.dispatchEvent(Object.assign(new Event("deviceorientation"), { gamma: g, beta: b })), [gamma, beta]);
(async () => {
  const b = await chromium.launch();
  const mk = async (o = {}, init) => { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, ...o }); await ctx.addCookies([{ name: "sk_space", value: "members", url: B }]); if (init) await ctx.addInitScript(init); const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message)); return { ctx, p, errs }; };

  /* Android / capteurs libres : actif sans permission */
  {
    const { ctx, p, errs } = await mk({}, "delete DeviceOrientationEvent.requestPermission;"); await p.goto(B + "/v3/flight"); await p.waitForTimeout(1800);
    ok("PASS 3D : calques profondeur + hologramme présents", (await p.locator("[data-layer=holo]").count()) === 1 && (await p.locator("[data-layer=blue]").count()) === 1);
    await orient(p, 25, 75); await p.waitForTimeout(300); const v = await vars(p);
    ok("CAPTEURS (sans permission requise) : l'inclinaison déplace lumière et relief", Number.isFinite(parseFloat(v.ry)) && parseFloat(v.ry) !== 0 && v.mx !== "" && v.mx !== "28.0%");
    await orient(p, 90, 200); for (let i = 0; i < 25; i++) await orient(p, 90, 200); await p.waitForTimeout(300); const m = await vars(p);
    ok("PASS 3D : rotation plafonnée (≤ 7° en Y, ≤ 6° en X) et lissée", Number.isFinite(parseFloat(m.ry)) && Math.abs(parseFloat(m.ry)) <= 7 && Math.abs(parseFloat(m.rx)) <= 6, JSON.stringify(m));
    ok("PASS 3D : le QR reste hors des calques parallaxe (emplacement stable, fond opaque)", await p.getByRole("img", { name: /Emplacement du QR/ }).evaluate((e) => !e.style.transform && getComputedStyle(e).backgroundColor !== "rgba(0, 0, 0, 0)"));
    ok("PASS 3D : aucune erreur JS", errs.length === 0, errs.join("|"));
    await ctx.close();
  }
  /* iOS : permission demandée uniquement après un toucher */
  for (const answer of ["granted", "denied"]) {
    const { ctx, p } = await mk({}, `window.__perm=0;DeviceOrientationEvent.requestPermission=function(){window.__perm++;return Promise.resolve('${answer}')};`);
    await p.goto(B + "/v3/flight"); await p.waitForTimeout(1500);
    ok(`iOS (${answer}) : aucune demande de permission au chargement`, (await p.evaluate(() => window.__perm)) === 0);
    await orient(p, 25, 75); await p.waitForTimeout(250); ok(`iOS (${answer}) : capteurs inactifs tant que non autorisés`, parseFloat((await vars(p)).ry || "0") === 0);
    await p.getByRole("button", { name: /reflet au mouvement/i }).click(); await p.waitForTimeout(300);
    ok(`iOS (${answer}) : permission demandée une fois, après l'interaction`, (await p.evaluate(() => window.__perm)) === 1);
    await orient(p, 25, 75); await p.waitForTimeout(250); const ry = parseFloat((await vars(p)).ry || "0");
    ok(answer === "granted" ? "iOS : autorisé → le pass suit l'inclinaison" : "iOS : refusé → version statique conservée", answer === "granted" ? (Number.isFinite(ry) && ry !== 0) : ry === 0);
    await ctx.close();
  }
  /* Desktop : pointeur */
  {
    const { ctx, p } = await mk({ isMobile: false, hasTouch: false, viewport: { width: 1000, height: 900 } }); await p.goto(B + "/v3/flight"); await p.waitForTimeout(1800);
    const bb = await p.getByRole("group", { name: /Pass SKYLINE/ }).boundingBox();
    await p.mouse.move(bb.x + bb.width * 0.9, bb.y + bb.height * 0.2, { steps: 6 }); await p.waitForTimeout(300); const a = await vars(p);
    await p.mouse.move(bb.x + bb.width * 0.1, bb.y + bb.height * 0.8, { steps: 6 }); await p.waitForTimeout(300); const c = await vars(p);
    ok("DESKTOP : le survol déplace reflets et relief", a.mx !== c.mx && parseFloat(a.ry) > 0 && parseFloat(c.ry) < 0, JSON.stringify([a, c]));
    await p.mouse.move(5, 5); await p.waitForTimeout(300); ok("DESKTOP : retour à la position de repos", parseFloat((await vars(p)).ry) === 0);
    ok("DESKTOP : pas de bouton capteur", (await p.getByRole("button", { name: /reflet au mouvement/i }).count()) === 0);
    await ctx.close();
  }
  /* Réduction des animations : statique */
  {
    const { ctx, p } = await mk({ reducedMotion: "reduce" }); await p.goto(B + "/v3/flight"); await p.waitForTimeout(1500);
    await orient(p, 25, 75); const bb = await p.getByRole("group", { name: /Pass SKYLINE/ }).boundingBox(); await p.mouse.move(bb.x + 10, bb.y + 10); await p.waitForTimeout(300);
    const v = await vars(p);
    ok("ANIMATIONS RÉDUITES : pass statique (aucun mouvement, aucun bouton capteur)", (v.ry === "" || parseFloat(v.ry) === 0) && (await p.getByRole("button", { name: /reflet au mouvement/i }).count()) === 0);
    ok("ANIMATIONS RÉDUITES : hologramme présent mais fixe, balayage d'intro désactivé", (await p.locator("[data-layer=holo]").count()) === 1 && (await p.evaluate(() => { const e = document.querySelector(".metal-sweep"); return e ? getComputedStyle(e).display : "absent"; })) === "none");
    await ctx.close();
  }
  await b.close(); console.log(fails ? `${fails} ÉCHEC(S)` : "TOUT PASSE"); process.exit(fails ? 1 : 0);
})();
