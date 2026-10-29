/* eslint-disable */
// STAFF HQ : contrôle d'accès SERVEUR (cookie signé vérifié par le proxy), rôles, sélecteur d'espace, navigation, mobiles.
const { chromium } = require("playwright");
const B = process.env.BASE || "http://localhost:3100";
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${!c && d ? " — " + d : ""}`); if (!c) fails++; };
const STAFF_PATHS = ["/staff", "/staff/missions", "/staff/schedule", "/staff/comms", "/staff/comms/general", "/staff/team", "/staff/team/tom", "/staff/profile"];
const b64u = (s) => Buffer.from(s).toString("base64url");
(async () => {
  const browser = await chromium.launch();
  const mk = async (o = {}) => { const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, ...o }); await ctx.addCookies([{ name: "sk_space", value: "members", url: B }]); const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message)); return { ctx, p, errs }; };
  const login = async (ctx, account) => { const r = await ctx.request.post(B + "/api/demo-session", { form: { account, next: "/staff" }, maxRedirects: 0 }); return r; };
  const hit = async (ctx, path) => { const r = await ctx.request.get(B + path, { maxRedirects: 0 }); return { status: r.status(), loc: r.headers()["location"] || "" }; };

  /* 0. Choix de l'espace à l'ouverture */
  {
    const fresh = async () => { const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); return { ctx, p: await ctx.newPage() }; };
    let { ctx, p } = await fresh(); await p.goto(B + "/"); await p.waitForTimeout(1000);
    ok("OUVERTURE : premier lancement → écran de choix de l'espace", new URL(p.url()).pathname === "/start" && (await p.getByRole("heading", { level: 1, name: "Choisissez votre espace" }).count()) === 1);
    ok("OUVERTURE : deux choix Members et Staff HQ, sans barre de navigation", (await p.getByRole("link", { name: /Members/ }).count()) === 1 && (await p.getByRole("link", { name: /Staff HQ/ }).count()) === 1 && (await p.getByRole("navigation").count()) === 0);
    await p.getByRole("link", { name: /Members/ }).click(); await p.waitForURL(B + "/"); await p.waitForTimeout(800);
    ok("OUVERTURE : choisir Members ouvre l'app participant", (await p.getByRole("heading", { level: 1 }).first().innerText()).toLowerCase().includes("la fête"));
    await p.goto(B + "/"); await p.waitForTimeout(800); ok("OUVERTURE : choix mémorisé (réouverture directe sur Members)", new URL(p.url()).pathname === "/");
    await p.goto(B + "/start"); await p.waitForTimeout(600);
    await p.getByRole("link", { name: /Staff HQ/ }).click(); await p.waitForURL("**/staff/access**"); await p.waitForTimeout(600);
    ok("OUVERTURE : choisir Staff sans session → accès (démo) vérifié par le serveur", (await p.getByRole("button", { name: /^Qafard/ }).count()) === 1);
    await p.getByRole("button", { name: /^Participant/ }).click(); await p.waitForTimeout(900);
    ok("OUVERTURE : compte participant refusé malgré le choix Staff", new URL(p.url()).search.includes("denied=1"));
    await p.goto(B + "/"); await p.waitForTimeout(900);
    ok("OUVERTURE : choix Staff mémorisé → ouverture directe côté STAFF (puis refus serveur)", new URL(p.url()).pathname === "/staff/access");
    await p.getByRole("link", { name: /Retour à Members/ }).click(); await p.waitForURL(B + "/"); await p.waitForTimeout(600);
    await p.goto(B + "/"); await p.waitForTimeout(600); ok("OUVERTURE : « Retour à Members » remet Members comme choix", new URL(p.url()).pathname === "/");
    await ctx.close();
    ({ ctx, p } = await fresh()); await login(ctx, "graw"); await p.goto(B + "/start"); await p.waitForTimeout(600);
    await p.getByRole("link", { name: /Staff HQ/ }).click(); await p.waitForURL(B + "/staff"); await p.waitForTimeout(800);
    ok("OUVERTURE : compte staff → STAFF HQ directement", (await p.getByRole("heading", { level: 1, name: "HQ" }).count()) === 1);
    await p.goto(B + "/"); await p.waitForTimeout(800); ok("OUVERTURE : réouverture → STAFF HQ", new URL(p.url()).pathname === "/staff");
    await p.getByRole("link", { name: "Profil et espaces" }).click(); await p.waitForURL("**/staff/profile"); await p.waitForTimeout(700);
    await p.getByRole("link", { name: /Changer d'espace/ }).click(); await p.waitForURL("**/start"); await p.waitForTimeout(500);
    ok("PROFIL : « Changer d'espace » ramène à l'écran de choix", (await p.getByRole("heading", { level: 1, name: "Choisissez votre espace" }).count()) === 1);
    const soft = await (async () => { await p.getByRole("link", { name: /Members/ }).click(); await p.waitForURL(B + "/"); await p.waitForTimeout(500); await p.getByRole("link", { name: "Club" }).first().click().catch(() => {}); await p.waitForTimeout(800); return new URL(p.url()).pathname; })();
    ok("OUVERTURE : les navigations internes ne sont jamais redirigées vers le choix", !soft.startsWith("/start") && !soft.startsWith("/staff"), soft);
    await ctx.close();
  }

  /* 1. Serveur : sans session */
  {
    const { ctx } = await mk(); let allBlocked = true, bad = "";
    for (const p of STAFF_PATHS) { const r = await hit(ctx, p); if (!(r.status >= 300 && r.status < 400 && r.loc.includes("/staff/access"))) { allBlocked = false; bad += `${p}:${r.status} `; } }
    ok("SERVEUR : toutes les pages STAFF redirigent vers l'accès sans session", allBlocked, bad);
    ok("SERVEUR : la page d'accès démo reste publique", (await hit(ctx, "/staff/access")).status === 200);
    await ctx.close();
  }
  /* 2. Falsification : cookie inventé, charge utile modifiée, localStorage */
  {
    const { ctx, p } = await mk();
    const payload = b64u(JSON.stringify({ sub: "x", name: "Pirate", roles: ["admin"], demo: true, iat: 1, exp: 9999999999 }));
    for (const [n, v] of [["cookie aléatoire", "abc"], ["charge utile sans signature valide", `${payload}.AAAA`], ["jeton à 3 segments", `${payload}.AAAA.BBBB`], ["rôles inconnus", `${b64u("{}")}.AAAA`]]) {
      await ctx.addCookies([{ name: "sk_demo", value: v, url: B }]); const r = await hit(ctx, "/staff");
      ok(`FALSIFICATION : ${n} refusé`, r.status >= 300 && r.status < 400 && r.loc.includes("/staff/access"), JSON.stringify(r));
    }
    await ctx.clearCookies();
    await p.addInitScript(() => { localStorage.setItem("role", "staff"); localStorage.setItem("skyline.role", "admin"); localStorage.setItem("skyline.v3.proto.v2", JSON.stringify({ roles: ["admin", "staff"] })); });
    await p.goto(B + "/staff"); await p.waitForTimeout(800);
    ok("FALSIFICATION : localStorage / état client ne donnent aucun accès", new URL(p.url()).pathname === "/staff/access");
    await ctx.close();
  }
  /* 3. Rôles : participant refusé, staff / admin / staff+participant acceptés */
  for (const [acc, allowed] of [["participant", false], ["qafard", true], ["graw", true], ["tom", true]]) {
    const { ctx } = await mk(); const r = await login(ctx, acc);
    ok(`RÔLE ${acc} : session créée (cookie httpOnly signé)`, r.status() === 303 && /sk_demo=/.test(r.headers()["set-cookie"] || "") && /HttpOnly/i.test(r.headers()["set-cookie"] || ""));
    let okAll = true, bad = "";
    for (const p of STAFF_PATHS) { const h = await hit(ctx, p); const pass = allowed ? h.status === 200 : (h.status >= 300 && h.status < 400 && h.loc.includes("denied=1")); if (!pass) { okAll = false; bad += `${p}:${h.status}:${h.loc} `; } }
    ok(`RÔLE ${acc} : ${allowed ? "accès à toutes les pages STAFF HQ" : "refus de toutes les pages STAFF HQ"}`, okAll, bad);
    await ctx.close();
  }
  /* 4. Parcours navigateur : staff */
  {
    const { ctx, p, errs } = await mk(); await p.goto(B + "/staff"); await p.waitForTimeout(800);
    ok("ACCÈS : sans session, /staff mène à la page d'accès démo explicite", (await p.getByText(/démonstration/i).count()) >= 1 && (await p.getByRole("button", { name: /^Qafard/ }).count()) >= 1);
    await p.getByRole("button", { name: /^Qafard/ }).click(); await p.waitForURL(B + "/staff"); await p.waitForTimeout(900);
    ok("HQ : titre, prochaine échéance, priorités, annonces internes", (await p.getByRole("heading", { level: 1, name: "HQ" }).count()) === 1 && (await p.getByText("Prochaine échéance").count()) === 1 && (await p.getByText("Informations prioritaires").count()) === 1 && (await p.getByText("Annonces internes").count()) === 1);
    ok("HQ : navigation à quatre onglets (HQ, Schedule, Comms, Team)", (await p.getByRole("navigation", { name: "Navigation STAFF HQ" }).getByRole("link").allInnerTexts()).map((t) => t.trim().toLowerCase()).join("|") === "hq|schedule|comms|team");
    ok("HQ : pas de chrome participant (navigation Home / Club absente)", (await p.getByRole("navigation", { name: "Navigation principale" }).count()) === 0);
    const tab = (n) => p.getByRole("navigation", { name: "Navigation STAFF HQ" }).getByRole("link", { name: n, exact: true });
    await tab("Schedule").click(); await p.waitForURL("**/staff/schedule"); await p.waitForTimeout(500);
    ok("SCHEDULE : phases chronologiques, responsables, statuts", (await p.getByRole("heading", { level: 2, name: "Préparation" }).count()) === 1 && (await p.getByText("Sur place").count()) >= 1 && (await p.getByText(/À planifier/).count()) >= 1 && (await p.getByText(/J-45/).count()) >= 1);
    await tab("Comms").click(); await p.waitForURL("**/staff/comms"); await p.waitForTimeout(500);
    ok("COMMS : canaux par équipe + mention « non connectée »", (await p.getByText(/non connectée/).count()) >= 1 && (await p.getByRole("link", { name: /Photo & vidéo/ }).count()) === 1);
    await p.getByRole("link", { name: /Général/ }).click(); await p.waitForURL("**/comms/general"); await p.waitForTimeout(500);
    ok("COMMS : canal en lecture, saisie inactive (aucune messagerie simulée)", (await p.getByPlaceholder(/non connectée/).isDisabled()) && (await p.getByRole("button", { name: "Envoyer" }).isDisabled()));
    await tab("Team").click(); await p.waitForURL("**/staff/team"); await p.waitForTimeout(500);
    ok("TEAM : annuaire, filtre par fonction", (await p.getByText(/3 personnes/).count()) === 1);
    await p.getByRole("button", { name: "Photographe" }).click(); await p.waitForTimeout(300);
    ok("TEAM : le filtre fonctionne", (await p.getByText(/1 personne/).count()) === 1);
    await p.getByRole("link", { name: /Qafard/ }).click(); await p.waitForURL("**/team/qafard"); await p.waitForTimeout(1000);
    const vis = (t, o) => p.getByText(t, o).locator("visible=true");
    ok("FICHE : fonction et responsabilités séparées des rôles d'accès, coordonnées non partagées", (await vis("Responsabilités").count()) === 1 && (await vis("Accès", { exact: true }).count()) === 1 && (await vis(/Coordonnées non partagées/).count()) === 1);
    await p.goto(B + "/staff/team/tom"); await p.waitForTimeout(600);
    ok("FICHE : équipe active limitée à Tom, Graw, Qafard (fiche Sarah / Loïck / Bastien introuvable)", (await p.getByRole("heading", { level: 1, name: "Tom" }).count()) === 1 && (await ctx.request.get(B + "/staff/team/sarah")).status() === 404 && (await ctx.request.get(B + "/staff/team/loick")).status() === 404);
    ok("STAFF : aucune erreur JS", errs.length === 0, errs.join("|"));
    ok("STAFF : pages inconnues → 404", (await ctx.request.get(B + "/staff/team/zz")).status() === 404 && (await ctx.request.get(B + "/staff/comms/zz")).status() === 404);
    await ctx.close();
  }
  /* 5. Sélecteur d'espace */
  {
    const { ctx, p } = await mk(); await login(ctx, "graw");
    await p.goto(B + "/v3/profile"); await p.waitForTimeout(1000);
    const sw = p.getByRole("group", { name: "Espace" });
    ok("SÉLECTEUR : compte staff+participant le voit dans le profil MEMBERS", (await sw.count()) === 1);
    await sw.getByRole("link", { name: "Staff HQ" }).click(); await p.waitForURL("**/staff"); await p.waitForTimeout(800);
    ok("SÉLECTEUR : passage à STAFF HQ sans nouvelle connexion", (await p.getByRole("heading", { level: 1, name: "HQ" }).count()) === 1);
    await p.getByRole("link", { name: "Profil et espaces" }).click(); await p.waitForURL("**/staff/profile"); await p.waitForTimeout(900);
    await p.getByRole("group", { name: "Espace" }).getByRole("link", { name: "Members" }).click(); await p.waitForURL(B + "/"); await p.waitForTimeout(1500);
    ok("SÉLECTEUR : retour à MEMBERS, session conservée", (await p.getByRole("heading", { level: 1 }).first().innerText()).toLowerCase().includes("la fête"));
    await ctx.close();
    const c2 = await mk(); await login(c2.ctx, "participant"); await c2.p.goto(B + "/v3/profile"); await c2.p.waitForTimeout(1000);
    ok("SÉLECTEUR : invisible pour un participant seul (et l'URL reste refusée par le serveur)", (await c2.p.getByRole("group", { name: "Espace" }).count()) === 0);
    await c2.p.goto(B + "/staff"); await c2.p.waitForTimeout(700);
    ok("PARTICIPANT : /staff affiche le refus explicite", new URL(c2.p.url()).search.includes("denied=1") && (await c2.p.getByRole("alert").filter({ hasText: /n.a pas accès/ }).count()) === 1);
    await c2.ctx.close();
    const c3 = await mk(); await login(c3.ctx, "qafard"); await c3.p.goto(B + "/"); await c3.p.waitForTimeout(800); await c3.p.getByRole("button", { name: "Mon profil" }).click().catch(() => {}); await c3.p.waitForTimeout(600);
    ok("SÉLECTEUR : disponible aussi dans le profil de l'application participant (production)", (await c3.p.getByRole("group", { name: "Espace" }).count()) === 1);
    await c3.ctx.close();
  }
  /* 6. Mobiles, texte, tactile */
  for (const w of [375, 390, 430]) {
    const { ctx, p } = await mk({ viewport: { width: w, height: 812 } }); await login(ctx, "qafard"); let bad = [];
    for (const r of [...STAFF_PATHS, "/staff/access"]) { await p.goto(B + r); await p.waitForTimeout(500); const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (ov > 0) bad.push(`${r}:+${ov}`); }
    ok(`MOBILE ${w} px : aucun défilement horizontal sur STAFF HQ`, bad.length === 0, bad.join(" "));
    if (w === 375) {
      const small = [], tiny = [];
      for (const r of STAFF_PATHS) { await p.goto(B + r); await p.waitForTimeout(600);
        const s = await p.evaluate(() => { const out = [], t = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const x = n.textContent.trim(); if (!x) continue; const e = n.parentElement; const r = e.getBoundingClientRect(); if (!r.width || e.closest("[aria-hidden='true'], .sr-only")) continue; if (parseFloat(getComputedStyle(e).fontSize) < 11) out.push(x.slice(0, 18)); } document.querySelectorAll("a, button").forEach((e) => { const r = e.getBoundingClientRect(); if (r.width && r.height && !e.classList.contains("sr-only") && !(e.textContent || "").startsWith("Aller au contenu") && !e.closest("[aria-hidden='true']") && (r.height < 40)) t.push((e.textContent || e.getAttribute("aria-label") || "").trim().slice(0, 16) + " " + Math.round(r.height)); }); return [out, t]; });
        if (s[0].length) small.push(r + " " + s[0].slice(0, 2)); if (s[1].length) tiny.push(r + " " + s[1].slice(0, 3)); }
      ok("STAFF : aucun texte < 11 px", small.length === 0, small.join(";")); ok("STAFF : cibles tactiles ≥ 40 px", tiny.length === 0, tiny.join(";"));
    }
    await ctx.close();
  }
  /* 7. Production (démo désactivée par défaut) — nécessite un second serveur lancé avec VERCEL_ENV=production */
  if (process.env.BASE_PROD) {
    const P = process.env.BASE_PROD; const { ctx, p } = await mk();
    const r = await ctx.request.post(B + "/api/demo-session", { form: { account: "tom" }, maxRedirects: 0 }); const token = /sk_demo=([^;]+)/.exec(r.headers()["set-cookie"] || "")[1];
    await ctx.addCookies([{ name: "sk_demo", value: token, url: P }]);
    const g = await ctx.request.get(P + "/staff", { maxRedirects: 0 });
    ok("PRODUCTION : un jeton valide ne donne AUCUN accès quand la démo est désactivée", g.status() >= 300 && g.status() < 400 && (g.headers()["location"] || "").includes("/staff/access"));
    ok("PRODUCTION : l'ouverture de session démo est refusée (404)", (await ctx.request.post(P + "/api/demo-session", { form: { account: "tom" }, maxRedirects: 0 })).status() === 404);
    await p.goto(P + "/staff/access"); await p.waitForTimeout(1200);
    ok("PRODUCTION : la page d'accès explique que la démo est désactivée, sans comptes proposés", (await p.getByText(/désactivée sur cet environnement/).count()) === 1 && (await p.getByRole("button", { name: /^Tom/ }).count()) === 0);
    await ctx.close();
  }
  await browser.close(); console.log(fails ? `${fails} ÉCHEC(S)` : "TOUT PASSE"); process.exit(fails ? 1 : 0);
})();
