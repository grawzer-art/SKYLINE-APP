/* eslint-disable */
// LOT 2 — cohérence, navigation, finition : pas de texte tronqué (pass, carte CLUB, tuiles) à 320 et 390 px, aucun « Prototype/démo » visible, sélecteur de langue masqué,
// tuile Messages non cliquable, profil sans pseudo propre, zone tactile, SOUVENIRS, en-têtes de sécurité. Serveurs de tests/run-participant.sh : A=3105 (comptes) · OFF=3106 (sans comptes).
const { chromium } = require("playwright");
const A = process.env.PART_A || "http://localhost:3105", OFF = process.env.PART_OFF || "http://localhost:3106", MOCK = process.env.MOCK || "http://127.0.0.1:3199";
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${!c && d ? " — " + d : ""}`); if (!c) fails++; };
const ctl = (b) => fetch(MOCK + "/__control", { method: "POST", body: JSON.stringify(b) }).then((r) => r.json());
const LONG = { first: "Alexandre-Maximilien", last: "de Montmorency-Beaulieu", display: "Alexandre-Maximilien de Montmorency" };
const VERYLONG = { first: "Jean", last: "Dupont", display: "Bartholomew-Maximilianus-Augustinus" };
async function login(p) { await p.goto(A + "/v3/login"); await p.locator("#login-email").fill("participant@example.test"); await p.getByRole("button", { name: "Recevoir un code" }).click(); await p.locator("#login-code").fill("123456"); await p.getByRole("button", { name: "Se connecter" }).click(); await p.waitForURL("**/v3/account", { timeout: 8000 }); }
async function saveProfile(p, n) { await p.goto(A + "/v3/account"); await p.waitForTimeout(1200); await p.getByLabel(/Prénom/).fill(n.first); await p.getByLabel(/^Nom \*/).first().fill(n.last).catch(() => {}); await p.getByLabel(/Nom affiché/).fill(n.display); await p.getByRole("button", { name: "Enregistrer" }).click(); await p.waitForTimeout(1500); }
/** Le texte d'un élément est-il ENTIÈREMENT visible (ni ellipse, ni coupé verticalement, ni débordant de son conteneur) ? */
const fits = (loc) => loc.evaluate((el) => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); const par = el.closest("[aria-label]") || el.parentElement; const pr = par.getBoundingClientRect();
  return { ellipsis: cs.textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth + 1, clipped: el.scrollHeight > el.clientHeight + 1 && cs.overflow !== "visible", out: r.right > pr.right + 1 || r.left < pr.left - 1, lines: Math.round(r.height / parseFloat(cs.lineHeight)), size: parseFloat(cs.fontSize) }; });
const cardOk = (loc) => loc.evaluate((card) => { const cr = card.getBoundingClientRect(); const last = [...card.querySelectorAll("p,span")].filter((e) => e.textContent.trim()).map((e) => e.getBoundingClientRect().bottom); return { bottom: Math.max(...last), cardBottom: cr.bottom, w: cr.width, h: cr.height }; });
(async () => {
  const browser = await chromium.launch(); await ctl({ reset: true, delay: 0 });
  for (const w of [320, 390]) {
    const mk = async (base) => { const ctx = await browser.newContext({ viewport: { width: w, height: 760 }, isMobile: true, hasTouch: true }); await ctx.addCookies([{ name: "sk_space", value: "members", url: base }]); return [ctx, await ctx.newPage()]; };
    const tag = `[${w}px]`;
    /* VOYAGEUR VÉRIFIÉ : pass et carte, nom par défaut puis noms longs */
    await ctl({ reset: true, delay: 0 }); await ctl({ travelers: { participant: true } });
    let [ctx, p] = await mk(A); await login(p);
    await p.goto(A + "/v3/profile"); await p.waitForTimeout(1400); let t = await p.evaluate(() => document.body.innerText);
    ok(`${tag} PROFIL sans pseudo : ni « ? » ni « — » isolés, état « Profil à compléter »`, /Profil à compléter/i.test(t) && !/(^|\n)\s*\?\s*(\n|$)/.test(t) && !/(^|\n)\s*—\s*(\n|$)/.test(t));
    const ms = p.getByRole("link", { name: /My Space/ }).first(); const bb = await ms.boundingBox(); ok(`${tag} PROFIL : zone tactile « My Space » ≥ 44 px de haut`, !!bb && bb.height >= 43.5, JSON.stringify(bb));
    ok(`${tag} PROFIL : plus de sélecteur de langue (architecture i18n conservée)`, (await p.getByRole("radiogroup").count()) === 0 && (await p.getByRole("radio", { name: "English" }).count()) === 0);
    ok(`${tag} TITRE : « Profil — SKYLINE », aucun « Prototype »`, (await p.title()) === "Profil — SKYLINE", await p.title());
    for (const [label, name] of [["nom par défaut", null], ["nom long", LONG], ["nom démesuré (un seul mot de 35 lettres)", VERYLONG]]) {
      if (name) await saveProfile(p, name);
      await p.goto(A + "/v3/flight"); await p.waitForTimeout(1500);
      const pass = p.locator('[aria-label^="Pass SKYLINE"]'); const nm = pass.locator(".metal-text").first(); const f = await fits(nm);
      ok(`${tag} PASS (${label}) : nom jamais tronqué (ni « … », ni coupé, ni débordant), ≤ 3 lignes`, !f.ellipsis && !f.clipped && !f.out && f.lines <= 3 && f.size >= 18, JSON.stringify(f));
      ok(`${tag} PASS (${label}) : aucun cadre de QR`, (await pass.getByText(/^QR$/).count()) === 0 && (await pass.getByRole("img", { name: /QR/ }).count()) === 0);
      ok(`${tag} PASS (${label}) : statut « Réservation vérifiée » et mention « Pas un titre de transport » conservés`, (await pass.getByText(/Réservation vérifiée/).count()) === 1 && (await pass.getByText(/Pas un titre de transport/).count()) === 1);
      const hs = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1); ok(`${tag} PASS (${label}) : aucun défilement horizontal`, !hs);
      await p.goto(A + "/v3/club"); await p.waitForTimeout(1500);
      const card = p.locator('[aria-label^="Member SKYLINE"]'); const cn = card.locator(".metal-text").first(); const g = await fits(cn); const co = await cardOk(card.first());
      ok(`${tag} CARTE CLUB (${label}) : nom jamais tronqué`, !g.ellipsis && !g.clipped && !g.out && g.lines <= 3 && g.size >= 16, JSON.stringify(g));
      ok(`${tag} CARTE CLUB (${label}) : dernière ligne (« Membre depuis / N° ») entièrement visible dans la carte`, co.bottom <= co.cardBottom + 0.5, JSON.stringify(co));
      if (!name) ok(`${tag} CARTE CLUB : proportions d'origine conservées (≈ 1,586) avec le nom par défaut, y compris à 320 px`, Math.abs(co.w / co.h - 1.586) < 0.04, (co.w / co.h).toFixed(3));
      ok(`${tag} CARTE CLUB (${label}) : « En attente » (jamais de crochets)`, (await card.getByText("En attente").count()) === 1 && !/\[|\]/.test(await card.innerText()));
    }
    /* TUILES CLUB : sous-titres entiers, Messages non cliquable, My Space / Members accessibles */
    await p.goto(A + "/v3/club"); await p.waitForTimeout(1500);
    const subs = p.locator('nav[aria-label="Club"] .line-clamp-2'); const n = await subs.count(); let bad = [];
    for (let i = 0; i < n; i++) { const f = await fits(subs.nth(i)); if (f.clipped || f.lines > 2) bad.push(await subs.nth(i).innerText()); }
    ok(`${tag} TUILES CLUB : ${n} sous-titres entièrement lisibles (≤ 2 lignes, rien de coupé)`, n >= 3 && bad.length === 0, bad.join("|"));
    const tile = p.getByTestId("tile-soon");
    ok(`${tag} TUILE MESSAGES : « Bientôt », non cliquable (ni lien, ni flèche), même gabarit`, (await tile.count()) === 1 && (await tile.locator("a").count()) === 0 && (await tile.getByText("Bientôt").count()) === 1 && (await tile.locator("svg").count()) === 0 && Math.round((await tile.boundingBox()).height) === 76);
    ok(`${tag} TUILES CLUB : My Space, Members et Souvenirs restent des liens`, (await p.locator('nav[aria-label="Club"] a[href="/v3/club/space"]').count()) === 1 && (await p.locator('nav[aria-label="Club"] a[href="/v3/club/members"]').count()) === 1 && (await p.locator('nav[aria-label="Club"] a[href="/v3/club/memories"]').count()) === 1);
    await tile.evaluate((e) => e.scrollIntoView({ block: "center" })); await p.waitForTimeout(300); await tile.click().catch(() => {}); await p.waitForTimeout(500); ok(`${tag} TUILE MESSAGES : un tap ne change pas de page`, new URL(p.url()).pathname === "/v3/club");
    await p.goto(A + "/v3/club/memories"); await p.waitForTimeout(1200); t = await p.evaluate(() => document.body.innerText);
    ok(`${tag} SOUVENIRS : pastille « Archives SKYLINE », titre « Photographies », phrase « Revivez les moments SKYLINE. », plus de paragraphe « En production », aucune affirmation historique`, /archives skyline/i.test(t) && /photographies/i.test(t) && /Revivez les moments SKYLINE\./.test(t) && !/En production|Aperçu|première édition|édition précédente|archives officielles/i.test(t) && (await p.title()) === "Souvenirs — SKYLINE");
    /* titres des quatre onglets */
    const titles = []; for (const [path, exp] of [["/v3", "SKYLINE"], ["/v3/flight", "My Flight — SKYLINE"], ["/v3/explore", "Explore — SKYLINE"], ["/v3/club", "Club — SKYLINE"], ["/v3/explore/sound", "Skyline Sound — SKYLINE"], ["/v3/club/space", "My Space — SKYLINE"], ["/v3/account", "Mon compte — SKYLINE"]]) { await p.goto(A + path); await p.waitForTimeout(500); const tt = await p.title(); if (tt !== exp) titles.push(`${path}: « ${tt} » ≠ « ${exp} »`); }
    ok(`${tag} TITRES : cohérents sur HOME, MY FLIGHT, EXPLORE, CLUB, SOUND, My Space, compte (aucun « Prototype »)`, titles.length === 0, titles.join(" ; "));
    const aria = await (async () => { await p.goto(A + "/v3"); return p.getByRole("link", { name: /accueil/ }).first().getAttribute("aria-label"); })(); ok(`${tag} ACCESSIBILITÉ : le logo s'appelle « SKYLINE — accueil » (plus de « prototype »)`, aria === "SKYLINE — accueil", aria);
    await ctx.close();
    /* MEMBRE SANS RÉSERVATION */
    await ctl({ reset: true, delay: 0 }); await ctl({ travelers: {} }); [ctx, p] = await mk(A); await login(p);
    await p.goto(A + "/v3/flight"); await p.waitForTimeout(1500); const pass2 = p.locator('[aria-label^="Pass SKYLINE"]'); const f2 = await fits(pass2.locator(".metal-text").first());
    ok(`${tag} MEMBRE sans réservation : pass « Réservation à confirmer », nom entier, aucun QR`, (await pass2.getByText(/Réservation à confirmer/).count()) === 1 && !f2.ellipsis && !f2.clipped && (await pass2.getByText(/^QR$/).count()) === 0, JSON.stringify(f2));
    await ctx.close();
    /* VISITEUR : parcours cohérent (connexion proposée quand elle existe) ; sans comptes : aucune tuile morte cliquable en plus */
    [ctx, p] = await mk(A); await p.goto(A + "/v3/club/space"); await p.waitForTimeout(1500);
    ok(`${tag} VISITEUR (comptes disponibles) : My Space propose « Se connecter » vers /v3/login, pas un cul-de-sac`, (await p.getByRole("link", { name: /Se connecter/ }).first().getAttribute("href"))?.startsWith("/v3/login") === true);
    await p.goto(A + "/v3/club"); await p.waitForTimeout(1200); ok(`${tag} VISITEUR : Messages « Bientôt » non cliquable aussi`, (await p.getByTestId("tile-soon").count()) === 1);
    await ctx.close();
    [ctx, p] = await mk(OFF); await p.goto(OFF + "/v3/flight"); await p.waitForTimeout(1500); const pass3 = p.locator('[aria-label^="Pass SKYLINE"]'); const f3 = await fits(pass3.locator(".metal-text").first());
    ok(`${tag} VISITEUR (sans comptes) : pass « à confirmer », nom entier, aucun QR ni mention technique`, !f3.ellipsis && !f3.clipped && (await pass3.getByText(/^QR$/).count()) === 0 && !/prototype|démonstration/i.test(await p.evaluate(() => document.body.innerText + document.title + [...document.querySelectorAll("[aria-label]")].map((e) => e.getAttribute("aria-label")).join(" "))), JSON.stringify(f3));
    await ctx.close();
  }
  /* En-têtes de sécurité (D4) — tous serveurs, y compris STAFF HQ (sans le modifier) */
  const ctx = await browser.newContext();
  for (const path of ["/v3", "/v3/flight", "/staff/login", "/start", "/signal/inconnu"]) { const r = await ctx.request.get(A + path, { maxRedirects: 0 }); const h = r.headers();
    ok(`EN-TÊTES ${path} : X-Content-Type-Options=nosniff et Referrer-Policy=strict-origin-when-cross-origin`, h["x-content-type-options"] === "nosniff" && h["referrer-policy"] === "strict-origin-when-cross-origin", JSON.stringify({ n: h["x-content-type-options"], r: h["referrer-policy"], s: r.status() })); }
  const m = await ctx.request.get(A + "/manifest.webmanifest"); const mj = await m.json(); ok("MANIFEST : description sans « démonstration » ; start_url inchangé (« / », D5 reporté)", !/démonstration|prototype/i.test(mj.description || "") && mj.start_url === "/", JSON.stringify(mj).slice(0, 160));
  await ctx.close(); await browser.close(); console.log(fails ? `${fails} ÉCHEC(S)` : "TOUT PASSE"); process.exit(fails ? 1 : 0);
})();
