/* eslint-disable */
// Validation de configuration : une configuration demandée mais incorrecte → ERREUR EXPLICITE (503), jamais de repli silencieux vers le local.
// Le mode démonstration reste disponible quand STAFF_DATA_SOURCE=local est explicite ou par défaut. L'application participants n'est jamais affectée.
const { chromium } = require("playwright");
const E = { A: process.env.CFG_A, B: process.env.CFG_B, C: process.env.CFG_C, D: process.env.CFG_D };
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${!c && d ? " — " + d : ""}`); if (!c) fails++; };
const PATHS = ["/staff", "/staff/missions", "/staff/access", "/staff/login", "/staff/team", "/staff/profile"];
(async () => {
  const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
  const get = (url, o = {}) => ctx.request.get(url, { maxRedirects: 0, ...o });
  // Jeton de démonstration parfaitement valide (serveur D, démo explicite) : ne doit RIEN ouvrir ailleurs.
  const demo = await ctx.request.post(E.D + "/api/demo-session", { form: { account: "tom" }, maxRedirects: 0 });
  const tok = /sk_demo=([^;]+)/.exec(demo.headers()["set-cookie"] || "")?.[1];
  ok("DÉMO EXPLICITE (STAFF_DATA_SOURCE=local) : la connexion de démonstration fonctionne", demo.status() === 303 && !!tok, String(demo.status()));

  const cases = [["A", "STAFF_DATA_SOURCE=db sans authentification Supabase", /STAFF_DATA_SOURCE=db.*STAFF_AUTH_MODE=supabase/], ["B", "STAFF_AUTH_MODE=supabase sans URL/clé Supabase", /NEXT_PUBLIC_SUPABASE_URL/], ["C", "STAFF_DATA_SOURCE à valeur inconnue (faute de frappe)", /non reconnue/]];
  for (const [k, label, re] of cases) {
    const base = E[k]; await ctx.addCookies([{ name: "sk_demo", value: tok, url: base }]);
    let good = true, bad = ""; for (const p of PATHS) { const r = await get(base + p); const body = await r.text(); if (r.status() !== 503 || !/Configuration invalide/.test(body) || !re.test(body) || r.headers()["cache-control"] !== "no-store") { good = false; bad += `${p}:${r.status()} `; } }
    ok(`ERREUR EXPLICITE — ${label} : toutes les pages STAFF → 503 « Configuration invalide » + cause, sans cache`, good, bad);
    const s = await (await get(base + "/api/staff/session")).json(); ok(`ERREUR EXPLICITE — ${label} : l'API de session signale « misconfigured », aucune session`, s.dataSource === "misconfigured" && s.session === null && typeof s.configError === "string");
    ok(`ERREUR EXPLICITE — ${label} : un jeton de démonstration valide n'ouvre RIEN`, (await get(base + "/staff/missions")).status() === 503);
    ok(`ERREUR EXPLICITE — ${label} : l'ouverture de session de démonstration est refusée`, (await ctx.request.post(base + "/api/demo-session", { form: { account: "tom" }, maxRedirects: 0 })).status() === 404);
    const body = await (await get(base + "/staff")).text(); ok(`ERREUR EXPLICITE — ${label} : le message ne contient aucune valeur sensible`, !/sb_secret|service_role|eyJ|https?:\/\/[a-z0-9.-]+\.supabase/i.test(body));
    // L'application participants n'est pas affectée
    let pub = true, pbad = ""; for (const p of ["/start", "/explore", "/"]) { const r = await get(base + p); if (![200, 307].includes(r.status())) { pub = false; pbad += `${p}:${r.status()} `; } }
    ok(`PARTICIPANTS — ${label} : l'application participants reste disponible`, pub, pbad);
  }
  // Affichage navigateur de l'erreur (mobile)
  const p = await ctx.newPage(); await p.goto(E.A + "/staff/missions", { waitUntil: "domcontentloaded" });
  ok("AFFICHAGE : message lisible (iPhone SE 375 px), aucun débordement horizontal, aucune donnée de mission", (await p.getByTestId("config-error").isVisible()) && await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth) && (await p.getByText(/Repérage photo|Mission/).count()) <= 1);
  await p.screenshot({ path: "/tmp/config-error.png" });

  // Défaut / local explicite : comportement habituel (démo), pas d'erreur
  await ctx.addCookies([{ name: "sk_demo", value: tok, url: E.D }]);
  const r = await get(E.D + "/staff/missions"); ok("LOCAL EXPLICITE : STAFF HQ accessible en démonstration (200), sans erreur de configuration", r.status() === 200 && !/Configuration invalide/.test(await r.text()), String(r.status()));
  const s = await (await get(E.D + "/api/staff/session")).json(); ok("LOCAL EXPLICITE : source « local », mode démo", s.dataSource === "local" && s.mode === "demo" && s.session?.memberId === "tom");
  const q = await ctx.newPage(); await q.goto(E.D + "/staff/missions", { waitUntil: "domcontentloaded" });
  ok("LOCAL EXPLICITE : l'écran Missions affiche la mention de stockage local", await q.getByText(/Enregistré sur cet appareil uniquement/).first().isVisible({ timeout: 10000 }).catch(() => false));
  await browser.close(); console.log(fails ? `\n${fails} ÉCHEC(S)` : "\nTous les tests de configuration sont passés."); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
