/* eslint-disable */
// Sprint V3.1 — Unification et fiabilisation : navigation V3, redirections, mode live (sans comptes / anonyme / membre sans réservation / voyageur vérifié SIMULÉ par le faux serveur),
// mode revue LOCAL, absence de QR. FAUX serveur Supabase local (aucun vrai projet).
// Serveurs (tests/run-participant.sh) : A=3105 (comptes) · OFF=3106 (sans comptes, hors revue) · REV=3112 (revue locale) · PREV=3113 (revue demandée + VERCEL_ENV=preview) · PROD=3114 (revue demandée + VERCEL_ENV=production).
const { chromium } = require("playwright");
const A = process.env.PART_A || "http://localhost:3105", OFF = process.env.PART_OFF || "http://localhost:3106", REV = process.env.REV || "http://localhost:3112", PREV = process.env.PREV || "http://localhost:3113", PROD = process.env.PROD || "http://localhost:3114", MOCK = process.env.MOCK || "http://127.0.0.1:3199";
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${!c && d ? " — " + d : ""}`); if (!c) fails++; };
const ctl = (b) => fetch(MOCK + "/__control", { method: "POST", body: JSON.stringify(b) }).then((r) => r.json());
const KEY = "skyline.v3.proto.v2";
// État local « simulé » d'une ancienne session de démonstration : réservation confirmée, phase pendant, voyage fictif, consentements, pseudo « Alex ».
const FORGED = { phase: "during", locale: "fr", sim: { reservation: "confirmed", tone: true, trip: true }, community: { adult: true, charter: true, consent: true }, me: { pseudo: "Alex", city: "Paris", bio: "", genres: ["House"], visible: true } };
(async () => {
  const browser = await chromium.launch(); const errs = []; await ctl({ reset: true, delay: 0, fail: {}, profileTable: "ok", clubTable: "ok", signupTable: "ok", otpRate: false, otpFail: null, verifyFail: null });
  const mk = async (base, o = {}) => { const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); await ctx.addCookies([{ name: "sk_space", value: o.space ?? "members", url: base }]); if (o.forged) await ctx.addInitScript(([k, v]) => { try { if (!localStorage.getItem(k)) localStorage.setItem(k, v); } catch {} }, [KEY, JSON.stringify(FORGED)]); const p = await ctx.newPage(); p.setDefaultTimeout(15000); p.on("pageerror", (e) => errs.push(e.message)); return { ctx, p }; };
  const vis = async (loc, t = 8000) => { try { await loc.first().waitFor({ state: "visible", timeout: t }); return true; } catch { return false; } };
  const get = (ctx, url, headers = {}) => ctx.request.get(url, { maxRedirects: 0, headers });
  const body = (p) => p.locator("body").innerText();
  const login = async (p, base, who) => { await p.goto(base + "/v3/login", { waitUntil: "domcontentloaded" }); await p.locator("#login-email").fill(`${who}@example.test`); await p.getByRole("button", { name: "Recevoir un code" }).click(); await p.locator("#login-code").fill("123456"); await p.getByRole("button", { name: "Se connecter" }).click(); await p.waitForURL("**/v3/account"); };
  const noQr = (p) => p.evaluate(() => document.querySelectorAll("canvas, img[src*='qr' i], img[alt*='qr' i], svg[aria-label*='qr' i], svg[data-qr], [data-testid*='qr' i]").length === 0 && !/otpauth|data:image\/png;base64/i.test(document.body.innerHTML));
  const tabs = (p) => p.evaluate(() => [...document.querySelectorAll("nav[aria-label='Navigation principale'] a")].map((a) => `${a.textContent.trim()}|${a.getAttribute("href")}|${a.getAttribute("aria-current") ?? ""}`));
  const SIM_UI = /Simuler le parcours|Phase du voyage|Réinitialiser le prototype|Plan des écrans|Quitter le prototype/i;

  /* ===== 1. Redirections (anciennes routes) : une étape, sans boucle, requête conservée ===== */
  { const { ctx } = await mk(OFF);
    const doc = { "sec-fetch-dest": "document" }; const loc = (r) => new URL(r.headers()["location"] || "http://x/", "http://localhost").pathname + new URL(r.headers()["location"] || "http://x/", "http://localhost").search;
    let r = await get(ctx, OFF + "/", doc); ok("« / » (espace Members mémorisé) → /v3", r.status() === 307 && loc(r) === "/v3");
    r = await get(ctx, OFF + "/?utm=1"); ok("« / » (navigation interne) → /v3 avec la requête conservée", r.status() === 307 && loc(r) === "/v3?utm=1");
    const fresh = await browser.newContext(); r = await fresh.request.get(OFF + "/", { maxRedirects: 0, headers: doc }); ok("« / » sans espace mémorisé → choix de l'espace (/start), inchangé", r.status() === 307 && loc(r) === "/start");
    const staffCtx = await browser.newContext(); await staffCtx.addCookies([{ name: "sk_space", value: "staff", url: OFF }]); r = await staffCtx.request.get(OFF + "/", { maxRedirects: 0, headers: doc }); ok("« / » avec espace STAFF mémorisé → /staff, inchangé", r.status() === 307 && loc(r) === "/staff"); await fresh.close(); await staffCtx.close();
    for (const [src, dst] of [["/explore", "/v3/explore"], ["/flight", "/v3/flight"], ["/club", "/v3/club"], ["/pass", "/v3/flight"], ["/more", "/v3"], ["/crew", "/v3/club"], ["/v3/explore/radio", "/v3/explore/sound"], ["/v3/explore/radio/dj/dj1", "/v3/explore/sound"], ["/v3/explore/radio/sel/sel1", "/v3/explore/sound"]]) {
      r = await get(ctx, OFF + src); const l = loc(r); const next = await get(ctx, OFF + l.split("?")[0]);
      ok(`REDIRECTION ${src} → ${dst} : une seule étape, cible servie (aucune chaîne ni boucle)`, [307, 308].includes(r.status()) && l === dst && next.status() === 200, `${r.status()} ${l} puis ${next.status()}`);
    }
    ok("PAS de redirection sur /v3, /v3/flight, /v3/explore, /v3/club, /start", (await Promise.all(["/v3", "/v3/flight", "/v3/explore", "/v3/club", "/start"].map((x) => get(ctx, OFF + x)))).every((x) => x.status() === 200));
    /* LOT 1 — contenus de démonstration MASQUÉS PAR DÉFAUT (construction sans SKYLINE_REVIEW_MODE), même si le mode revue est demandé à l'exécution, y compris sur Preview/Production simulées. */
    for (const [label, base] of [["défaut", OFF], ["revue demandée à l'exécution seulement", REV], ["revue + VERCEL_ENV=preview", PREV], ["revue + VERCEL_ENV=production", PROD]]) {
      const slug = await get(ctx, base + "/signal/un-lieu-a-ibiza-se-devoile"); const ex = await get(ctx, base + "/v3/explore"); const snd = await get(ctx, base + "/v3/explore/sound"); const home = await get(ctx, base + "/v3");
      const bodies = (await ex.text()) + (await snd.text()) + (await home.text());
      ok(`LOT 1 [${label}] : signal fictif introuvable (404), aucun texte de démonstration, aucune playlist tierce, aucun outil de test dans le HTML servi`, slug.status() === 404 && !/Un lieu à Ibiza se dévoile|Un premier nom rejoint|Un mix à écouter|Ici s.afficherait|andres-jaramillo|Tester une URL SoundCloud|\[Attribué\]/.test(bodies), `${slug.status()}`);
    }
    {
      const q = await browser.newContext(); const pg = await q.newPage();
      await pg.goto(OFF + "/v3/explore"); await pg.waitForTimeout(1200);
      ok("LOT 1 : EXPLORE sans signal publié → section « Révélations » conservée avec un état vide sobre, sans date ni badge", (await pg.getByRole("heading", { name: "Révélations" }).count()) === 1 && (await pg.getByText(/premières révélations seront dévoilées/).count()) === 1 && (await pg.getByText(/NEW|New/).count()) === 0);
      await pg.goto(OFF + "/v3/explore/sound"); await pg.waitForTimeout(1200);
      ok("LOT 1 : SOUND sans lien autorisé → quatre collections « Bientôt », aucun outil de test ni mention « Prototype »", (await pg.getByText("Bientôt").count()) === 4 && (await pg.getByText(/Tester une URL|Prototype|URL de test/).count()) === 0 && (await pg.locator("iframe").count()) === 0);
      await pg.goto(OFF + "/v3"); await pg.waitForTimeout(1200);
      ok("LOT 1 : HOME sans signal → aucune carte de révélation", (await pg.getByText(/Location Reveal|Artist Reveal|Nouvelle révélation/i).count()) === 0);
      await q.close();
    }
    await ctx.close(); }
  { const { ctx } = await mk(A);
    const r = await get(ctx, A + "/v3/login?next=%2Fv3%2Fflight"); ok("AUTHENTIFICATION : /v3/login?next=… servie sans redirection (paramètre intact)", r.status() === 200);
    const cb = await get(ctx, A + "/auth/callback"); ok("AUTHENTIFICATION : /auth/callback sans code → connexion en erreur (aucune boucle vers « / »)", [303, 307].includes(cb.status()) && /\/v3\/login\?error=1|\/staff\/login\?error=1/i.test(cb.headers()["location"] || ""));
    ok("AUTHENTIFICATION : /v3/account sans session → /v3/login?next=… (inchangé)", (await get(ctx, A + "/v3/account")).status() === 307 && /\/v3\/login\?next=/i.test((await get(ctx, A + "/v3/account")).headers()["location"] || ""));
    await ctx.close(); }

  /* ===== 2. Barre de navigation unifiée, état actif ===== */
  { const { ctx, p } = await mk(OFF);
    await p.goto(OFF + "/v3", { waitUntil: "domcontentloaded" }); await vis(p.getByRole("heading", { level: 1 })); const t0 = await tabs(p);
    ok("NAVIGATION : quatre onglets HOME, MY FLIGHT, EXPLORE, CLUB — tous vers /v3", t0.length === 4 && t0.map((x) => x.split("|").slice(0, 2).join("|")).join(",") === "Home|/v3,My Flight|/v3/flight,Explore|/v3/explore,Club|/v3/club");
    for (const [path, active] of [["/v3", "Home"], ["/v3/flight", "My Flight"], ["/v3/explore", "Explore"], ["/v3/explore/sound", "Explore"], ["/v3/club", "Club"], ["/v3/club/space", "Club"], ["/v3/club/members", "Club"], ["/v3/profile", ""]]) {
      await p.goto(OFF + path, { waitUntil: "domcontentloaded" }); await vis(p.locator("nav[aria-label='Navigation principale']")); const t = await tabs(p); const act = t.filter((x) => x.endsWith("|page")).map((x) => x.split("|")[0]);
      ok(`NAVIGATION ${path} : onglet actif = « ${active || "aucun"} » ; mêmes quatre onglets`, act.join() === active && t.length === 4 && t.map((x) => x.split("|").slice(0, 2).join("|")).join() === t0.map((x) => x.split("|").slice(0, 2).join("|")).join(), t.join(";"));
    }
    await p.goto(OFF + "/v3/flight", { waitUntil: "domcontentloaded" }); await vis(p.locator("nav[aria-label='Navigation principale']")); await p.locator("nav[aria-label='Navigation principale']").getByRole("link", { name: "Home" }).click(); await p.waitForURL(OFF + "/v3");
    ok("NAVIGATION : l'onglet HOME ouvre le véritable accueil V3 (/v3) — pas l'ancien accueil", new URL(p.url()).pathname === "/v3" && (await vis(p.getByRole("heading", { level: 1 }))));
    await ctx.close(); }

  /* ===== 3. Application SANS comptes (hors revue) : aucune simulation, malgré un état local « confirmé » ===== */
  { const { ctx, p } = await mk(OFF, { forged: true });
    const rv = await (await ctx.request.get(OFF + "/api/review-mode")).json(); ok("SANS COMPTES : le mode revue est désactivé côté serveur", rv.review === false);
    await p.goto(OFF + "/v3", { waitUntil: "domcontentloaded" }); await vis(p.getByTestId("to-confirm")); await p.waitForTimeout(500); let t = await body(p);
    ok("SANS COMPTES : l'état local (« phase pendant », « réservation confirmée ») est IGNORÉ — accueil « avant », « Dates à confirmer », aucun compte à rebours", !/Bienvenue\s+à Ibiza|Skyline Now/i.test(t) && (await p.getByRole("timer").count()) === 0 && (await p.getByTestId("to-confirm").count()) === 1 && /Dates à confirmer/i.test(t));
    ok("SANS COMPTES : aucune identité de démonstration (Alex Martin), aucune commande de simulation, aucun bandeau « prototype »", !/Alex|Martin|Prototype|Revue interne|données fictives/i.test(t) && !SIM_UI.test(t) && (await p.locator("header button").count()) === 0);
    ok("SANS COMPTES : aucun texte de remplacement entre crochets", !/\[[^\]\n]{3,60}\]/i.test(t), (t.match(/\[[^\]\n]{3,60}\]/) || [""])[0]);
    ok("SANS COMPTES : bandeau sobre « Programme à confirmer »", /Programme à confirmer/i.test(t));
    ok("SANS COMPTES : aucun signal fictif sur HOME (Lot 1) ; la section reste cohérente", (await p.getByRole("link", { name: /Un lieu à Ibiza/ }).count()) === 0);
    await p.goto(OFF + "/v3/flight", { waitUntil: "domcontentloaded" }); await vis(p.getByRole("group", { name: /Pass SKYLINE/ })); t = await body(p);
    ok("SANS COMPTES : pass « Réservation à confirmer », origine « À confirmer » (pas de « France »), aucun voyage fictif, aucune étiquette Démo", /Réservation à confirmer/i.test(t) && !/Réservation (confirmée|vérifiée)/i.test(t) && !/France/i.test(t) && !/Aéroport de démonstration|Démo|fictif/i.test(t) && (await vis(p.getByText(/apparaîtront ici dès leur confirmation/))));
    ok("SANS COMPTES : aucun QR code (aucun canvas, image ni SVG de QR)", await noQr(p));
    await p.getByRole("tab", { name: "Infos" }).click(); await p.getByRole("button", { name: /Informations importantes/ }).first().click(); await p.waitForTimeout(500); ok("SANS COMPTES : « Informations importantes » sans documents d'exemple (« Ici s'afficherait… »)", !/Ici s'afficher/i.test(await body(p)) && (await vis(p.getByText(/pas un titre de transport/i)))); await p.keyboard.press("Escape");
    await p.goto(OFF + "/v3/explore", { waitUntil: "domcontentloaded" }); await vis(p.getByRole("link", { name: /Skyline Sound/ })); t = await body(p);
    ok("SANS COMPTES : EXPLORE sans blocs vides (« Line-up à annoncer », « Expériences à Ibiza ») ; SKYLINE SOUND conservé", !/Line-up à annoncer|Expériences à Ibiza|À venir/i.test(t) && (await p.getByRole("link", { name: /Skyline Sound/ }).count()) >= 1);
    await p.goto(OFF + "/v3/club", { waitUntil: "domcontentloaded" }); await vis(p.getByRole("heading", { level: 1 })); t = await body(p);
    ok("SANS COMPTES : CLUB — carte « Participant » (pas « Alex »), aucune invitation à rejoindre une communauté simulée", !/Alex/i.test(t) && (await p.getByRole("link", { name: /Rejoindre la communauté|Voir les conditions/ }).count()) === 0);
    for (const [path, label] of [["/v3/club/space", "My Space"], ["/v3/club/members", "Members"], ["/v3/club/messages", "Messages"], ["/v3/club/community", "Communauté"], ["/v3/club/members/m1", "Membre"]]) {
      await p.goto(OFF + path, { waitUntil: "domcontentloaded" }); const okU = await vis(p.getByTestId("club-unavailable")); t = await body(p);
      ok(`SANS COMPTES : ${path} → « Bientôt disponible », aucun membre ni conversation fictifs`, okU && !/Alba|Noé|Maëlys|Sacha|Inès|Zoé|Léo|Alex/i.test(t));
    }
    await p.goto(OFF + "/v3/profile", { waitUntil: "domcontentloaded" }); await vis(p.getByRole("heading", { name: "Profil" })); await vis(p.getByText(/disponibles prochainement/i)); t = await body(p);
    ok("SANS COMPTES : profil sans réglages simulés (membres bloqués, notifications, réinitialisation) ni nom de démonstration ; « Mes données » : prochainement", !/Alex|Membres bloqués|Notifications|Réinitialiser le prototype|Communauté/i.test(t) && /disponibles prochainement/i.test(t));
    ok("SANS COMPTES : plan des écrans et wireframes inexistants (404)", (await get(ctx, OFF + "/v3/screens")).status() === 404 && (await get(ctx, OFF + "/v3/wireframes")).status() === 404);
    await ctx.close(); }

  /* ===== 4. ANONYME (comptes actifs, non connecté) ===== */
  { const { ctx, p } = await mk(A, { forged: true });
    await p.goto(A + "/v3", { waitUntil: "domcontentloaded" }); await vis(p.getByTestId("identity-anonymous")); const t = await body(p);
    ok("ANONYME : invitation à se connecter, accueil « avant », aucune simulation malgré l'état local forgé", /Se connecter/i.test(t) && !/Bienvenue\s+à Ibiza|Alex|Prototype|Revue interne/i.test(t) && !SIM_UI.test(t) && (await p.locator("header button").count()) === 0);
    await p.goto(A + "/v3/flight", { waitUntil: "domcontentloaded" }); await vis(p.getByRole("group", { name: /Pass SKYLINE/ })); const f = await body(p);
    ok("ANONYME : pass « Réservation à confirmer », aucun QR", /Réservation à confirmer/i.test(f) && !/Réservation (confirmée|vérifiée)/i.test(f) && await noQr(p));
    await ctx.close(); }

  /* ===== 5. MEMBRE SANS RÉSERVATION (preuve serveur absente) ===== */
  await ctl({ travelers: {} });
  { const { ctx, p } = await mk(A, { forged: true }); await login(p, A, "participant");
    await vis(p.getByTestId("account-status")); ok("MEMBRE SANS RÉSERVATION : statut serveur « Compte membre · réservation non vérifiée »", /réservation non vérifiée/i.test(await p.getByTestId("account-status").innerText()));
    await p.goto(A + "/v3/flight", { waitUntil: "domcontentloaded" }); await vis(p.getByRole("group", { name: /Pass SKYLINE/ })); await p.waitForTimeout(600); const f = await body(p);
    ok("MEMBRE SANS RÉSERVATION : pass « Réservation à confirmer » — l'état local « confirmé » ne compte pour rien ; aucun voyage fictif ; aucun QR", /Réservation à confirmer/i.test(f) && !/Réservation (confirmée|vérifiée)/i.test(f) && !/Aéroport de démonstration|France/i.test(f) && await noQr(p));
    await p.goto(A + "/v3/club/members", { waitUntil: "domcontentloaded" }); ok("MEMBRE SANS RÉSERVATION : annuaire fermé « Réservé aux voyageurs vérifiés », malgré consentements locaux forgés", await vis(p.getByTestId("dir-traveler")));
    await p.goto(A + "/v3/club/messages", { waitUntil: "domcontentloaded" }); ok("MEMBRE SANS RÉSERVATION : messagerie « Bientôt disponible » (aucune conversation fictive)", (await vis(p.getByTestId("club-soon"))) && !/Alba|Noé/i.test(await body(p)));
    await p.goto(A + "/v3", { waitUntil: "domcontentloaded" }); await vis(p.getByTestId("identity-incomplete").or(p.getByTestId("identity-name"))); ok("MEMBRE SANS RÉSERVATION : accueil « avant », « Dates à confirmer », aucune simulation", !/Bienvenue\s+à Ibiza/i.test(await body(p)) && (await p.getByTestId("to-confirm").count()) === 1 && !SIM_UI.test(await body(p)));
    await ctx.close(); }

  /* ===== 6. VOYAGEUR VÉRIFIÉ — SIMULÉ par le faux serveur (contexte de test isolé) ===== */
  await ctl({ travelers: { participant: true } });
  { const { ctx, p } = await mk(A); await login(p, A, "participant");
    await vis(p.getByTestId("account-status")); ok("VOYAGEUR VÉRIFIÉ : statut serveur « Voyageur · réservation vérifiée »", /Voyageur · réservation vérifiée/i.test(await p.getByTestId("account-status").innerText()));
    await p.goto(A + "/v3/flight", { waitUntil: "domcontentloaded" }); await vis(p.getByRole("group", { name: /Pass SKYLINE/ })); await p.waitForTimeout(600); const f = await body(p);
    ok("VOYAGEUR VÉRIFIÉ : pass « Réservation vérifiée » (preuve serveur) — toujours SANS QR (QR « remis par l'équipe »), aucun voyage inventé", /Réservation vérifiée/i.test(f) && /remis par l'équipe/i.test(f) && !/Aéroport de démonstration|France/i.test(f) && await noQr(p));
    await p.goto(A + "/v3/club/members", { waitUntil: "domcontentloaded" }); await p.waitForTimeout(800); ok("VOYAGEUR VÉRIFIÉ : l'annuaire n'est plus bloqué par le statut voyageur (profil CLUB à créer / publier)", (await p.getByTestId("dir-traveler").count()) === 0 && (await vis(p.getByTestId("dir-closed"))));
    await ctx.close(); }
  await ctl({ travelers: { participant: true, lea: true, graw: true } });

  /* ===== 7. MODE REVUE LOCAL : explicite, local uniquement ===== */
  { const { ctx, p } = await mk(REV, { forged: true });
    ok("REVUE : autorisée sur le serveur local (variable explicite, hors Vercel, adresse locale)", (await (await ctx.request.get(REV + "/api/review-mode")).json()).review === true);
    ok("REVUE : refusée si la requête arrive via un relais public (x-forwarded-host)", (await (await ctx.request.get(REV + "/api/review-mode", { headers: { "x-forwarded-host": "skyline.example.com" } })).json()).review === false && (await get(ctx, REV + "/v3/screens", { "x-forwarded-host": "skyline.example.com" })).status() === 404);
    await p.goto(REV + "/v3", { waitUntil: "domcontentloaded" }); await p.waitForTimeout(1200); let t = await body(p);
    ok("REVUE : bandeau « Revue interne », identité de démonstration, phase simulée (pendant), commandes visibles", /Revue interne/i.test(t) && /Alex Martin/i.test(t) && /Bienvenue\s+à Ibiza/i.test(t) && (await p.locator("header button").count()) >= 1);
    await p.locator("header button").first().click(); ok("REVUE : la feuille « Simuler le parcours » s'ouvre", await vis(p.getByText("Simuler le parcours")));
    await p.getByRole("radio", { name: "Avant" }).click(); await p.keyboard.press("Escape"); await p.waitForTimeout(600); ok("REVUE : la phase simulée change l'accueil", await vis(p.getByRole("timer")));
    await p.goto(REV + "/v3/flight", { waitUntil: "domcontentloaded" }); await vis(p.getByRole("group", { name: /Pass SKYLINE/ })); await vis(p.getByText("Démo", { exact: true })); t = await body(p);
    ok("REVUE : pass simulé étiqueté « Démo » (réservation simulée ≠ vérifiée) ; aucun QR même en revue", /Démo/i.test(t) && !/Réservation vérifiée/i.test(t) && await noQr(p));
    await p.goto(REV + "/v3/club/members", { waitUntil: "domcontentloaded" }); ok("REVUE : annuaire de démonstration (membres fictifs) visible", await vis(p.getByText("Alba")));
    ok("REVUE : plan des écrans et wireframes accessibles", (await get(ctx, REV + "/v3/screens")).status() === 200 && (await get(ctx, REV + "/v3/wireframes")).status() === 200);
    await ctx.close(); }
  for (const [label, base] of [["PREVIEW (VERCEL_ENV=preview)", PREV], ["PRODUCTION (VERCEL_ENV=production)", PROD]]) {
    const { ctx, p } = await mk(base, { forged: true });
    ok(`REVUE ${label} : IMPOSSIBLE même avec SKYLINE_REVIEW_MODE=on (API false, pages de conception 404)`, (await (await ctx.request.get(base + "/api/review-mode")).json()).review === false && (await get(ctx, base + "/v3/screens")).status() === 404 && (await get(ctx, base + "/v3/wireframes")).status() === 404);
    await p.goto(base + "/v3", { waitUntil: "domcontentloaded" }); await vis(p.getByTestId("to-confirm")); const t = await body(p);
    ok(`REVUE ${label} : aucune commande de simulation, aucun état simulé`, !/Revue interne|Alex|Bienvenue\s+à Ibiza/i.test(t) && (await p.locator("header button").count()) === 0 && !SIM_UI.test(t));
    await ctx.close(); }

  ok("AUCUNE erreur JavaScript", errs.length === 0, errs.slice(0, 3).join(" | "));
  await browser.close(); console.log(fails ? `\n${fails} ÉCHEC(S)` : "\nTous les tests E2E V3.1 sont passés."); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
