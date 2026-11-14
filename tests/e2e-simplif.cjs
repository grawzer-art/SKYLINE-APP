/* eslint-disable */
// V3.2 SIMPLIFICATION — étape 1 : en-tête compact et CLUB. Serveurs de tests/run-participant.sh : A=3105 (comptes) · OFF=3106 (sans comptes). 320 et 390 px, trois états utilisateurs.
const { chromium } = require("playwright");
const A = process.env.PART_A || "http://localhost:3105", OFF = process.env.PART_OFF || "http://localhost:3106", MOCK = process.env.MOCK || "http://127.0.0.1:3199";
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${!c && d ? " — " + d : ""}`); if (!c) fails++; };
const ctl = (b) => fetch(MOCK + "/__control", { method: "POST", body: JSON.stringify(b) }).then((r) => r.json());
async function login(p) { await p.goto(A + "/v3/login"); await p.locator("#login-email").fill("participant@example.test"); await p.getByRole("button", { name: "Recevoir un code" }).click(); await p.locator("#login-code").fill("123456"); await p.getByRole("button", { name: "Se connecter" }).click(); await p.waitForURL("**/v3/account", { timeout: 8000 }); }
const ROUTES = [["/v3/club", "CLUB", false], ["/v3/club/space", "PROFIL CLUB", true], ["/v3/club/members", "MEMBRES", true], ["/v3/club/memories", "SOUVENIRS", true], ["/v3/club/messages", "MESSAGES", true], ["/v3/profile", "PROFIL", false], ["/v3/account", "COMPTE", true]];
const hdr = (p) => p.evaluate(() => { const h = document.querySelector('[data-testid="header-compact"]'); if (!h) return null; const r = h.getBoundingClientRect(); const l = h.querySelector('[data-testid="header-label"]'); const wm = h.querySelector("img"); const av = h.querySelector('a[aria-label="Profil et paramètres"] span').getBoundingClientRect(); return { h: Math.round(r.height), label: l.textContent, labelCut: l.scrollWidth > l.clientWidth + 1, wm: wm && wm.getBoundingClientRect().height, hasBack: !!h.querySelector('a[aria-label^="Retour"]'), avRight: Math.round(innerWidth - av.right), hs: document.documentElement.scrollWidth > innerWidth + 1, h1: [...document.querySelectorAll("h1")].map((e) => e.textContent.trim()), banner: /Programme à confirmer/i.test(document.body.innerText) }; });
(async () => {
  const browser = await chromium.launch();
  for (const w of [320, 390]) {
    const tag = `[${w}px]`; const H = w === 390 ? 844 : 700;
    const mk = async (base) => { const ctx = await browser.newContext({ viewport: { width: w, height: H }, isMobile: true, hasTouch: true }); await ctx.addCookies([{ name: "sk_space", value: "members", url: base }]); return [ctx, await ctx.newPage()]; };
    for (const [state, base, trav] of [["voyageur vérifié", A, { participant: true }], ["membre sans réservation", A, {}], ["visiteur (comptes disponibles)", A, null], ["visiteur (sans comptes)", OFF, null]]) {
      await ctl({ reset: true, delay: 0 }); if (trav) await ctl({ travelers: trav });
      const [ctx, p] = await mk(base); if (trav) await login(p);
      const probs = [];
      for (const [path, label, back] of ROUTES) {
        if ((state.startsWith("visiteur") && path === "/v3/account") || (base === OFF && path === "/v3/account")) continue;
        const r = await p.goto(base + path); await p.waitForTimeout(1200); const h = await hdr(p);
        if (!h) { probs.push(`${path}: pas d'en-tête compact`); continue; }
        if (h.h < 43 || h.h > 46) probs.push(`${path}: hauteur ${h.h}`); if (h.label !== label) probs.push(`${path}: label « ${h.label} »`); if (h.labelCut) probs.push(`${path}: label tronqué`);
        if (h.hasBack !== back) probs.push(`${path}: retour=${h.hasBack}`); if (h.hs) probs.push(`${path}: défilement horizontal`); if (h.h1.length !== 1) probs.push(`${path}: ${h.h1.length} h1`); if (h.banner) probs.push(`${path}: bandeau « Programme à confirmer »`);
        if (Math.abs(h.avRight - 20) > 1.5) probs.push(`${path}: avatar à ${h.avRight}px du bord (attendu 20)`); if (Math.abs(h.wm - 14) > 0.6) probs.push(`${path}: logo ${h.wm}px`);
      }
      ok(`${tag} EN-TÊTE COMPACT (${state}) : 44 px, « SKYLINE | nom d'écran », logo 14 px, avatar aligné sur la marge, un seul h1, aucun bandeau, aucun défilement horizontal, retour sur les sous-écrans`, probs.length === 0, probs.join(" ; "));
      /* CLUB */
      await p.goto(base + "/v3/club"); await p.waitForTimeout(1400);
      const m = await p.evaluate(({ navTop, OPEN }) => { const rows = [...document.querySelectorAll('nav[aria-label="Club"] a')].map((e) => e.getBoundingClientRect()); const covered = [...document.querySelectorAll('nav[aria-label="Club"] a')].filter((a) => { const r = a.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !e || e.closest('a') !== a; }).length; const sub = [...document.querySelectorAll('nav[aria-label="Club"] .line-clamp-2')].map((e) => e.textContent.trim()); const clipped = [...document.querySelectorAll('nav[aria-label="Club"] .line-clamp-2')].some((e) => e.scrollHeight > e.clientHeight + 1); return { covered, first: Math.round(rows[0].top), lastBottom: Math.round(rows[rows.length - 1].bottom), n: rows.length, sub, clipped, tag: /From France to Ibiza/i.test(document.body.innerText), forbidden: /Messages|THE JOURNEY|The membership|N° |Membre depuis|reflet/i.test(document.body.innerText) || (!OPEN && /Bientôt/.test(document.body.innerText)) }; }, { navTop: H - 60, OPEN: base === OFF });
      const open = base === OFF;
      ok(`${tag} CLUB (${state}) : 3 accès, aucun masqué par le bandeau photo (test de survol), 1er accès avant ${w === 390 ? 190 : 175} px, tout au-dessus de la barre du bas, rien de coupé`, m.covered === 0 && m.n === 3 && m.first <= (w === 390 ? 190 : 175) && m.lastBottom <= H - 60 - 8 && !m.clipped, JSON.stringify(m));
      ok(`${tag} CLUB (${state}) : bandeau « From France to Ibiza » conservé ; ni carte membre, ni reflet, ni Messages, ni « The journey never ends », ni titre géant`, m.tag && !m.forbidden, JSON.stringify(m.forbidden));
      const txt = m.sub.join(" | ");
      if (state === "voyageur vérifié") ok(`${tag} CLUB (${state}) : Membres ouvert (« Rencontrer la communauté »)`, /Rencontrer la communauté/.test(txt) && !/Réservé aux voyageurs/.test(txt), txt);
      if (state === "membre sans réservation") ok(`${tag} CLUB (${state}) : Membres « Réservé aux voyageurs vérifiés » ; Mon profil CLUB utilisable`, /Réservé aux voyageurs vérifiés/.test(txt) && /Votre monde/.test(txt), txt);
      if (state === "visiteur (comptes disponibles)") ok(`${tag} CLUB (${state}) : Mon profil CLUB invite à se connecter ; Souvenirs ouvert ; parcours de connexion intact`, /Connectez-vous pour gérer votre profil CLUB/.test(txt) && (await p.locator('nav[aria-label="Club"] a[href="/v3/club/memories"]').count()) === 1, txt);
      if (state === "visiteur (comptes disponibles)") { await p.goto(A + "/v3/club/space"); await p.waitForTimeout(1200); ok(`${tag} VISITEUR : Mon profil CLUB → « Se connecter » → /v3/login`, (await p.getByRole("link", { name: /Se connecter/ }).first().getAttribute("href"))?.startsWith("/v3/login") === true); }
      if (open) ok(`${tag} CLUB (${state}) : lignes « Bientôt » pour Mon profil CLUB et Membres (aucune fonction communautaire sans comptes) ; Souvenirs ouvert`, /Bientôt/.test(txt) && (await p.locator('nav[aria-label="Club"] a[href="/v3/club/memories"]').count()) === 1, txt);
      /* Navigation : retour depuis un sous-écran, accès Souvenirs sans compte */
      await p.goto(base + "/v3/club/memories"); await p.waitForTimeout(900); await p.getByRole("link", { name: "Retour : Club" }).click(); await p.waitForTimeout(800);
      ok(`${tag} NAVIGATION (${state}) : Souvenirs ouvert, flèche de retour de l'en-tête → CLUB`, new URL(p.url()).pathname === "/v3/club");
      await p.goto(base + "/v3/club"); await p.waitForTimeout(700); await p.locator('nav[aria-label="Club"] a[href="/v3/club/memories"]').click(); await p.waitForTimeout(900);
      ok(`${tag} NAVIGATION (${state}) : CLUB → Souvenirs en un tap, contenu visible sans connexion`, new URL(p.url()).pathname === "/v3/club/memories" && /ARCHIVES SKYLINE/i.test(await p.evaluate(() => document.body.innerText)));
      /* Onglets de la barre du bas depuis les écrans compacts + ancien en-tête conservé sur HOME / MY FLIGHT / EXPLORE (migrés aux étapes suivantes) */
      const nav = []; for (const [name, path] of [["Home", "/v3"], ["My Flight", "/v3/flight"], ["Explore", "/v3/explore"], ["Club", "/v3/club"]]) { await p.goto(base + "/v3/club/memories"); await p.waitForTimeout(400); await p.locator("nav[aria-label='Navigation principale']").getByRole("link").filter({ hasText: new RegExp("^\\s*" + name, "i") }).first().click(); await p.waitForTimeout(700); if (new URL(p.url()).pathname !== path || (await p.locator("nav[aria-label='Navigation principale'] [aria-current='page']").count()) !== 1) nav.push(`${name}→${new URL(p.url()).pathname}`); }
      ok(`${tag} NAVIGATION (${state}) : les 4 onglets fonctionnent depuis un écran compact`, nav.length === 0, nav.join(" ; "));
      const legacy = []; for (const path of ["/v3", "/v3/flight", "/v3/explore"]) { await p.goto(base + path); await p.waitForTimeout(700); if ((await p.locator('[data-testid="header-compact"]').count()) !== 0) legacy.push(path); }
      ok(`${tag} ÉTAPE 1 (${state}) : HOME, MY FLIGHT et EXPLORE gardent encore l'ancien en-tête (migrés aux étapes 2 et 3)`, legacy.length === 0, legacy.join(","));
      await ctx.close();
    }
  }
  await browser.close(); console.log(fails ? `${fails} ÉCHEC(S)` : "TOUT PASSE"); process.exit(fails ? 1 : 0);
})();
