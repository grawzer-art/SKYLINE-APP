/* eslint-disable */
// V3.2 — finitions : parcours complets, tailles de texte, texte agrandi, clavier, animations réduites, zones tactiles.
const { chromium } = require("playwright");
const B = process.env.BASE || "http://localhost:3100";
const KEY = "skyline.v3.proto.v2";
const active = { community: { adult: true, charter: true, consent: true }, me: { visible: true, pseudo: "Alex", city: "Lyon", bio: "x", genres: ["House"] } };
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${!c && d ? " — " + d : ""}`); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  const mk = async (o = {}, seed) => { const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, ...o }); if (seed) await ctx.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify(v)); }, [KEY, seed]); const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text())); return { ctx, p, errs }; };
  const nav = (p) => p.locator("nav[aria-label='Navigation principale'], nav[aria-label='Navigation du prototype']").filter({ visible: true }).first();

  /* Parcours */
  {
    const { ctx, p, errs } = await mk({}, active);
    await p.goto(B + "/"); await p.waitForTimeout(1200);
    await p.getByRole("link", { name: /My Flight/ }).first().click(); await p.waitForURL("**/v3/flight"); await p.waitForTimeout(800);
    ok("PARCOURS : HOME → MY FLIGHT", (await p.locator("h1:visible").first().innerText()).toLowerCase().includes("my flight"));
    await p.goto(B + "/"); await p.waitForTimeout(800);
    await nav(p).getByRole("link", { name: "Club" }).click(); await p.waitForURL("**/v3/club"); await p.waitForTimeout(800);
    await p.getByRole("link", { name: /My Space/i }).first().click(); await p.waitForURL("**/v3/club/space"); await p.waitForTimeout(800);
    ok("PARCOURS : HOME → CLUB → MY SPACE", (await p.locator("#space-title:visible").count()) === 1);
    await p.goto(B + "/v3/club"); await p.waitForTimeout(800);
    await p.getByRole("link", { name: /Members/i }).first().click(); await p.waitForURL("**/v3/club/members"); await p.waitForTimeout(800);
    await p.getByRole("link", { name: /Alba/ }).first().click(); await p.waitForURL("**/members/**"); await p.waitForTimeout(800);
    ok("PARCOURS : CLUB → MEMBERS → profil", (await p.getByText("Alba").locator("visible=true").count()) >= 1);
    await p.goto(B + "/explore"); await p.waitForTimeout(900);
    await p.getByRole("link", { name: /Skyline Radio/ }).first().click(); await p.waitForURL("**/v3/explore/radio"); await p.waitForTimeout(800);
    ok("PARCOURS : EXPLORE → SKYLINE RADIO", (await p.locator("#radio-title:visible").count()) === 1);
    ok("PARCOURS : aucune erreur console", errs.length === 0, errs.join(" | "));
    await ctx.close();
    const c2 = await mk({}, null);
    await c2.p.goto(B + "/v3/club"); await c2.p.waitForTimeout(900);
    await c2.p.getByRole("link", { name: /Voir les conditions/ }).click(); await c2.p.waitForURL("**/v3/club/community"); await c2.p.waitForTimeout(700);
    ok("PARCOURS : CLUB → rejoindre la communauté", (await c2.p.locator("#gate-title:visible").count()) === 1);
    ok("ACTIVATION : aucun consentement présélectionné", (await c2.p.getByRole("switch", { checked: true }).count()) === 0);
    ok("ACTIVATION : promesses visibles (privé, contact, quitter)", (await c2.p.getByText("Privé par défaut").count()) === 1 && (await c2.p.getByText(/Vous choisissez qui vous écrit/).count()) === 1 && (await c2.p.getByText(/Vous partez quand vous voulez/).count()) === 1);
    await c2.ctx.close();
  }

  /* Texte agrandi + débordements + tailles minimales */
  const routes = ["/", "/explore", "/v3/flight", "/v3/club", "/v3/club/community", "/v3/club/space", "/v3/club/members", "/v3/club/messages", "/v3/club/messages/m1", "/v3/explore/radio"];
  for (const [label, scale] of [["normal", 16], ["texte agrandi (20 px)", 20]]) {
    const { ctx, p } = await mk({}, active); let bad = [];
    for (const r of routes) {
      await p.goto(B + r); await p.evaluate((s) => (document.documentElement.style.fontSize = s + "px"), scale); await p.waitForTimeout(450);
      const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (ov > 0) bad.push(`${r}:+${ov}`);
    }
    ok(`375 px, ${label} : aucun défilement horizontal`, bad.length === 0, bad.join(" "));
    await ctx.close();
  }
  {
    const { ctx, p } = await mk({}, active); let small = [];
    for (const r of routes) {
      await p.goto(B + r); await p.waitForTimeout(900);
      const s = await p.evaluate(() => { const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const t = n.textContent.trim(); if (!t) continue; const e = n.parentElement; const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); if (!r.width || !r.height || cs.visibility === "hidden" || e.closest("[aria-hidden='true'], .sr-only")) continue; const px = parseFloat(cs.fontSize); if (px < 11) out.push(`${t.slice(0, 20)}=${px}`); } return out; });
      if (s.length) small.push(r + " " + s.slice(0, 3).join(","));
    }
    ok("TEXTE : aucun texte visible sous 11 px", small.length === 0, small.join(" ; "));
    await ctx.close();
  }

  /* Zones tactiles */
  {
    const { ctx, p } = await mk({}, active); let bad = [];
    for (const r of ["/v3/flight", "/v3/club", "/v3/club/members", "/v3/club/messages", "/v3/explore/radio"]) {
      await p.goto(B + r); await p.waitForTimeout(900);
      const s = await p.evaluate(() => [...document.querySelectorAll("a, button, [role=tab], [role=switch], input, select")].filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width && r.height && cs.visibility !== "hidden" && !e.closest("[aria-hidden='true']") && !e.classList.contains("sr-only") && e.type !== "checkbox" && (r.height < 40 || r.width < 40); }).map((e) => `${(e.getAttribute("aria-label") || e.textContent || e.tagName).trim().slice(0, 18)} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`));
      if (s.length) bad.push(r + " " + s.slice(0, 4).join(","));
    }
    ok("TACTILE : cibles ≥ 40 px", bad.length === 0, bad.join(" ; "));
    await ctx.close();
  }

  /* Clavier */
  {
    const { ctx, p } = await mk({}, active); await p.goto(B + "/v3/flight"); await p.waitForTimeout(900);
    let focusable = 0, outlined = 0;
    for (let i = 0; i < 8; i++) { await p.keyboard.press("Tab"); const r = await p.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const cs = getComputedStyle(e); return cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0; }); if (r !== null) { focusable++; if (r) outlined++; } }
    ok("CLAVIER : focus visible sur les premiers éléments", focusable >= 5 && outlined === focusable, `${outlined}/${focusable}`);
    await p.getByRole("tab", { name: /Your stay/ }).focus(); await p.keyboard.press("Enter"); await p.waitForTimeout(400);
    ok("CLAVIER : onglet activable au clavier", (await p.getByRole("tab", { name: /Your stay/ }).getAttribute("aria-selected")) === "true");
    await ctx.close();
  }

  /* Animations réduites */
  {
    const { ctx, p } = await mk({ reducedMotion: "reduce" }, active); await p.goto(B + "/v3/club"); await p.waitForTimeout(1500);
    const sweep = await p.evaluate(() => { const e = document.querySelector(".metal-sweep"); return e ? getComputedStyle(e).display : "absent"; });
    ok("ANIMATIONS RÉDUITES : balayage métallique désactivé, pas de bouton de mouvement", sweep === "none" && (await p.getByRole("button", { name: /reflet au mouvement/i }).count()) === 0, sweep);
    await ctx.close();
  }
  await b.close();
  console.log(fails ? `${fails} ÉCHEC(S)` : "TOUT PASSE"); process.exit(fails ? 1 : 0);
})();
