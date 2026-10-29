/* eslint-disable */
// STAFF HQ V2 — mode Supabase : isolation, redirections, formulaire de connexion (réponses Supabase SIMULÉES : aucun vrai projet n'est contacté).
// Nécessite deux serveurs : BASE (mode démonstration, port 3100) et BASE_SUPA (copie construite avec STAFF_AUTH_MODE=supabase + URL factice, port 3102).
// Voir `npm run test:auth` (script tests/run-auth.sh).
const { chromium } = require("playwright");
const B = process.env.BASE || "http://localhost:3100"; const S = process.env.BASE_SUPA || "http://localhost:3102";
const FAKE = "http://127.0.0.1:9";
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${!c && d ? " — " + d : ""}`); if (!c) fails++; };
const PATHS = ["/staff", "/staff/missions", "/staff/schedule", "/staff/comms", "/staff/comms/general", "/staff/team", "/staff/team/tom", "/staff/profile"];
(async () => {
  const browser = await chromium.launch();
  const mk = async (o = {}) => { const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, ...o }); const p = await ctx.newPage(); return { ctx, p }; };
  const hit = async (ctx, url) => { const r = await ctx.request.get(url, { maxRedirects: 0 }); return { status: r.status(), loc: r.headers()["location"] || "" }; };
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };

  /* 1. Isolation côté serveur (mode supabase) */
  {
    const { ctx } = await mk(); let good = true, bad = "";
    for (const p of PATHS) { const r = await hit(ctx, S + p); if (!(r.status === 307 && r.loc.includes("/staff/login"))) { good = false; bad += `${p}:${r.status}:${r.loc} `; } }
    ok("SUPABASE : toutes les pages STAFF redirigent vers /staff/login sans session", good, bad);
    ok("SUPABASE : /staff/login est public", (await ctx.request.get(S + "/staff/login")).status() === 200);
    const a = await hit(ctx, S + "/staff/access"); ok("SUPABASE : la page d'accès démo est fermée (redirection vers la connexion)", a.status === 307 && a.loc.includes("/staff/login"));
    ok("SUPABASE : l'ouverture de session démo est refusée (404)", (await ctx.request.post(S + "/api/demo-session", { form: { account: "tom" }, maxRedirects: 0 })).status() === 404);
    const j = await (await ctx.request.get(S + "/api/staff/session")).json(); ok("SUPABASE : session API sans connexion → null, mode supabase", j.mode === "supabase" && j.session === null);
    // un cookie de démo parfaitement valide sur le serveur de démonstration ne donne rien ici
    const demo = await ctx.request.post(B + "/api/demo-session", { form: { account: "tom" }, maxRedirects: 0 }); const tok = /sk_demo=([^;]+)/.exec(demo.headers()["set-cookie"] || "")?.[1];
    await ctx.addCookies([{ name: "sk_demo", value: tok, url: S }]); const r = await hit(ctx, S + "/staff"); ok("SUPABASE : un jeton de démonstration valide n'ouvre RIEN en mode supabase", r.status === 307 && r.loc.includes("/staff/login"));
    for (const [n, v] of [["cookie Supabase falsifié", "garbage"], ["JWT inventé", "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4Iiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQifQ.AAAA"]]) {
      await ctx.addCookies([{ name: "sb-127-auth-token", value: v, url: S }, { name: "sb-127-auth-token.0", value: v, url: S }]);
      const h = await hit(ctx, S + "/staff/missions"); ok(`SUPABASE : ${n} → refusé`, h.status === 307 && h.loc.includes("/staff/login"));
    }
    ok("SUPABASE : rappel de callback sans code → connexion avec erreur", (await hit(ctx, S + "/auth/callback")).loc.includes("/staff/login?error=1"));
    ok("SUPABASE : callback avec un faux code (service injoignable) → erreur, pas de session", (await hit(ctx, S + "/auth/callback?code=abc&next=https://evil.example")).loc.includes("/staff/login?error=1"));
    ok("SUPABASE : déconnexion uniquement en POST", (await ctx.request.get(S + "/auth/signout", { maxRedirects: 0 })).status() === 405 && (await ctx.request.post(S + "/auth/signout", { maxRedirects: 0 })).status() === 303);
    ok("DÉMO : en mode démonstration, /staff/login n'existe pas (redirection vers l'accès démo)", (await hit(ctx, B + "/staff/login")).loc.includes("/staff/access") && (await hit(ctx, B + "/auth/callback")).status === 404);
    await ctx.close();
  }
  /* 2. Formulaire de connexion (Supabase simulé) */
  {
    const { ctx, p } = await mk(); const calls = [];
    await ctx.route(FAKE + "/**", async (route) => {
      const req = route.request(); const url = new URL(req.url());
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
      const body = req.postData() ? JSON.parse(req.postData()) : {}; calls.push({ path: url.pathname, body, redirect: url.searchParams.get("redirect_to") });
      if (url.pathname.endsWith("/otp")) return route.fulfill({ status: calls.filter((c) => c.path.endsWith("/otp")).length === 3 ? 429 : 200, headers: { ...cors, "content-type": "application/json" }, body: calls.filter((c) => c.path.endsWith("/otp")).length === 3 ? JSON.stringify({ code: 429, error_code: "over_email_send_rate_limit", msg: "rate limit" }) : "{}" });
      if (url.pathname.endsWith("/verify")) return route.fulfill({ status: 403, headers: { ...cors, "content-type": "application/json" }, body: JSON.stringify({ code: 403, error_code: "otp_expired", msg: "Token has expired or is invalid" }) });
      return route.fulfill({ status: 404, headers: cors, body: "{}" });
    });
    await p.goto(S + "/staff/missions"); await p.waitForTimeout(1200);
    ok("LOGIN : /staff/missions sans session → écran de connexion Staff HQ (sans chrome)", new URL(p.url()).pathname === "/staff/login" && new URL(p.url()).searchParams.get("next") === "/staff/missions" && (await p.getByRole("heading", { level: 1, name: "Staff HQ" }).count()) === 1 && (await p.getByRole("navigation").count()) === 0);
    await p.getByLabel("Adresse e-mail").fill("pas-un-email"); await p.getByRole("button", { name: "Recevoir un code" }).click(); await p.waitForTimeout(300);
    ok("LOGIN : adresse invalide refusée côté formulaire (aucune requête)", (await p.getByRole("alert").filter({ hasText: "adresse e-mail valide" }).count()) === 1 && calls.length === 0);
    await p.getByLabel("Adresse e-mail").fill("Test@Example.com"); await p.getByRole("button", { name: "Recevoir un code" }).click(); await p.waitForTimeout(800);
    const otp = calls.find((c) => c.path.endsWith("/otp"));
    ok("LOGIN : demande de code → create_user=false (aucun compte créé), e-mail normalisé, retour vers /auth/callback?next=…", !!otp && otp.body.create_user === false && otp.body.email === "test@example.com" && /\/auth\/callback\?next=%2Fstaff%2Fmissions$/.test(otp.redirect || ""), JSON.stringify(otp));
    ok("LOGIN : message neutre (n'indique pas si le compte existe) et saisie du code", (await p.getByText("Si ce compte existe, un code vient d'être envoyé").count()) === 1 && (await p.getByLabel("Code reçu").count()) === 1);
    await p.getByLabel("Code reçu").fill("12"); await p.getByRole("button", { name: "Se connecter" }).click(); await p.waitForTimeout(300);
    ok("LOGIN : code mal formé refusé côté formulaire", (await p.getByRole("alert").filter({ hasText: "code reçu" }).count()) === 1);
    await p.getByLabel("Code reçu").fill("123456"); await p.getByRole("button", { name: "Se connecter" }).click(); await p.waitForTimeout(800);
    const ver = calls.find((c) => c.path.endsWith("/verify"));
    ok("LOGIN : vérification → type email + code ; code refusé → message générique, pas de session", !!ver && ver.body.type === "email" && ver.body.token === "123456" && (await p.getByRole("alert").filter({ hasText: "Code invalide ou expiré" }).count()) === 1 && new URL(p.url()).pathname === "/staff/login");
    ok("LOGIN : « Renvoyer le code » inactif pendant le délai (60 s)", await p.getByRole("button", { name: /Renvoyer le code \(\d+ s\)/ }).isDisabled());
    await p.getByRole("button", { name: "Changer d'adresse" }).click(); await p.getByLabel("Adresse e-mail").fill("a@b.co"); await p.getByRole("button", { name: "Recevoir un code" }).click(); await p.waitForTimeout(500);
    await p.getByRole("button", { name: "Changer d'adresse" }).click(); await p.getByLabel("Adresse e-mail").fill("a@b.co"); await p.getByRole("button", { name: "Recevoir un code" }).click(); await p.waitForTimeout(600);
    ok("LOGIN : limite de débit → message dédié", (await p.getByRole("alert").filter({ hasText: "Trop de tentatives" }).count()) === 1);
    await p.goto(S + "/staff/login?denied=1"); await p.waitForTimeout(800);
    ok("LOGIN : compte non autorisé → message clair + déconnexion", (await p.getByRole("alert").filter({ hasText: "pas autorisé" }).count()) === 1 && (await p.getByRole("button", { name: "Se déconnecter" }).count()) === 1);
    ok("LOGIN : aucune clé secrète dans le code client (service_role / secret absents des pages)", !/service_role|SERVICE_ROLE|sb_secret/.test(await p.content()));
    for (const w of [375, 390, 430]) { await p.setViewportSize({ width: w, height: 800 }); await p.goto(S + "/staff/login"); await p.waitForTimeout(500); ok(`LOGIN ${w} px : aucun défilement horizontal`, (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0); }
    await ctx.close();
  }
  await browser.close(); console.log(fails ? `${fails} ÉCHEC(S)` : "TOUT PASSE"); process.exit(fails ? 1 : 0);
})();
